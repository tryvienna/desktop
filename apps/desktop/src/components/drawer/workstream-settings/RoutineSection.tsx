/**
 * RoutineSection — Displays routine-specific settings when the workstream is a routine workstream.
 *
 * @ai-context
 * - Fetches routine via GET_ROUTINE_BY_WORKSTREAM, returns null if no routine found
 * - Shows schedule (editable), prompt (editable), status, run stats, action buttons
 * - Wrapped in ContentSection
 * - data-slot="routine-section"
 */

import { useState, useCallback } from 'react';

import { ContentSection, MetadataList, Badge, Button } from '@tryvienna/ui';
import {
  useQuery,
  useMutation,
  GET_ROUTINE_BY_WORKSTREAM,
  UPDATE_ROUTINE,
  PAUSE_ROUTINE,
  RESUME_ROUTINE,
  RUN_ROUTINE_NOW,
} from '@vienna/graphql/client';
import { formatRelativeTime } from './helpers';

export interface RoutineSectionProps {
  workstreamId: string;
}

export function RoutineSection({ workstreamId }: RoutineSectionProps) {
  const { data, refetch } = useQuery(GET_ROUTINE_BY_WORKSTREAM, {
    variables: { workstreamId },
  });

  const routine = data?.routineByWorkstreamId;

  const [updateRoutine] = useMutation(UPDATE_ROUTINE);
  const [pauseRoutine, { loading: pauseLoading }] = useMutation(PAUSE_ROUTINE);
  const [resumeRoutine, { loading: resumeLoading }] = useMutation(RESUME_ROUTINE);
  const [runRoutineNow, { loading: runLoading }] = useMutation(RUN_ROUTINE_NOW);

  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleValue, setScheduleValue] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState('');

  const handleScheduleEdit = useCallback(() => {
    setScheduleValue(routine?.schedule?.expression ?? '');
    setEditingSchedule(true);
  }, [routine?.schedule?.expression]);

  const handleScheduleSave = useCallback(async () => {
    if (!routine?.id) return;
    const trimmed = scheduleValue.trim();
    if (!trimmed || trimmed === routine.schedule?.expression) {
      setEditingSchedule(false);
      return;
    }
    await updateRoutine({
      variables: {
        id: routine.id,
        input: {
          schedule: {
            type: (routine.schedule?.type ?? 'cron') as 'cron' | 'interval',
            expression: trimmed,
          },
        },
      },
    });
    setEditingSchedule(false);
    refetch();
  }, [routine?.id, routine?.schedule, scheduleValue, updateRoutine, refetch]);

  const handlePromptEdit = useCallback(() => {
    setPromptValue(routine?.prompt ?? '');
    setEditingPrompt(true);
  }, [routine?.prompt]);

  const handlePromptSave = useCallback(async () => {
    if (!routine?.id) return;
    const trimmed = promptValue.trim();
    if (!trimmed || trimmed === routine.prompt) {
      setEditingPrompt(false);
      return;
    }
    await updateRoutine({
      variables: {
        id: routine.id,
        input: { prompt: trimmed },
      },
    });
    setEditingPrompt(false);
    refetch();
  }, [routine?.id, routine?.prompt, promptValue, updateRoutine, refetch]);

  const handlePause = useCallback(async () => {
    if (!routine?.id) return;
    await pauseRoutine({ variables: { id: routine.id } });
    refetch();
  }, [routine?.id, pauseRoutine, refetch]);

  const handleResume = useCallback(async () => {
    if (!routine?.id) return;
    await resumeRoutine({ variables: { id: routine.id } });
    refetch();
  }, [routine?.id, resumeRoutine, refetch]);

  const handleRunNow = useCallback(async () => {
    if (!routine?.id) return;
    await runRoutineNow({ variables: { id: routine.id } });
    refetch();
  }, [routine?.id, runRoutineNow, refetch]);

  if (!routine) return null;

  const isPaused = routine.status === 'paused';
  const statusLabel = routine.status ? routine.status.charAt(0).toUpperCase() + routine.status.slice(1) : '';
  const statusClass = routine.status === 'active'
    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
    : routine.status === 'paused'
      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
      : '';

  const metadataItems = [
    ...(routine.runCount != null ? [{ label: 'Run count', value: String(routine.runCount) }] : []),
    ...(routine.lastRunAt ? [{ label: 'Last run', value: formatRelativeTime(routine.lastRunAt) }] : []),
    ...(routine.nextRunAt && !isPaused ? [{ label: 'Next run', value: formatRelativeTime(routine.nextRunAt) }] : []),
  ];

  return (
    <ContentSection title="Routine" data-slot="routine-section">
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status</span>
          <Badge variant="secondary" className={`text-xs ${statusClass}`}>
            {routine.status === 'active' && <span className="size-1.5 rounded-full bg-emerald-400" />}
            {statusLabel}
          </Badge>
        </div>

        {/* Schedule */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Schedule</span>
            {!editingSchedule && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={handleScheduleEdit}
              >
                Edit
              </button>
            )}
          </div>
          {editingSchedule ? (
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-md border bg-background px-2 py-1 text-xs"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleScheduleSave();
                  if (e.key === 'Escape') setEditingSchedule(false);
                }}
                autoFocus
              />
              <Button variant="outline" size="sm" onClick={() => void handleScheduleSave()}>
                Save
              </Button>
            </div>
          ) : (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <code className="text-xs text-foreground">
                {routine.schedule?.expression ?? '—'}
              </code>
            </div>
          )}
        </div>

        {/* Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Prompt</span>
            {!editingPrompt && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={handlePromptEdit}
              >
                Edit
              </button>
            )}
          </div>
          {editingPrompt ? (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-md border bg-background px-2 py-1 text-xs min-h-[4rem] resize-y"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingPrompt(false);
                }}
                autoFocus
              />
              <Button variant="outline" size="sm" onClick={() => void handlePromptSave()}>
                Save
              </Button>
            </div>
          ) : (
            <p className="text-xs text-foreground whitespace-pre-wrap">
              {routine.prompt || '—'}
            </p>
          )}
        </div>

        {/* Run stats */}
        {metadataItems.length > 0 && <MetadataList items={metadataItems} />}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={runLoading}
            onClick={() => void handleRunNow()}
          >
            Run Now
          </Button>
          {isPaused ? (
            <Button
              variant="outline"
              size="sm"
              disabled={resumeLoading}
              onClick={() => void handleResume()}
            >
              Resume
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={pauseLoading}
              onClick={() => void handlePause()}
            >
              Pause
            </Button>
          )}
        </div>
      </div>
    </ContentSection>
  );
}
