/*
  Lightweight crypto utilities for E2E in the browser using WebCrypto.
  - Room key: AES-GCM 256
  - User keys: ECDH P-256 for key exchange
  - Key derivation: HKDF(SHA-256)
*/

export type JWK = JsonWebKey;

export const hasSubtle = (): boolean => typeof window !== 'undefined' && !!(window.crypto && window.crypto.subtle) && !!(window.isSecureContext);

// Derive an AES-GCM room key from a shared passphrase (offline-friendly)
export async function deriveRoomKeyFromPassphrase(passphrase: string, salt: string = 'lanhub-passphrase-salt-v1'): Promise<CryptoKey> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  const baseKey = await crypto.subtle.importKey(
    'raw',
    utf8Encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: utf8Encode(salt), iterations: 200_000 },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Base64 helpers for binary data
export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const utf8Encode = (s: string) => new TextEncoder().encode(s);
export const utf8Decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

export const randomBytes = (length: number) => {
  const a = new Uint8Array(length);
  crypto.getRandomValues(a);
  return a;
};

// AES-GCM 256 key helpers
export async function generateRoomKey(): Promise<CryptoKey> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable. Serve app over HTTPS (secure context).');
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportAesRaw(key: CryptoKey): Promise<Uint8Array> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

export async function exportAesJwk(key: CryptoKey): Promise<JWK> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  return crypto.subtle.exportKey("jwk", key);
}

export async function importAesJwk(jwk: JWK): Promise<CryptoKey> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  return crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

export async function importAesRaw(raw: Uint8Array): Promise<CryptoKey> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

export async function aesEncryptBytes(key: CryptoKey, data: Uint8Array): Promise<{ nonceB64: string; ctB64: string }>{
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  const nonce = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, data);
  return { nonceB64: bytesToBase64(nonce), ctB64: bytesToBase64(new Uint8Array(ct)) };
}

export async function aesDecryptBytes(key: CryptoKey, ctB64: string, nonceB64: string): Promise<Uint8Array> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  const nonce = base64ToBytes(nonceB64);
  const ct = base64ToBytes(ctB64);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ct);
  return new Uint8Array(pt);
}

export async function aesEncryptString(key: CryptoKey, text: string): Promise<{ nonceB64: string; ctB64: string }>{
  return aesEncryptBytes(key, utf8Encode(text));
}

export async function aesDecryptString(key: CryptoKey, ctB64: string, nonceB64: string): Promise<string> {
  const bytes = await aesDecryptBytes(key, ctB64, nonceB64);
  return utf8Decode(bytes);
}

// ECDH P-256 for key exchange
export async function generateECDH(): Promise<{ publicJwk: JWK; privateJwk: JWK }>{
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  const kp = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  return { publicJwk, privateJwk };
}

async function importECDHPublic(jwk: JWK): Promise<CryptoKey> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
}

async function importECDHPrivate(jwk: JWK): Promise<CryptoKey> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"]
  );
}

async function deriveSharedBits(privateJwk: JWK, otherPublicJwk: JWK): Promise<Uint8Array> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  const priv = await importECDHPrivate(privateJwk);
  const pub = await importECDHPublic(otherPublicJwk);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: pub }, priv, 256);
  return new Uint8Array(bits);
}

async function deriveAesFromShared(shared: Uint8Array, salt: Uint8Array, infoLabel = "lanhub-roomkey-v1"): Promise<CryptoKey> {
  if (!hasSubtle()) throw new Error('WebCrypto SubtleCrypto unavailable');
  const baseKey = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: utf8Encode(infoLabel) },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a room key for a recipient using ephemeral ECDH + HKDF + AES-GCM
export async function packRoomKeyForRecipient(roomKey: CryptoKey, recipientPublicJwk: JWK): Promise<{ epk: JWK; saltB64: string; nonceB64: string; ctB64: string }>{
  const ephem = await generateECDH();
  const shared = await deriveSharedBits(ephem.privateJwk, recipientPublicJwk);
  const salt = randomBytes(16);
  const aes = await deriveAesFromShared(shared, salt);
  const rawRoomKey = await exportAesRaw(roomKey);
  const { nonceB64, ctB64 } = await aesEncryptBytes(aes, rawRoomKey);
  return { epk: ephem.publicJwk, saltB64: bytesToBase64(salt), nonceB64, ctB64 };
}

// Decrypt a packed room key from a sender
export async function unpackRoomKeyFromSender(privateJwk: JWK, epk: JWK, saltB64: string, nonceB64: string, ctB64: string): Promise<CryptoKey> {
  const shared = await deriveSharedBits(privateJwk, epk);
  const salt = base64ToBytes(saltB64);
  const aes = await deriveAesFromShared(shared, salt);
  const raw = await aesDecryptBytes(aes, ctB64, nonceB64);
  return importAesRaw(raw);
}

// Persistent storage helpers (localStorage)
const ROOM_KEY_STORAGE = "lanhub_room_key_jwk";
const USER_KEYS_STORAGE = "lanhub_user_ecdh_keys";

export function saveRoomKeyJwk(jwk: JWK) {
  localStorage.setItem(ROOM_KEY_STORAGE, JSON.stringify(jwk));
}
export function loadRoomKeyJwk(): JWK | null {
  const s = localStorage.getItem(ROOM_KEY_STORAGE);
  return s ? (JSON.parse(s) as JWK) : null;
}

export function saveUserKeyPair(publicJwk: JWK, privateJwk: JWK) {
  localStorage.setItem(USER_KEYS_STORAGE, JSON.stringify({ publicJwk, privateJwk }));
}
export function loadUserKeyPair(): { publicJwk: JWK; privateJwk: JWK } | null {
  const s = localStorage.getItem(USER_KEYS_STORAGE);
  return s ? (JSON.parse(s) as { publicJwk: JWK; privateJwk: JWK }) : null;
}
