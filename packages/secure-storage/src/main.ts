/**
 * Main Process Secure Storage
 *
 * Implements SecureStorage and ScopedStorage using the filesystem.
 * All values are JSON-serialized, encrypted, and stored as .enc files
 * within namespace directories.
 *
 * This module uses node:fs and node:path. It is intended for the
 * Electron main process. Never import this from renderer or preload.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  EncryptionProvider,
  SecureStorage,
  SecureStorageOptions,
  ScopedStorage,
  ScopedStorageOptions,
} from "./index";
import { SecureStorageError } from "./errors";

export type {
  EncryptionProvider,
  SecureStorage,
  SecureStorageOptions,
  ScopedStorage,
  ScopedStorageOptions,
};
export { SecureStorageError } from "./errors";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Only allow safe filesystem characters. Colons are needed for scoped keys. */
const SAFE_NAME_RE = /^[a-zA-Z0-9_\-:.]+$/;

function validateSegment(value: string, label: "Namespace" | "Key"): void {
  if (!value || value.trim().length === 0) {
    throw new SecureStorageError(
      `${label} must not be empty`,
      label === "Namespace" ? "INVALID_NAMESPACE" : "INVALID_KEY",
    );
  }
  if (value.includes("..") || value.includes("/") || value.includes("\\")) {
    throw new SecureStorageError(
      `${label} contains path traversal characters`,
      "TRAVERSAL_DETECTED",
    );
  }
  if (!SAFE_NAME_RE.test(value)) {
    throw new SecureStorageError(
      `${label} contains invalid characters (allowed: a-z A-Z 0-9 _ - : .)`,
      label === "Namespace" ? "INVALID_NAMESPACE" : "INVALID_KEY",
    );
  }
}

// ---------------------------------------------------------------------------
// FileSecureStorage
// ---------------------------------------------------------------------------

class FileSecureStorage implements SecureStorage {
  private readonly storageDir: string;
  private readonly encryption: EncryptionProvider;
  private readonly fallback: "throw" | "plaintext";

  constructor(options: SecureStorageOptions) {
    this.storageDir = options.storageDir;
    this.encryption = options.encryption;
    this.fallback = options.fallbackBehavior ?? "throw";
  }

  get isEncryptionAvailable(): boolean {
    return this.encryption.isAvailable();
  }

  // --- Read ---

  async get<T = unknown>(namespace: string, key: string): Promise<T | null> {
    validateSegment(namespace, "Namespace");
    validateSegment(key, "Key");

    const filePath = this.filePath(namespace, key);
    if (!fs.existsSync(filePath)) return null;

    try {
      const content = fs.readFileSync(filePath);
      const json = this.decryptBuffer(content);
      return JSON.parse(json) as T;
    } catch (error) {
      if (error instanceof SecureStorageError) throw error;
      throw new SecureStorageError(
        `Failed to read ${namespace}/${key}: ${error instanceof Error ? error.message : String(error)}`,
        "READ_FAILED",
      );
    }
  }

  async has(namespace: string, key: string): Promise<boolean> {
    validateSegment(namespace, "Namespace");
    validateSegment(key, "Key");
    return fs.existsSync(this.filePath(namespace, key));
  }

  async keys(namespace: string): Promise<string[]> {
    validateSegment(namespace, "Namespace");
    const dir = path.join(this.storageDir, namespace);
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".enc"))
      .map((f) => f.slice(0, -4));
  }

  // --- Write ---

  async set(namespace: string, key: string, value: unknown): Promise<void> {
    validateSegment(namespace, "Namespace");
    validateSegment(key, "Key");

    const dir = path.join(this.storageDir, namespace);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      const json = JSON.stringify(value);
      const content = this.encryptString(json);
      fs.writeFileSync(this.filePath(namespace, key), content);
    } catch (error) {
      if (error instanceof SecureStorageError) throw error;
      throw new SecureStorageError(
        `Failed to write ${namespace}/${key}: ${error instanceof Error ? error.message : String(error)}`,
        "WRITE_FAILED",
      );
    }
  }

  async delete(namespace: string, key: string): Promise<void> {
    validateSegment(namespace, "Namespace");
    validateSegment(key, "Key");

    const filePath = this.filePath(namespace, key);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        throw new SecureStorageError(
          `Failed to delete ${namespace}/${key}: ${error instanceof Error ? error.message : String(error)}`,
          "DELETE_FAILED",
        );
      }
    }
  }

  async deleteNamespace(namespace: string): Promise<void> {
    validateSegment(namespace, "Namespace");
    const dir = path.join(this.storageDir, namespace);
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        throw new SecureStorageError(
          `Failed to delete namespace ${namespace}: ${error instanceof Error ? error.message : String(error)}`,
          "DELETE_FAILED",
        );
      }
    }
  }

  // --- Internal ---

  private filePath(namespace: string, key: string): string {
    return path.join(this.storageDir, namespace, `${key}.enc`);
  }

  private encryptString(plaintext: string): Buffer {
    if (this.encryption.isAvailable()) {
      return this.encryption.encrypt(plaintext);
    }
    if (this.fallback === "plaintext") {
      return Buffer.from(plaintext, "utf-8");
    }
    throw new SecureStorageError(
      "Encryption unavailable and plaintext fallback is disabled",
      "ENCRYPTION_UNAVAILABLE",
    );
  }

  private decryptBuffer(content: Buffer): string {
    if (this.encryption.isAvailable()) {
      return this.encryption.decrypt(content);
    }
    if (this.fallback === "plaintext") {
      return content.toString("utf-8");
    }
    throw new SecureStorageError(
      "Encryption unavailable and plaintext fallback is disabled",
      "ENCRYPTION_UNAVAILABLE",
    );
  }
}

// ---------------------------------------------------------------------------
// createSecureStorage
// ---------------------------------------------------------------------------

/**
 * Create a SecureStorage instance backed by the filesystem.
 *
 * @example
 * ```ts
 * import { createSecureStorage } from '@vienna/secure-storage/main';
 * import type { EncryptionProvider } from '@vienna/secure-storage';
 * import { safeStorage } from 'electron';
 *
 * const encryption: EncryptionProvider = {
 *   isAvailable: () => safeStorage.isEncryptionAvailable(),
 *   encrypt: (s) => safeStorage.encryptString(s),
 *   decrypt: (b) => safeStorage.decryptString(b),
 * };
 *
 * const storage = createSecureStorage({
 *   storageDir: path.join(app.getPath('userData'), 'secure-storage'),
 *   encryption,
 * });
 *
 * await storage.set('user-123', 'auth_token', { accessToken: '...' });
 * const token = await storage.get('user-123', 'auth_token');
 * ```
 */
export function createSecureStorage(
  options: SecureStorageOptions,
): SecureStorage {
  return new FileSecureStorage(options);
}

// ---------------------------------------------------------------------------
// createScopedStorage
// ---------------------------------------------------------------------------

const SCOPED_NAMESPACE = "_entity_storage";

/**
 * Create a key-whitelisted, scoped view over a SecureStorage instance.
 *
 * The scope translates to a key prefix: all keys are stored as
 * `entity:<scope>:<key>` within the fixed `_entity_storage` namespace.
 *
 * @example
 * ```ts
 * import { createScopedStorage } from '@vienna/secure-storage/main';
 *
 * const scoped = createScopedStorage(storage, {
 *   scope: 'integration:linear',
 *   allowedKeys: ['api_token', 'oauth_linear_tokens'],
 * });
 *
 * await scoped.set('api_token', 'sk-...');  // OK
 * await scoped.set('password', '...');       // throws KEY_NOT_ALLOWED
 * ```
 */
export function createScopedStorage(
  storage: SecureStorage,
  options: ScopedStorageOptions,
): ScopedStorage {
  const { scope, allowedKeys } = options;

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

  return {
    async get(key: string): Promise<string | null> {
      validateKey(key);
      const data = await storage.get<{ value: string }>(
        SCOPED_NAMESPACE,
        scopedKey(key),
      );
      return data?.value ?? null;
    },

    async set(key: string, value: string): Promise<void> {
      validateKey(key);
      await storage.set(SCOPED_NAMESPACE, scopedKey(key), { value });
    },

    async delete(key: string): Promise<void> {
      validateKey(key);
      await storage.delete(SCOPED_NAMESPACE, scopedKey(key));
    },

    async has(key: string): Promise<boolean> {
      validateKey(key);
      return storage.has(SCOPED_NAMESPACE, scopedKey(key));
    },
  };
}
