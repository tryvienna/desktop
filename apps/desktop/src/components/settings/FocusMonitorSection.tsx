import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@vienna/graphql/client';
import { GET_SETTINGS, UPDATE_ADVANCED_SETTINGS } from '@vienna/graphql/client';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../../ipc';
import { Switch, Slider, Badge, Button } from '@tryvienna/ui';
import { SettingsRow } from './SettingsRow';
import type { FocusInfo, TerminalWindow, TerminalTab, TerminalSession } from '../../ipc/focus-monitor/contract';

export function FocusMonitorSection() {
  const { data } = useQuery(GET_SETTINGS);
  const [updateAdvanced] = useMutation(UPDATE_ADVANCED_SETTINGS);
  const advanced = data?.settings?.advanced;

  const ipc = useMemo(() => getApi(api), []);
  const eventSubs = useMemo(() => getEvents(events), []);

  const [latestFocus, setLatestFocus] = useState<FocusInfo | null>(null);

  const enabled = advanced?.focusMonitorEnabled ?? false;
  const intervalMs = advanced?.focusMonitorIntervalMs ?? 2000;

  useEffect(() => {
    if (!enabled) {
      setLatestFocus(null);
      return;
    }

    const unsub = eventSubs.focusMonitor.onFocusChanged((info: FocusInfo) => {
      setLatestFocus(info);
    });
    return () => unsub();
  }, [enabled, eventSubs]);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      await updateAdvanced({
        variables: { input: { focusMonitorEnabled: checked } },
      });
      await ipc.focusMonitor.configure({ enabled: checked, intervalMs });
    },
    [updateAdvanced, ipc, intervalMs],
  );

  const handleIntervalChange = useCallback(
    async (value: number[]) => {
      const ms = value[0];
      await updateAdvanced({
        variables: { input: { focusMonitorIntervalMs: ms } },
      });
      if (enabled) {
        await ipc.focusMonitor.configure({ enabled: true, intervalMs: ms });
      }
    },
    [updateAdvanced, ipc, enabled],
  );

  const handleActivate = useCallback(
    (windowIndex: number, tabIndex?: number) => {
      if (!latestFocus) return;
      ipc.focusMonitor.activateWindow({
        appName: latestFocus.appName,
        windowIndex,
        tabIndex,
      });
    },
    [ipc, latestFocus],
  );

  if (!advanced) return null;

  const details = latestFocus?.details;
  const hasWindows = details && details.windows.length > 0;

  return (
    <div className="grid gap-4">
      <SettingsRow
        label="Focus Monitor"
        description="Poll the OS to detect which application and window the user has focused."
        htmlFor="focus-monitor"
      >
        <Switch
          id="focus-monitor"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </SettingsRow>

      <SettingsRow
        label="Polling Interval"
        description={`How often to check the focused window (${formatMs(intervalMs)}).`}
        htmlFor="focus-interval"
      >
        <div className="w-40">
          <Slider
            id="focus-interval"
            min={500}
            max={60000}
            step={500}
            value={[intervalMs]}
            onValueChange={handleIntervalChange}
            disabled={!enabled}
          />
        </div>
      </SettingsRow>

      {enabled && latestFocus && (
        <div className="rounded-md border border-border bg-muted/50 p-3 text-xs font-mono space-y-2 max-h-[500px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Live Focus</span>
            <Badge variant="outline" className="text-[10px]">
              {details?.detectorId ?? 'generic'}
            </Badge>
            <span className="text-muted-foreground/60 text-[10px] ml-auto">
              {new Date(latestFocus.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Basic info */}
          <div className="space-y-0.5">
            <Row label="App" value={latestFocus.appName} />
            <Row label="Bundle ID" value={latestFocus.bundleId} />
            <Row label="Window" value={latestFocus.windowTitle} />
          </div>

          {/* Active session summary */}
          {details && (
            <div className="space-y-0.5 border-t border-border/50 pt-2">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide mb-1">Active</div>
              <Row label="Tab" value={details.tabTitle} />
              <Row label="CWD" value={details.cwd} />
              <Row label="Command" value={details.runningCommand} />
              <Row label="File" value={details.filePath} />
              <Row label="Branch" value={details.gitBranch} />
              <Row label="Profile" value={details.profileName} />
            </div>
          )}

          {/* Full window/tab/session tree */}
          {hasWindows && (
            <div className="border-t border-border/50 pt-2">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide mb-1">
                All Windows & Tabs ({details.windows.length}w / {details.windows.reduce((s, w) => s + w.tabs.length, 0)}t)
              </div>
              {details.windows.map((win) => (
                <WindowTree key={win.index} window={win} onActivate={handleActivate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WindowTree({
  window: win,
  onActivate,
}: {
  window: TerminalWindow;
  onActivate: (windowIndex: number, tabIndex?: number) => void;
}) {
  return (
    <div className="ml-1 mb-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground/60">{'>'}</span>
        <span className={win.isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}>
          {win.title || `Window ${win.index + 1}`}
        </span>
        {win.isActive && (
          <Badge variant="outline" className="text-[9px] px-1 py-0">active</Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-4 px-1.5 text-[9px] ml-auto"
          onClick={() => onActivate(win.index)}
        >
          Open
        </Button>
      </div>
      {win.tabs.map((tab) => (
        <TabTree key={tab.index} tab={tab} windowIndex={win.index} onActivate={onActivate} />
      ))}
    </div>
  );
}

function TabTree({
  tab,
  windowIndex,
  onActivate,
}: {
  tab: TerminalTab;
  windowIndex: number;
  onActivate: (windowIndex: number, tabIndex?: number) => void;
}) {
  return (
    <div className="ml-4 mb-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground/60">{'>'}</span>
        <span className={tab.isActive ? 'text-foreground' : 'text-muted-foreground'}>
          {tab.title || `Tab ${tab.index + 1}`}
        </span>
        {tab.isActive && (
          <Badge variant="outline" className="text-[9px] px-1 py-0">active</Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-4 px-1.5 text-[9px] ml-auto"
          onClick={() => onActivate(windowIndex, tab.index)}
        >
          Open
        </Button>
      </div>
      {tab.sessions.map((sess, i) => (
        <SessionRow key={sess.sessionId ?? i} session={sess} siblingCount={tab.sessions.length} />
      ))}
    </div>
  );
}

function SessionRow({ session: sess, siblingCount }: { session: TerminalSession; siblingCount: number }) {
  const parts: string[] = [];
  if (sess.cwd) parts.push(shortenPath(sess.cwd));
  if (sess.runningCommand) parts.push(`$ ${sess.runningCommand}`);
  if (sess.profileName) parts.push(`[${sess.profileName}]`);

  return (
    <div className="ml-8 flex items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground/40">{'>'}</span>
      <span className={sess.isActive ? 'text-foreground' : 'text-muted-foreground/70'}>
        {parts.length > 0 ? parts.join(' ') : (sess.name || sess.tty || 'session')}
      </span>
      {sess.isActive && siblingCount > 1 && (
        <Badge variant="outline" className="text-[9px] px-1 py-0">active</Badge>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground min-w-[70px]">{label}:</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${ms / 1000}s`;
  return `${ms}ms`;
}

function shortenPath(p: string): string {
  const home = typeof process !== 'undefined' ? process.env?.HOME : undefined;
  if (home && p.startsWith(home)) return '~' + p.slice(home.length);
  return p;
}
