import { Message, FileTransfer } from '@/types';
import { coreEventBus } from '../event-bus';

export interface TransportService {
  connect(url?: string): Promise<void>;
  disconnect(): void;
  sendMessage(message: Partial<Message>): void;
  sendFileSignal(transfer: Partial<FileTransfer>): void;
  sendScreenSignal(targetId: string, signal: any): void;
  isConnected(): boolean;
}

export class CoreTransport implements TransportService {
  private socket: WebSocket | null = null;
  private connected: boolean = false;
  private reconnectInterval: any = null;

  async connect(url?: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = url || `${protocol}//${window.location.host}/api/ws`;

    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          this.connected = true;
          console.log('[LANHub Transport] WebSocket connected to', wsUrl);
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIncomingMessage(data);
          } catch (err) {
            console.error('[LANHub Transport] Error parsing message:', err);
          }
        };

        this.socket.onclose = () => {
          this.connected = false;
          console.warn('[LANHub Transport] Connection closed');
        };

        this.socket.onerror = (err) => {
          console.error('[LANHub Transport] Socket error:', err);
          resolve(); // don't crash caller on fail
        };
      } catch (err) {
        console.error('[LANHub Transport] Socket init error:', err);
        resolve();
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
  }

  sendMessage(message: Partial<Message>): void {
    if (this.socket && this.connected) {
      this.socket.send(JSON.stringify({ type: 'chat', data: message }));
    }
    // Also emit locally for immediate UI update / offline mode
    if (message.content) {
      coreEventBus.emit('message:received', {
        message: message as Message,
      });
    }
  }

  sendFileSignal(transfer: Partial<FileTransfer>): void {
    if (this.socket && this.connected) {
      this.socket.send(JSON.stringify({ type: 'file', data: transfer }));
    }
  }

  sendScreenSignal(targetId: string, signal: any): void {
    if (this.socket && this.connected) {
      this.socket.send(JSON.stringify({ type: 'screenshare', targetId, signal }));
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleIncomingMessage(data: any): void {
    switch (data.type) {
      case 'chat':
        if (data.data) {
          coreEventBus.emit('message:received', { message: data.data });
        }
        break;
      case 'presence':
        if (data.device) {
          coreEventBus.emit('peer:online', { device: data.device, user: data.user });
        }
        break;
      case 'file':
        if (data.data) {
          coreEventBus.emit('file:transfer:progress', {
            transferId: data.data.id,
            progress: data.data.progress || 0,
            status: data.data.status,
          });
        }
        break;
      case 'screenshare':
        coreEventBus.emit('screenshare:signal', {
          senderId: data.senderId,
          targetId: data.targetId,
          signal: data.signal,
        });
        break;
    }
  }
}

export const coreTransport = new CoreTransport();
