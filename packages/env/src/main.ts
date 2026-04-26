import { z } from 'zod';

/**
 * Schema for environment variables available in the Electron main process.
 * This is the ONLY place in the entire codebase where process.env should be read.
 */
const mainEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),

  /** Set to any truthy value in CI environments. */
  CI: z.string().optional(),

  /**
   * Override for the app data directory. When set, all Vienna data
   * (logs, cache, config) is stored here instead of the OS default.
   * Useful for development, CI, and testing.
   */
  VIENNA_DATA_DIR: z.string().optional(),

  /**
   * Vite dev-server URL injected by Electron Forge during development.
   * When set, the main window loads from this URL instead of a local file.
   */
  MAIN_WINDOW_VITE_DEV_SERVER_URL: z.string().url().optional(),

  /**
   * Vite renderer name used to locate the built HTML file in production.
   * Defaults to 'main_window'.
   */
  MAIN_WINDOW_VITE_NAME: z.string().default('main_window'),

  /**
   * Vienna web backend URL for authentication.
   * Desktop app opens this URL in the browser for login/signup.
   */
  VIENNA_WEB_URL: z.string().url().optional(),
});

export type MainEnv = z.infer<typeof mainEnvSchema>;

export { mainEnvSchema };

// eslint-disable-next-line no-restricted-syntax -- This is the single authorized access point for process.env
export const mainEnv: MainEnv = mainEnvSchema.parse(process.env);
