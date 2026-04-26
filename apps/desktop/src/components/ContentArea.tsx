import { type ReactNode, useState, useCallback, useEffect, useMemo } from 'react';
import { CopyIcon, CheckIcon } from 'lucide-react';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../ipc';
import { TopBar } from './TopBar';
import { ActiveWorkstreamTitle } from './ActiveWorkstreamTitle';
import { WorkstreamWidgetArea } from './WorkstreamWidgetArea';
import { usePluginMenuBarItems } from '../renderer/hooks/usePluginMenuBarItems';
import { useDeveloperMode } from '../renderer/hooks/useDeveloperMode';

function CopySessionDirButton() {
  const [copied, setCopied] = useState(false);
  const [sessionDir, setSessionDir] = useState<string | null>(null);
  const ipc = useMemo(() => getApi(api), []);

  useEffect(() => {
    ipc.logger.getSessionId({}).then(({ sessionDir }) => {
      setSessionDir(sessionDir);
    });
  }, [ipc]);

  const handleCopy = useCallback(async () => {
    if (!sessionDir) return;
    await navigator.clipboard.writeText(sessionDir);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionDir]);

  if (!sessionDir) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute bottom-3 right-3 z-10 inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-50 hover:opacity-100"
      aria-label="Copy session log directory path"
      title={copied ? 'Copied!' : 'Copy session log path'}
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </button>
  );
}

export function ContentArea({ children }: { children?: ReactNode }) {
  const menuBarItems = usePluginMenuBarItems();
  const developerMode = useDeveloperMode();

  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--surface-elevated)' }}
    >
      <TopBar
        center={<ActiveWorkstreamTitle />}
        trailing={menuBarItems}
      />
      <WorkstreamWidgetArea />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      {developerMode && <CopySessionDirButton />}
    </div>
  );
}
