# @vienna/secure-storage

Encrypted key-value storage with namespace isolation. Uses OS-level encryption (macOS Keychain, Windows Credential Vault, Linux Secret Service) via a pluggable `EncryptionProvider` interface.

**Zero runtime dependencies. No Electron import.** Encryption is injected by the consumer.

## Exports

| Import path                      | Process safety    | Contents                                                                           |
| -------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| `@vienna/secure-storage`         | All processes     | Types and interfaces only                                                          |
| `@vienna/secure-storage/main`    | Main process only | `createSecureStorage()`, `createScopedStorage()` (uses `node:fs`)                  |
| `@vienna/secure-storage/testing` | Tests only        | `InMemorySecureStorage`, `InMemoryEncryptionProvider`, `createTestScopedStorage()` |

## Core Concepts

### SecureStorage — generic encrypted key-value store

Stores values as encrypted `.enc` files organized by namespace directories:

```
<storageDir>/
├── <namespace>/
│   ├── <key>.enc
│   └── <key>.enc
└── _entity_storage/          # Used by ScopedStorage
    └── entity:<scope>:<key>.enc
```

**API:** `get<T>(namespace, key)`, `set(namespace, key, value)`, `delete(namespace, key)`, `has(namespace, key)`, `keys(namespace)`, `deleteNamespace(namespace)`

Values are JSON-serialized before encryption. Any JSON-serializable value works.

### ScopedStorage — key-whitelisted view for integrations

A restricted view over `SecureStorage` that only allows access to pre-declared keys. Used by integration plugins so they can only touch their own credentials.

**API:** `get(key)`, `set(key, value)`, `delete(key)`, `has(key)` — all string values only.

Internally stores under the `_entity_storage` namespace with keys prefixed as `entity:<scope>:<key>`.

Structurally identical to `EntitySecureStorage` from `@tryvienna/sdk` (compatible via TypeScript structural typing, no import needed).

### EncryptionProvider — dependency injection for encryption

```ts
interface EncryptionProvider {
  isAvailable(): boolean;
  encrypt(plaintext: string): Buffer;
  decrypt(encrypted: Buffer): string;
}
```

The package never imports `electron`. The desktop app creates a provider from `safeStorage`:

```ts
import { safeStorage } from "electron";
import type { EncryptionProvider } from "@vienna/secure-storage";

const encryption: EncryptionProvider = {
  isAvailable: () => safeStorage.isEncryptionAvailable(),
  encrypt: (s) => safeStorage.encryptString(s),
  decrypt: (b) => safeStorage.decryptString(b),
};
```

## Usage

### Creating storage (main process)

```ts
import {
  createSecureStorage,
  createScopedStorage,
} from "@vienna/secure-storage/main";

const storage = createSecureStorage({
  storageDir: path.join(app.getPath("userData"), "secure-storage"),
  encryption, // EncryptionProvider (see above)
  // fallbackBehavior: 'throw',  // default — throws if encryption unavailable
  // fallbackBehavior: 'plaintext', // opt-in for dev/CI
});

// Direct namespace usage (e.g., per-user credential storage)
await storage.set("user-abc", "auth_token", { accessToken: "eyJ..." });
const token = await storage.get<{ accessToken: string }>(
  "user-abc",
  "auth_token",
);

// Scoped storage for an integration plugin
const linearStorage = createScopedStorage(storage, {
  scope: "integration:linear",
  allowedKeys: ["api_token", "oauth_linear_tokens"],
});

await linearStorage.set("api_token", "lin_api_..."); // OK
await linearStorage.set("password", "..."); // throws KEY_NOT_ALLOWED
```

### Using in tests

```ts
import {
  InMemorySecureStorage,
  createTestScopedStorage,
} from "@vienna/secure-storage/testing";

// Full in-memory storage (no filesystem, no encryption)
const storage = new InMemorySecureStorage();
await storage.set("ns", "key", { foo: "bar" });
const val = await storage.get("ns", "key"); // { foo: 'bar' }
storage.clear(); // reset between tests

// Scoped storage for testing integration code
const { scoped, storage: underlying } = createTestScopedStorage({
  scope: "my-integration",
  allowedKeys: ["token", "secret"],
});
await scoped.set("token", "abc");
```

### Types only (safe for any process)

```ts
import type {
  SecureStorage,
  ScopedStorage,
  EncryptionProvider,
  SecureStorageOptions,
  ScopedStorageOptions,
} from "@vienna/secure-storage";

import { SecureStorageError } from "@vienna/secure-storage";
```

## Security

| Concern                   | Mitigation                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Directory traversal       | Namespace and key names validated against `[a-zA-Z0-9_\-:.]` regex. Rejects `..`, `/`, `\`.                                         |
| Silent plaintext fallback | `fallbackBehavior` defaults to `'throw'`. Plaintext requires explicit opt-in.                                                       |
| Key leakage               | No logging in the package. Callers control what they log.                                                                           |
| Namespace collision       | `ScopedStorage` uses fixed `_entity_storage` namespace with `entity:<scope>:<key>` prefix. Direct callers use their own namespaces. |
| Integration overreach     | `ScopedStorage` enforces a key allowlist. Access to undeclared keys throws `KEY_NOT_ALLOWED`.                                       |

## Error Codes

All errors are `SecureStorageError` instances with a `.code` property:

| Code                     | When                                                      |
| ------------------------ | --------------------------------------------------------- |
| `ENCRYPTION_UNAVAILABLE` | Encryption provider unavailable and fallback is `'throw'` |
| `INVALID_NAMESPACE`      | Namespace is empty or contains invalid characters         |
| `INVALID_KEY`            | Key is empty or contains invalid characters               |
| `KEY_NOT_ALLOWED`        | ScopedStorage access to a key not in `allowedKeys`        |
| `TRAVERSAL_DETECTED`     | Namespace or key contains `..`, `/`, or `\`               |
| `READ_FAILED`            | Filesystem read or JSON parse error                       |
| `WRITE_FAILED`           | Filesystem write error                                    |
| `DELETE_FAILED`          | Filesystem delete error                                   |

## Relationship to @tryvienna/sdk

`EntitySecureStorage` in `@tryvienna/sdk` is structurally identical to `ScopedStorage`. No import dependency exists between the packages — TypeScript structural typing makes them compatible. When wiring up integrations, pass a `ScopedStorage` instance wherever `EntitySecureStorage` is expected.
