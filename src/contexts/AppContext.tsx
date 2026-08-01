"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, Device, Message, FileTransfer, ActivityLog, ChatRoom } from '@/types';
import { storage } from '@/lib/local-storage';
import { coreStore } from '@/core/state';
import type { JWK } from '@/lib/crypto';
import {
  generateECDH,
  generateRoomKey,
  exportAesJwk,
  importAesJwk,
  loadRoomKeyJwk,
  saveRoomKeyJwk,
  loadUserKeyPair,
  saveUserKeyPair,
  packRoomKeyForRecipient,
  unpackRoomKeyFromSender,
  aesEncryptString,
  aesDecryptString,
  aesEncryptBytes,
  aesDecryptBytes,
  bytesToBase64,
  base64ToBytes,
  utf8Decode,
  hasSubtle,
} from '@/lib/crypto';

export function getApiEndpoint(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('lanhub_server_url');
    if (custom) return `${custom.replace(/\/$/, '')}/api/ws`;
  }
  const envUrl = process.env.NEXT_PUBLIC_RELAY_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, '')}/api/ws`;
  return '/api/ws';
}

const defaultGeneralRoom: ChatRoom = {
  id: 'general',
  name: 'General Chat',
  participants: [],
  createdBy: 'system',
  createdAt: 0,
  isPublic: true,
};

interface AppContextType {
  currentUser: User | null;
  users: User[];
  devices: Device[];
  messages: Message[];
  fileTransfers: FileTransfer[];
  activityLogs: ActivityLog[];
  chatRooms: ChatRoom[];
  login: (username: string, password: string) => boolean;
  register: (username: string, password: string, displayName: string) => boolean;
  logout: () => void;
  sendMessage: (content: string, roomId?: string) => void;
  addFileTransfer: (transfer: FileTransfer) => void;
  updateFileTransfer: (transferId: string, updates: Partial<FileTransfer>) => void;
  removeFileTransfer: (transferId: string) => void;
  createChatRoom: (name: string, isPublic: boolean) => Promise<void>;
  generateInviteCode: (roomId: string) => string | null;
  joinRoomWithCode: (code: string) => boolean;
  simulateDeviceDiscovery: () => void;
  sendFiles: (files: FileList | File[], roomId?: string) => Promise<string[]>;
  // Admin operations
  kickMember: (roomId: string, userId: string) => Promise<boolean>;
  setRoomAdmin: (roomId: string, userId: string, make: boolean) => Promise<boolean>;
  transferRoomOwner: (roomId: string, newOwnerId: string) => Promise<boolean>;
  deleteChatRoom: (roomId: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [lastSeq, setLastSeq] = useState<number>(0);
  // E2E keys
  const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);
  const [userKeyPair, setUserKeyPair] = useState<{ publicJwk: JWK; privateJwk: JWK } | null>(null);
  // Track who we've sent the room key to (session scope)
  const distributedToRef = useRef<Set<string>>(new Set());
  // Receiving file transfers (assembly buffers)
  const receiversRef = useRef<Map<string, {
    total: number;
    buffers: (Uint8Array | null)[];
    downloaded: Set<number>;
    meta: { id: string; fileName: string; fileSize: number; senderId: string; senderName: string };
  }>>(new Map());

  // Merge helper to keep unique messages by id, ordered by seq/timestamp
  const mergeMessages = (prev: Message[], incoming: Message[]): Message[] => {
    const map = new Map<string, Message>();
    for (const m of prev) map.set(m.id, m);
    for (const m of incoming) map.set(m.id, m);
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const sa = a.seq ?? 0;
      const sb = b.seq ?? 0;
      if (sa !== sb) return sa - sb;
      return a.timestamp - b.timestamp;
    });
    return arr;
  };

  // Sync with server
  const syncWithServer = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(getApiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'heartbeat',
          payload: {
            userId: currentUser.id,
            lastSeq,
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        if (data.onlineUsers) {
          setUsers(data.onlineUsers);
        }

        if (typeof data.lastSeq === 'number') {
          setLastSeq(data.lastSeq);
        }

        if (Array.isArray(data.rooms)) {
          const hasGeneral = data.rooms.some((r: any) => r.id === 'general');
          const mergedRooms = hasGeneral ? data.rooms : [defaultGeneralRoom, ...data.rooms];
          setChatRooms(mergedRooms);
          localStorage.setItem('lanhub_chat_rooms', JSON.stringify(mergedRooms));
        }

        if (Array.isArray(data.devices)) {
          setDevices(data.devices);
        }

        if (data.newMessages && data.newMessages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m: Message) => m.id));
            const uniqueNewMessages: Message[] = data.newMessages.filter((msg: Message) => !existingIds.has(msg.id));
            if (uniqueNewMessages.length === 0) return prev;

            const out: Message[] = uniqueNewMessages.map((msg: Message) => {
              if (msg.enc && msg.nonce && roomKey) {
                try {
                  const plain = utf8Decode(base64ToBytes(msg.content));
                  return { ...msg, content: plain };
                } catch {
                  return msg;
                }
              }
              return msg;
            });

            out.forEach((m) => storage.addMessage(m));
            const updated = mergeMessages(prev, out);
            coreStore.setState({ messages: updated });
            return updated;
          });
        }

        coreStore.setState((prev) => {
          const serverRooms = Array.isArray(data.rooms) ? data.rooms : prev.rooms;
          const hasGen = serverRooms.some((r: any) => r.id === 'general');
          const finalRooms = hasGen ? serverRooms : [defaultGeneralRoom, ...serverRooms];
          return {
            users: Array.isArray(data.onlineUsers) ? data.onlineUsers : prev.users,
            devices: Array.isArray(data.devices) ? data.devices : prev.devices,
            rooms: finalRooms,
          };
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  // Register user on server (include ECDH public key for E2E)
  const registerUserOnServer = async (user: User) => {
    try {
      const response = await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'register_user',
          payload: { ...user, publicKeyJwk: userKeyPair?.publicJwk }
        })
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.onlineUsers || []);
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (error) {
      console.error('Register error:', error);
    }
  };

  // Unregister user from server
  const unregisterUserFromServer = async (userId: string) => {
    try {
      await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'unregister_user',
          payload: { userId }
        })
      });
    } catch (error) {
      console.error('Unregister error:', error);
    }
  };

  // Heartbeat every 500ms (ultra-low latency sync)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      syncWithServer();
    }, 500);

    // Initial sync
    syncWithServer();

    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    // Load data from localStorage
    const savedUser = storage.getCurrentUser();
    setCurrentUser(savedUser);
    if (savedUser) {
      coreStore.setState({
        currentUser: savedUser,
        currentDevice: {
          id: `dev-${savedUser.id}`,
          name: `${savedUser.displayName}'s Device`,
          type: 'desktop',
          ipAddress: '127.0.0.1',
          userId: savedUser.id,
          isOnline: true,
          lastSeen: Date.now(),
        },
      });
    }
    setDevices(storage.getDevices());
    setMessages(storage.getMessages());
    setFileTransfers(storage.getFileTransfers());
    setActivityLogs(storage.getActivityLogs());
    setChatRooms(storage.getChatRooms());

    // Load or generate crypto keys
    (async () => {
      let kp = loadUserKeyPair();
      if (!kp) {
        kp = await generateECDH();
        saveUserKeyPair(kp.publicJwk, kp.privateJwk);
      }
      setUserKeyPair(kp);
      const roomJwk = loadRoomKeyJwk();
      if (roomJwk) {
        try {
          const k = await importAesJwk(roomJwk);
          setRoomKey(k);
        } catch (e) {
          console.warn('Failed to import saved room key:', e);
        }
      }
    })();

    // If user was logged in, re-register with server
    if (savedUser) {
      registerUserOnServer(savedUser);
    }

    // Get initial server state
    fetch('/api/ws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'get_state', payload: {} })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.onlineUsers || []);
          if (data.messages) {
            // decrypt if we already have a room key
            (async () => {
              const out: Message[] = [] as any;
              for (const msg of data.messages as Message[]) {
                if (msg.enc && msg.nonce && roomKey) {
                  try {
                    const plain = await aesDecryptString(roomKey, msg.content, msg.nonce);
                    out.push({ ...msg, content: plain });
                  } catch {
                    out.push({ ...msg, content: '[Encrypted message]' });
                  }
                } else {
                  out.push(msg);
                }
              }
              setMessages(mergeMessages([], out));
            })();
          }
          if (typeof data.lastSeq === 'number') {
            setLastSeq(data.lastSeq);
          }
          if (data.devices) {
            setDevices(data.devices);
          }
          if (data.rooms) {
            setChatRooms(data.rooms);
            localStorage.setItem('lanhub_chat_rooms', JSON.stringify(data.rooms));
          }
        }
      })
      .catch(console.error);
  }, []);

  const login = (username: string, password: string): boolean => {
    const localUsers = storage.getUsers();
    const user = localUsers.find(u => u.username === username);
    
    if (user) {
      const updatedUser = { ...user, status: 'online' as const, lastSeen: Date.now() };
      storage.updateUser(user.id, updatedUser);
      storage.setCurrentUser(updatedUser);
      setCurrentUser(updatedUser);
      coreStore.setState({
        currentUser: updatedUser,
        currentDevice: {
          id: `dev-${updatedUser.id}`,
          name: `${updatedUser.displayName}'s Device`,
          type: 'desktop',
          ipAddress: '127.0.0.1',
          userId: updatedUser.id,
          isOnline: true,
          lastSeen: Date.now(),
        },
      });
      
      // Register with server
      registerUserOnServer(updatedUser);
      
      // Add activity log
      const log: ActivityLog = {
        id: Date.now().toString(),
        type: 'login',
        userId: user.id,
        userName: user.displayName,
        description: `${user.displayName} logged in`,
        timestamp: Date.now(),
      };
      storage.addActivityLog(log);
      setActivityLogs(storage.getActivityLogs());
      
      return true;
    }
    return false;
  };

  const register = (username: string, password: string, displayName: string): boolean => {
    const localUsers = storage.getUsers();
    if (localUsers.find(u => u.username === username)) {
      return false;
    }

    const newUser: User = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      displayName,
      isAdmin: false, // never admin by default
      status: 'online',
      lastSeen: Date.now(),
    };

    storage.addUser(newUser);
    storage.setCurrentUser(newUser);
    setCurrentUser(newUser);
    coreStore.setState({
      currentUser: newUser,
      currentDevice: {
        id: `dev-${newUser.id}`,
        name: `${newUser.displayName}'s Device`,
        type: 'desktop',
        ipAddress: '127.0.0.1',
        userId: newUser.id,
        isOnline: true,
        lastSeen: Date.now(),
      },
    });

    // Register with server
    registerUserOnServer(newUser);

    // Add activity log
    const log: ActivityLog = {
      id: Date.now().toString(),
      type: 'login',
      userId: newUser.id,
      userName: newUser.displayName,
      description: `${newUser.displayName} registered and logged in`,
      timestamp: Date.now(),
    };
    storage.addActivityLog(log);
    setActivityLogs(storage.getActivityLogs());

    return true;
  };

  const logout = () => {
    if (currentUser) {
      storage.updateUser(currentUser.id, { status: 'offline', lastSeen: Date.now() });
      
      // Unregister from server
      unregisterUserFromServer(currentUser.id);
      
      // Add activity log
      const log: ActivityLog = {
        id: Date.now().toString(),
        type: 'logout',
        userId: currentUser.id,
        userName: currentUser.displayName,
        description: `${currentUser.displayName} logged out`,
        timestamp: Date.now(),
      };
      storage.addActivityLog(log);
      setActivityLogs(storage.getActivityLogs());
    }
    
    storage.setCurrentUser(null);
    setCurrentUser(null);
  };

  const sendMessage = async (content: string, roomId?: string) => {
    if (!currentUser) return;

    // Permissions:
    // - Global (roomId undefined): only admin can send
    if (!roomId && !currentUser.isAdmin) {
      return;
    }
    // - Room: allow if public or participant
    if (roomId) {
      const room = chatRooms.find(r => r.id === roomId);
      if (!room) return;
      const isParticipant = room.participants.includes(currentUser.id);
      const canSend = room.isPublic || isParticipant;
      if (!canSend) return;
    }

    let toSend: Message;
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (roomKey) {
      try {
        const { nonceB64, ctB64 } = await aesEncryptString(roomKey, content);
        toSend = {
          id,
          senderId: currentUser.id,
          senderName: currentUser.displayName,
          content: ctB64,
          timestamp: Date.now(),
          roomId,
          type: 'text',
          enc: true,
          nonce: nonceB64,
          alg: 'aes-256-gcm',
        };
      } catch (e) {
        console.error('Encryption failed, sending plaintext:', e);
        toSend = {
          id,
          senderId: currentUser.id,
          senderName: currentUser.displayName,
          content,
          timestamp: Date.now(),
          roomId,
          type: 'text',
        };
      }
    } else {
      toSend = {
        id,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content,
        timestamp: Date.now(),
        roomId,
        type: 'text',
      };
    }

    // Save locally (store plaintext for local UX)
    const localMessage: Message = {
      ...toSend,
      content: content,
    };
    storage.addMessage(localMessage);
    setMessages(prev => mergeMessages(prev, [localMessage]));
    coreStore.setState(prev => ({
      messages: mergeMessages(prev.messages, [localMessage])
    }));

    // Send to server
    try {
      await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'send_message',
          payload: toSend
        })
      });
      void syncWithServer();
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const addFileTransfer = (transfer: FileTransfer) => {
    storage.addFileTransfer(transfer);
    setFileTransfers(storage.getFileTransfers());

    const log: ActivityLog = {
      id: Date.now().toString(),
      type: 'file_sent',
      userId: transfer.senderId,
      userName: transfer.senderName,
      description: `${transfer.senderName} is sharing ${transfer.fileName}`,
      timestamp: Date.now(),
    };
    storage.addActivityLog(log);
    setActivityLogs(storage.getActivityLogs());
  };

  const updateFileTransfer = (transferId: string, updates: Partial<FileTransfer>) => {
    storage.updateFileTransfer(transferId, updates);
    setFileTransfers(storage.getFileTransfers());
  };

  const removeFileTransfer = (transferId: string) => {
    // If receiver had assembled Blob, revoke it
    const t = fileTransfers.find(x => x.id === transferId);
    if (t?.downloadUrl) {
      try { URL.revokeObjectURL(t.downloadUrl); } catch {}
    }
    // Drop receiver buffers to avoid re-adding in this session
    receiversRef.current.delete(transferId);
    // Mark dismissed if current user is receiver
    if (t?.receiverId === currentUser?.id) {
      storage.addDismissedTransfer(transferId);
    }
    storage.removeFileTransfer(transferId);
    setFileTransfers(storage.getFileTransfers());
  };

  const createChatRoom = async (name: string, isPublic: boolean) => {
    if (!currentUser) return;

    const room: ChatRoom = {
      id: Date.now().toString(),
      name,
      participants: [currentUser.id],
      createdBy: currentUser.id,
      createdAt: Date.now(),
      isPublic,
      admins: [],
    };

    // Persist locally immediately for UX
    storage.addChatRoom(room);
    setChatRooms(storage.getChatRooms());

    // Inform server so others can see public rooms
    try {
      const res = await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'create_room', payload: room })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setChatRooms(data.rooms);
          localStorage.setItem('lanhub_chat_rooms', JSON.stringify(data.rooms));
        }
      }
    } catch (e) {
      console.warn('Failed to create room on server:', e);
    }
  };

  // Base64URL helpers for invite codes
  const b64url = (s: string) =>
    typeof window === 'undefined'
      ? Buffer.from(s).toString('base64url')
      : btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64urlDecode = (s: string) => {
    try {
      const norm = s.replace(/-/g, '+').replace(/_/g, '/');
      const pad = '==='.slice((norm.length + 3) % 4);
      const decoded = typeof window === 'undefined' ? Buffer.from(norm + pad, 'base64').toString('utf-8') : atob(norm + pad);
      return decoded;
    } catch {
      return '';
    }
  };

  const generateInviteCode = (roomId: string): string | null => {
    if (!currentUser) return null;
    const room = storage.getChatRooms().find(r => r.id === roomId);
    if (!room || room.isPublic) return null;
    // Ensure current user is participant
    if (!room.participants.includes(currentUser.id)) return null;
    const payload = {
      v: 1,
      roomId: room.id,
      name: room.name,
      isPublic: false,
      inviterId: currentUser.id,
      ts: Date.now(),
    };
    return b64url(JSON.stringify(payload));
  };

  const joinRoomWithCode = (code: string): boolean => {
    if (!currentUser) return false;
    let payload: any;
    try {
      payload = JSON.parse(b64urlDecode(code));
    } catch {
      return false;
    }
    if (!payload || payload.v !== 1 || !payload.roomId || !payload.name) return false;

    const existing = storage.getChatRooms().find(r => r.id === payload.roomId);
    if (existing) {
      const participants = Array.from(new Set([...existing.participants, currentUser.id, payload.inviterId].filter(Boolean)));
      storage.updateChatRoom(existing.id, { participants });
    } else {
      const room: ChatRoom = {
        id: payload.roomId,
        name: payload.name,
        participants: Array.from(new Set([currentUser.id, payload.inviterId].filter(Boolean))),
        createdBy: payload.inviterId || currentUser.id,
        createdAt: payload.ts || Date.now(),
        isPublic: false,
      };
      storage.addChatRoom(room);
    }
    setChatRooms(storage.getChatRooms());
    return true;
  };

  const simulateDeviceDiscovery = async () => {
    if (!currentUser) return;
    
    const currentDevices = storage.getDevices();
    const deviceId = `device-${currentUser.id}`;
    
    if (!currentDevices.find(d => d.id === deviceId)) {
      const device: Device = {
        id: deviceId,
        name: `${currentUser.displayName}'s Device`,
        type: 'desktop',
        ipAddress: `192.168.1.${Math.floor(Math.random() * 200 + 10)}`,
        userId: currentUser.id,
        isOnline: true,
        lastSeen: Date.now(),
      };
      
      storage.addDevice(device);
      setDevices(prev => [...prev, device]);

      // Register device with server
      try {
        await fetch('/api/ws', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'register_device',
            payload: device
          })
        });
      } catch (error) {
        console.error('Device registration error:', error);
      }
    }
  };

  // Distribute room key to online users (admin only)
  const distributeRoomKeyIfAdmin = async () => {
    if (!currentUser || !currentUser.isAdmin || !roomKey) return;
    const jwk = await exportAesJwk(roomKey);
    for (const u of users) {
      if (u.id === currentUser.id) continue;
      if (distributedToRef.current.has(u.id)) continue;
      const theirPub = (u as any).publicKeyJwk as JWK | undefined;
      if (!theirPub) continue;
      try {
        const env = await packRoomKeyForRecipient(roomKey, theirPub);
        await fetch('/api/ws', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'key_update', payload: { targetUserId: u.id, fromUserId: currentUser.id, envelope: env } })
        });
        // mark as distributed (best-effort)
        distributedToRef.current.add(u.id);
      } catch (e) {
        console.error('Failed to send key to user', u.id, e);
      }
    }
  };

  // When users list or roomKey changes, try distribution
  useEffect(() => {
    distributeRoomKeyIfAdmin();
  }, [users, roomKey, currentUser?.id]);

  // If admin with no room key yet, create one
  useEffect(() => {
    (async () => {
      if (!currentUser) return;
      if (currentUser.isAdmin && !roomKey) {
        try {
          const k = await generateRoomKey();
          setRoomKey(k);
          const jwk = await exportAesJwk(k);
          saveRoomKeyJwk(jwk);
        } catch (e) {
          console.warn('Failed to generate room key (likely non-secure context). Use HTTPS or set a passphrase in localStorage (lanhub_room_passphrase).', e);
        }
      }
    })();
  }, [currentUser, roomKey]);

  // Fallback: derive room key from passphrase stored locally (offline-friendly)
  useEffect(() => {
    (async () => {
      if (roomKey) return;
      const pass = localStorage.getItem('lanhub_room_passphrase');
      if (pass) {
        try {
          const k = await (await import('@/lib/crypto')).deriveRoomKeyFromPassphrase(pass);
          setRoomKey(k);
          const jwk = await exportAesJwk(k);
          saveRoomKeyJwk(jwk);
        } catch (e) {
          console.warn('Failed to derive key from passphrase:', e);
        }
      }
    })();
  }, [roomKey]);

  // When a room key becomes available later, try to decrypt any encrypted messages in memory
  useEffect(() => {
    (async () => {
      if (!roomKey) return;
      const out: Message[] = [] as any;
      const seen = new Set<string>();
      for (const m of messages as Message[]) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        if (m.enc && m.nonce) {
          try {
            const plain = await aesDecryptString(roomKey, m.content, m.nonce);
            out.push({ ...m, content: plain });
          } catch {
            out.push(m);
          }
        } else {
          out.push(m);
        }
      }
      setMessages(out);
    })();
  }, [roomKey]);

  // Poll incoming file transfers for receiver side
  useEffect(() => {
    if (!currentUser) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      try {
        const res = await fetch('/api/ws', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'list_file_transfers', payload: { userId: currentUser.id } })
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.transfers)) {
          const dismissed = new Set(storage.getDismissedTransfers());
          for (const t of data.transfers as Array<{ id: string; totalChunks: number; fileName: string; fileSize: number; senderId: string; senderName: string; availableChunks: number[] }>) {
            if (dismissed.has(t.id)) continue;
            if (t.senderId === currentUser.id) {
              // Skip adding a local receiver record for our own transfers
              continue;
            }
            if (!receiversRef.current.has(t.id)) {
              receiversRef.current.set(t.id, { total: t.totalChunks, buffers: new Array(t.totalChunks).fill(null), downloaded: new Set(), meta: { id: t.id, fileName: t.fileName, fileSize: t.fileSize, senderId: t.senderId, senderName: t.senderName } });
              // create local record
              const transfer: FileTransfer = {
                id: t.id,
                fileName: t.fileName,
                fileSize: t.fileSize,
                senderId: t.senderId,
                senderName: t.senderName,
                receiverId: currentUser.id,
                progress: 0,
                status: 'transferring',
                timestamp: Date.now(),
                totalChunks: t.totalChunks,
              };
              storage.addFileTransfer(transfer);
              setFileTransfers(storage.getFileTransfers());
            }
            // Attempt to fetch up to 5 available chunks not yet downloaded
            const rec = receiversRef.current.get(t.id)!;
            const need = t.availableChunks.filter((idx: number) => !rec.downloaded.has(idx)).slice(0, 5);
            for (const index of need) {
              try {
                const chunkRes = await fetch('/api/ws', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'download_file_chunk', payload: { userId: currentUser.id, transferId: t.id, index } })
                });
                if (!chunkRes.ok) continue;
                const chunkData = await chunkRes.json();
                if (chunkData.success) {
                  let decrypted: Uint8Array;
                  if (chunkData.nonce) {
                    if (!roomKey) continue; // wait until we have a key to decrypt
                    decrypted = await aesDecryptBytes(roomKey, chunkData.data, chunkData.nonce);
                  } else {
                    // insecure testing fallback (plaintext base64)
                    decrypted = base64ToBytes(chunkData.data);
                  }
                  rec.buffers[index] = decrypted;
                  rec.downloaded.add(index);
                  // update progress
                  const prog = Math.floor((rec.downloaded.size / rec.total) * 100);
                  storage.updateFileTransfer(t.id, { progress: prog, status: prog >= 100 ? 'completed' : 'transferring' });
                  setFileTransfers(storage.getFileTransfers());
                  // If complete, assemble Blob and set downloadUrl
                  if (rec.downloaded.size === rec.total) {
                    const parts: BlobPart[] = [];
                    for (let i = 0; i < rec.total; i++) {
                      const b = rec.buffers[i];
                      if (!b) { break; }
                      parts.push(b as any);
                    }
                    const blob = new Blob(parts, { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    storage.updateFileTransfer(t.id, { downloadUrl: url, status: 'completed', progress: 100 });
                    setFileTransfers(storage.getFileTransfers());
                  }
                }
              } catch (e) {
                console.error('Download chunk error', e);
              }
            }
          }
        }
      } catch (e) {
        // ignore transient errors
      } finally {
        setTimeout(tick, 2000);
      }
    };
    tick();
    return () => { stop = true; };
  }, [currentUser, roomKey]);

  // Send files (chunked, encrypted) optionally scoped to a room
  const sendFiles = async (files: FileList | File[], roomId?: string): Promise<string[]> => {
    const ids: string[] = [];
    if (!currentUser) return ids;
    const allowInsecure = typeof window !== 'undefined' && localStorage.getItem('lanhub_allow_insecure') === 'true';
    if (!roomKey && !allowInsecure) {
      console.warn('E2E key unavailable. Falling back to plaintext file transfer for now. To enable encryption, serve over HTTPS or set a passphrase (lanhub_room_passphrase).');
      // continue with plaintext fallback
    }
    // Broadcast to all current and future users (access controlled by encryption)
    // Determine recipients based on room
    let recipients = undefined as string[] | undefined;
    if (roomId) {
      const room = storage.getChatRooms().find(r => r.id === roomId);
      if (room) {
        recipients = room.isPublic ? undefined : room.participants;
      }
    }
    for (const file of Array.from(files as any) as any[]) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      ids.push(id);
      const chunkSize = 64 * 1024; // 64 KiB to stay well under body limits
      const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
      // Record locally
      const tx: FileTransfer = {
        id,
        fileName: file.name,
        fileSize: file.size,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        recipients,
        progress: 0,
        status: 'pending',
        timestamp: Date.now(),
        totalChunks,
      };
      storage.addFileTransfer(tx);
      setFileTransfers(storage.getFileTransfers());
      // Init on server
      {
        const initRes = await fetch('/api/ws', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'init_file_transfer', payload: { id, senderId: currentUser.id, senderName: currentUser.displayName, fileName: file.name, fileSize: file.size, totalChunks, recipients } })
        });
        if (!initRes.ok) {
          storage.updateFileTransfer(id, { status: 'failed' });
          setFileTransfers(storage.getFileTransfers());
          continue;
        }
      }
      // Upload chunks sequentially (could be parallelized)
      let failed = false;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const slice = file.slice(start, end);
        const arrayBuf = new Uint8Array(await slice.arrayBuffer());
        let ctB64: string;
        let nonceB64: string;
        if (roomKey) {
          const enc = await aesEncryptBytes(roomKey, arrayBuf);
          ctB64 = enc.ctB64; nonceB64 = enc.nonceB64;
        } else {
          // insecure testing fallback
          ctB64 = bytesToBase64(arrayBuf);
          nonceB64 = '';
        }
        const upRes = await fetch('/api/ws', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'upload_chunk', payload: { transferId: id, index: i, totalChunks, data: ctB64, nonce: nonceB64 } })
        });
        if (!upRes.ok) {
          failed = true;
          storage.updateFileTransfer(id, { status: 'failed' });
          setFileTransfers(storage.getFileTransfers());
          break;
        }
        const prog = Math.floor(((i + 1) / totalChunks) * 100);
        storage.updateFileTransfer(id, { status: 'transferring', progress: prog });
        setFileTransfers(storage.getFileTransfers());
      }
      if (!failed) {
        storage.updateFileTransfer(id, { status: 'completed', progress: 100 });
        setFileTransfers(storage.getFileTransfers());
        // Post a chat message referencing the file
        const meta = { transferId: id, fileName: file.name, mime: file.type };
        try {
          sendMessage(JSON.stringify(meta), roomId);
        } catch {}
      }
    }
    return ids;
  };

  // Admin operations
  const kickMember = async (roomId: string, userId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update_room', payload: { roomId, byUserId: currentUser.id, removeParticipant: userId } })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.rooms)) {
        setChatRooms(data.rooms);
        localStorage.setItem('lanhub_chat_rooms', JSON.stringify(data.rooms));
        return true;
      }
    } catch (e) { console.warn('kickMember failed', e); }
    return false;
  };

  const setRoomAdmin = async (roomId: string, userId: string, make: boolean): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update_room', payload: { roomId, byUserId: currentUser.id, ...(make ? { addAdmin: userId } : { removeAdmin: userId }) } })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.rooms)) {
        setChatRooms(data.rooms);
        localStorage.setItem('lanhub_chat_rooms', JSON.stringify(data.rooms));
        return true;
      }
    } catch (e) { console.warn('setRoomAdmin failed', e); }
    return false;
  };

  const transferRoomOwner = async (roomId: string, newOwnerId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update_room', payload: { roomId, byUserId: currentUser.id, transferOwnerTo: newOwnerId } })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.rooms)) {
        setChatRooms(data.rooms);
        localStorage.setItem('lanhub_chat_rooms', JSON.stringify(data.rooms));
        return true;
      }
    } catch (e) { console.warn('transferRoomOwner failed', e); }
    return false;
  };

  const deleteChatRoom = async (roomId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delete_room', payload: { roomId, byUserId: currentUser.id } })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.rooms)) {
        setChatRooms(data.rooms);
        localStorage.setItem('lanhub_chat_rooms', JSON.stringify(data.rooms));
        return true;
      }
    } catch (e) { console.warn('deleteChatRoom failed', e); }
    return false;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        devices,
        messages,
        fileTransfers,
        activityLogs,
        chatRooms,
        login,
        register,
        logout,
        sendMessage,
        addFileTransfer,
        updateFileTransfer,
        removeFileTransfer,
        createChatRoom,
        generateInviteCode,
        joinRoomWithCode,
        simulateDeviceDiscovery,
        sendFiles,
        // admin ops
        kickMember,
        setRoomAdmin,
        transferRoomOwner,
        deleteChatRoom,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
