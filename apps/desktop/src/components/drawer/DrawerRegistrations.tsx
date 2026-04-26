/**
 * DrawerRegistrations — Registers all drawer content renderers on mount.
 *
 * @ai-context
 * - Mount this component once near the app root (inside DrawerRegistryProvider)
 * - Registers workstream-settings renderer at priority 100
 * - Returns null (no DOM output) — purely a side-effect component
 * - Uses useDrawerRegistration hook for auto-cleanup on unmount
 * - EditorDrawerPanel is lazy-loaded to defer heavy @monaco-editor/react imports
 */

import { Suspense, lazy } from 'react';
import { useDrawerRegistration, StandaloneDrawerNavigationProvider, useDrawerRegistrySnapshot } from '../../lib/drawer';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import { isWorkstreamSettingsContent, WORKSTREAM_SETTINGS_CONTENT_ID, isGroupSettingsContent, isEntityDrawerContent, isFileEditorContent, isFileChangeReviewContent, isPasteContent, isScopedPermissionsContent, isVerificationActionsConfigContent, isFeedbackContent, isGitDiffReviewContent, isPlanReviewContent, isSkillBrowserContent, isSkillDetailContent, getSkillDetailPayload, skillBrowserContent, isPluginStoreContent, isPluginDrawerContent, isClaudeSettingsEditorContent, isHelpDocContent, isFeedEditorContent, isFeedPluginsContent, isFeedWidgetsContent, isTagManagerContent, getTagManagerPayload, tagManagerContent, isReleaseNotesContent, isTaskSettingsContent, getTaskSettingsPayload, isReferenceDetailContent } from './content';
import type { WorkstreamSettingsPayload } from './content';
import { HelpDocDrawer } from './HelpDocDrawer';
import { ReferenceDetailDrawer } from './ReferenceDetailDrawer';
import { ReleaseNotesDrawer } from './ReleaseNotesDrawer';
import { StoreDrawer } from '../store/StoreDrawer';
import { PluginDrawerRenderer } from './PluginDrawerRenderer';
import { FeedbackDrawer } from './FeedbackDrawer';
import { WorkstreamSettingsDrawer } from './workstream-settings';
import { GroupSettingsDrawer } from './group-settings';
import { ScopedPermissionsDrawer } from './scoped-permissions';
import { EntityDrawerRouter } from './entity-drawers';
import { FileChangeReviewDrawerPanel } from './FileChangeReviewDrawerPanel';
import { GitDiffReviewDrawerPanel } from './GitDiffReviewDrawerPanel';

const LazyEditorDrawerPanel = lazy(() =>
  import('./EditorDrawerPanel').then((m) => ({ default: m.EditorDrawerPanel }))
);

const LazyPasteDrawer = lazy(() =>
  import('./PasteDrawer').then((m) => ({ default: m.PasteDrawer }))
);

const LazyVerificationActionsConfigDrawer = lazy(() =>
  import('../verification-actions/VerificationActionsConfigDrawer').then((m) => ({
    default: m.VerificationActionsConfigDrawer,
  }))
);

const LazyPlanReviewDrawer = lazy(() =>
  import('./plan-review/PlanReviewDrawer').then((m) => ({ default: m.PlanReviewDrawer }))
);

const LazyClaudeSettingsEditorDrawer = lazy(() =>
  import('./claude-settings-editor').then((m) => ({ default: m.ClaudeSettingsEditorDrawer }))
);

const LazyFeedEditorDrawer = lazy(() =>
  import('./FeedEditorDrawer').then((m) => ({ default: m.FeedEditorDrawer }))
);

const LazyFeedPluginsList = lazy(() =>
  import('./FeedPluginsList').then((m) => ({ default: m.FeedPluginsList }))
);

const LazyFeedWidgetsList = lazy(() =>
  import('./FeedWidgetsList').then((m) => ({ default: m.FeedWidgetsList }))
);

import { useDrawerNavigationOptional } from '../../lib/drawer';
import { SkillBrowserDrawer } from '../skills/SkillBrowserDrawer';
import { SkillDetailView } from '../skills/SkillDetailView';

const LazyTagManagerDrawer = lazy(() =>
  import('../tags/TagManagerDrawer').then((m) => ({ default: m.TagManagerDrawer }))
);

const LazyTaskSettingsDrawer = lazy(() =>
  import('./task-settings/TaskSettingsDrawer').then((m) => ({ default: m.TaskSettingsDrawer }))
);

function EditorDrawerPanelLoader({ content }: { content: DrawerContentDescriptor }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          Loading editor...
        </div>
      }
    >
      <LazyEditorDrawerPanel content={content} />
    </Suspense>
  );
}

/**
 * FullModeStackRouter — Generic stack-aware router for full-mode drawers.
 *
 * Reads the current top-of-stack from StandaloneDrawerNavigationProvider and
 * resolves content via the drawer registry. This gives full-mode drawers the
 * same push/pop navigation that tabbed-mode drawers get automatically.
 *
 * Usage: wrap a full-mode drawer in StandaloneDrawerNavigationProvider, then
 * render FullModeStackRouter with the root content as `children`. Any pushed
 * content will be resolved via the registry; popping returns to the root.
 */
function FullModeStackRouter({ children }: { children: React.ReactNode }) {
  const navigation = useDrawerNavigationOptional();
  const registry = useDrawerRegistrySnapshot();

  // If the stack has been pushed beyond the root, render the top via registry
  if (navigation && navigation.stack.length > 1) {
    const top = navigation.stack[navigation.stack.length - 1];
    if (top) {
      const rendered = registry.render(top.content);
      if (rendered) return <>{rendered}</>;
    }
  }

  // Default: render the root content (children)
  return <>{children}</>;
}

export function DrawerRegistrations() {
  useDrawerRegistration({
    match: isWorkstreamSettingsContent,
    priority: 100,
    render: (content) => {
      const wsPayload = content.payload as unknown as WorkstreamSettingsPayload;
      const initialContent = { contentId: WORKSTREAM_SETTINGS_CONTENT_ID, payload: wsPayload };
      return (
        <StandaloneDrawerNavigationProvider initialStack={[{ content: initialContent, title: 'Settings' }]}>
          <FullModeStackRouter>
            <WorkstreamSettingsDrawer initialTab={wsPayload?.initialTab} />
          </FullModeStackRouter>
        </StandaloneDrawerNavigationProvider>
      );
    },
  });

  useDrawerRegistration({
    match: isGroupSettingsContent,
    priority: 95,
    render: () => <GroupSettingsDrawer />,
  });

  useDrawerRegistration({
    match: isScopedPermissionsContent,
    priority: 90,
    render: (content) => <ScopedPermissionsDrawer content={content} />,
  });

  useDrawerRegistration({
    match: isClaudeSettingsEditorContent,
    priority: 85,
    render: (content) => (
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Loading settings...
          </div>
        }
      >
        <LazyClaudeSettingsEditorDrawer content={content} />
      </Suspense>
    ),
  });

  useDrawerRegistration({
    match: isFileEditorContent,
    priority: 80,
    render: (content) => <EditorDrawerPanelLoader content={content} />,
  });

  useDrawerRegistration({
    match: isEntityDrawerContent,
    priority: 60,
    render: (content) => <EntityDrawerRouter content={content} />,
  });

  useDrawerRegistration({
    match: isFileChangeReviewContent,
    priority: 90,
    render: () => <FileChangeReviewDrawerPanel />,
  });

  useDrawerRegistration({
    match: isPasteContent,
    priority: 100,
    render: (content) => (
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Loading editor...
          </div>
        }
      >
        <LazyPasteDrawer content={content} />
      </Suspense>
    ),
  });

  useDrawerRegistration({
    match: isVerificationActionsConfigContent,
    priority: 85,
    render: () => (
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Loading...
          </div>
        }
      >
        <LazyVerificationActionsConfigDrawer />
      </Suspense>
    ),
  });

  useDrawerRegistration({
    match: isFeedbackContent,
    priority: 100,
    render: () => <FeedbackDrawer />,
  });

  useDrawerRegistration({
    match: isGitDiffReviewContent,
    priority: 85,
    render: (content) => <GitDiffReviewDrawerPanel content={content} />,
  });

  useDrawerRegistration({
    match: isPlanReviewContent,
    priority: 90,
    render: (content) => (
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Loading plan review...
          </div>
        }
      >
        <LazyPlanReviewDrawer content={content} />
      </Suspense>
    ),
  });

  useDrawerRegistration({
    match: isTagManagerContent,
    priority: 85,
    render: (content) => {
      const payload = getTagManagerPayload(content);
      if (!payload) return null;
      const initialContent = payload.initialView === 'create'
        ? { contentId: 'tag-creator-drawer', payload: { projectId: payload.projectId } }
        : tagManagerContent(payload.projectId, 'list');
      const initialTitle = payload.initialView === 'create' ? 'Create Tag' : 'Tags';
      return (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Loading...
            </div>
          }
        >
          <StandaloneDrawerNavigationProvider initialStack={[{ content: initialContent, title: initialTitle }]}>
            <LazyTagManagerDrawer projectId={payload.projectId} />
          </StandaloneDrawerNavigationProvider>
        </Suspense>
      );
    },
  });

  useDrawerRegistration({
    match: isTaskSettingsContent,
    priority: 85,
    render: (content) => {
      const payload = getTaskSettingsPayload(content);
      if (!payload) return null;
      return (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Loading...
            </div>
          }
        >
          <LazyTaskSettingsDrawer projectId={payload.projectId} />
        </Suspense>
      );
    },
  });

  useDrawerRegistration({
    match: isSkillBrowserContent,
    priority: 90,
    render: () => (
      <StandaloneDrawerNavigationProvider initialStack={[{ content: skillBrowserContent(), title: 'Skills' }]}>
        <SkillBrowserDrawer />
      </StandaloneDrawerNavigationProvider>
    ),
  });

  useDrawerRegistration({
    match: isSkillDetailContent,
    priority: 90,
    render: (content) => {
      const payload = getSkillDetailPayload(content);
      return <SkillDetailView skillId={payload?.skillId ?? ''} />;
    },
  });

  useDrawerRegistration({
    match: isPluginStoreContent,
    priority: 95,
    render: (content) => <StoreDrawer content={content} />,
  });

  useDrawerRegistration({
    match: isPluginDrawerContent,
    priority: 90,
    render: (content) => <PluginDrawerRenderer content={content} />,
  });

  useDrawerRegistration({
    match: isFeedEditorContent,
    priority: 85,
    render: (content) => (
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Loading editor...
          </div>
        }
      >
        <LazyFeedEditorDrawer content={content} />
      </Suspense>
    ),
  });

  useDrawerRegistration({
    match: isFeedPluginsContent,
    priority: 84,
    render: (content) => (
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Loading...
          </div>
        }
      >
        <LazyFeedPluginsList content={content} />
      </Suspense>
    ),
  });

  useDrawerRegistration({
    match: isFeedWidgetsContent,
    priority: 84,
    render: (content) => (
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Loading...
          </div>
        }
      >
        <LazyFeedWidgetsList content={content} />
      </Suspense>
    ),
  });

  useDrawerRegistration({
    match: isReferenceDetailContent,
    priority: 85,
    render: (content) => <ReferenceDetailDrawer content={content} />,
  });

  useDrawerRegistration({
    match: isHelpDocContent,
    priority: 70,
    render: (content) => <HelpDocDrawer content={content} />,
  });

  useDrawerRegistration({
    match: isReleaseNotesContent,
    priority: 100,
    render: (content) => <ReleaseNotesDrawer content={content} />,
  });

  return null;
}
