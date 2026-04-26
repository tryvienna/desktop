import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { Version } from '../api/types';

export type TimePreset = '1m' | '5m' | '10m' | '30m' | '1h' | '6h' | '24h' | '7d' | 'all';

const TIME_PRESETS: { value: TimePreset; label: string; ms: number | null }[] = [
  { value: '1m', label: '1m', ms: 60 * 1000 },
  { value: '5m', label: '5m', ms: 5 * 60 * 1000 },
  { value: '10m', label: '10m', ms: 10 * 60 * 1000 },
  { value: '30m', label: '30m', ms: 30 * 60 * 1000 },
  { value: '1h', label: '1h', ms: 60 * 60 * 1000 },
  { value: '6h', label: '6h', ms: 6 * 60 * 60 * 1000 },
  { value: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: 'all', label: 'All', ms: null },
];

interface Props {
  timePreset: TimePreset;
  onTimePresetChange: (preset: TimePreset) => void;
  versions: Version[];
  fromVersionId: string | undefined;
  toVersionId: string | undefined;
  onFromVersionChange: (id: string | undefined) => void;
  onToVersionChange: (id: string | undefined) => void;
  onClear: () => void;
}

export function ChartFilterBar({
  timePreset,
  onTimePresetChange,
  versions,
  fromVersionId,
  toVersionId,
  onFromVersionChange,
  onToVersionChange,
  onClear,
}: Props) {
  const hasFilters = timePreset !== 'all' || fromVersionId || toVersionId;
  const sortedVersions = [...versions].sort((a, b) => b.created_at - a.created_at);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <ToggleGroup
        type="single"
        value={timePreset}
        onValueChange={(v) => {
          if (v) onTimePresetChange(v as TimePreset);
        }}
        size="sm"
        variant="outline"
      >
        {TIME_PRESETS.map((p) => (
          <ToggleGroupItem key={p.value} value={p.value}>
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <span className="text-xs text-muted-foreground">Commits:</span>

      <Select
        value={fromVersionId ?? '__none__'}
        onValueChange={(v) => onFromVersionChange(v === '__none__' ? undefined : v)}
      >
        <SelectTrigger className="w-[240px] h-8 text-xs">
          <SelectValue placeholder="From (any)" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="__none__">Any</SelectItem>
          {sortedVersions.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              <span className="font-mono text-xs">{v.commit_hash.slice(0, 7)}</span>
              {v.commit_message && (
                <span className="ml-1 text-muted-foreground truncate">{v.commit_message}</span>
              )}
              {!v.commit_message && <span className="ml-1 text-muted-foreground">{v.version}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={toVersionId ?? '__none__'}
        onValueChange={(v) => onToVersionChange(v === '__none__' ? undefined : v)}
      >
        <SelectTrigger className="w-[240px] h-8 text-xs">
          <SelectValue placeholder="To (any)" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="__none__">Any</SelectItem>
          {sortedVersions.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              <span className="font-mono text-xs">{v.commit_hash.slice(0, 7)}</span>
              {v.commit_message && (
                <span className="ml-1 text-muted-foreground truncate">{v.commit_message}</span>
              )}
              {!v.commit_message && <span className="ml-1 text-muted-foreground">{v.version}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}

export function resolveTimePreset(preset: TimePreset): number | undefined {
  const entry = TIME_PRESETS.find((p) => p.value === preset);
  if (!entry?.ms) return undefined;
  return Date.now() - entry.ms;
}

export function resolveVersionRange(
  versions: Version[],
  fromId?: string,
  toId?: string
): string[] | undefined {
  if (!fromId) return undefined;

  const sorted = [...versions].sort((a, b) => a.created_at - b.created_at);
  const fromIdx = sorted.findIndex((v) => v.id === fromId);
  if (fromIdx === -1) return undefined;

  if (!toId) return [fromId];

  const toIdx = sorted.findIndex((v) => v.id === toId);
  if (toIdx === -1) return [fromId];

  const lo = Math.min(fromIdx, toIdx);
  const hi = Math.max(fromIdx, toIdx);
  return sorted.slice(lo, hi + 1).map((v) => v.id);
}
