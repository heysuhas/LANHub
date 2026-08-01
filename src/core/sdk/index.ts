import { PluginManifest, CapabilityPermission } from '../types/plugin';
import { coreEventBus, EventBus } from '../event-bus';
import { coreTransport, TransportService } from '../transport';
import { coreIdentity, IdentityService } from '../identity';

export interface StorageService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export interface NotificationService {
  show(title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
}

export interface UISlotRegistry {
  registerSidebarContribution(contribution: any): void;
}

export interface PluginContext {
  manifest: PluginManifest;
  events: EventBus;
  transport: TransportService;
  storage: StorageService;
  notifications: NotificationService;
  identity: IdentityService;
}

class ScopedStorage implements StorageService {
  constructor(private prefix: string) {}

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(`${this.prefix}:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${this.prefix}:${key}`, JSON.stringify(value));
  }

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${this.prefix}:${key}`);
  }
}

class CoreNotifications implements NotificationService {
  show(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    coreEventBus.emit('notification:show', {
      id: String(Date.now()),
      title,
      message,
      type,
    });
  }
}

export function createPluginContext(manifest: PluginManifest): PluginContext {
  const permissions = new Set<CapabilityPermission>(manifest.permissions || []);

  const verifyPermission = (permission: CapabilityPermission) => {
    if (!permissions.has(permission)) {
      throw new Error(
        `[LANHub SDK Permission Error] Plugin '${manifest.id}' attempted to access '${permission}' capability without declaring it in permissions manifest.`
      );
    }
  };

  return {
    manifest,
    get events() {
      verifyPermission('events');
      return coreEventBus;
    },
    get transport() {
      verifyPermission('transport');
      return coreTransport;
    },
    get storage() {
      verifyPermission('storage');
      return new ScopedStorage(`plugin:${manifest.id}`);
    },
    get notifications() {
      verifyPermission('notifications');
      return new CoreNotifications();
    },
    get identity() {
      verifyPermission('identity');
      return coreIdentity;
    },
  };
}
