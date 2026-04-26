import { z } from 'zod';
import type { MainEnv } from './main';

/**
 * Schema for the subset of environment variables that are safe to expose
 * to the renderer process via the preload bridge.
 *
 * The renderer runs in a sandboxed browser context with no direct access
 * to process.env. Values are passed through contextBridge.exposeInMainWorld.
 */
const rendererEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  isDev: z.boolean(),
  isProd: z.boolean(),
  isTest: z.boolean(),
  isCI: z.boolean(),
});

export type RendererEnv = z.infer<typeof rendererEnvSchema>;

export { rendererEnvSchema };

/**
 * Creates a validated RendererEnv from a MainEnv.
 * Call this in the preload script and expose the result via contextBridge.
 */
export function createRendererEnv(env: MainEnv): RendererEnv {
  return rendererEnvSchema.parse({
    NODE_ENV: env.NODE_ENV,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    isCI: !!env.CI,
  });
}
