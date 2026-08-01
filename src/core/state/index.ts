import { useSyncExternalStore } from 'react';
import { User, Device, Message, FileTransfer, ChatRoom } from '@/types';
import { PluginManifest } from '../types/plugin';

export interface CoreState {
  currentUser: User | null;
  currentDevice: Device | null;
  devices: Device[];
  users: User[];
  rooms: ChatRoom[];
  messages: Message[];
  transfers: FileTransfer[];
  activePluginId: string;
  registeredPlugins: PluginManifest[];
}

const initialState: CoreState = {
  currentUser: null,
  currentDevice: null,
  devices: [],
  users: [],
  rooms: [
    {
      id: 'general',
      name: 'General Chat',
      participants: [],
      createdBy: 'system',
      createdAt: Date.now(),
      isPublic: true,
    },
  ],
  messages: [],
  transfers: [],
  activePluginId: 'presence',
  registeredPlugins: [],
};

class StateStore {
  private state: CoreState = { ...initialState };
  private listeners = new Set<() => void>();

  getState(): CoreState {
    return this.state;
  }

  setState(partial: Partial<CoreState> | ((prev: CoreState) => Partial<CoreState>)): void {
    const nextPartial = typeof partial === 'function' ? partial(this.state) : partial;
    this.state = { ...this.state, ...nextPartial };
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const coreStore = new StateStore();

export function useCoreState<T = CoreState>(selector?: (state: CoreState) => T): T {
  const state = useSyncExternalStore(
    (listener) => coreStore.subscribe(listener),
    () => coreStore.getState(),
    () => coreStore.getState()
  );
  return selector ? selector(state) : (state as unknown as T);
}
