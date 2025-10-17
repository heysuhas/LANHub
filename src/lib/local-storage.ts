import { User, Device, Message, FileTransfer, ActivityLog, ChatRoom } from '@/types';

const STORAGE_KEYS = {
  CURRENT_USER: 'lanhub_current_user',
  USERS: 'lanhub_users',
  DEVICES: 'lanhub_devices',
  MESSAGES: 'lanhub_messages',
  FILE_TRANSFERS: 'lanhub_file_transfers',
  ACTIVITY_LOGS: 'lanhub_activity_logs',
  CHAT_ROOMS: 'lanhub_chat_rooms',
};

export const storage = {
  // User operations
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getCurrentUser: (): User | null => {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
  },

  // Users collection
  getUsers: (): User[] => {
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    return users ? JSON.parse(users) : [];
  },

  addUser: (user: User) => {
    const users = storage.getUsers();
    users.push(user);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  updateUser: (userId: string, updates: Partial<User>) => {
    const users = storage.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      
      // Update current user if it's the same
      const currentUser = storage.getCurrentUser();
      if (currentUser?.id === userId) {
        storage.setCurrentUser({ ...currentUser, ...updates });
      }
    }
  },

  // Devices
  getDevices: (): Device[] => {
    const devices = localStorage.getItem(STORAGE_KEYS.DEVICES);
    return devices ? JSON.parse(devices) : [];
  },

  addDevice: (device: Device) => {
    const devices = storage.getDevices();
    devices.push(device);
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
  },

  updateDevice: (deviceId: string, updates: Partial<Device>) => {
    const devices = storage.getDevices();
    const index = devices.findIndex(d => d.id === deviceId);
    if (index !== -1) {
      devices[index] = { ...devices[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    }
  },

  // Messages
  getMessages: (): Message[] => {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return messages ? JSON.parse(messages) : [];
  },

  addMessage: (message: Message) => {
    const messages = storage.getMessages();
    if (!messages.find(m => m.id === message.id)) {
      messages.push(message);
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }
  },

  // File transfers
  getFileTransfers: (): FileTransfer[] => {
    const transfers = localStorage.getItem(STORAGE_KEYS.FILE_TRANSFERS);
    return transfers ? JSON.parse(transfers) : [];
  },

  addFileTransfer: (transfer: FileTransfer) => {
    const transfers = storage.getFileTransfers();
    const idx = transfers.findIndex(t => t.id === transfer.id);
    if (idx === -1) {
      transfers.push(transfer);
    } else {
      transfers[idx] = { ...transfers[idx], ...transfer };
    }
    localStorage.setItem(STORAGE_KEYS.FILE_TRANSFERS, JSON.stringify(transfers));
  },

  updateFileTransfer: (transferId: string, updates: Partial<FileTransfer>) => {
    const transfers = storage.getFileTransfers();
    const index = transfers.findIndex(t => t.id === transferId);
    if (index !== -1) {
      transfers[index] = { ...transfers[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.FILE_TRANSFERS, JSON.stringify(transfers));
    }
  },

  removeFileTransfer: (transferId: string) => {
    const transfers = storage.getFileTransfers().filter(t => t.id !== transferId);
    localStorage.setItem(STORAGE_KEYS.FILE_TRANSFERS, JSON.stringify(transfers));
  },

  // Dismissed transfers (receiver-side) to keep lists clean
  getDismissedTransfers: (): string[] => {
    const s = localStorage.getItem('lanhub_dismissed_transfers');
    return s ? JSON.parse(s) : [];
  },
  addDismissedTransfer: (id: string) => {
    const list = storage.getDismissedTransfers();
    if (!list.includes(id)) list.push(id);
    localStorage.setItem('lanhub_dismissed_transfers', JSON.stringify(list));
  },
  removeDismissedTransfer: (id: string) => {
    const list = storage.getDismissedTransfers().filter(x => x !== id);
    localStorage.setItem('lanhub_dismissed_transfers', JSON.stringify(list));
  },

  // Activity logs
  getActivityLogs: (): ActivityLog[] => {
    const logs = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
    return logs ? JSON.parse(logs) : [];
  },

  addActivityLog: (log: ActivityLog) => {
    const logs = storage.getActivityLogs();
    logs.push(log);
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.shift();
    }
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
  },

  // Chat rooms
  getChatRooms: (): ChatRoom[] => {
    const rooms = localStorage.getItem(STORAGE_KEYS.CHAT_ROOMS);
    return rooms ? JSON.parse(rooms) : [];
  },

  addChatRoom: (room: ChatRoom) => {
    const rooms = storage.getChatRooms();
    rooms.push(room);
    localStorage.setItem(STORAGE_KEYS.CHAT_ROOMS, JSON.stringify(rooms));
  },

  updateChatRoom: (roomId: string, updates: Partial<ChatRoom>) => {
    const rooms = storage.getChatRooms();
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx !== -1) {
      rooms[idx] = { ...rooms[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.CHAT_ROOMS, JSON.stringify(rooms));
    }
  },
};