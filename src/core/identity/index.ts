import { User, Device } from '@/types';
import * as cryptoUtils from '@/lib/crypto';

export interface IdentityService {
  getCurrentUser(): User | null;
  getCurrentDevice(): Device | null;
  setCurrentUser(user: User): void;
  setCurrentDevice(device: Device): void;
  getUserKeyPair(): Promise<{ publicJwk: cryptoUtils.JWK; privateJwk: cryptoUtils.JWK }>;
  getOrCreateRoomKey(): Promise<CryptoKey>;
}

class CoreIdentity implements IdentityService {
  private currentUser: User | null = null;
  private currentDevice: Device | null = null;
  private roomKey: CryptoKey | null = null;

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getCurrentDevice(): Device | null {
    return this.currentDevice;
  }

  setCurrentUser(user: User): void {
    this.currentUser = user;
  }

  setCurrentDevice(device: Device): void {
    this.currentDevice = device;
  }

  async getUserKeyPair(): Promise<{ publicJwk: cryptoUtils.JWK; privateJwk: cryptoUtils.JWK }> {
    let keys = cryptoUtils.loadUserKeyPair();
    if (!keys && cryptoUtils.hasSubtle()) {
      keys = await cryptoUtils.generateECDH();
      cryptoUtils.saveUserKeyPair(keys.publicJwk, keys.privateJwk);
    }
    if (!keys) {
      throw new Error('WebCrypto unavailable to generate keys');
    }
    return keys;
  }

  async getOrCreateRoomKey(): Promise<CryptoKey> {
    if (this.roomKey) return this.roomKey;
    let jwk = cryptoUtils.loadRoomKeyJwk();
    if (jwk) {
      this.roomKey = await cryptoUtils.importAesJwk(jwk);
    } else {
      this.roomKey = await cryptoUtils.generateRoomKey();
      const exportedJwk = await cryptoUtils.exportAesJwk(this.roomKey);
      cryptoUtils.saveRoomKeyJwk(exportedJwk);
    }
    return this.roomKey;
  }
}

export const coreIdentity = new CoreIdentity();
