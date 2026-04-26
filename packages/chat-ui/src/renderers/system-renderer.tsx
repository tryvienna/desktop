/**
 * SystemRenderers — Thin wrappers dispatching system content blocks to widgets
 *
 * @ai-context
 * - All registered at priority 30 (highest built-in priority)
 * - Includes: CompactBoundary, ModelChange, EntityLink, SkillActivation,
 *   Interrupted, TaskNotification, RateLimit, ApiError, Unknown, VerificationAction
 * - Each renderer delegates to a corresponding widget in components/system
 * - data-slot="system-renderer"
 *
 * @example
 * <ModelChangeRenderer content={{ type: 'model_change', fromModel: 'a', toModel: 'b' }} messageId="m1" isStreaming={false} />
 */

import { memo } from 'react';

import type {
  CompactBoundaryBlock,
  ModelChangeBlock,
  EntityLinkBlock,
  SkillActivationBlock,
  InterruptedBlock,
  TaskNotificationBlock,
  RateLimitBlock,
  ApiRetryBlock,
  ApiErrorBlock,
  UnknownBlock,
  VerificationActionBlock,
  TagExecutionBlock,
} from '../types/messages';
import type { RendererProps, RendererDefinition } from './registry';
import {
  CompactingWidget,
  ModelChangeWidget,
  EntityLinkWidget,
  SkillActivationWidget,
  InterruptedWidget,
  TaskNotificationWidget,
  RateLimitWidget,
  ApiRetryWidget,
  ApiErrorWidget,
  UnknownMessageWidget,
  VerificationActionWidget,
  TagExecutionWidget,
} from '../components/system';

// ─── Compact Boundary ────────────────────────────────────────────────────────

export const CompactBoundaryRenderer = memo(function CompactBoundaryRenderer({
  content,
}: RendererProps<CompactBoundaryBlock>) {
  return (
    <CompactingWidget
      status={content.status ?? 'complete'}
      trigger={content.trigger}
      preTokens={content.preTokens}
    />
  );
});

export const compactBoundaryRendererDefinition: RendererDefinition<CompactBoundaryBlock> = {
  id: 'compact_boundary',
  match: (content): content is CompactBoundaryBlock => content.type === 'compact_boundary',
  component: CompactBoundaryRenderer,
  priority: 30,
};

// ─── Model Change ────────────────────────────────────────────────────────────

export const ModelChangeRenderer = memo(function ModelChangeRenderer({
  content,
}: RendererProps<ModelChangeBlock>) {
  return <ModelChangeWidget fromModel={content.fromModel} toModel={content.toModel} />;
});

export const modelChangeRendererDefinition: RendererDefinition<ModelChangeBlock> = {
  id: 'model_change',
  match: (content): content is ModelChangeBlock => content.type === 'model_change',
  component: ModelChangeRenderer,
  priority: 30,
};

// ─── Entity Link ─────────────────────────────────────────────────────────────

export const EntityLinkRenderer = memo(function EntityLinkRenderer({
  content,
}: RendererProps<EntityLinkBlock>) {
  return (
    <EntityLinkWidget
      action={content.action}
      entityType={content.entityType}
      entityTitle={content.entityTitle}
      entityUri={content.entityUri}
    />
  );
});

export const entityLinkRendererDefinition: RendererDefinition<EntityLinkBlock> = {
  id: 'entity_link',
  match: (content): content is EntityLinkBlock => content.type === 'entity_link',
  component: EntityLinkRenderer,
  priority: 30,
};

// ─── Skill Activation ────────────────────────────────────────────────────────

export const SkillActivationRenderer = memo(function SkillActivationRenderer({
  content,
}: RendererProps<SkillActivationBlock>) {
  return <SkillActivationWidget skills={content.skills} />;
});

export const skillActivationRendererDefinition: RendererDefinition<SkillActivationBlock> = {
  id: 'skill_activation',
  match: (content): content is SkillActivationBlock => content.type === 'skill_activation',
  component: SkillActivationRenderer,
  priority: 30,
};

// ─── Interrupted ─────────────────────────────────────────────────────────────

export const InterruptedRenderer = memo(function InterruptedRenderer(
  _props: RendererProps<InterruptedBlock>
) {
  return <InterruptedWidget />;
});

export const interruptedRendererDefinition: RendererDefinition<InterruptedBlock> = {
  id: 'interrupted',
  match: (content): content is InterruptedBlock => content.type === 'interrupted',
  component: InterruptedRenderer,
  priority: 30,
};

// ─── Task Notification ───────────────────────────────────────────────────────

export const TaskNotificationRenderer = memo(function TaskNotificationRenderer({
  content,
}: RendererProps<TaskNotificationBlock>) {
  return <TaskNotificationWidget status={content.status} summary={content.summary} />;
});

export const taskNotificationRendererDefinition: RendererDefinition<TaskNotificationBlock> = {
  id: 'task_notification',
  match: (content): content is TaskNotificationBlock => content.type === 'task_notification',
  component: TaskNotificationRenderer,
  priority: 30,
};

// ─── Rate Limit ──────────────────────────────────────────────────────────────

export const RateLimitRenderer = memo(function RateLimitRenderer({
  content,
}: RendererProps<RateLimitBlock>) {
  return <RateLimitWidget rateLimitType={content.rateLimitType} resetsAt={content.resetsAt} isUsingOverage={content.isUsingOverage} />;
});

export const rateLimitRendererDefinition: RendererDefinition<RateLimitBlock> = {
  id: 'rate_limit',
  match: (content): content is RateLimitBlock => content.type === 'rate_limit',
  component: RateLimitRenderer,
  priority: 30,
};

// ─── API Retry ───────────────────────────────────────────────────────────

export const ApiRetryRenderer = memo(function ApiRetryRenderer({
  content,
}: RendererProps<ApiRetryBlock>) {
  return (
    <ApiRetryWidget
      attempt={content.attempt}
      maxRetries={content.maxRetries}
      retryDelayMs={content.retryDelayMs}
      errorStatus={content.errorStatus}
      error={content.error}
    />
  );
});

export const apiRetryRendererDefinition: RendererDefinition<ApiRetryBlock> = {
  id: 'api_retry',
  match: (content): content is ApiRetryBlock => content.type === 'api_retry',
  component: ApiRetryRenderer,
  priority: 30,
};

// ─── API Error ───────────────────────────────────────────────────────────────

export const ApiErrorRenderer = memo(function ApiErrorRenderer({
  content,
}: RendererProps<ApiErrorBlock>) {
  return (
    <ApiErrorWidget
      statusCode={content.statusCode}
      errorType={content.errorType}
      errorMessage={content.errorMessage}
      requestId={content.requestId}
      rawText={content.rawText}
    />
  );
});

export const apiErrorRendererDefinition: RendererDefinition<ApiErrorBlock> = {
  id: 'api_error',
  match: (content): content is ApiErrorBlock => content.type === 'api_error',
  component: ApiErrorRenderer,
  priority: 30,
};

// ─── Unknown Message ─────────────────────────────────────────────────────────

export const UnknownMessageRenderer = memo(function UnknownMessageRenderer({
  content,
}: RendererProps<UnknownBlock>) {
  return (
    <UnknownMessageWidget
      rawPayload={content.rawPayload}
      rawPayloadTruncated={content.rawPayloadTruncated}
      parseErrors={content.parseErrors}
      originalType={content.originalType}
      timestamp={content.timestamp}
    />
  );
});

export const unknownMessageRendererDefinition: RendererDefinition<UnknownBlock> = {
  id: 'unknown_message',
  match: (content): content is UnknownBlock => content.type === 'unknown',
  component: UnknownMessageRenderer,
  priority: 30,
};

// ─── Verification Action ─────────────────────────────────────────────────────

export const VerificationActionRenderer = memo(function VerificationActionRenderer({
  content,
}: RendererProps<VerificationActionBlock>) {
  return (
    <VerificationActionWidget
      actionId={content.actionId}
      actionLabel={content.actionLabel}
      actionType={content.actionType}
      prompt={content.prompt}
    />
  );
});

export const verificationActionRendererDefinition: RendererDefinition<VerificationActionBlock> = {
  id: 'verification_action',
  match: (content): content is VerificationActionBlock => content.type === 'verification_action',
  component: VerificationActionRenderer,
  priority: 30,
};

// ─── Tag Execution ──────────────────────────────────────────────────────

export const TagExecutionRenderer = memo(function TagExecutionRenderer({
  content,
}: RendererProps<TagExecutionBlock>) {
  return (
    <TagExecutionWidget
      tagName={content.tagName}
      color={content.color}
      status={content.status}
      instructions={content.instructions}
      workstreamId={content.workstreamId}
      snapshot={content.snapshot}
    />
  );
});

export const tagExecutionRendererDefinition: RendererDefinition<TagExecutionBlock> = {
  id: 'tag_execution',
  match: (content): content is TagExecutionBlock => content.type === 'tag_execution',
  component: TagExecutionRenderer,
  priority: 30,
};
