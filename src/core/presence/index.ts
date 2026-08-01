import { Device, User } from '@/types';
import { coreEventBus } from '../event-bus';
import { coreStore } from '../state';

export class CorePresenceService {
  private heartbeatInterval: any = null;

  startPresenceMonitoring(): void {
    // Listen for online events and update core state
    coreEventBus.on('peer:online', ({ device, user }) => {
      this.handlePeerOnline(device, user);
    });

    coreEventBus.on('peer:offline', ({ deviceId }) => {
      this.handlePeerOffline(deviceId);
    });

    coreEventBus.on('peer:heartbeat', ({ deviceId, timestamp }) => {
      this.handlePeerHeartbeat(deviceId, timestamp);
    });

    // Run local periodic heartbeat broadcast
    if (typeof window !== 'undefined') {
      this.heartbeatInterval = setInterval(() => {
        const state = coreStore.getState();
        if (state.currentDevice) {
          coreEventBus.emit('peer:heartbeat', {
            deviceId: state.currentDevice.id,
            timestamp: Date.now(),
          });
        }
      }, 10_000);
    }
  }

  stopPresenceMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handlePeerOnline(device: Device, user?: User): void {
    coreStore.setState((prev) => {
      const existingDeviceIdx = prev.devices.findIndex((d) => d.id === device.id);
      const newDevices = [...prev.devices];
      if (existingDeviceIdx >= 0) {
        newDevices[existingDeviceIdx] = { ...device, isOnline: true, lastSeen: Date.now() };
      } else {
        newDevices.push({ ...device, isOnline: true, lastSeen: Date.now() });
      }

      let newUsers = [...prev.users];
      if (user) {
        const existingUserIdx = prev.users.findIndex((u) => u.id === user.id);
        if (existingUserIdx >= 0) {
          newUsers[existingUserIdx] = { ...user, status: 'online', lastSeen: Date.now() };
        } else {
          newUsers.push({ ...user, status: 'online', lastSeen: Date.now() });
        }
      }

      return { devices: newDevices, users: newUsers };
    });
  }

  private handlePeerOffline(deviceId: string): void {
    coreStore.setState((prev) => {
      const newDevices = prev.devices.map((d) =>
        d.id === deviceId ? { ...d, isOnline: false, lastSeen: Date.now() } : d
      );
      return { devices: newDevices };
    });
  }

  private handlePeerHeartbeat(deviceId: string, timestamp: number): void {
    coreStore.setState((prev) => {
      const newDevices = prev.devices.map((d) =>
        d.id === deviceId ? { ...d, isOnline: true, lastSeen: timestamp } : d
      );
      return { devices: newDevices };
    });
  }
}

export const corePresence = new CorePresenceService();
