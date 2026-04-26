import { useState } from 'react';
import { useQuery, useMutation } from '@vienna/graphql/client';
import {
  GET_CONTENT_PROFILES,
  FORK_CONTENT_PROFILE,
  SWITCH_CONTENT_PROFILE,
  DELETE_CONTENT_PROFILE,
} from '@vienna/graphql/client';
import { Button, Input, Badge, Separator, ConfirmDialog } from '@tryvienna/ui';
import { GitFork, Trash2, Check, ExternalLink, Download } from 'lucide-react';
import { PROFILE_SWITCH_EVENT } from '../quick-actions/use-quick-actions';

const FEATURED_PROFILES = [
  { name: 'solo-founder', icon: '🚀', label: 'Solo Technical Founder', description: 'Changelogs, launch marketing, revenue tracking, outreach', url: 'https://github.com/tryvienna/profile-solo-founder.git' },
  { name: 'backend-engineer', icon: '🔧', label: 'Backend Engineer', description: 'Error triage, migrations, PR reviews, API dev, postmortems', url: 'https://github.com/tryvienna/profile-backend-engineer.git' },
  { name: 'frontend-engineer', icon: '🎨', label: 'Frontend Engineer', description: 'Design-to-code, accessibility, performance, E2E tests', url: 'https://github.com/tryvienna/profile-frontend-engineer.git' },
  { name: 'engineering-manager', icon: '📊', label: 'Engineering Manager', description: '1:1 prep, sprint retros, perf reviews, stakeholder updates', url: 'https://github.com/tryvienna/profile-engineering-manager.git' },
  { name: 'devops-engineer', icon: '☁️', label: 'DevOps / Platform Engineer', description: 'Alert triage, Terraform, K8s debugging, incident response', url: 'https://github.com/tryvienna/profile-devops-engineer.git' },
  { name: 'data-engineer', icon: '📊', label: 'Data Engineer / Scientist', description: 'SQL generation, dbt models, pipeline debugging, profiling', url: 'https://github.com/tryvienna/profile-data-engineer.git' },
  { name: 'technical-pm', icon: '🎯', label: 'Technical PM', description: 'Feature prioritization, PRDs, sprint summaries, release notes', url: 'https://github.com/tryvienna/profile-technical-pm.git' },
] as const;

export function ProfileSettings() {
  const { data, refetch } = useQuery(GET_CONTENT_PROFILES);
  const [forkProfile, { loading: forking }] = useMutation(FORK_CONTENT_PROFILE);
  const [switchProfile] = useMutation(SWITCH_CONTENT_PROFILE);
  const [deleteProfile] = useMutation(DELETE_CONTENT_PROFILE);

  const [forkUrl, setForkUrl] = useState('');
  const [forkError, setForkError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [forkingFeatured, setForkingFeatured] = useState<string | null>(null);

  const profiles = data?.contentProfiles ?? [];
  const installedNames = new Set(profiles.map((p) => p.name));

  const handleFork = async (url?: string) => {
    const gitUrl = url ?? forkUrl.trim();
    if (!gitUrl) return;

    try {
      setForkError(null);
      await forkProfile({ variables: { gitUrl } });
      if (!url) setForkUrl('');
      refetch();
    } catch (err) {
      setForkError(err instanceof Error ? err.message : 'Failed to fork profile');
    }
  };

  const handleForkFeatured = async (featured: typeof FEATURED_PROFILES[number]) => {
    setForkingFeatured(featured.name);
    try {
      await handleFork(featured.url);
    } finally {
      setForkingFeatured(null);
    }
  };

  const handleSwitch = async (name: string) => {
    await switchProfile({ variables: { name } });
    // Clear quick actions localStorage so next mount re-seeds from new profile
    localStorage.removeItem('vienna:quick-actions');
    window.dispatchEvent(new CustomEvent(PROFILE_SWITCH_EVENT));
    refetch();
  };

  const handleDelete = async (name: string) => {
    await deleteProfile({ variables: { name } });
    setDeleteTarget(null);
    refetch();
  };

  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted-foreground">
        Content profiles bundle skills, plugins, quick actions, and settings into shareable, forkable packages.
      </p>

      {/* Featured profiles */}
      <div className="grid gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          Featured profiles
        </label>
        {FEATURED_PROFILES.map((featured) => {
          const installed = installedNames.has(featured.name);
          const isForkingThis = forkingFeatured === featured.name;
          return (
            <div
              key={featured.name}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">{featured.icon}</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium">{featured.label}</span>
                  <p className="text-xs text-muted-foreground truncate">
                    {featured.description}
                  </p>
                </div>
              </div>
              <Button
                variant={installed ? 'ghost' : 'outline'}
                size="sm"
                className="shrink-0"
                disabled={installed || isForkingThis || forking}
                onClick={() => handleForkFeatured(featured)}
              >
                {installed ? (
                  <>
                    <Check size={14} />
                    Installed
                  </>
                ) : isForkingThis ? (
                  <>
                    <Download size={14} className="animate-pulse" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <GitFork size={14} />
                    Fork
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Fork from URL */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Fork a profile from a Git URL
          </label>
          <Input
            placeholder="https://github.com/user/my-profile.git"
            value={forkUrl}
            onChange={(e) => setForkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFork()}
          />
        </div>
        <Button size="sm" onClick={() => handleFork()} disabled={forking || !forkUrl.trim()}>
          <GitFork size={14} />
          {forking ? 'Cloning...' : 'Fork'}
        </Button>
      </div>

      {forkError && (
        <p className="text-sm text-destructive">{forkError}</p>
      )}

      <Separator />

      {/* Profile list */}
      {profiles.length === 0 && (
        <p className="text-sm text-muted-foreground">No profiles found.</p>
      )}

      {profiles.map((profile) => (
        <div
          key={profile.name}
          className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {profile.metadata?.icon && (
                <span className="text-lg">{profile.metadata.icon}</span>
              )}
              <span className="font-medium">
                {profile.metadata?.displayName ?? profile.name}
              </span>
              {profile.isDefault && (
                <Badge variant="secondary">Default</Badge>
              )}
              {profile.isActive && (
                <Badge variant="default">Active</Badge>
              )}
              {profile.isFork && (
                <Badge variant="outline">Fork</Badge>
              )}
            </div>
            {profile.metadata?.description && (
              <p className="mt-0.5 text-sm text-muted-foreground truncate">
                {profile.metadata.description}
              </p>
            )}
            {profile.metadata?.sourceUrl && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink size={10} />
                {profile.metadata.sourceUrl.replace(/\.git$/, '')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!profile.isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSwitch(profile.name)}
              >
                <Check size={14} />
                Switch
              </Button>
            )}
            {!profile.isDefault && !profile.isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(profile.name)}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          open
          title={`Delete profile "${deleteTarget}"?`}
          description="This will permanently remove the profile and all its content. This cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
