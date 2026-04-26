/**
 * @vienna/secure-storage — Encrypted key-value storage with namespace isolation.
 *
 * Entry points:
 *   @vienna/secure-storage          — shared types (safe for all processes)
 *   @vienna/secure-storage/main     — FileSecureStorage + createScopedStorage (Node.js / Electron main)
 *   @vienna/secure-storage/testing  — InMemorySecureStorage + InMemoryEncryptionProvider (tests)
 */

export { SecureStorageError } from "./errors";
export type { SecureStorageErrorCode } from "./errors";

// ---------------------------------------------------------------------------
// Encryption Provider (dependency injection seam)
// ---------------------------------------------------------------------------

/**
 * Abstraction over OS-level encryption.
 *
 * In production, wraps Electron's `safeStorage.encryptString` / `decryptString`.
 * In tests, use `InMemoryEncryptionProvider` from `@vienna/secure-storage/testing`.
 */
export interface EncryptionProvider {
  /** Whether encryption is currently available (e.g., OS keychain unlocked). */
  isAvailable(): boolean;

  /** Encrypt a UTF-8 string. Returns an opaque Buffer. */
  encrypt(plaintext: string): Buffer;

  /** Decrypt a Buffer previously returned by encrypt(). Returns UTF-8 string. */
  decrypt(encrypted: Buffer): string;
}

// ---------------------------------------------------------------------------
// Secure Storage
// ---------------------------------------------------------------------------

/**
 * Generic encrypted key-value store with namespace isolation.
 *
 * Values are JSON-serialized, encrypted via the EncryptionProvider, and
 * written to `<storageDir>/<namespace>/<key>.enc` files.
 */
export interface SecureStorage {
  /** Whether the underlying encryption provider is available. */
  readonly isEncryptionAvailable: boolean;

  /** Read a value. Returns null if the key does not exist. */
  get<T = unknown>(namespace: string, key: string): Promise<T | null>;

  /** Write a value. Creates the namespace directory if needed. */
  set(namespace: string, key: string, value: unknown): Promise<void>;

  /** Delete a key. No-op if the key does not exist. */
  delete(namespace: string, key: string): Promise<void>;

  /** Check whether a key exists. */
  has(namespace: string, key: string): Promise<boolean>;

  /** List all keys in a namespace. Returns key names (without .enc suffix). */
  keys(namespace: string): Promise<string[]>;

  /** Delete all keys in a namespace. No-op if the namespace does not exist. */
  deleteNamespace(namespace: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Scoped Storage (key-whitelisted view for integrations/entities)
// ---------------------------------------------------------------------------

/**
 * A key-whitelisted, namespace-scoped view of SecureStorage.
 *
 * Integrations receive a ScopedStorage and can only read/write
 * the keys declared in their configuration.
 *
 * Structurally identical to EntitySecureStorage in @tryvienna/sdk.
 */
export interface ScopedStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SecureStorageOptions {
  /** Root directory for encrypted files. Typically `<userData>/secure-storage`. */
  storageDir: string;

  /** Encryption provider (Electron safeStorage wrapper or in-memory mock). */
  encryption: EncryptionProvider;

  /**
   * Behavior when encryption is unavailable.
   * - `'throw'`: throw SecureStorageError (default — secure by default)
   * - `'plaintext'`: fall back to unencrypted storage (dev/CI only)
   */
  fallbackBehavior?: "throw" | "plaintext";
}

export interface ScopedStorageOptions {
  /** The scoping prefix, typically an integration ID (e.g., `'integration:linear'`). */
  scope: string;

  /** Keys this scope is allowed to access. Empty array = all access denied. */
  allowedKeys: string[];
}
