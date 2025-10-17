export interface User {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
}

export interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'other';
  ipAddress: string;
  userId?: string;
  isOnline: boolean;
  lastSeen: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string; // plaintext or base64 ciphertext when enc=true
  timestamp: number;
  roomId?: string;
  type: 'text' | 'file' | 'system';
  // Server-assigned, monotonic sequence used for reliable delivery
  seq?: number;
  // Encryption metadata (optional)
  enc?: boolean; // true if content is encrypted
  nonce?: string; // base64 AES-GCM nonce
  alg?: 'aes-256-gcm';
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  senderId: string;
  senderName: string;
  receiverId?: string;
  recipients?: string[]; // recipients for this transfer (empty/undefined = broadcast)
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  timestamp: number;
  downloadUrl?: string; // created on receiver when file is assembled
  totalChunks?: number; // known on sender/receiver
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: string[];
  createdBy: string; // owner
  createdAt: number;
  isPublic: boolean;
  admins?: string[]; // optional list of admins (owner is implicitly admin)
}

export interface ActivityLog {
  id: string;
  type: 'login' | 'logout' | 'file_sent' | 'file_received' | 'message' | 'device_connected';
  userId: string;
  userName: string;
  description: string;
  timestamp: number;
}