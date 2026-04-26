/**
 * Secure Storage Errors
 */

export type SecureStorageErrorCode =
  | "ENCRYPTION_UNAVAILABLE"
  | "INVALID_NAMESPACE"
  | "INVALID_KEY"
  | "KEY_NOT_ALLOWED"
  | "TRAVERSAL_DETECTED"
  | "READ_FAILED"
  | "WRITE_FAILED"
  | "DELETE_FAILED";

export class SecureStorageError extends Error {
  override readonly name = "SecureStorageError";

  constructor(
    message: string,
    public readonly code: SecureStorageErrorCode,
  ) {
    super(message);
  }
}
