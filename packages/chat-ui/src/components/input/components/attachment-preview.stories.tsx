// AttachmentPreview Stories — File/image attachment preview chip

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AttachmentPreview } from './attachment-preview';
import type { Attachment } from '../../../types/input';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 1x1 transparent PNG as a minimal data URL for image preview demos. */
const SAMPLE_IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const makeAttachment = (overrides: Partial<Attachment> = {}): Attachment => ({
  id: 'att-1',
  name: 'document.pdf',
  size: 245_000,
  mimeType: 'application/pdf',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof AttachmentPreview> = {
  title: 'Input/attachment-preview',
  component: AttachmentPreview,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360, padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onRemove: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AttachmentPreview>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default PDF file attachment with remove button. */
export const Default: Story = {
  args: {
    attachment: makeAttachment(),
  },
};

/** Image attachment showing a thumbnail via previewUrl. */
export const ImageAttachment: Story = {
  args: {
    attachment: makeAttachment({
      id: 'att-img-1',
      name: 'screenshot.png',
      size: 1_200_000,
      mimeType: 'image/png',
      previewUrl: SAMPLE_IMAGE_DATA_URL,
    }),
  },
};

/** Large file displaying human-readable GB size. */
export const LargeFile: Story = {
  args: {
    attachment: makeAttachment({
      id: 'att-large',
      name: 'database-backup-2026-02-28.sql.gz',
      size: 2_400_000_000,
      mimeType: 'application/gzip',
    }),
  },
};

/** Small (sm) size variant with compact spacing. */
export const SmallSize: Story = {
  args: {
    attachment: makeAttachment({
      id: 'att-sm',
      name: 'notes.txt',
      size: 1_024,
      mimeType: 'text/plain',
    }),
    size: 'sm',
  },
};

/** Attachment with a wired-up onRemove action (visible in Actions panel). */
export const WithRemoveAction: Story = {
  args: {
    attachment: makeAttachment({
      id: 'att-remove',
      name: 'report-final.pdf',
      size: 540_000,
      mimeType: 'application/pdf',
    }),
    removable: true,
    onRemove: fn(),
  },
};

/** Non-removable attachment (remove button hidden). */
export const NotRemovable: Story = {
  args: {
    attachment: makeAttachment({
      id: 'att-locked',
      name: 'locked-config.json',
      size: 2_048,
      mimeType: 'application/json',
    }),
    removable: false,
  },
};

/** Multiple attachments of different file types rendered in a column. */
export const MultipleAttachments: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <>
      <AttachmentPreview
        {...args}
        attachment={makeAttachment({
          id: 'att-pdf',
          name: 'proposal.pdf',
          size: 320_000,
          mimeType: 'application/pdf',
        })}
      />
      <AttachmentPreview
        {...args}
        attachment={makeAttachment({
          id: 'att-img',
          name: 'hero-banner.jpg',
          size: 890_000,
          mimeType: 'image/jpeg',
          previewUrl: SAMPLE_IMAGE_DATA_URL,
        })}
      />
      <AttachmentPreview
        {...args}
        attachment={makeAttachment({
          id: 'att-code',
          name: 'utils.ts',
          size: 4_200,
          mimeType: 'application/typescript',
        })}
      />
      <AttachmentPreview
        {...args}
        attachment={makeAttachment({
          id: 'att-video',
          name: 'demo-recording.mp4',
          size: 15_000_000,
          mimeType: 'video/mp4',
        })}
      />
      <AttachmentPreview
        {...args}
        attachment={makeAttachment({
          id: 'att-audio',
          name: 'podcast-episode.mp3',
          size: 8_500_000,
          mimeType: 'audio/mpeg',
        })}
      />
      <AttachmentPreview
        {...args}
        attachment={makeAttachment({
          id: 'att-zip',
          name: 'project-archive.zip',
          size: 50_000_000,
          mimeType: 'application/zip',
        })}
      />
    </>
  ),
};

/** JavaScript source file (shows code icon). */
export const JavaScriptFile: Story = {
  args: {
    attachment: makeAttachment({
      id: 'att-js',
      name: 'index.js',
      size: 3_400,
      mimeType: 'application/javascript',
    }),
  },
};
