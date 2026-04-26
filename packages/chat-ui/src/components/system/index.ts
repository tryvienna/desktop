/**
 * System Widgets — barrel export
 *
 * @ai-context
 * - Components for system-level messages and status indicators in chat
 * - Each widget renders a specific system event type (error, compacting, model change, etc.)
 * - All widgets use data-slot attributes for styling hooks
 */

export { CompactingWidget } from './compacting-widget';
export type {
  CompactingWidgetProps,
  CompactingStatus,
  CompactingTrigger,
} from './compacting-widget';

export { ModelChangeWidget } from './model-change-widget';
export type { ModelChangeWidgetProps } from './model-change-widget';

export { EntityLinkWidget } from './entity-link-widget';
export type { EntityLinkWidgetProps } from './entity-link-widget';

export { SkillActivationWidget } from './skill-activation-widget';
export type { SkillActivationWidgetProps } from './skill-activation-widget';

export { InterruptedWidget } from './interrupted-widget';

export { InterruptHint } from './interrupt-hint';
export type { InterruptHintProps } from './interrupt-hint';

export { TaskNotificationWidget } from './task-notification-widget';
export type { TaskNotificationWidgetProps } from './task-notification-widget';

export { RateLimitWidget } from './rate-limit-widget';
export type { RateLimitWidgetProps } from './rate-limit-widget';

export { ApiRetryWidget } from './api-retry-widget';
export type { ApiRetryWidgetProps } from './api-retry-widget';

export { UnknownMessageWidget } from './unknown-message-widget';
export type { UnknownMessageWidgetProps } from './unknown-message-widget';

export { ApiErrorWidget } from './api-error-widget';
export type { ApiErrorWidgetProps } from './api-error-widget';

export { VerificationActionWidget } from './verification-action-widget';
export type { VerificationActionWidgetProps, ActionExecStatus } from './verification-action-widget';

export { TagExecutionWidget } from './tag-execution-widget';
export type { TagExecutionWidgetProps, TagSnapshotItem } from './tag-execution-widget';

export { SnapshotDAGView } from './snapshot-dag-view';
export type { SnapshotDAGViewProps } from './snapshot-dag-view';

export { TagDelegationWidget } from './tag-delegation-widget';
export type { TagDelegationWidgetProps } from './tag-delegation-widget';

export { TagStatusProvider, useTagStatusLookup } from './tag-status-context';
export type { LiveTagStatus, TagStatusLookup, TagStatusContextValue } from './tag-status-context';

export { LinkedEntityEditProvider, useLinkedEntityEdit } from './linked-entity-edit-context';
export type { LinkedEntityEditContextValue } from './linked-entity-edit-context';

export { ShellExecutionWidget } from './shell-execution-widget';
export type { ShellExecutionWidgetProps } from './shell-execution-widget';
