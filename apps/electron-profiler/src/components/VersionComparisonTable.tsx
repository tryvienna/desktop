import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { VersionSummary } from '../api/types';

interface Props {
  summaries: VersionSummary[];
  onSelectVersion?: (versionId: string) => void;
}

export function VersionComparisonTable({ summaries, onSelectVersion }: Props) {
  if (summaries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No version data available. Scan git tags or push metrics with commit hashes.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>Commit</TableHead>
            <TableHead className="text-right">Samples</TableHead>
            <TableHead className="text-right">Avg CPU</TableHead>
            <TableHead className="text-right">Peak CPU</TableHead>
            <TableHead className="text-right">Avg Mem</TableHead>
            <TableHead className="text-right">Peak Mem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.map((s) => (
            <TableRow
              key={s.version_id}
              className={onSelectVersion ? 'cursor-pointer hover:bg-accent/50' : ''}
              onClick={() => onSelectVersion?.(s.version_id)}
            >
              <TableCell className="font-medium">{s.version}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {s.commit_hash.slice(0, 7)}
              </TableCell>
              <TableCell className="text-right">{s.sample_count}</TableCell>
              <TableCell className="text-right">{s.avg_cpu.toFixed(1)}%</TableCell>
              <TableCell className="text-right">{s.max_cpu.toFixed(1)}%</TableCell>
              <TableCell className="text-right">{formatMB(s.avg_memory)}</TableCell>
              <TableCell className="text-right">{formatMB(s.max_memory)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(0) + ' MB';
}
