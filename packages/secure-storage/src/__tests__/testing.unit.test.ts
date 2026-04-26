import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemorySecureStorage,
  InMemoryEncryptionProvider,
  createTestScopedStorage,
} from "../testing";

describe("InMemoryEncryptionProvider", () => {
  it("should default to available", () => {
    const provider = new InMemoryEncryptionProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  it("should respect initial availability option", () => {
    const provider = new InMemoryEncryptionProvider({ available: false });
    expect(provider.isAvailable()).toBe(false);
  });

  it("should toggle availability", () => {
    const provider = new InMemoryEncryptionProvider();
    expect(provider.isAvailable()).toBe(true);
    provider.setAvailable(false);
    expect(provider.isAvailable()).toBe(false);
    provider.setAvailable(true);
    expect(provider.isAvailable()).toBe(true);
  });

  it("should round-trip encrypt/decrypt", () => {
    const provider = new InMemoryEncryptionProvider();
    const plaintext = "hello world";
    const encrypted = provider.encrypt(plaintext);
    const decrypted = provider.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});

describe("InMemorySecureStorage", () => {
  let storage: InMemorySecureStorage;

  beforeEach(() => {
    storage = new InMemorySecureStorage();
  });

  describe("basic CRUD", () => {
    it("should set and get a value", async () => {
      await storage.set("ns", "key", { foo: "bar" });
      const result = await storage.get("ns", "key");
      expect(result).toEqual({ foo: "bar" });
    });

    it("should return null for non-existent key", async () => {
      expect(await storage.get("ns", "missing")).toBeNull();
    });

    it("should return null for non-existent namespace", async () => {
      expect(await storage.get("nope", "key")).toBeNull();
    });

    it("should overwrite existing value", async () => {
      await storage.set("ns", "key", { v: 1 });
      await storage.set("ns", "key", { v: 2 });
      expect(await storage.get("ns", "key")).toEqual({ v: 2 });
    });

    it("should delete a key", async () => {
      await storage.set("ns", "key", "value");
      await storage.delete("ns", "key");
      expect(await storage.get("ns", "key")).toBeNull();
    });

    it("should not throw when deleting non-existent key", async () => {
      await expect(storage.delete("ns", "missing")).resolves.toBeUndefined();
    });

    it("should report has correctly", async () => {
      expect(await storage.has("ns", "key")).toBe(false);
      await storage.set("ns", "key", "v");
      expect(await storage.has("ns", "key")).toBe(true);
    });
  });

  describe("keys", () => {
    it("should list keys in a namespace", async () => {
      await storage.set("ns", "a", 1);
      await storage.set("ns", "b", 2);
      const keys = await storage.keys("ns");
      expect(keys.sort()).toEqual(["a", "b"]);
    });

    it("should return empty array for non-existent namespace", async () => {
      expect(await storage.keys("nope")).toEqual([]);
    });
  });

  describe("deleteNamespace", () => {
    it("should delete all keys in a namespace", async () => {
      await storage.set("ns", "a", 1);
      await storage.set("ns", "b", 2);
      await storage.deleteNamespace("ns");
      expect(await storage.get("ns", "a")).toBeNull();
      expect(await storage.keys("ns")).toEqual([]);
    });
  });

  describe("clear", () => {
    it("should remove all data", async () => {
      await storage.set("ns1", "k1", "v1");
      await storage.set("ns2", "k2", "v2");
      storage.clear();
      expect(await storage.get("ns1", "k1")).toBeNull();
      expect(await storage.get("ns2", "k2")).toBeNull();
    });
  });

  describe("deep clone semantics", () => {
    it("should not be affected by mutations to returned objects", async () => {
      const original = { nested: { value: "original" } };
      await storage.set("ns", "key", original);

      const result = await storage.get<{ nested: { value: string } }>(
        "ns",
        "key",
      );
      result!.nested.value = "mutated";

      const fresh = await storage.get<{ nested: { value: string } }>(
        "ns",
        "key",
      );
      expect(fresh!.nested.value).toBe("original");
    });

    it("should not be affected by mutations to input objects", async () => {
      const input = { value: "original" };
      await storage.set("ns", "key", input);
      input.value = "mutated";

      const result = await storage.get<{ value: string }>("ns", "key");
      expect(result!.value).toBe("original");
    });
  });
});

describe("createTestScopedStorage", () => {
  it("should create a working scoped storage", async () => {
    const { scoped } = createTestScopedStorage({
      scope: "test",
      allowedKeys: ["token"],
    });

    await scoped.set("token", "abc");
    expect(await scoped.get("token")).toBe("abc");
  });

  it("should reject disallowed keys", async () => {
    const { scoped } = createTestScopedStorage({
      scope: "test",
      allowedKeys: ["token"],
    });

    await expect(scoped.get("secret")).rejects.toEqual(
      expect.objectContaining({ code: "KEY_NOT_ALLOWED" }),
    );
  });

  it("should share underlying storage when provided", async () => {
    const mem = new InMemorySecureStorage();
    const { scoped: scoped1 } = createTestScopedStorage(
      { scope: "scope1", allowedKeys: ["key"] },
      mem,
    );
    const { scoped: scoped2 } = createTestScopedStorage(
      { scope: "scope2", allowedKeys: ["key"] },
      mem,
    );

    await scoped1.set("key", "value1");
    await scoped2.set("key", "value2");

    expect(await scoped1.get("key")).toBe("value1");
    expect(await scoped2.get("key")).toBe("value2");
  });
});
