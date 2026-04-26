/**
 * System Widget Storybooks
 *
 * Comprehensive interactive documentation for all system widgets.
 * Each story demonstrates widget behavior with every visual state.
 * Designed for both humans and AI systems.
 *
 * @module chat-ui/components/system/SystemWidgets.stories
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { CompactingWidget } from './compacting-widget';
import { ModelChangeWidget } from './model-change-widget';
import { EntityLinkWidget } from './entity-link-widget';
import { SkillActivationWidget } from './skill-activation-widget';
import { InterruptedWidget } from './interrupted-widget';
import { TaskNotificationWidget } from './task-notification-widget';
import { RateLimitWidget } from './rate-limit-widget';
import { ApiRetryWidget } from './api-retry-widget';
import { UnknownMessageWidget } from './unknown-message-widget';
import { ApiErrorWidget } from './api-error-widget';
import { VerificationActionWidget } from './verification-action-widget';
import type { ActionExecStatus } from './verification-action-widget';

const meta: Meta = {
  title: 'System Widgets',
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: `
# System Widgets

Compact inline widgets for system-level events in the chat stream.
These are NOT user or assistant messages — they are status indicators
for events like model changes, compaction, interruptions, etc.

## Visual Language

All widgets share a consistent visual pattern:
- Rounded-lg border with subtle background
- Compact height (py-2 to py-3)
- Left-aligned icon → label → badges → action
- framer-motion entry animation (opacity + y + scale)
- CSS variable-based theming
        `,
      },
    },
  },
};

export default meta;

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxWidth: 560,
  padding: 24,
};

// ─── CompactingWidget ────────────────────────────────────────────────────

function CompactingDemo() {
  const [status, setStatus] = useState<'compacting' | 'complete'>('compacting');
  return (
    <div style={wrapStyle}>
      <CompactingWidget status={status} trigger="auto" preTokens={128000} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setStatus('compacting')}
          style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
        >
          Compacting
        </button>
        <button
          onClick={() => setStatus('complete')}
          style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
        >
          Complete
        </button>
      </div>
    </div>
  );
}

export const Compacting: StoryObj = {
  render: () => <CompactingDemo />,
  parameters: {
    docs: {
      description: {
        story:
          '**CompactingWidget** — Shows context compression progress and completion. Toggle between states to see animated transitions.',
      },
    },
  },
};

export const CompactingComplete: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <CompactingWidget status="complete" trigger="auto" preTokens={128000} />
      <CompactingWidget status="complete" trigger="manual" preTokens={64000} />
      <CompactingWidget status="complete" preTokens={200000} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Completed compaction states: auto trigger, manual trigger, no trigger specified.',
      },
    },
  },
};

// ─── ModelChangeWidget ───────────────────────────────────────────────────

export const ModelChange: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <ModelChangeWidget fromModel="claude-sonnet-4-5" toModel="claude-opus-4-5" />
      <ModelChangeWidget fromModel="claude-haiku-3-5" toModel="claude-sonnet-4-5" />
      <ModelChangeWidget fromModel="gpt-4o" toModel="claude-opus-4-5" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**ModelChangeWidget** — Shows model switches. Automatically formats known Claude model names (Opus, Sonnet, Haiku).',
      },
    },
  },
};

// ─── EntityLinkWidget ────────────────────────────────────────────────────

export const EntityLink: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <EntityLinkWidget
        action="linked"
        entityType="github_pr"
        entityTitle="Fix authentication flow"
        entityUri="@vienna//github_pr/owner/repo/42"
      />
      <EntityLinkWidget
        action="linked"
        entityType="linear_issue"
        entityTitle="Performance regression in dashboard"
        entityUri="@vienna//linear_issue/TEAM-123"
      />
      <EntityLinkWidget action="unlinked" entityType="slack_channel" entityTitle="#development" />
      <EntityLinkWidget
        action="linked"
        entityType="sentry_issue"
        entityTitle="TypeError: Cannot read property 'id' of undefined"
        entityUri="@vienna//sentry_issue/SENTRY-456"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**EntityLinkWidget** — Shows entity linked/unlinked events. Unlinked shows strikethrough. Edit button appears when LinkedEntityEditProvider is mounted.',
      },
    },
  },
};

// ─── SkillActivationWidget ───────────────────────────────────────────────

export const SkillActivation: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <SkillActivationWidget skills={[{ id: 'commit', name: 'commit' }]} />
      <SkillActivationWidget
        skills={[
          { id: 'review-pr', name: 'review-pr' },
          { id: 'vienna-plugin-dev', name: 'vienna-plugin-dev' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**SkillActivationWidget** — Shows skill injection events. Handles singular/plural labeling and multiple skill badges.',
      },
    },
  },
};

// ─── InterruptedWidget ───────────────────────────────────────────────────

export const Interrupted: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <InterruptedWidget />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**InterruptedWidget** — Minimal indicator for user interruptions. No props required.',
      },
    },
  },
};

// ─── TaskNotificationWidget ──────────────────────────────────────────────

export const TaskNotification: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <TaskNotificationWidget status="completed" summary="Background task completed successfully" />
      <TaskNotificationWidget status="failed" summary="Task failed: timeout after 60s" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '**TaskNotificationWidget** — Background task completion/failure indicators.',
      },
    },
  },
};

// ─── RateLimitWidget ─────────────────────────────────────────────────────

export const RateLimit: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <RateLimitWidget rateLimitType="five_hour" resetsAt={Math.floor(Date.now() / 1000) + 3600} />
      <RateLimitWidget rateLimitType="seven_day" resetsAt={Math.floor(Date.now() / 1000) + 86400} />
      <RateLimitWidget rateLimitType="five_hour" resetsAt={Math.floor(Date.now() / 1000) + 120} />
      <RateLimitWidget rateLimitType="five_hour" resetsAt={Math.floor(Date.now() / 1000) + 7200} isUsingOverage />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**RateLimitWidget** — Amber warning cards with live countdown timers. Shows formatted limit type and time remaining.',
      },
    },
  },
};

// ─── UnknownMessageWidget ────────────────────────────────────────────────

export const UnknownMessage: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <UnknownMessageWidget
        rawPayload={{ type: 'custom_event', data: { foo: 'bar', nested: { baz: 42 } } }}
        parseErrors={[
          {
            code: 'invalid_type',
            message: 'Expected string, received number',
            path: ['data', 'nested', 'baz'],
          },
          { code: 'missing_field', message: 'Required field "id" is missing', path: ['data'] },
        ]}
        originalType="custom_event"
        timestamp={Date.now()}
      />
      <UnknownMessageWidget
        rawPayload="This is not JSON at all"
        rawPayloadTruncated
        parseErrors={[]}
        timestamp={Date.now()}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**UnknownMessageWidget** — Collapsible viewer for unrecognized messages. Click to expand and see parse errors + raw payload. Shows truncation badge when applicable.',
      },
    },
  },
};

// ─── ApiErrorWidget ──────────────────────────────────────────────────────

export const ApiError: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <ApiErrorWidget
        statusCode={500}
        errorType="internal_error"
        errorMessage="Internal server error"
        requestId="req_01ABC123XYZ"
        rawText="Error 500: Internal server error\n\nThe server encountered an unexpected condition."
      />
      <ApiErrorWidget
        statusCode={429}
        errorType="rate_limit_error"
        errorMessage="Too many requests"
        rawText="Too many requests"
      />
      <ApiErrorWidget
        errorMessage="Network error: Failed to fetch"
        rawText="Network error: Failed to fetch"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**ApiErrorWidget** — API error display. Click to expand details (request ID, raw error text). Non-expandable when rawText matches errorMessage.',
      },
    },
  },
};

// ─── VerificationActionWidget ────────────────────────────────────────────

function VerificationActionDemo() {
  const [status, setStatus] = useState<ActionExecStatus>('pending');

  return (
    <div style={wrapStyle}>
      <VerificationActionWidget
        actionId="test-1"
        actionLabel="Run test suite"
        actionType="builtin"
        prompt="Execute the full test suite and report results"
        status={status}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        {(['pending', 'running', 'done', 'error'] as ActionExecStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{
              fontSize: 12,
              padding: '4px 8px',
              cursor: 'pointer',
              fontWeight: status === s ? 700 : 400,
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export const VerificationAction: StoryObj = {
  render: () => <VerificationActionDemo />,
  parameters: {
    docs: {
      description: {
        story:
          '**VerificationActionWidget** — Post-verification action with animated status indicator. Toggle between pending (pulsing dots), running (spinner), done (checkmark), and error (X) states.',
      },
    },
  },
};

export const VerificationActionAllStates: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <VerificationActionWidget
        actionId="1"
        actionLabel="Run tests"
        actionType="builtin"
        status="pending"
      />
      <VerificationActionWidget
        actionId="2"
        actionLabel="Build project"
        actionType="builtin"
        status="running"
      />
      <VerificationActionWidget
        actionId="3"
        actionLabel="Deploy to staging"
        actionType="prompt"
        prompt="Deploy the current build to the staging environment"
        status="done"
      />
      <VerificationActionWidget
        actionId="4"
        actionLabel="Lint codebase"
        actionType="builtin"
        status="error"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'All four status states side by side: pending, running, done, error.' },
    },
  },
};

// ─── ApiRetryWidget ──────────────────────────────────────────────────

function ApiRetryDemo() {
  const [attempt, setAttempt] = useState(1);
  const maxRetries = 10;
  const delay = Math.round(500 * Math.pow(2, attempt - 1));
  return (
    <div style={wrapStyle}>
      <ApiRetryWidget
        attempt={attempt}
        maxRetries={maxRetries}
        retryDelayMs={delay}
        errorStatus={529}
        error="rate_limit"
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setAttempt((a) => Math.min(a + 1, maxRetries))}
          style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
        >
          Next attempt
        </button>
        <button
          onClick={() => setAttempt(1)}
          style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export const ApiRetry: StoryObj = {
  render: () => <ApiRetryDemo />,
  parameters: {
    docs: {
      description: {
        story:
          '**ApiRetryWidget** — Shows API retry status with pulsing indicator. Click "Next attempt" to simulate escalating retries with exponential backoff delay.',
      },
    },
  },
};

export const ApiRetryVariants: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <ApiRetryWidget attempt={1} maxRetries={10} retryDelayMs={504} errorStatus={529} error="rate_limit" />
      <ApiRetryWidget attempt={5} maxRetries={10} retryDelayMs={8064} errorStatus={529} error="overloaded" />
      <ApiRetryWidget attempt={9} maxRetries={10} retryDelayMs={128000} errorStatus={503} error="service_unavailable" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'API retry states: early attempt (low delay), mid-retry, and near max retries (high delay).',
      },
    },
  },
};

// ─── All Widgets Together ────────────────────────────────────────────────

export const AllWidgets: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <h3 style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)' }}>
        Complete System Widget Gallery
      </h3>
      <CompactingWidget status="complete" trigger="auto" preTokens={128000} />
      <ModelChangeWidget fromModel="claude-sonnet-4-5" toModel="claude-opus-4-5" />
      <EntityLinkWidget
        action="linked"
        entityType="github_pr"
        entityTitle="Fix auth flow"
        entityUri="@vienna//github_pr/owner/repo/42"
      />
      <SkillActivationWidget skills={[{ id: 'commit', name: 'commit' }]} />
      <InterruptedWidget />
      <TaskNotificationWidget status="completed" summary="Background search completed" />
      <RateLimitWidget rateLimitType="five_hour" resetsAt={Math.floor(Date.now() / 1000) + 7200} />
      <ApiRetryWidget attempt={3} maxRetries={10} retryDelayMs={2016} errorStatus={529} error="rate_limit" />
      <ApiErrorWidget
        statusCode={500}
        errorType="internal_error"
        errorMessage="Internal server error"
        rawText="Internal server error"
      />
      <VerificationActionWidget
        actionId="1"
        actionLabel="Run tests"
        actionType="builtin"
        status="done"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'All system widgets displayed together to demonstrate visual consistency and compact sizing.',
      },
    },
  },
};
