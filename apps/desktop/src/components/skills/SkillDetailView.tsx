/**
 * SkillDetailView — Detail view for a single skill, shown via in-drawer navigation.
 *
 * @ai-context
 * - Pushed onto the drawer navigation stack from SkillBrowserDrawer
 * - Shows full skill info: icon, name, description, author, category, tags, version
 * - Action buttons: Install/Update/Uninstall, Enable/Disable toggle
 * - DrawerContainer provides back button automatically via navigation context
 */

import { useCallback, useMemo } from 'react';
import {
  Button,
  Separator,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@tryvienna/ui';
import { Zap, Download, Trash2, ArrowUpCircle, Check, HardDrive, Pencil, Globe, FolderOpen } from 'lucide-react';
import { DrawerContainer } from '../../lib/drawer/DrawerContainer';
import { useDrawerActions } from '../../lib/drawer';
import { fileEditorTab } from '../drawer/content';
import { useSkills } from './use-skills';
import { useWorkstreamList } from '../../renderer/contexts/WorkstreamContext';
import { useInstallDestinations } from './useInstallDestinations';

interface SkillDetailViewProps {
  skillId: string;
}

/** Extract display fields from either an installed or registry skill. */
function extractSkillFields(installed: Record<string, unknown> | undefined, registry: Record<string, unknown> | undefined) {
  const skill = installed ?? registry;
  if (!skill) return null;

  const name = String(skill.name ?? '');
  const description = String(skill.description ?? '');
  const icon = typeof skill.icon === 'string' ? skill.icon : null;
  const category = typeof skill.category === 'string' ? skill.category : null;
  const version = typeof skill.version === 'string' ? skill.version : null;

  // Tags: array of strings from either source
  let tags: string[] = [];
  if (Array.isArray(skill.tags)) {
    tags = skill.tags.filter((t): t is string => typeof t === 'string');
  }

  // Author: installed stores as string, registry stores as { name: string }
  let author: string | null = null;
  if (typeof skill.author === 'string') {
    author = skill.author;
  } else if (skill.author && typeof skill.author === 'object' && 'name' in skill.author) {
    author = typeof (skill.author as { name?: unknown }).name === 'string'
      ? (skill.author as { name: string }).name
      : null;
  }

  return { name, description, icon, category, version, tags, author };
}

export function SkillDetailView({ skillId }: SkillDetailViewProps) {
  const {
    installedSkills,
    registrySkills,
    install,
    uninstall,
    update,
    toggleEnabled,
    installingId,
    uninstallingId,
    updatingId,
  } = useSkills();
  const { openTab } = useDrawerActions();
  const { projectId } = useWorkstreamList();
  const projectDirectories = useInstallDestinations(projectId);

  const installedSkill = useMemo(
    () => installedSkills.find((s) => s.id === skillId),
    [installedSkills, skillId],
  );

  const registrySkill = useMemo(
    () => registrySkills.find((s) => s.id === skillId),
    [registrySkills, skillId],
  );

  const isInstalled = !!installedSkill;
  const isLocal = installedSkill?.source === 'local';
  const hasUpdate = installedSkill?.hasUpdate ?? false;
  const installing = installingId === skillId;
  const uninstalling = uninstallingId === skillId;
  const updating = updatingId === skillId;

  const fields = useMemo(
    () => extractSkillFields(installedSkill, registrySkill),
    [installedSkill, registrySkill],
  );

  const handleInstall = useCallback(async (destination: string) => {
    await install(skillId, destination);
  }, [install, skillId]);

  const handleUninstall = useCallback(async () => {
    await uninstall(skillId);
  }, [uninstall, skillId]);

  const handleUpdate = useCallback(async () => {
    await update(skillId);
  }, [update, skillId]);

  const handleToggleEnabled = useCallback(async () => {
    if (!installedSkill) return;
    await toggleEnabled(skillId, !installedSkill.enabled);
  }, [toggleEnabled, skillId, installedSkill]);

  const handleEdit = useCallback(() => {
    if (!installedSkill?.path) return;
    const skillMdPath = `${installedSkill.path}/SKILL.md`;
    openTab(fileEditorTab(skillMdPath));
  }, [installedSkill, openTab]);

  if (!fields) {
    return (
      <DrawerContainer id="skill-detail" title="Skill">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Skill not found
        </div>
      </DrawerContainer>
    );
  }

  const { name, description, icon, category, tags, author, version } = fields;

  return (
    <DrawerContainer id="skill-detail" title={name}>
      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            {icon ? (
              <span className="text-xl">{icon}</span>
            ) : (
              <Zap className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">{name}</h2>
            {author && (
              <p className="text-xs text-muted-foreground">by {author}</p>
            )}
            {version && (
              <p className="text-xs text-muted-foreground">v{version}</p>
            )}
            {installedSkill?.path && (
              <p className="mt-1 truncate text-xs text-sky-600 dark:text-sky-400">
                {installedSkill.path.replace(/^\/Users\/[^/]+/, '~')}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {isInstalled && isLocal ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleToggleEnabled}
              >
                {installedSkill!.enabled ? 'Disable' : 'Enable'}
              </Button>
              <span className="inline-flex items-center gap-1 self-center rounded-full bg-sky-500/10 px-2 py-0.5 text-xs text-sky-600 dark:text-sky-400">
                <HardDrive className="h-3 w-3" />
                Local
              </span>
            </>
          ) : isInstalled ? (
            <>
              {hasUpdate && (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1"
                  disabled={updating}
                  onClick={handleUpdate}
                >
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  {updating ? 'Updating...' : 'Update'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleToggleEnabled}
              >
                {installedSkill!.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-destructive hover:bg-destructive/10"
                disabled={uninstalling}
                onClick={handleUninstall}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {uninstalling ? 'Removing...' : 'Uninstall'}
              </Button>
              {!hasUpdate && (
                <span className="inline-flex items-center gap-1 self-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" />
                  Installed
                </span>
              )}
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-1" disabled={installing}>
                  <Download className="h-3.5 w-3.5" />
                  {installing ? 'Installing...' : 'Install'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Install to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleInstall('global')}>
                  <Globe className="mr-2 h-4 w-4" />
                  Global (~/.claude)
                </DropdownMenuItem>
                {projectDirectories.map((dir) => (
                  <DropdownMenuItem key={dir.path} onClick={() => handleInstall(dir.path)}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {dir.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Separator />

        {/* Description */}
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground">
            Description
          </h3>
          <p className="text-sm text-foreground">{description}</p>
        </div>

        {/* Metadata */}
        {(category || tags.length > 0) && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              {category && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Category
                  </h3>
                  <span className="inline-flex w-fit rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs text-cyan-400 border border-cyan-500/20">
                    {category}
                  </span>
                </div>
              )}
              {tags.length > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-400 border border-cyan-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DrawerContainer>
  );
}
