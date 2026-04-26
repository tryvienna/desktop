/**
 * Test Utilities for Secure Storage
 *
 * In-memory implementations for unit testing without filesystem or Electron.
 *
 * This module is intended for test use only. Never import in production code.
 */

import type {
  EncryptionProvider,
  SecureStorage,
  ScopedStorage,
  ScopedStorageOptions,
} from "./index";
import { SecureStorageError } from "./errors";

export type {
  EncryptionProvider,
  SecureStorage,
  ScopedStorage,
  ScopedStorageOptions,
};
export { SecureStorageError } from "./errors";

// ---------------------------------------------------------------------------
// InMemoryEncryptionProvider
// ---------------------------------------------------------------------------

/**
 * An EncryptionProvider that performs identity transforms (no real encryption).
 * Can be configured to simulate encryption being unavailable.
 *
 * NOT cryptographically secure — test use only.
 */
export class InMemoryEncryptionProvider implements EncryptionProvider {
  private available: boolean;

  constructor(options?: { available?: boolean }) {
    this.available = options?.available ?? true;
  }

  isAvailable(): boolean {
    return this.available;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  encrypt(plaintext: string): Buffer {
    return Buffer.from(plaintext, "utf-8");
  }

  decrypt(encrypted: Buffer): string {
    return encrypted.toString("utf-8");
  }
}

// ---------------------------------------------------------------------------
// InMemorySecureStorage
// ---------------------------------------------------------------------------

/**
 * A fully in-memory SecureStorage implementation for unit tests.
 * No filesystem access, no encryption. Just a nested Map.
 */
export class InMemorySecureStorage implements SecureStorage {
  private data = new Map<string, Map<string, unknown>>();

  readonly isEncryptionAvailable = true;

  async get<T = unknown>(namespace: string, key: string): Promise<T | null> {
    const ns = this.data.get(namespace);
    if (!ns) return null;
    const value = ns.get(key);
    if (value === undefined) return null;
    // Round-trip through JSON to match real filesystem behavior
    return JSON.parse(JSON.stringify(value)) as T;
  }

  async has(namespace: string, key: string): Promise<boolean> {
    return this.data.get(namespace)?.has(key) ?? false;
  }

  async keys(namespace: string): Promise<string[]> {
    const ns = this.data.get(namespace);
    if (!ns) return [];
    return Array.from(ns.keys());
  }

  async set(namespace: string, key: string, value: unknown): Promise<void> {
    let ns = this.data.get(namespace);
    if (!ns) {
      ns = new Map();
      this.data.set(namespace, ns);
    }
    // Store a deep clone via JSON round-trip
    ns.set(key, JSON.parse(JSON.stringify(value)));
  }

  async delete(namespace: string, key: string): Promise<void> {
    this.data.get(namespace)?.delete(key);
  }

  async deleteNamespace(namespace: string): Promise<void> {
    this.data.delete(namespace);
  }

  /** Reset all data. Useful in afterEach(). */
  clear(): void {
    this.data.clear();
  }
}

// ---------------------------------------------------------------------------
// createTestScopedStorage
// ---------------------------------------------------------------------------

/**
 * Create a ScopedStorage backed by InMemorySecureStorage.
 * Convenient one-liner for tests.
 *
 * @returns The scoped storage and the underlying in-memory storage for assertions.
 */
export function createTestScopedStorage(
  options: ScopedStorageOptions,
  storage?: InMemorySecureStorage,
): { scoped: ScopedStorage; storage: InMemorySecureStorage } {
  const mem = storage ?? new InMemorySecureStorage();
  const { scope, allowedKeys } = options;
  const namespace = "_entity_storage";

  function scopedKey(key: string): string {
    return `entity:${scope}:${key}`;
  }

  function validateKey(key: string): void {
    if (!allowedKeys.includes(key)) {
      throw new SecureStorageError(
        `Key '${key}' not declared in allowedKeys for scope '${scope}'`,
        "KEY_NOT_ALLOWED",
      );
    }
  }

  const scoped: ScopedStorage = {
    async get(key: string): Promise<string | null> {
      validateKey(key);
      const data = await mem.get<{ value: string }>(namespace, scopedKey(key));
      return data?.value ?? null;
    },

    async set(key: string, value: string): Promise<void> {
      validateKey(key);
      await mem.set(namespace, scopedKey(key), { value });
    },

    async delete(key: string): Promise<void> {
      validateKey(key);
      await mem.delete(namespace, scopedKey(key));
    },

    async has(key: string): Promise<boolean> {
      validateKey(key);
      return mem.has(namespace, scopedKey(key));
    },
  };

  return { scoped, storage: mem };
}
