import { User, Device, Message, FileTransfer, ChatRoom } from '@/types';

export interface CoreEvents {
  // Peer & Presence Events
  'peer:online': { device: Device; user?: User };
  'peer:offline': { deviceId: string };
  'peer:heartbeat': { deviceId: string; timestamp: number };

  // Messaging & Room Events
  'message:received': { message: Message };
  'message:sent': { message: Message };
  'room:created': { room: ChatRoom };
  'room:joined': { roomId: string; userId: string };
  'room:left': { roomId: string; userId: string };

  // File Transfer Events
  'file:transfer:start': { transfer: FileTransfer };
  'file:transfer:progress': { transferId: string; progress: number; status: FileTransfer['status'] };
  'file:transfer:complete': { transferId: string; downloadUrl?: string };
  'file:transfer:failed': { transferId: string; error: string };

  // Screen Share & Media Signaling Events
  'screenshare:start': { streamId: string; hostId: string };
  'screenshare:signal': { senderId: string; targetId: string; signal: any };
  'screenshare:stop': { streamId: string; hostId: string };

  // Notification & System Events
  'notification:show': { id: string; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' };
  'plugin:state:changed': { pluginId: string; active: boolean };
}
