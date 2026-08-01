import { CoreEvents } from '../types/events';

type EventHandler<T = any> = (payload: T) => void;

export class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on<K extends keyof CoreEvents>(event: K, handler: (payload: CoreEvents[K]) => void): () => void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    const handlers = this.listeners.get(event as string)!;
    handlers.add(handler as EventHandler);

    return () => {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.listeners.delete(event as string);
      }
    };
  }

  emit<K extends keyof CoreEvents>(event: K, payload: CoreEvents[K]): void {
    const handlers = this.listeners.get(event as string);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`Error in event handler for ${String(event)}:`, err);
        }
      });
    }
  }

  removeAllListeners(event?: keyof CoreEvents): void {
    if (event) {
      this.listeners.delete(event as string);
    } else {
      this.listeners.clear();
    }
  }
}

export const coreEventBus = new EventBus();
