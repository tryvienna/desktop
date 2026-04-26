/**
 * Environment variable validation for the relay server.
 *
 * RELAY_ALLOW_DEV_AUTH must be explicitly set to "true" to enable
 * dev auth bypass (JWT decode without signature verification).
 * This prevents accidental exposure in production if NODE_ENV is wrong.
 */

export const env = {
  get PORT() { return parseInt(process.env.PORT ?? '3300', 10); },
  get DESKTOP_JWT_SECRET() { return process.env.DESKTOP_JWT_SECRET ?? ''; },
  get NODE_ENV() { return process.env.NODE_ENV ?? 'development'; },
  get isDev() { return this.NODE_ENV === 'development'; },
  /** Explicit opt-in for dev auth bypass — never infer from NODE_ENV alone */
  get RELAY_ALLOW_DEV_AUTH() { return process.env.RELAY_ALLOW_DEV_AUTH === 'true'; },
};
