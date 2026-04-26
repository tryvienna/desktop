/**
 * Plugin system — bundling, evaluation, and hot-reload for customized plugins.
 */

export { PluginBundler } from './PluginBundler';
export type { BundleTarget, BundleResult } from './PluginBundler';

export { evaluateModule, evaluatePluginBundle } from './evaluator';
export type { EvaluateOptions } from './evaluator';

export { PluginInstaller } from './PluginInstaller';
export type { PluginInstallerDeps } from './PluginInstaller';

export { PluginDevServer } from './PluginDevServer';
export type {
  LoadResult,
  CustomizationStep,
  PluginChangedCallback,
  PluginErrorCallback,
  CustomizationProgressCallback,
  PluginSourceSettings,
  PluginDevServerDeps,
} from './PluginDevServer';
