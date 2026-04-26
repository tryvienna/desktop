import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProcessInfo {
  pid: number;
  type: string;
  cpu: number;
  memory: number;
  name?: string;
}

interface Props {
  processesJson: string | null;
}

export function ProcessBreakdownTable({ processesJson }: Props) {
  if (!processesJson) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No per-process data available. The SDK collects this from app.getAppMetrics().
      </p>
    );
  }

  let processes: ProcessInfo[];
  try {
    processes = JSON.parse(processesJson);
  } catch {
    return <p className="text-sm text-destructive py-4">Invalid process data</p>;
  }

  if (processes.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No processes reported.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">CPU %</TableHead>
            <TableHead className="text-right">Memory</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processes
            .sort((a, b) => b.cpu - a.cpu)
            .map((p) => (
              <TableRow key={p.pid}>
                <TableCell className="font-mono text-xs">{p.pid}</TableCell>
                <TableCell>{p.type}</TableCell>
                <TableCell className="text-muted-foreground">{p.name || '—'}</TableCell>
                <TableCell className="text-right">{p.cpu.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{formatMB(p.memory)}</TableCell>
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
