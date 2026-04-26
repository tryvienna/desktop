/**
 * Content Renderer Registry — Barrel Export
 *
 * Re-exports all renderers, context providers, and the default
 * registry factory for convenience.
 *
 * @module chat-ui/renderers
 */

// ─── Registry Core ──────────────────────────────────────────────────────────

export {
  RendererRegistry,
  createRendererRegistry,
  RendererRegistryProvider,
  useRendererRegistry,
  useRenderer,
} from './registry';
export type { RendererProps, RendererDefinition } from './registry';

// ─── Entity Widget Context ──────────────────────────────────────────────────

export { EntityWidgetProvider, useEntityWidgetRenderer } from './entity-widget-context';
export type { EntityWidgetRenderer, EntityWidgetRendererProps } from './entity-widget-context';

// ─── Text ───────────────────────────────────────────────────────────────────

export { TextRenderer, textRendererDefinition } from './text-renderer';

// ─── Thinking ───────────────────────────────────────────────────────────────

export { ThinkingRenderer, thinkingRendererDefinition } from './thinking-renderer';

// ─── Code ───────────────────────────────────────────────────────────────────

export { CodeRenderer, codeRendererDefinition } from './code-renderer';

// ─── Image Attachment ───────────────────────────────────────────────────────

export {
  ImageAttachmentRenderer,
  imageAttachmentRendererDefinition,
} from './image-attachment-renderer';

// ─── Entity Text ────────────────────────────────────────────────────────────

export {
  EntityTextRenderer,
  entityTextRendererDefinition,
  EntityClickProvider,
  useEntityClick,
  ViennaChipIcon,
} from './entity-text-renderer';
export type { EntityClickHandler } from './entity-text-renderer';

// ─── Paste Text ─────────────────────────────────────────────────────────────

export {
  PasteTextRenderer,
  pasteTextRendererDefinition,
  PasteEditorProvider,
} from './paste-text-renderer';

// ─── NanoContext ────────────────────────────────────────────────────────────

export { NanoContextRenderer, nanoContextRendererDefinition } from './nano-context-renderer';

// ─── System Renderers ───────────────────────────────────────────────────────

export {
  CompactBoundaryRenderer,
  compactBoundaryRendererDefinition,
  ModelChangeRenderer,
  modelChangeRendererDefinition,
  EntityLinkRenderer,
  entityLinkRendererDefinition,
  SkillActivationRenderer,
  skillActivationRendererDefinition,
  InterruptedRenderer,
  interruptedRendererDefinition,
  TaskNotificationRenderer,
  taskNotificationRendererDefinition,
  RateLimitRenderer,
  rateLimitRendererDefinition,
  ApiRetryRenderer,
  apiRetryRendererDefinition,
  ApiErrorRenderer,
  apiErrorRendererDefinition,
  UnknownMessageRenderer,
  unknownMessageRendererDefinition,
  VerificationActionRenderer,
  verificationActionRendererDefinition,
  TagExecutionRenderer,
  tagExecutionRendererDefinition,
} from './system-renderer';

// ─── Default Registry Factory ───────────────────────────────────────────────

import { createRendererRegistry } from './registry';
import { textRendererDefinition } from './text-renderer';
import { thinkingRendererDefinition } from './thinking-renderer';
import { codeRendererDefinition } from './code-renderer';
import { imageAttachmentRendererDefinition } from './image-attachment-renderer';
import { entityTextRendererDefinition } from './entity-text-renderer';
import { pasteTextRendererDefinition } from './paste-text-renderer';
import { nanoContextRendererDefinition } from './nano-context-renderer';
import {
  compactBoundaryRendererDefinition,
  modelChangeRendererDefinition,
  entityLinkRendererDefinition,
  skillActivationRendererDefinition,
  interruptedRendererDefinition,
  taskNotificationRendererDefinition,
  rateLimitRendererDefinition,
  apiRetryRendererDefinition,
  apiErrorRendererDefinition,
  unknownMessageRendererDefinition,
  verificationActionRendererDefinition,
  tagExecutionRendererDefinition,
} from './system-renderer';

/**
 * Create a registry with all default content renderers registered.
 *
 * Priority order (highest checked first):
 *   30 — System renderers (compact_boundary, model_change, etc.)
 *   15 — Paste text (text with [paste://…] markup)
 *   10 — Entity text (text with [@vienna//…] markup), Code
 *    5 — Thinking, Image attachment
 *    0 — Plain text (catch-all)
 */
export function createDefaultRendererRegistry() {
  const registry = createRendererRegistry();

  // Priority 30 — System renderers
  registry.register(compactBoundaryRendererDefinition);
  registry.register(modelChangeRendererDefinition);
  registry.register(entityLinkRendererDefinition);
  registry.register(skillActivationRendererDefinition);
  registry.register(interruptedRendererDefinition);
  registry.register(taskNotificationRendererDefinition);
  registry.register(rateLimitRendererDefinition);
  registry.register(apiRetryRendererDefinition);
  registry.register(apiErrorRendererDefinition);
  registry.register(unknownMessageRendererDefinition);
  registry.register(verificationActionRendererDefinition);
  registry.register(tagExecutionRendererDefinition);

  // Priority 15 — Paste text (text with paste markup, before entity text)
  registry.register(pasteTextRendererDefinition);

  // Priority 10 — Entity text, Code
  registry.register(entityTextRendererDefinition);
  registry.register(codeRendererDefinition);

  // Priority 5 — Thinking, Image attachment, NanoContext
  registry.register(thinkingRendererDefinition);
  registry.register(imageAttachmentRendererDefinition);
  registry.register(nanoContextRendererDefinition);

  // Priority 0 — Plain text (catch-all fallback)
  registry.register(textRendererDefinition);

  return registry;
}
