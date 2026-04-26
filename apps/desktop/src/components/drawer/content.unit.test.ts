import { describe, it, expect } from 'vitest';
import {
  WORKSTREAM_SETTINGS_CONTENT_ID,
  workstreamSettingsContent,
  isWorkstreamSettingsContent,
  getWorkstreamIdFromContent,
} from './content';

describe('workstreamSettingsContent', () => {
  it('creates a descriptor with correct contentId', () => {
    const desc = workstreamSettingsContent('ws-123');
    expect(desc.contentId).toBe(WORKSTREAM_SETTINGS_CONTENT_ID);
  });

  it('includes workstreamId in payload', () => {
    const desc = workstreamSettingsContent('ws-456');
    expect(desc.payload).toEqual({ workstreamId: 'ws-456' });
  });
});

describe('isWorkstreamSettingsContent', () => {
  it('returns true for valid workstream settings content', () => {
    const desc = workstreamSettingsContent('ws-123');
    expect(isWorkstreamSettingsContent(desc)).toBe(true);
  });

  it('returns false for different contentId', () => {
    expect(
      isWorkstreamSettingsContent({ contentId: 'other', payload: { workstreamId: 'ws-1' } })
    ).toBe(false);
  });

  it('returns false when payload missing workstreamId', () => {
    expect(
      isWorkstreamSettingsContent({ contentId: WORKSTREAM_SETTINGS_CONTENT_ID })
    ).toBe(false);
  });

  it('returns false when workstreamId is not a string', () => {
    expect(
      isWorkstreamSettingsContent({
        contentId: WORKSTREAM_SETTINGS_CONTENT_ID,
        payload: { workstreamId: 123 },
      })
    ).toBe(false);
  });
});

describe('getWorkstreamIdFromContent', () => {
  it('extracts workstreamId from valid descriptor', () => {
    const desc = workstreamSettingsContent('ws-789');
    expect(getWorkstreamIdFromContent(desc)).toBe('ws-789');
  });

  it('returns null for non-matching descriptor', () => {
    expect(getWorkstreamIdFromContent({ contentId: 'other' })).toBeNull();
  });
});
