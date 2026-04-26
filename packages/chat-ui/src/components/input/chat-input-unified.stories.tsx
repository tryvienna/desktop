// ChatInputUnified Stories
//
// Production-ready chat input combining all input features:
// - File attachments with validation and previews (useAttachments)
// - + button menu for attaching files and selecting skills (AttachmentMenu)
// - EntityPalette overlay (@ trigger) — requires entityProvider
// - CommandPalette overlay (/ trigger) — requires commandProvider
// - Entity chip insertion via palette selection
// - Message history navigation (Up/Down arrows when palette not active)
// - Rotating placeholder with fade animation
// - Builder mode toggle (wrench icon)
// - Voice input controls (mic icon)
// - Keyboard shortcuts (Enter submit, Escape clear, Shift+Enter newline)
// - Paste editor modal for large pasted content
//
// Props:
//   config?: InputConfig & { maxAttachments?, maxFileSize?, allowedMimeTypes? }
//   initialValue?: InputValue | null        — restore drafts on mount
//   onChange?(value: InputValue)             — fires on input change
//   onSubmit?(value: InputValue, attachments: Attachment[]) — fires on submit
//   onAttachmentsChange?(attachments)       — fires when attachments change
//   onSkillSelect?(skillId)                 — skill selected from + menu
//   skills?: SkillMenuItem[]                — skills for the + menu
//   onBrowseSkills?()                       — "Browse skills..." clicked
//   disabled?: boolean                      — disables input
//   isSubmitting?: boolean                  — shows spinner
//   showSubmitButton?: boolean              — render send button (default: true)
//   submitButtonLabel?: string              — aria-label for send
//   builderMode?: boolean                   — builder mode toggle state
//   onBuilderModeChange?(enabled)           — builder mode toggled
//   voiceRecording?: boolean                — mic is recording
//   voiceTranscribing?: boolean             — transcription in progress
//   onVoiceStart?()                         — start recording
//   onVoiceStop?()                          — stop recording
//   entityProvider?: EntityPaletteDataProvider — enables @ trigger
//   commandProvider?: CommandPaletteDataProvider — enables / trigger
//   entityTabs?: PaletteTab[]               — tabs for entity palette
//   commandTabs?: PaletteTab[]              — tabs for command palette
//   onEntitySelect?(entity)                 — entity selected from palette
//   onCommandExecute?(command)              — command executed from palette
//   onEntityChipClick?(uri, type, id)       — entity chip clicked in input
//   iconHints?: Record<string, string>      — entity type -> Lucide icon name
//   flowRegistry?: Record<string, FlowDefinition> — multi-step command flows
//   onEntityBrowse?(entity)                 — entity selected in browse mode (CMD+P)
//   onPasteOpen?(pasteId, content, preview, onSave) — open paste in external drawer
//
// Ref Handle API (ChatInputUnifiedHandle):
//   focus(), clear(), setValue(value), getValue(), insertEntity(entity),
//   getAttachments(), clearAttachments(),
//   openEntityBrowse(), openWorkstreamBrowse(), openCommandPalette()

import React, { useRef, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ChatInputUnified } from './chat-input-unified';
import type { ChatInputUnifiedHandle } from './chat-input-unified';
import type { EntityPaletteDataProvider } from '../palette/types';
import type { SkillMenuItem } from './components/attachment-menu';

// ---------------------------------------------------------------------------
// Mock Palette Provider
// ---------------------------------------------------------------------------

/**
 * Minimal mock entity provider for demonstrating palette integration.
 * Returns a fixed set of dummy entities for any query.
 */
const mockEntityProvider: EntityPaletteDataProvider = {
  search: async (query: string) => {
    const all = [
      {
        id: 'ws-1',
        type: 'workstream',
        title: 'Auth Service',
        subtitle: 'Backend workstream',
        metadata: {},
      },
      {
        id: 'ws-2',
        type: 'workstream',
        title: 'Dashboard UI',
        subtitle: 'Frontend workstream',
        metadata: {},
      },
      {
        id: 'ws-3',
        type: 'workstream',
        title: 'Data Pipeline',
        subtitle: 'ETL workstream',
        metadata: {},
      },
      {
        id: 'sk-1',
        type: 'skill',
        title: 'Code Review',
        subtitle: 'Automated code review',
        metadata: {},
      },
      {
        id: 'sk-2',
        type: 'skill',
        title: 'Deploy',
        subtitle: 'Deploy to production',
        metadata: {},
      },
    ];
    const q = query.toLowerCase();
    return q ? all.filter((e) => e.title.toLowerCase().includes(q)) : all;
  },
  getRecent: async () => [],
};

// ---------------------------------------------------------------------------
// Mock Skills
// ---------------------------------------------------------------------------

const mockSkills: SkillMenuItem[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Automated code review with best practices',
    pinned: true,
  },
  { id: 'deploy', name: 'Deploy', description: 'Deploy to staging or production' },
  { id: 'test-gen', name: 'Test Generator', description: 'Generate unit tests for selected files' },
];

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof ChatInputUnified> = {
  title: 'Input/chat-input-unified',
  component: ChatInputUnified,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-6 bg-surface-sunken min-h-[300px]">
        <Story />
      </div>
    ),
  ],
  args: {
    onChange: fn(),
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ChatInputUnified>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Basic unified input with default configuration.
 *
 * Renders the full input container with:
 * - ContentEditable text area with placeholder
 * - + button (attachment menu) on the left
 * - Builder mode toggle (wrench) on the left
 * - Send button on the right
 *
 * Type text and press Enter to submit.
 */
export const Default: Story = {
  args: {
    config: {
      placeholder: 'Type a message...',
    },
  },
};

/**
 * Input with file attachment capabilities.
 *
 * The + button menu includes "Attach File" which opens the native
 * file picker. Attached files appear as preview cards above the input.
 * Files are validated against maxAttachments, maxFileSize, and allowedMimeTypes.
 *
 * Try attaching files via the + button menu.
 */
export const WithAttachments: Story = {
  args: {
    config: {
      placeholder: 'Attach files via the + button...',
      maxAttachments: 5,
      maxFileSize: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/*', 'text/*', 'application/pdf'],
    },
    onAttachmentsChange: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: `File attachment flow:
        1. Click the + button in the bottom-left
        2. Select "Attach File" from the menu
        3. Choose files from the native picker
        4. Preview cards appear above the input
        5. Click X on a preview to remove it
        6. Submit sends both text and attachments

        Validation:
        - maxAttachments (default: 10) limits total files
        - maxFileSize (default: 10MB) limits individual file size
        - allowedMimeTypes filters by MIME type
        - Errors appear in a red alert box above the input`,
      },
    },
  },
};

/**
 * Builder mode toggle enabled.
 *
 * The wrench icon in the bottom-left toggles builder mode.
 * When active, it turns yellow with a pulsing glow animation.
 * Builder mode changes how the AI interprets the message
 * (e.g., focusing on building/creating rather than chatting).
 *
 * Click the wrench icon to toggle.
 */
export const WithBuilderMode: Story = {
  args: {
    builderMode: false,
    onBuilderModeChange: fn(),
    config: {
      placeholder: 'Toggle builder mode with the wrench icon...',
    },
  },
  parameters: {
    docs: {
      description: {
        story: `Builder mode toggle:
        - Wrench icon in the bottom-left control row
        - Off: transparent background, muted icon
        - On: yellow background, dark icon, pulsing box-shadow animation
        - aria-pressed tracks the state
        - onBuilderModeChange fires with the new boolean value`,
      },
    },
  },
};

/**
 * Voice input controls.
 *
 * When onVoiceStart is provided, a microphone icon appears in
 * the bottom-left control row. Clicking it toggles recording state.
 * While recording, the button turns red with a pulsing glow.
 * While transcribing, it shows a spinner.
 */
export const WithVoice: Story = {
  args: {
    voiceRecording: false,
    voiceTranscribing: false,
    onVoiceStart: fn(),
    onVoiceStop: fn(),
    config: {
      placeholder: 'Click the mic to start recording...',
    },
  },
  parameters: {
    docs: {
      description: {
        story: `Voice input states:
        - **Idle**: Muted mic icon, "Click to speak" tooltip
        - **Recording**: Red mic icon with pulsing glow, "Click to stop recording"
        - **Transcribing**: Spinning loader icon, button disabled

        The voice controls are only rendered when onVoiceStart is provided.
        The parent component manages the actual recording/transcription logic.`,
      },
    },
  },
};

/**
 * Disabled state.
 *
 * All interactive elements are disabled: contentEditable, + button,
 * builder mode toggle, voice button, and send button. Reduced opacity
 * and not-allowed cursor applied.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    config: {
      placeholder: 'Input is disabled',
    },
    onVoiceStart: fn(),
  },
};

/**
 * Submitting state.
 *
 * Similar to disabled but specifically during submission.
 * The send button shows a spinning Loader2 icon. The input is
 * non-editable. data-submitting="true" is set on the container.
 */
export const Submitting: Story = {
  args: {
    isSubmitting: true,
    config: {
      placeholder: 'Submitting...',
    },
  },
};

/**
 * Palette integration with a mock entity provider.
 *
 * Type "@" to open the entity palette overlay. It appears above
 * the input with a slide-down animation. Type a query after @ to
 * filter entities. Select an entity to insert a chip into the input.
 *
 * The mock provider returns workstreams and skills for demonstration.
 */
export const WithPaletteProviders: Story = {
  args: {
    entityProvider: mockEntityProvider,
    entityTabs: [
      { id: 'all', label: 'All' },
      { id: 'workstream', label: 'Workstreams' },
      { id: 'skill', label: 'Skills' },
    ],
    onEntitySelect: fn(),
    onEntityChipClick: fn(),
    config: {
      placeholder: 'Type @ to mention an entity...',
    },
  },
  parameters: {
    docs: {
      description: {
        story: `Entity palette integration:
        1. Type "@" to open the palette overlay
        2. Continue typing to filter entities
        3. Use Up/Down arrows to navigate, Enter to select
        4. Selected entity inserts as an inline chip
        5. Press Escape to dismiss the palette

        The palette requires an entityProvider that implements:
        - search(query: string): Promise<Entity[]>
        - getRecent(): Promise<Entity[]>

        Entity shape: { id, type, title, subtitle, metadata }`,
      },
    },
  },
};

/**
 * All features enabled together.
 *
 * Combines attachments, builder mode, voice, palette providers,
 * skills, character count, and rotating placeholder to demonstrate
 * the full unified input surface.
 */
export const FullFeatures: Story = {
  render: (args) => {
    const ref = useRef<ChatInputUnifiedHandle>(null);

    const handleBrowseSkills = useCallback(() => {
      // eslint-disable-next-line no-alert
      alert('Browse skills clicked');
    }, []);

    return (
      <div className="flex flex-col gap-4">
        <ChatInputUnified ref={ref} {...args} onBrowseSkills={handleBrowseSkills} />
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => ref.current?.focus()}
            className="px-3 py-1.5 text-xs font-medium bg-surface-interactive text-foreground-secondary border border-border-muted rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            focus()
          </button>
          <button
            type="button"
            onClick={() => ref.current?.clear()}
            className="px-3 py-1.5 text-xs font-medium bg-surface-interactive text-foreground-secondary border border-border-muted rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            clear()
          </button>
          <button
            type="button"
            onClick={() => ref.current?.setValue('Pre-filled message from ref API')}
            className="px-3 py-1.5 text-xs font-medium bg-surface-interactive text-foreground-secondary border border-border-muted rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            setValue(...)
          </button>
        </div>
      </div>
    );
  },
  args: {
    config: {
      placeholder: 'Full-featured input: @mentions, /commands, attachments, voice...',
      showCharacterCount: true,
      maxLength: 4000,
      maxAttachments: 10,
      maxFileSize: 10 * 1024 * 1024,
    },
    builderMode: false,
    onBuilderModeChange: fn(),
    voiceRecording: false,
    onVoiceStart: fn(),
    onVoiceStop: fn(),
    entityProvider: mockEntityProvider,
    entityTabs: [
      { id: 'all', label: 'All' },
      { id: 'workstream', label: 'Workstreams' },
      { id: 'skill', label: 'Skills' },
    ],
    skills: mockSkills,
    onSkillSelect: fn(),
    onEntitySelect: fn(),
    onEntityChipClick: fn(),
    onAttachmentsChange: fn(),
    onChange: fn(),
    onSubmit: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: `All features enabled:
        - **Text input** with character count (4000 max)
        - **Attachments** via + button (up to 10 files, 10MB each)
        - **Skills** in the + menu (Code Review, Deploy, Test Generator)
        - **Builder mode** toggle (wrench icon)
        - **Voice input** (mic icon)
        - **Entity palette** (type @ to open)
        - **Ref API** (focus, clear, setValue via control buttons)

        This demonstrates the complete surface area of ChatInputUnified.`,
      },
    },
  },
};

/**
 * Leading accessory slot.
 *
 * The `leadingAccessory` prop renders arbitrary React content inside the
 * bottom controls row, after the built-in buttons (attachment, builder, voice).
 * Use this for contextual actions like a branch picker or workspace selector.
 */
export const WithLeadingAccessory: Story = {
  args: {
    leadingAccessory: (
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-border-muted px-1.5 h-[22px] text-[9px] font-mono text-foreground-secondary hover:bg-surface-hover transition-colors"
      >
        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
        <span className="max-w-[100px] truncate">feat/my-branch</span>
        <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    ),
    config: {
      placeholder: 'The branch picker button is in the bottom-left controls...',
    },
  },
  parameters: {
    docs: {
      description: {
        story: `The \`leadingAccessory\` prop accepts any ReactNode and renders it
        inside the bottom controls row alongside the built-in buttons.

        Common use cases:
        - **Branch picker** — shows active branch with a dropdown
        - **Workspace selector** — switch between project directories
        - **Context indicator** — show active file or selection

        The accessory is vertically centered via \`items-center\` on the
        controls row. It appears after the attachment, builder, and voice buttons.`,
      },
    },
  },
};
