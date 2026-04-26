/**
 * useNewWorkstreamForm — Provides the ActionFormDefinition for the "New Workstream" quick form.
 *
 * @ai-context
 * - Returns the form definition + state needed to wire ActionFormBar into ChatInput
 * - CMD+N triggers showForm(), which sets the active form definition
 * - On submit: creates workstream with title + model, optionally sets up worktree
 * - When groups exist, includes a "Group" step for assigning to a group
 * - Model and project options resolved from live context (WorkstreamContext, EntityProvider)
 * - Step preferences persisted in localStorage
 * - Form is dismissed on Escape or after successful submission
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { defineActionForm } from '@vienna/chat-ui';
import type { ActionFormDefinition, ActionFormOption, ActionFormStep } from '@vienna/chat-ui';
import { useQuery, useMutation, useApolloClient, invalidateEntity, SET_BRANCH_SELECTION, GET_PROJECT_DIRECTORIES, GET_PERMISSION_TEMPLATES, APPLY_PERMISSION_TEMPLATE, GET_GIT_BRANCHES, LINK_WORKSTREAM_ENTITY } from '@vienna/graphql/client';
/** The client type expected by invalidateEntity (avoids direct @apollo/client/core import) */
type InvalidateEntityClient = Parameters<typeof invalidateEntity>[0];
import { DEFAULT_MODEL, MODEL_REGISTRY } from '../components/domain';
import { useWorkstreamActions, useWorkstreamList } from '../renderer/contexts/WorkstreamContext';
import { useWorkstreamGroups } from '../renderer/hooks/useWorkstreamGroups';

// ─── LocalStorage key for step preferences ──────────────────────────────────

const PREFS_KEY = 'vienna:action-form:new-workstream:disabled-steps';

function loadDisabledSteps(): string[] {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDisabledSteps(ids: string[]) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

// ─── Model option resolver ──────────────────────────────────────────────────

function resolveModelOptions(): Promise<ActionFormOption[]> {
  // Synchronous data but wrapped in Promise to match the resolve interface.
  // In the future this could fetch from a remote API.
  const options: ActionFormOption[] = Object.values(MODEL_REGISTRY).map((m) => ({
    value: m.id,
    label: m.name,
    description: m.description,
    color: m.color,
  }));
  return Promise.resolve(options);
}

// ─── Branch name sanitizer ──────────────────────────────────────────────────

function sanitizeForBranch(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// ─── Entity attachment ──────────────────────────────────────────────────────

export interface EntityAttachment {
  uri: string;
  type: string;
  title: string;
}

export interface ShowFormOptions {
  /** Pre-select a group */
  groupId?: string;
  /** Display name of the pre-selected group (used when cache hasn't propagated yet) */
  groupName?: string;
  /** Entities to attach to the new workstream */
  entities?: EntityAttachment[];
  /** Called after the workstream is successfully created, with the new workstream ID */
  onCreated?: (workstreamId: string) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface WorktreeCreationError {
  workstreamId: string;
  originalBranch: string;
  dirPaths: string[];
  message: string;
}

export interface UseNewWorkstreamFormReturn {
  /** The active form definition, or null if the form is not showing */
  activeForm: ActionFormDefinition | null;
  /** Show the new workstream form with optional pre-fill options */
  showForm: (options?: string | ShowFormOptions) => void;
  /** Dismiss the form */
  dismissForm: () => void;
  /** Handle form submission */
  handleSubmit: (formId: string, answers: Record<string, string>) => void;
  /** Disabled step IDs (persisted) */
  disabledStepIds: string[];
  /** Handle preference changes */
  handlePreferencesChange: (ids: string[]) => void;
  /** Workstream ID currently having its worktrees created (null if none) */
  pendingWorktreeWorkstreamId: string | null;
  /** Worktree creation error info (null if none) */
  worktreeCreationError: WorktreeCreationError | null;
  /** Clear the worktree creation error */
  clearWorktreeCreationError: () => void;
  /** Retry worktree creation with a new branch name */
  retryWorktreeCreation: (newBranch: string) => void;
}

const NO_GROUP_VALUE = '__none__';
const CREATE_GROUP_VALUE = '__create__';
const NO_TEMPLATE_VALUE = '__none__';

export function useNewWorkstreamForm(): UseNewWorkstreamFormReturn {
  const [activeForm, setActiveForm] = useState<ActionFormDefinition | null>(null);
  const [disabledStepIds, setDisabledStepIds] = useState<string[]>(loadDisabledSteps);
  const [chainingFromGroup, setChainingFromGroup] = useState(false);
  const [pendingWorktreeWorkstreamId, setPendingWorktreeWorkstreamId] = useState<string | null>(null);
  const [worktreeCreationError, setWorktreeCreationError] = useState<WorktreeCreationError | null>(null);
  const pendingGroupIdRef = useRef<string | undefined>(undefined);
  const pendingGroupNameRef = useRef<string | undefined>(undefined);
  const pendingEntitiesRef = useRef<EntityAttachment[]>([]);
  const onCreatedCallbackRef = useRef<((workstreamId: string) => void) | undefined>(undefined);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  const client = useApolloClient();
  const { createWorkstream, switchWorkstreamModel } = useWorkstreamActions();
  const { projectId } = useWorkstreamList();
  const { groups, createGroup } = useWorkstreamGroups(projectId);
  const [setBranchSelection] = useMutation(SET_BRANCH_SELECTION);
  const [applyPermissionTemplate] = useMutation(APPLY_PERMISSION_TEMPLATE);
  const [linkEntityMutation] = useMutation(LINK_WORKSTREAM_ENTITY);
  const { data: projectDirsData } = useQuery(GET_PROJECT_DIRECTORIES, {
    variables: { projectId: projectId! },
    skip: !projectId,
  });
  const { data: templatesData } = useQuery(GET_PERMISSION_TEMPLATES);

  // Use ref to capture latest values for the submit handler
  const actionsRef = useRef({ createWorkstream, switchWorkstreamModel, createGroup, projectId, setBranchSelection, applyPermissionTemplate, linkEntityMutation, projectDirsData, client });
  actionsRef.current = { createWorkstream, switchWorkstreamModel, createGroup, projectId, setBranchSelection, applyPermissionTemplate, linkEntityMutation, projectDirsData, client };

  // Store group options in a ref so the resolve function can access them
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  // Store templates in a ref for the resolve function
  const templates = templatesData?.permissionTemplates ?? [];
  const templatesRef = useRef(templates);
  templatesRef.current = templates;

  // Store project dirs and apollo client in refs for the worktree combobox resolver
  const projectDirsRef = useRef(projectDirsData);
  projectDirsRef.current = projectDirsData;
  const apolloClientRef = useRef(client);
  apolloClientRef.current = client;

  // Track known branches so submit handler can distinguish existing vs new
  // and pass along the worktree path for branches that already have one
  const knownBranchesRef = useRef<Map<string, string | null>>(new Map());
  // Track which project directories are git repos (populated by worktree step resolve)
  const gitRepoDirsRef = useRef<Set<string>>(new Set());

  // Build a form definition.
  // Called at show-time so it always reflects the correct state.
  const buildFormDefinition = useCallback((entities: EntityAttachment[] = []) => {
    const steps: ActionFormStep[] = [];

    // If entities are being attached, show them as the first step
    if (entities.length > 0) {
      steps.push({
        id: 'entities',
        header: 'Entities',
        question: entities.length === 1
          ? 'This entity will be linked to the new workstream'
          : `These ${entities.length} entities will be linked to the new workstream`,
        type: 'display',
        items: entities.map((e) => ({
          value: e.uri,
          label: e.title,
          description: e.type,
        })),
        value: entities.map((e) => e.uri).join(','),
        required: true,
      });
    }

    steps.push(
      {
        id: 'name',
        header: 'Name',
        question: 'What should we call this workstream?',
        type: 'text',
        placeholder: 'e.g. Fix auth bug, Add dark mode, Refactor API',
        required: true,
        helpDocId: '/features/workstreams',
        // Pre-fill from first entity title when entities are attached
        ...(entities.length === 1 ? { defaultValue: entities[0].title } : {}),
      },
      {
        id: 'model',
        header: 'Model',
        question: 'Which model should power this workstream?',
        type: 'select',
        resolve: resolveModelOptions,
        defaultValue: DEFAULT_MODEL,
        skippable: true,
        defaultEnabled: true,
      },
    );

    steps.push({
      id: 'group',
      header: 'Scope',
      question: 'Add to a scope?',
      type: 'select',
      resolve: async () => {
        const currentGroups = groupsRef.current;
        const pendingId = pendingGroupIdRef.current;
        const pendingName = pendingGroupNameRef.current;
        // If we're chaining from scope creation, the Apollo cache may not have
        // propagated the new scope yet. Inject it explicitly so the review
        // screen can display the name instead of the raw UUID.
        const groups = pendingId && pendingName && !currentGroups.find((g) => g.id === pendingId)
          ? [{ id: pendingId, name: pendingName }, ...currentGroups]
          : currentGroups;
        return [
          { value: NO_GROUP_VALUE, label: 'None' },
          { value: CREATE_GROUP_VALUE, label: 'Create new scope' },
          ...groups.map((g) => ({ value: g.id, label: g.name })),
        ];
      },
      freeformOption: {
        optionValue: CREATE_GROUP_VALUE,
        placeholder: 'e.g. Feature work, Bug fixes',
      },
      defaultValue: () => pendingGroupIdRef.current || NO_GROUP_VALUE,
      skippable: true,
      defaultEnabled: true,
    });

    if (templatesRef.current.length > 0) {
      steps.push({
        id: 'template',
        header: 'Permissions',
        question: 'Apply a permission template?',
        type: 'select',
        resolve: async (): Promise<ActionFormOption[]> => {
          const currentTemplates = templatesRef.current;
          return [
            { value: NO_TEMPLATE_VALUE, label: 'None' },
            ...currentTemplates.map((t) => ({
              value: String(t.id ?? ''),
              label: String(t.name ?? ''),
              description: t.description || undefined,
            })),
          ];
        },
        defaultValue: NO_TEMPLATE_VALUE,
        skippable: true,
        defaultEnabled: true,
      });
    }

    steps.push({
      id: 'worktree',
      header: 'Worktree',
      question: 'Select an existing branch or type a new branch name',
      type: 'combobox',
      placeholder: 'e.g. fix-auth-bug',
      noneValue: '__none__',
      noneLabel: 'None (skip worktree)',
      resolve: async (): Promise<ActionFormOption[]> => {
        const dirs = projectDirsRef.current?.projectDirectories ?? [];
        if (dirs.length === 0) return [];

        // Query all directories for branches to determine which are git repos.
        // Use the first git repo's branches for the combobox options.
        const gitRepoDirs = new Set<string>();
        type BranchInfo = { name: string; isRemote: boolean; hasWorktree: boolean; worktreePath?: string | null };
        let firstGitRepoBranches: BranchInfo[] = [];

        for (const dir of dirs) {
          if (!dir.path) continue;
          try {
            const result = await apolloClientRef.current.query({
              query: GET_GIT_BRANCHES,
              variables: { path: dir.path },
              fetchPolicy: 'network-only',
            });
            const branches = (result.data?.gitBranches ?? []) as BranchInfo[];
            if (branches.length > 0) {
              gitRepoDirs.add(dir.path);
              if (firstGitRepoBranches.length === 0) {
                firstGitRepoBranches = branches;
              }
            }
          } catch {
            // Not a git repo or query failed — skip
          }
        }

        gitRepoDirsRef.current = gitRepoDirs;

        // No git repos among project directories — nothing to offer
        if (gitRepoDirs.size === 0) return [];

        const localBranches = firstGitRepoBranches.filter((b) => !b.isRemote);
        // Populate known branches so submit handler knows which are existing
        // and can pass worktree paths for branches that already have one
        knownBranchesRef.current = new Map(localBranches.map((b) => [b.name, b.worktreePath ?? null]));
        return localBranches.map((b) => ({
          value: b.name,
          label: b.name,
          description: b.hasWorktree ? 'has worktree' : undefined,
        }));
      },
      defaultValue: (context: Record<string, string>) => {
        if (!context.name) return '__none__';
        const groupId = context.group;
        const group = groupId && groupId !== NO_GROUP_VALUE
          ? groupsRef.current.find((g) => g.id === groupId)
          : undefined;
        const prefix = group ? sanitizeForBranch(group.name) : '';
        const name = sanitizeForBranch(context.name);
        return prefix ? `${prefix}-${name}` : name;
      },
      skippable: true,
      defaultEnabled: true,
    });

    return defineActionForm({
      id: 'new-workstream',
      title: 'New Workstream',
      icon: 'plus',
      shortcut: 'mod+n',
      steps,
      onSubmit: async () => {
        // No-op — actual submission handled by handleSubmit below
      },
    });
  }, []);

  const showForm = useCallback((options?: string | ShowFormOptions) => {
    // Support legacy call signature: showForm(groupId?: string)
    const opts: ShowFormOptions = typeof options === 'string'
      ? { groupId: options }
      : options ?? {};
    pendingGroupIdRef.current = opts.groupId;
    pendingGroupNameRef.current = opts.groupName;
    pendingEntitiesRef.current = opts.entities ?? [];
    onCreatedCallbackRef.current = opts.onCreated;
    // When chaining from group creation, show all steps regardless of
    // persisted preferences — the user expects the full wizard flow.
    setChainingFromGroup(!!opts.groupId);
    setActiveForm(buildFormDefinition(pendingEntitiesRef.current));
  }, [buildFormDefinition]);

  const dismissForm = useCallback(() => {
    setActiveForm(null);
    setChainingFromGroup(false);
  }, []);

  const handleSubmit = useCallback(
    (_formId: string, answers: Record<string, string>) => {
      // Dismiss immediately so the form closes without waiting for async work
      setActiveForm(null);
      setChainingFromGroup(false);

      // Group from form step takes precedence, then pending ref
      let groupId = pendingGroupIdRef.current;
      let newGroupName: string | undefined;
      if (answers.group && answers.group !== NO_GROUP_VALUE) {
        // When freeformOption is used, the stored answer is the typed group name,
        // not an existing group ID. Detect this by checking against known groups.
        const isExistingGroup = groupsRef.current.some((g) => g.id === answers.group);
        if (isExistingGroup) {
          groupId = answers.group;
        } else {
          newGroupName = answers.group.trim();
        }
      }
      pendingGroupIdRef.current = undefined;

      // Capture entities before clearing the ref
      const entities = [...pendingEntitiesRef.current];
      pendingEntitiesRef.current = [];

      const { createWorkstream, switchWorkstreamModel, createGroup, setBranchSelection, applyPermissionTemplate, linkEntityMutation, projectDirsData, client } = actionsRef.current;
      const title = answers.name?.trim() || 'New Workstream';
      const model = answers.model || DEFAULT_MODEL;

      void (async () => {
        // Create the group first if the user typed a new group name
        if (newGroupName) {
          groupId = (await createGroup(newGroupName)) ?? undefined;
        }

        const newId = await createWorkstream(title, groupId);

        if (newId) {
          await switchWorkstreamModel(newId, model);
          // Invoke the onCreated callback (e.g. to assign the workstream to a task)
          onCreatedCallbackRef.current?.(newId);
          onCreatedCallbackRef.current = undefined;
        }

        // Link entities to the new workstream
        if (newId && entities.length > 0) {
          await Promise.all(
            entities.map((entity) =>
              linkEntityMutation({
                variables: {
                  workstreamId: newId,
                  entityUri: entity.uri,
                  entityType: entity.type,
                  entityTitle: entity.title,
                },
              }),
            ),
          );
        }

        // Apply permission template if selected
        const templateId = answers.template;
        if (newId && templateId && templateId !== NO_TEMPLATE_VALUE) {
          await applyPermissionTemplate({
            variables: { templateId, scopeType: 'workstream', scopeId: newId },
          });
        }

        const worktreeBranch = answers.worktree?.trim();
        if (newId && worktreeBranch && worktreeBranch !== '__none__') {
          // If the branch already exists, just set the selection without creating a worktree.
          // If it's a new branch name, create a worktree.
          const isExistingBranch = knownBranchesRef.current.has(worktreeBranch);
          const existingWorktreePath = isExistingBranch ? knownBranchesRef.current.get(worktreeBranch) : null;
          const branch = isExistingBranch ? worktreeBranch : sanitizeForBranch(worktreeBranch);
          // Only create worktrees for directories that are git repos
          const allDirs = projectDirsData?.projectDirectories ?? [];
          const dirs = allDirs.filter((d) => d.path && gitRepoDirsRef.current.has(d.path));

          if (isMountedRef.current) setPendingWorktreeWorkstreamId(newId);
          try {
            const results = await Promise.all(
              dirs.map((dir) =>
                setBranchSelection({
                  variables: {
                    workstreamId: newId,
                    directoryPath: dir.path ?? '',
                    branch,
                    createWorktree: !isExistingBranch,
                    // Pass the existing worktree path so the branch selection
                    // is saved with the correct working directory
                    ...(existingWorktreePath ? { worktreePath: existingWorktreePath } : {}),
                  },
                }),
              ),
            );
            if (!isMountedRef.current) return;
            // Invalidate each BranchSelection by ID — evicts stale cache entries and
            // triggers a refetch of all active queries (GetDirectoriesWithBranchInfo,
            // GetGitBranches, etc.) so the footer and branch picker update immediately.
            for (const result of results) {
              const id = result.data?.setBranchSelection?.branchSelection?.id;
              if (id) {
                invalidateEntity(client as unknown as InvalidateEntityClient, 'BranchSelection', id);
              }
            }
            // Surface any worktree creation errors (branch selection was saved without worktree).
            // Aggregate all failed directories into a single error message so the user
            // sees the full picture rather than fixing them one at a time.
            const errors = results
              .map((r) => r.data?.setBranchSelection?.worktreeError)
              .filter((e): e is string => !!e);
            if (errors.length > 0) {
              setWorktreeCreationError({
                workstreamId: newId,
                originalBranch: branch,
                dirPaths: dirs.map((d) => d.path).filter((p): p is string => !!p),
                message: errors.length === 1
                  ? errors[0]!
                  : `${errors.length} directories failed:\n${errors.join('\n')}`,
              });
            }
          } finally {
            if (isMountedRef.current) setPendingWorktreeWorkstreamId(null);
          }
        }
      })();
    },
    [],
  );

  const handlePreferencesChange = useCallback((ids: string[]) => {
    setDisabledStepIds(ids);
    saveDisabledSteps(ids);
  }, []);

  const clearWorktreeCreationError = useCallback(() => {
    setWorktreeCreationError(null);
  }, []);

  const retryWorktreeCreation = useCallback((newBranch: string) => {
    const error = worktreeCreationError;
    if (!error) return;
    setWorktreeCreationError(null);

    const { setBranchSelection, client } = actionsRef.current;
    const branch = sanitizeForBranch(newBranch);

    if (isMountedRef.current) setPendingWorktreeWorkstreamId(error.workstreamId);
    void (async () => {
      try {
        const results = await Promise.all(
          error.dirPaths.map((dirPath) =>
            setBranchSelection({
              variables: {
                workstreamId: error.workstreamId,
                directoryPath: dirPath,
                branch,
                createWorktree: true,
              },
            }),
          ),
        );
        if (!isMountedRef.current) return;
        for (const result of results) {
          const id = result.data?.setBranchSelection?.branchSelection?.id;
          if (id) {
            invalidateEntity(client as unknown as InvalidateEntityClient, 'BranchSelection', id);
          }
        }
        const errors = results
          .map((r) => r.data?.setBranchSelection?.worktreeError)
          .filter((e): e is string => !!e);
        if (errors.length > 0) {
          setWorktreeCreationError({
            workstreamId: error.workstreamId,
            originalBranch: branch,
            dirPaths: error.dirPaths,
            message: errors.length === 1
              ? errors[0]!
              : `${errors.length} directories failed:\n${errors.join('\n')}`,
          });
        }
      } finally {
        if (isMountedRef.current) setPendingWorktreeWorkstreamId(null);
      }
    })();
  }, [worktreeCreationError]);

  // When chaining from group creation, show all steps by returning empty
  // disabled list — persisted preferences only apply to standalone Cmd+N flow.
  const effectiveDisabledStepIds = chainingFromGroup ? [] : disabledStepIds;

  return {
    activeForm,
    showForm,
    dismissForm,
    handleSubmit,
    disabledStepIds: effectiveDisabledStepIds,
    handlePreferencesChange,
    pendingWorktreeWorkstreamId,
    worktreeCreationError,
    clearWorktreeCreationError,
    retryWorktreeCreation,
  };
}
