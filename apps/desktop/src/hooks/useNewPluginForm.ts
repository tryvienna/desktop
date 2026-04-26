/**
 * useNewPluginForm — Provides the ActionFormDefinition for the "New Plugin" quick form.
 *
 * @ai-context
 * - Returns the form definition + state needed to wire ActionFormBar into ChatInput
 * - On submit: runs `vcli plugin scaffold` via shell.execute(), then auto-loads the plugin
 * - Detects registry directories from project directories for output path
 * - Directory step offers: detected registries, project dirs, "Browse…" (native picker), freeform
 * - Directory step supports filesystem path auto-complete via resolveOnInput
 * - "Browse…" intercept via onSelectOption opens native picker without advancing
 * - Home directory resolved via shell IPC (process.env.HOME unavailable in renderer)
 * - Step preferences persisted via usePersistedState
 * - Form is dismissed on Escape or after successful submission
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { defineActionForm } from '@vienna/chat-ui';
import type { ActionFormDefinition, ActionFormOption } from '@vienna/chat-ui';
import { useQuery, GET_PROJECT_DIRECTORIES } from '@vienna/graphql/client';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../ipc';
import { useWorkstreamList } from '../renderer/contexts/WorkstreamContext';
import { useAddPluginToDirectories } from '../renderer/hooks/useAddPluginToDirectories';
import { useDrawerActions } from '../lib/drawer';
import { fileEditorTab } from '../components/drawer/content';
import { usePersistedState } from '../storage';

// ─── Constants ─────────────────────────────────────────────────────────────

const KEBAB_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const BROWSE_VALUE = '__browse__';

const AUTH_OPTIONS: ActionFormOption[] = [
  { value: 'none', label: 'None', description: 'No authentication needed' },
  { value: 'oauth', label: 'OAuth', description: 'OAuth 2.0 + PKCE flow with token refresh' },
  { value: 'pat', label: 'Personal Access Token', description: 'User-provided access token' },
  { value: 'api-key', label: 'API Key', description: 'Simple API key authentication' },
];

const CANVAS_OPTIONS: ActionFormOption[] = [
  { value: 'sidebar', label: 'Sidebar', description: 'Navigation section in the left sidebar' },
  { value: 'menu-bar', label: 'Menu Bar', description: 'Icon + popover in the top-right menu bar' },
  { value: 'feed', label: 'Feed', description: 'Full component rendered on the home feed' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Expand ~ using a known home directory string.
 * We cannot use process.env.HOME in the renderer (Electron contextBridge
 * does not expose it), so the caller must provide the resolved home path.
 */
function expandTilde(p: string, home: string): string {
  if (!p.startsWith('~') || !home) return p;
  return p.replace(/^~/, home);
}

/**
 * Resolve the user's home directory via shell IPC.
 * Cached after first call for the lifetime of the hook.
 */
async function resolveHomeDir(): Promise<string> {
  const ipc = getApi(api);
  const result = await ipc.shell.execute({
    command: 'echo $HOME',
    cwd: '/',
    timeoutMs: 5000,
  });
  return result.stdout.trim();
}

/** Escape a value for safe interpolation inside single-quoted shell strings. */
function shellEscape(value: string): string {
  // Replace each ' with '\'' (end quote, escaped quote, start quote)
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * List directory entries at a given path for filesystem auto-complete.
 * Returns only directories (for the output path picker).
 * Uses `find` instead of shell globbing to avoid issues with metacharacters in path.
 */
async function listDirectories(basePath: string): Promise<ActionFormOption[]> {
  const ipc = getApi(api);
  try {
    const escaped = shellEscape(basePath);
    const result = await ipc.shell.execute({
      command: `find ${escaped} -maxdepth 1 -type d -not -path ${escaped} 2>/dev/null | head -20 | sort`,
      cwd: '/',
      timeoutMs: 5000,
    });
    if (result.exitCode !== 0 || !result.stdout.trim()) return [];
    return result.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((dirPath) => {
        const name = dirPath.split('/').pop() ?? dirPath;
        return {
          value: dirPath.endsWith('/') ? dirPath : `${dirPath}/`,
          label: name,
          description: dirPath,
        };
      });
  } catch {
    return [];
  }
}

interface VcliResolution {
  /** The command to run (e.g. `node "/path/to/vcli.mjs"` or just `vcli`) */
  command: string;
  /** Working directory for the command */
  cwd: string;
  /** Human-readable description of how vcli was found */
  strategy: string;
}

/**
 * Search for vcli. Returns the command + cwd to use, or null if not found.
 *
 * Search order:
 *   0. Bundled vcli in app Resources (via IPC — works in packaged app)
 *   1. registryRoot from resolve callback (packages/vcli/bin/vcli.mjs)
 *   2. Each project directory (packages/vcli/bin/vcli.mjs)
 *   3. Global `vcli` on PATH (run directly, cwd = home)
 *   4. npx @tryvienna/cli (last resort)
 */
async function resolveVcli(
  ipc: ReturnType<typeof getApi<typeof api>>,
  registryRoot: string | null,
  projectDirs: Array<{ path?: string | null }>,
  home: string,
): Promise<VcliResolution> {
  // Strategy 0: Bundled vcli resolved by the main process
  try {
    const bundled = await ipc.cli.getVcliCommand({});
    if (bundled.command) {
      return {
        command: bundled.command,
        cwd: home,
        strategy: bundled.strategy,
      };
    }
  } catch {
    // IPC not available or method not implemented — continue
  }

  const registryRoots: string[] = [];
  if (registryRoot) registryRoots.push(registryRoot);
  for (const dir of projectDirs) {
    if (dir.path && !registryRoots.includes(dir.path)) {
      registryRoots.push(dir.path);
    }
  }

  const candidates = registryRoots.map((r) => `${r}/packages/vcli/bin/vcli.mjs`);

  // Strategy 1+2: Check each candidate bin path
  for (const binPath of candidates) {
    try {
      const result = await ipc.shell.execute({
        command: `test -f "${binPath}" && echo "found"`,
        cwd: '/',
        timeoutMs: 3000,
      });
      if (result.stdout.trim() === 'found') {
        const root = binPath.replace(/\/packages\/vcli\/bin\/vcli\.mjs$/, '');
        return {
          command: `node "${binPath}"`,
          cwd: root,
          strategy: `direct node (${binPath})`,
        };
      }
    } catch {
      // Continue
    }
  }

  // Strategy 3: Global vcli on PATH
  try {
    const result = await ipc.shell.execute({
      command: 'which vcli 2>/dev/null',
      cwd: '/',
      timeoutMs: 3000,
    });
    const globalPath = result.stdout.trim();
    if (globalPath && result.exitCode === 0) {
      return {
        command: 'vcli',
        cwd: home,
        strategy: `global vcli (${globalPath})`,
      };
    }
  } catch {
    // No global vcli
  }

  // Strategy 4: npx fallback
  return {
    command: 'npx --yes @tryvienna/cli',
    cwd: home,
    strategy: 'npx (fallback — vcli not found anywhere)',
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export interface UseNewPluginFormReturn {
  activeForm: ActionFormDefinition | null;
  showForm: () => void;
  dismissForm: () => void;
  handleSubmit: (formId: string, answers: Record<string, string>) => Promise<void | { error?: string }>;
  disabledStepIds: string[];
  handlePreferencesChange: (ids: string[]) => void;
}

export function useNewPluginForm(): UseNewPluginFormReturn {
  const [activeForm, setActiveForm] = useState<ActionFormDefinition | null>(null);
  const [disabledStepIds, setDisabledStepIds] = usePersistedState('pluginFormDisabledSteps');
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const { projectId } = useWorkstreamList();
  const { addPluginDirectory } = useAddPluginToDirectories();
  const { openTab } = useDrawerActions();
  const { data: projectDirsData } = useQuery(GET_PROJECT_DIRECTORIES, {
    variables: { projectId: projectId! },
    skip: !projectId,
  });

  const projectDirsRef = useRef(projectDirsData);
  projectDirsRef.current = projectDirsData;

  // Track the registry root path so the submit handler can use it as cwd
  const registryRootRef = useRef<string | null>(null);

  // Resolved home directory — populated lazily on first need
  const homeDirRef = useRef<string | null>(null);

  /** Get home dir, resolving via IPC if not yet cached */
  const getHomeDir = useCallback(async (): Promise<string> => {
    if (homeDirRef.current) return homeDirRef.current;
    const home = await resolveHomeDir();
    homeDirRef.current = home;
    return home;
  }, []);

  const buildFormDefinition = useCallback(() => {
    return defineActionForm({
      id: 'new-plugin',
      title: 'New Plugin',
      icon: 'puzzle',
      steps: [
        {
          id: 'name',
          header: 'Name',
          question: 'What should we call this plugin?',
          type: 'text',
          placeholder: 'e.g. slack-notifier, weather-dashboard, my-plugin',
          required: true,
          validate: (value: string) => {
            if (!KEBAB_PATTERN.test(value)) {
              return 'Must be lowercase with hyphens (e.g. my-plugin)';
            }
            return null;
          },
        },
        {
          id: 'description',
          header: 'Description',
          question: 'Describe what this plugin does',
          type: 'text',
          placeholder: 'e.g. Shows Slack notifications in the sidebar',
          defaultValue: 'A Vienna plugin',
          skippable: true,
          defaultEnabled: true,
        },
        {
          id: 'auth',
          header: 'Auth',
          question: 'What authentication does your API need?',
          type: 'select',
          options: AUTH_OPTIONS,
          defaultValue: 'none',
          skippable: true,
          defaultEnabled: true,
        },
        {
          id: 'canvases',
          header: 'Canvases',
          question: 'Which UI surfaces should this plugin use? A drawer panel is included automatically.',
          type: 'multi-select',
          options: CANVAS_OPTIONS,
          defaultValue: ['sidebar', 'menu-bar'],
          skippable: true,
          defaultEnabled: true,
        },
        {
          id: 'entities',
          header: 'Entities',
          question: 'What data types does this plugin work with?',
          type: 'text',
          placeholder: 'e.g. issue, comment, report (comma-separated, optional)',
          skippable: true,
          defaultEnabled: false,
          validate: (value: string) => {
            if (!value.trim()) return null;
            const names = value.split(',').map((s) => s.trim()).filter(Boolean);
            for (const name of names) {
              if (!KEBAB_PATTERN.test(name)) {
                return `"${name}" must be lowercase with hyphens`;
              }
            }
            return null;
          },
        },
        {
          id: 'directory',
          header: 'Directory',
          question: 'Where should the plugin folder be created? A new directory named after your plugin will be created here.',
          type: 'combobox',
          placeholder: 'Parent directory (e.g. ~/Documents/dev)',
          resolve: async (): Promise<ActionFormOption[]> => {
            const dirs = projectDirsRef.current?.projectDirectories ?? [];
            const ipc = getApi(api);
            const options: ActionFormOption[] = [];

            // Check each project directory for a registry
            for (const dir of dirs) {
              if (!dir.path) continue;
              try {
                const result = await ipc.shell.execute({
                  command: '(test -d plugins && echo "has-plugins") ; (test -f packages/vcli/bin/vcli.mjs && echo "has-vcli")',
                  cwd: dir.path,
                  timeoutMs: 5000,
                });
                const output = result.stdout.trim();
                const hasPlugins = output.includes('has-plugins');
                const hasVcli = output.includes('has-vcli');

                if (hasPlugins || hasVcli) {
                  registryRootRef.current = dir.path;
                }

                if (hasPlugins) {
                  options.push({
                    value: `${dir.path}/plugins`,
                    label: `${dir.label ?? dir.path}/plugins`,
                    description: 'Plugin registry',
                  });
                }
              } catch {
                // Registry check failed — skip
              }

              options.push({
                value: dir.path,
                label: dir.label ?? dir.path,
              });
            }

            // Add a "Browse…" option that triggers the native directory picker
            options.push({
              value: BROWSE_VALUE,
              label: 'Browse…',
              description: 'Open folder picker',
            });

            return options;
          },
          // ── Dynamic filesystem auto-complete ──
          resolveOnInput: async (text: string): Promise<ActionFormOption[]> => {
            if (!text || text.length < 2) return [];

            const home = homeDirRef.current ?? await getHomeDir();
            const expanded = expandTilde(text, home);

            if (!expanded.startsWith('/')) return [];

            const lastSlash = expanded.lastIndexOf('/');
            const basePath = expanded.slice(0, lastSlash + 1);

            return listDirectories(basePath.length > 0 ? basePath : '/');
          },
          // ── Intercept "Browse…" to open native picker without advancing ──
          onSelectOption: async (value: string): Promise<string | null> => {
            if (value !== BROWSE_VALUE) return value;

            const ipc = getApi(api);
            const { path: pickedPath } = await ipc.shell.pickDirectory({
              title: 'Choose plugin directory',
            });
            if (!pickedPath) return null; // Stay on this step
            return pickedPath;
          },
          required: true,
          validate: async (value: string, answers: Record<string, string>): Promise<string | null> => {
            // Skip validation when value is empty — this happens when Browse sets the
            // answer via setAnswer() but goToNext() fires before React commits the update.
            if (!value.trim()) return null;
            const name = answers.name;
            if (!name) return null;

            const home = homeDirRef.current ?? await getHomeDir();
            let expanded = expandTilde(value, home);
            if (expanded.endsWith('/') && expanded.length > 1) {
              expanded = expanded.slice(0, -1);
            }
            const targetDir = `${expanded}/${name}`;

            const ipc = getApi(api);
            try {
              const result = await ipc.shell.execute({
                command: `test -d "${targetDir}" && echo "exists"`,
                cwd: '/',
                timeoutMs: 3000,
              });
              if (result.stdout.trim() === 'exists') {
                return `Directory "${targetDir}" already exists`;
              }
            } catch {
              // Can't check — proceed anyway
            }
            return null;
          },
        },
      ],
      onSubmit: async () => {
        // No-op — actual submission handled by handleSubmit below
      },
    });
  }, [getHomeDir]);

  const showForm = useCallback(() => {
    // Pre-resolve home directory so it's available for tilde expansion
    void getHomeDir();
    setActiveForm(buildFormDefinition());
  }, [buildFormDefinition, getHomeDir]);

  const dismissForm = useCallback(() => {
    setActiveForm(null);
  }, []);

  const handleSubmit = useCallback(
    async (_formId: string, answers: Record<string, string>): Promise<void | { error?: string }> => {
      const ipc = getApi(api);

      const name = answers.name?.trim();
      if (!name) {
        return { error: 'Plugin name is required' };
      }

      if (!KEBAB_PATTERN.test(name)) {
        return { error: 'Plugin name must be lowercase with hyphens (e.g. my-plugin)' };
      }

      const description = answers.description?.trim() || 'A Vienna plugin';
      const auth = answers.auth || 'none';
      const canvases = (answers.canvases || 'sidebar').split(', ').join(',');
      const entities = answers.entities?.trim() || '';
      let directory = answers.directory?.trim();
      if (!directory) {
        return { error: 'Output directory is required' };
      }

      try {
        const home = await getHomeDir();

        directory = expandTilde(directory, home);
        if (directory.endsWith('/') && directory.length > 1) {
          directory = directory.slice(0, -1);
        }

        // Pre-check: target directory must not already exist
        const targetDir = `${directory}/${name}`;
        try {
          const check = await ipc.shell.execute({
            command: `test -d "${targetDir}" && echo "exists"`,
            cwd: '/',
            timeoutMs: 3000,
          });
          if (check.stdout.trim() === 'exists') {
            return { error: `Directory "${targetDir}" already exists` };
          }
        } catch {
          // Can't check — proceed anyway
        }

        // Build the vcli scaffold command args.
        // Name, auth, and canvases are validated against known patterns (safe).
        // Description, directory, and entities are shell-escaped with single quotes.
        const args = [
          'plugin', 'scaffold',
          `--name=${name}`,
          `--auth=${auth}`,
          `--canvas=${canvases}`,
          `--description=${shellEscape(description)}`,
          `--output=${shellEscape(directory)}`,
        ];

        if (entities) {
          args.push(`--entity=${shellEscape(entities)}`);
        }

        const vcli = await resolveVcli(
          ipc,
          registryRootRef.current,
          projectDirsRef.current?.projectDirectories ?? [],
          home,
        );
        const command = `${vcli.command} ${args.join(' ')}`;
        const cwd = vcli.cwd;

        const result = await ipc.shell.execute({
          command,
          cwd,
          timeoutMs: 60_000,
        });

        if (result.exitCode !== 0) {
          const stderr = result.stderr?.trim() || '';
          const errorMsg = stderr.startsWith('Error: ')
            ? stderr.slice('Error: '.length).trim()
            : stderr || `Scaffold failed (exit code ${result.exitCode})`;
          console.error('[useNewPluginForm] Scaffold failed:', stderr);
          return { error: errorMsg };
        }

        // ── Success: auto-load, add to directories, reveal ────────────────
        const pluginDir = `${directory}/${name}`;

        try {
          await ipc.plugin.loadLocalPlugin({ directoryPath: pluginDir });
        } catch {
          // Plugin load failed — may need pnpm install first
        }

        // Open the plugin's index.ts in the Monaco editor drawer
        const indexPath = `${pluginDir}/src/index.ts`;

        // Add directory to sidebar, revealing the index file once the refetch completes
        await addPluginDirectory(pluginDir, indexPath);

        // Dismiss the form only on success
        setActiveForm(null);

        if (isMountedRef.current) {
          openTab(fileEditorTab(indexPath));
        }
      } catch (err) {
        console.error('[useNewPluginForm] Exception:', err);
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
    [getHomeDir, addPluginDirectory, openTab],
  );

  const handlePreferencesChange = useCallback((ids: string[]) => {
    setDisabledStepIds(ids);
  }, [setDisabledStepIds]);

  return {
    activeForm,
    showForm,
    dismissForm,
    handleSubmit,
    disabledStepIds,
    handlePreferencesChange,
  };
}
