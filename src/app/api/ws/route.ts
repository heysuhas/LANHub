import { NextRequest } from 'next/server';

// Store connected clients
const clients = new Set<any>();
let messageHistory: any[] = [];
let messageSeq = 0; // server-assigned monotonic sequence for reliable delivery
let onlineUsers = new Map<string, any>();
let deviceRegistry = new Map<string, any>();
// Pending key update envelopes per-user (delivered via heartbeat)
let keyUpdates = new Map<string, any[]>();
// In-memory chat rooms
let rooms = new Map<string, {
  id: string;
  name: string;
  participants: string[];
  createdBy: string;
  createdAt: number;
  isPublic: boolean;
  admins?: string[];
}>();
// In-memory encrypted file transfers (metadata + chunks)
let fileTransfers = new Map<string, {
  id: string;
  senderId: string;
  senderName: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  recipients?: string[]; // undefined or empty => broadcast
  createdAt: number;
  completed: boolean;
  chunks: Map<number, { data: string; nonce: string }>; // base64 ciphertext + nonce per chunk
}>();

export async function GET(req: NextRequest) {
  // Check if request is upgrade to WebSocket
  const upgradeHeader = req.headers.get('upgrade');
  
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected websocket', { status: 426 });
  }

  // For Next.js, we'll use a long-polling fallback
  // Real WebSocket requires a custom server
  return new Response(
    JSON.stringify({ 
      error: 'WebSocket upgrade not supported in serverless. Use polling endpoint.' 
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return Response.json({ error: 'Invalid Content-Type, expected application/json' }, { status: 400 });
    }
    let body;
    const rawBody = await req.text(); // Read raw body as text
    if (rawBody === '') {
      body = {}; // Treat empty body as an empty JSON object
    } else {
      try {
        body = JSON.parse(rawBody); // Manually parse the text
      } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }
    const { type, payload } = body;

    switch (type) {
      case 'register_user':
        // Use 'id' instead of 'userId' for user identifier
        onlineUsers.set(payload.id, {
          ...payload,
          // allow clients to include ECDH public key for E2E key exchange
          publicKeyJwk: payload.publicKeyJwk,
          lastSeen: Date.now(),
          status: 'online'
        });
        broadcast({
          type: 'user_online',
          payload: {
            userId: payload.id,
            user: payload,
            onlineUsers: Array.from(onlineUsers.values())
          }
        });
        return Response.json({ 
          success: true, 
          onlineUsers: Array.from(onlineUsers.values()),
          messages: messageHistory
        });

      case 'unregister_user':
        onlineUsers.delete(payload.userId);
        broadcast({
          type: 'user_offline',
          payload: {
            userId: payload.userId,
            onlineUsers: Array.from(onlineUsers.values())
          }
        });
        return Response.json({ success: true });

      case 'heartbeat':
        if (onlineUsers.has(payload.userId)) {
          const user = onlineUsers.get(payload.userId);
          onlineUsers.set(payload.userId, {
            ...user,
            lastSeen: Date.now()
          });
        }
        // Refresh any devices belonging to this user as online (keep-alive)
        for (const [deviceId, device] of deviceRegistry.entries()) {
          if (device.userId === payload.userId) {
            deviceRegistry.set(deviceId, { ...device, lastSeen: Date.now(), isOnline: true });
          }
        }
        // Collect new messages and file announcements since lastSeq (monotonic)
        const lastSeq = payload.lastSeq || 0;
        const newMessages = messageHistory.filter(m => (m.seq ?? 0) > lastSeq);
        // Provide lightweight announcements without relying on timestamps
        const announcements = Array.from(fileTransfers.values())
          .filter(t => (Array.isArray(t.recipients) ? t.recipients.includes(payload.userId) : true))
          .map(t => ({
            id: t.id,
            senderId: t.senderId,
            senderName: t.senderName,
            fileName: t.fileName,
            fileSize: t.fileSize,
            totalChunks: t.totalChunks,
            recipients: t.recipients,
            createdAt: t.createdAt,
            completed: t.completed,
          }));
        // Deliver key updates queued for this user
        const queued = keyUpdates.get(payload.userId) || [];
        keyUpdates.set(payload.userId, []);
        return Response.json({ 
          success: true,
          onlineUsers: Array.from(onlineUsers.values()),
          newMessages,
          lastSeq: messageSeq,
          keyUpdates: queued,
          fileAnnouncements: announcements,
          devices: Array.from(deviceRegistry.values()),
          rooms: Array.from(rooms.values()),
        });

      case 'create_room':
        // payload: { id, name, createdBy, isPublic, participants? }
        if (!payload.id || !payload.name || !payload.createdBy) {
          return Response.json({ error: 'Invalid create_room payload' }, { status: 400 });
        }
        if (rooms.has(payload.id)) {
          return Response.json({ error: 'Room already exists' }, { status: 400 });
        }
        rooms.set(payload.id, {
          id: payload.id,
          name: payload.name,
          participants: Array.from(new Set([...(payload.participants || []), payload.createdBy])),
          createdBy: payload.createdBy,
          createdAt: Date.now(),
          isPublic: !!payload.isPublic,
          admins: payload.admins || [],
        });
        return Response.json({ success: true, rooms: Array.from(rooms.values()) });

      case 'update_room':
        // payload: { roomId, byUserId, addParticipant?, removeParticipant?, addAdmin?, removeAdmin?, transferOwnerTo? }
        {
          const r = rooms.get(payload.roomId);
          if (!r) return Response.json({ error: 'Room not found' }, { status: 404 });
          const isOwner = r.createdBy === payload.byUserId;
          const isAdmin = isOwner || (Array.isArray(r.admins) && r.admins.includes(payload.byUserId));
          if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
          // Mutations
          if (payload.addParticipant) {
            r.participants = Array.from(new Set([...r.participants, payload.addParticipant]));
          }
          if (payload.removeParticipant) {
            r.participants = r.participants.filter((u: string) => u !== payload.removeParticipant);
            // also drop admin if removed
            if (r.admins) r.admins = r.admins.filter((u: string) => u !== payload.removeParticipant);
            // prevent removing owner from participants
            if (!r.participants.includes(r.createdBy)) r.participants.push(r.createdBy);
          }
          if (payload.addAdmin) {
            const target = payload.addAdmin;
            if (target !== r.createdBy) {
              r.admins = Array.from(new Set([...(r.admins || []), target]));
              if (!r.participants.includes(target)) r.participants.push(target);
            }
          }
          if (payload.removeAdmin) {
            r.admins = (r.admins || []).filter((u: string) => u !== payload.removeAdmin);
          }
          if (payload.transferOwnerTo) {
            const target = payload.transferOwnerTo;
            if (r.participants.includes(target)) {
              r.createdBy = target;
              // ensure previous owner remains participant/admin as needed
              r.admins = Array.from(new Set([...(r.admins || []), payload.byUserId]));
            }
          }
          rooms.set(r.id, r);
          return Response.json({ success: true, room: r, rooms: Array.from(rooms.values()) });
        }

      case 'delete_room':
        // payload: { roomId, byUserId }
        {
          const r = rooms.get(payload.roomId);
          if (!r) return Response.json({ success: true });
          const isOwner = r.createdBy === payload.byUserId;
          if (!isOwner) return Response.json({ error: 'Forbidden' }, { status: 403 });
          rooms.delete(payload.roomId);
          return Response.json({ success: true, rooms: Array.from(rooms.values()) });
        }

      case 'send_message':
        const message = {
          ...payload,
          timestamp: Date.now(),
          seq: ++messageSeq,
        };
        messageHistory.push(message);
        // Keep only last 200 messages to support encryption metadata
        if (messageHistory.length > 200) {
          messageHistory = messageHistory.slice(-200);
        }
        broadcast({
          type: 'new_message',
          payload: message
        });
        return Response.json({ success: true, message });

      case 'register_device':
        // Use 'id' for deviceId
        deviceRegistry.set(payload.id, {
          ...payload,
          lastSeen: Date.now(),
          isOnline: true
        });
        broadcast({
          type: 'device_online',
          payload: {
            devices: Array.from(deviceRegistry.values())
          }
        });
        return Response.json({ 
          success: true,
          devices: Array.from(deviceRegistry.values())
        });
      case 'key_update':
        // Enqueue an encrypted room key update for target user
        // payload: { targetUserId, fromUserId, envelope: { epk, saltB64, nonceB64, ctB64 } }
        if (!payload.targetUserId || !payload.envelope) {
          return Response.json({ error: 'Invalid key_update payload' }, { status: 400 });
        }
        if (!keyUpdates.has(payload.targetUserId)) keyUpdates.set(payload.targetUserId, []);
        keyUpdates.get(payload.targetUserId)!.push({
          fromUserId: payload.fromUserId,
          envelope: payload.envelope,
          timestamp: Date.now(),
        });
        return Response.json({ success: true });
      case 'init_file_transfer':
        // payload: { id, senderId, senderName, fileName, fileSize, totalChunks, recipients? }
        fileTransfers.set(payload.id, {
          id: payload.id,
          senderId: payload.senderId,
          senderName: payload.senderName,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          totalChunks: payload.totalChunks,
          recipients: payload.recipients,
          createdAt: Date.now(),
          completed: false,
          chunks: new Map(),
        });
        return Response.json({ success: true });
      case 'upload_chunk':
        // payload: { transferId, index, totalChunks, data, nonce }
        if (!fileTransfers.has(payload.transferId)) {
          return Response.json({ error: 'Unknown transfer' }, { status: 400 });
        }
        {
          const t = fileTransfers.get(payload.transferId)!;
          t.totalChunks = payload.totalChunks || t.totalChunks;
          t.chunks.set(payload.index, { data: payload.data, nonce: payload.nonce });
          if (t.chunks.size >= t.totalChunks) {
            t.completed = true;
          }
          return Response.json({ success: true, received: payload.index });
        }
      case 'list_file_transfers':
        // payload: { userId }
        {
          const list = Array.from(fileTransfers.values())
            .filter(t => t.senderId !== payload.userId)
            .filter(t => (Array.isArray(t.recipients) ? t.recipients.includes(payload.userId) : true))
            .map(t => ({
              id: t.id,
              senderId: t.senderId,
              senderName: t.senderName,
              fileName: t.fileName,
              fileSize: t.fileSize,
              totalChunks: t.totalChunks,
              completed: t.completed,
              availableChunks: Array.from(t.chunks.keys()).sort((a,b)=>a-b),
            }));
          return Response.json({ success: true, transfers: list });
        }
      case 'download_file_chunk':
        // payload: { userId, transferId, index }
        {
          const t = fileTransfers.get(payload.transferId);
          if (!t) return Response.json({ error: 'Not found' }, { status: 404 });
          // access control (best-effort; encryption still protects)
          if (Array.isArray(t.recipients) && !t.recipients.includes(payload.userId)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
          }
          const chunk = t.chunks.get(payload.index);
          if (!chunk) return Response.json({ error: 'Chunk not ready' }, { status: 404 });
          return Response.json({ success: true, index: payload.index, data: chunk.data, nonce: chunk.nonce });
        }

      case 'get_state':
        return Response.json({
          success: true,
          onlineUsers: Array.from(onlineUsers.values()),
          messages: messageHistory,
          lastSeq: messageSeq,
          devices: Array.from(deviceRegistry.values()),
          rooms: Array.from(rooms.values()),
        });

      default:
        return Response.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (error) {
    console.error('WebSocket API error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// Broadcast helper (in real app, this would use WebSocket connections)
function broadcast(message: any) {
  // Store for polling clients
  // In production, use actual WebSocket connections
}

// Cleanup stale users every 30 seconds
setInterval(() => {
  const now = Date.now();
  const timeout = 35000; // 35 seconds

  for (const [userId, user] of onlineUsers.entries()) {
    if (now - user.lastSeen > timeout) {
      onlineUsers.delete(userId);
    }
  }

  for (const [deviceId, device] of deviceRegistry.entries()) {
    if (now - device.lastSeen > timeout) {
      deviceRegistry.delete(deviceId);
    }
  }
}, 30000);