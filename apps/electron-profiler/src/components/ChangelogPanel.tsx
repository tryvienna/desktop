import { Badge } from '@/components/ui/badge';
import { useChangelog } from '../hooks/use-changelog';

interface Props {
  appId: string;
  fromCommit?: string;
  toCommit?: string;
}

export function ChangelogPanel({ appId, fromCommit, toCommit }: Props) {
  const { data, loading, error } = useChangelog(appId, fromCommit, toCommit);

  if (!fromCommit || !toCommit) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Select two versions to view the changelog between them.
      </p>
    );
  }

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading changelog...</p>;
  if (error) return <p className="text-sm text-destructive py-4">{error}</p>;
  if (!data || data.commits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No commits found between these versions.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{data.commits.length} commits</span>
        {data.cached && (
          <Badge variant="outline" className="text-[10px]">
            cached
          </Badge>
        )}
      </div>

      {data.diffStat && (
        <pre className="text-xs bg-muted p-2 rounded-md overflow-auto font-mono">
          {data.diffStat}
        </pre>
      )}

      <ul className="space-y-1.5">
        {data.commits.map((c) => (
          <li key={c.hash} className="flex items-start gap-2 text-sm">
            <code className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
              {c.shortHash}
            </code>
            <div className="min-w-0">
              <span className="break-words">{c.subject}</span>
              <span className="text-xs text-muted-foreground ml-1.5">
                {c.author} &middot; {c.date}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
