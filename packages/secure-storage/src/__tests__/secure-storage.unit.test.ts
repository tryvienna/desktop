import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSecureStorage } from "../main";
import { InMemoryEncryptionProvider } from "../testing";
import type { SecureStorageErrorCode } from "../errors";
import { SecureStorageError } from "../errors";

function expectCode(code: SecureStorageErrorCode) {
  return expect.objectContaining({ code });
}

describe("FileSecureStorage", () => {
  let storageDir: string;
  let encryption: InMemoryEncryptionProvider;

  beforeEach(() => {
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "vienna-ss-"));
    encryption = new InMemoryEncryptionProvider();
  });

  afterEach(() => {
    fs.rmSync(storageDir, { recursive: true, force: true });
  });

  function create(fallback: "throw" | "plaintext" = "plaintext") {
    return createSecureStorage({
      storageDir,
      encryption,
      fallbackBehavior: fallback,
    });
  }

  // -------------------------------------------------------------------------
  // Basic CRUD
  // -------------------------------------------------------------------------

  describe("basic CRUD", () => {
    it("should set and get a value", async () => {
      const storage = create();
      await storage.set("ns", "key1", { hello: "world" });
      const result = await storage.get("ns", "key1");
      expect(result).toEqual({ hello: "world" });
    });

    it("should return null for non-existent key", async () => {
      const storage = create();
      const result = await storage.get("ns", "missing");
      expect(result).toBeNull();
    });

    it("should overwrite existing value", async () => {
      const storage = create();
      await storage.set("ns", "key1", { v: 1 });
      await storage.set("ns", "key1", { v: 2 });
      const result = await storage.get("ns", "key1");
      expect(result).toEqual({ v: 2 });
    });

    it("should delete a key", async () => {
      const storage = create();
      await storage.set("ns", "key1", "value");
      await storage.delete("ns", "key1");
      const result = await storage.get("ns", "key1");
      expect(result).toBeNull();
    });

    it("should not throw when deleting non-existent key", async () => {
      const storage = create();
      await expect(storage.delete("ns", "missing")).resolves.toBeUndefined();
    });

    it("should report has correctly", async () => {
      const storage = create();
      expect(await storage.has("ns", "key1")).toBe(false);
      await storage.set("ns", "key1", "value");
      expect(await storage.has("ns", "key1")).toBe(true);
      await storage.delete("ns", "key1");
      expect(await storage.has("ns", "key1")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Keys listing
  // -------------------------------------------------------------------------

  describe("keys", () => {
    it("should list keys in a namespace", async () => {
      const storage = create();
      await storage.set("ns", "alpha", 1);
      await storage.set("ns", "beta", 2);
      await storage.set("ns", "gamma", 3);
      const keys = await storage.keys("ns");
      expect(keys.sort()).toEqual(["alpha", "beta", "gamma"]);
    });

    it("should return empty array for non-existent namespace", async () => {
      const storage = create();
      const keys = await storage.keys("nope");
      expect(keys).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Namespace isolation
  // -------------------------------------------------------------------------

  describe("namespace isolation", () => {
    it("should isolate values across namespaces", async () => {
      const storage = create();
      await storage.set("ns-a", "key", "value-a");
      await storage.set("ns-b", "key", "value-b");

      expect(await storage.get("ns-a", "key")).toBe("value-a");
      expect(await storage.get("ns-b", "key")).toBe("value-b");
    });

    it("should delete an entire namespace", async () => {
      const storage = create();
      await storage.set("ns", "k1", "v1");
      await storage.set("ns", "k2", "v2");
      await storage.deleteNamespace("ns");

      expect(await storage.get("ns", "k1")).toBeNull();
      expect(await storage.get("ns", "k2")).toBeNull();
      expect(await storage.keys("ns")).toEqual([]);
    });

    it("should not throw when deleting non-existent namespace", async () => {
      const storage = create();
      await expect(storage.deleteNamespace("nope")).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  describe("validation", () => {
    it("should reject empty namespace", async () => {
      const storage = create();
      await expect(storage.set("", "key", "v")).rejects.toThrow(
        SecureStorageError,
      );
      await expect(storage.set("", "key", "v")).rejects.toThrow("Namespace");
    });

    it("should reject empty key", async () => {
      const storage = create();
      await expect(storage.set("ns", "", "v")).rejects.toThrow(
        SecureStorageError,
      );
      await expect(storage.set("ns", "", "v")).rejects.toThrow("Key");
    });

    it("should reject namespace with path traversal", async () => {
      const storage = create();
      await expect(storage.set("..", "key", "v")).rejects.toEqual(
        expectCode("TRAVERSAL_DETECTED"),
      );
      await expect(storage.set("a/b", "key", "v")).rejects.toEqual(
        expectCode("TRAVERSAL_DETECTED"),
      );
      await expect(storage.set("a\\b", "key", "v")).rejects.toEqual(
        expectCode("TRAVERSAL_DETECTED"),
      );
    });

    it("should reject key with path traversal", async () => {
      const storage = create();
      await expect(storage.set("ns", "../etc/passwd", "v")).rejects.toEqual(
        expectCode("TRAVERSAL_DETECTED"),
      );
    });

    it("should reject namespace with invalid characters", async () => {
      const storage = create();
      await expect(storage.set("n s", "key", "v")).rejects.toEqual(
        expectCode("INVALID_NAMESPACE"),
      );
      await expect(storage.set("n@s", "key", "v")).rejects.toEqual(
        expectCode("INVALID_NAMESPACE"),
      );
    });

    it("should reject key with invalid characters", async () => {
      const storage = create();
      await expect(storage.set("ns", "k y", "v")).rejects.toEqual(
        expectCode("INVALID_KEY"),
      );
    });

    it("should allow colons, dots, hyphens, and underscores", async () => {
      const storage = create();
      await storage.set("ns-1", "entity:scope:key_name.v2", { ok: true });
      const result = await storage.get("ns-1", "entity:scope:key_name.v2");
      expect(result).toEqual({ ok: true });
    });
  });

  // -------------------------------------------------------------------------
  // Encryption behavior
  // -------------------------------------------------------------------------

  describe("encryption", () => {
    it("should report encryption availability", () => {
      const storage = create();
      expect(storage.isEncryptionAvailable).toBe(true);
      encryption.setAvailable(false);
      expect(storage.isEncryptionAvailable).toBe(false);
    });

    it("should throw when encryption unavailable and fallback is throw", async () => {
      encryption.setAvailable(false);
      const storage = create("throw");
      await expect(storage.set("ns", "key", "v")).rejects.toEqual(
        expectCode("ENCRYPTION_UNAVAILABLE"),
      );
    });

    it("should succeed when encryption unavailable and fallback is plaintext", async () => {
      encryption.setAvailable(false);
      const storage = create("plaintext");
      await storage.set("ns", "key", { secret: "data" });
      const result = await storage.get("ns", "key");
      expect(result).toEqual({ secret: "data" });
    });

    it("should throw on read when encryption unavailable and fallback is throw", async () => {
      // Write with encryption available
      const storage = create("throw");
      await storage.set("ns", "key", "v");

      // Disable encryption and try to read
      encryption.setAvailable(false);
      await expect(storage.get("ns", "key")).rejects.toEqual(
        expectCode("ENCRYPTION_UNAVAILABLE"),
      );
    });
  });

  // -------------------------------------------------------------------------
  // JSON round-trip
  // -------------------------------------------------------------------------

  describe("JSON round-trip", () => {
    it("should preserve complex objects", async () => {
      const storage = create();
      const obj = {
        string: "hello",
        number: 42,
        bool: true,
        nested: { a: [1, 2, 3] },
        nullVal: null,
      };
      await storage.set("ns", "complex", obj);
      const result = await storage.get("ns", "complex");
      expect(result).toEqual(obj);
    });

    it("should preserve arrays", async () => {
      const storage = create();
      await storage.set("ns", "arr", [1, "two", { three: 3 }]);
      const result = await storage.get("ns", "arr");
      expect(result).toEqual([1, "two", { three: 3 }]);
    });

    it("should preserve string values", async () => {
      const storage = create();
      await storage.set("ns", "str", "just a string");
      const result = await storage.get("ns", "str");
      expect(result).toBe("just a string");
    });
  });

  // -------------------------------------------------------------------------
  // File structure
  // -------------------------------------------------------------------------

  describe("file structure", () => {
    it("should create namespace directory and .enc file", async () => {
      const storage = create();
      await storage.set("my-ns", "my-key", "data");

      const nsDir = path.join(storageDir, "my-ns");
      const filePath = path.join(nsDir, "my-key.enc");
      expect(fs.existsSync(nsDir)).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("should remove directory on deleteNamespace", async () => {
      const storage = create();
      await storage.set("to-delete", "k", "v");
      const nsDir = path.join(storageDir, "to-delete");
      expect(fs.existsSync(nsDir)).toBe(true);

      await storage.deleteNamespace("to-delete");
      expect(fs.existsSync(nsDir)).toBe(false);
    });
  });
});
