import { describe, it, expect, beforeEach } from "vitest";
import { createScopedStorage } from "../main";
import { InMemorySecureStorage } from "../testing";
import { SecureStorageError } from "../errors";

const expectKeyNotAllowed = expect.objectContaining({
  code: "KEY_NOT_ALLOWED",
});

describe("createScopedStorage", () => {
  let storage: InMemorySecureStorage;

  beforeEach(() => {
    storage = new InMemorySecureStorage();
  });

  function create(scope: string, allowedKeys: string[]) {
    return createScopedStorage(storage, { scope, allowedKeys });
  }

  // -------------------------------------------------------------------------
  // Basic CRUD with allowed keys
  // -------------------------------------------------------------------------

  describe("allowed keys", () => {
    it("should set and get a value", async () => {
      const scoped = create("linear", ["api_token"]);
      await scoped.set("api_token", "sk-123");
      const result = await scoped.get("api_token");
      expect(result).toBe("sk-123");
    });

    it("should return null for unset key", async () => {
      const scoped = create("linear", ["api_token"]);
      const result = await scoped.get("api_token");
      expect(result).toBeNull();
    });

    it("should delete a key", async () => {
      const scoped = create("linear", ["api_token"]);
      await scoped.set("api_token", "sk-123");
      await scoped.delete("api_token");
      expect(await scoped.get("api_token")).toBeNull();
    });

    it("should report has correctly", async () => {
      const scoped = create("linear", ["api_token"]);
      expect(await scoped.has("api_token")).toBe(false);
      await scoped.set("api_token", "sk-123");
      expect(await scoped.has("api_token")).toBe(true);
    });

    it("should handle multiple allowed keys", async () => {
      const scoped = create("github", ["api_token", "webhook_secret"]);
      await scoped.set("api_token", "ghp_abc");
      await scoped.set("webhook_secret", "whsec_xyz");

      expect(await scoped.get("api_token")).toBe("ghp_abc");
      expect(await scoped.get("webhook_secret")).toBe("whsec_xyz");
    });
  });

  // -------------------------------------------------------------------------
  // Key whitelisting
  // -------------------------------------------------------------------------

  describe("key whitelisting", () => {
    it("should reject get for disallowed key", async () => {
      const scoped = create("linear", ["api_token"]);
      await expect(scoped.get("password")).rejects.toThrow(SecureStorageError);
      await expect(scoped.get("password")).rejects.toEqual(expectKeyNotAllowed);
    });

    it("should reject set for disallowed key", async () => {
      const scoped = create("linear", ["api_token"]);
      await expect(scoped.set("password", "secret")).rejects.toEqual(
        expectKeyNotAllowed,
      );
    });

    it("should reject delete for disallowed key", async () => {
      const scoped = create("linear", ["api_token"]);
      await expect(scoped.delete("password")).rejects.toEqual(
        expectKeyNotAllowed,
      );
    });

    it("should reject has for disallowed key", async () => {
      const scoped = create("linear", ["api_token"]);
      await expect(scoped.has("password")).rejects.toEqual(expectKeyNotAllowed);
    });

    it("should deny all access with empty allowedKeys", async () => {
      const scoped = create("locked", []);
      await expect(scoped.get("anything")).rejects.toEqual(expectKeyNotAllowed);
      await expect(scoped.set("anything", "v")).rejects.toEqual(
        expectKeyNotAllowed,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Scope isolation
  // -------------------------------------------------------------------------

  describe("scope isolation", () => {
    it("should isolate values across scopes", async () => {
      const linear = create("integration:linear", ["api_token"]);
      const github = create("integration:github", ["api_token"]);

      await linear.set("api_token", "linear-token");
      await github.set("api_token", "github-token");

      expect(await linear.get("api_token")).toBe("linear-token");
      expect(await github.get("api_token")).toBe("github-token");
    });

    it("should not leak keys between scopes", async () => {
      const linear = create("integration:linear", ["api_token"]);
      const github = create("integration:github", ["api_token"]);

      await linear.set("api_token", "linear-token");
      expect(await github.get("api_token")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Internal storage format
  // -------------------------------------------------------------------------

  describe("internal storage format", () => {
    it("should store values wrapped as { value } in _entity_storage namespace", async () => {
      const scoped = create("integration:linear", ["api_token"]);
      await scoped.set("api_token", "sk-123");

      // Peek at the underlying storage to verify the format
      const raw = await storage.get(
        "_entity_storage",
        "entity:integration:linear:api_token",
      );
      expect(raw).toEqual({ value: "sk-123" });
    });
  });
});
