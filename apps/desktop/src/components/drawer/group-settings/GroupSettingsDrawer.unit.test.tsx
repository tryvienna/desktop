// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupSettingsDrawer } from './GroupSettingsDrawer';

// ─── Mock data ──────────────────────────────────────────────────────────────

const mockGroups = [
  { id: 'grp-1', name: 'Test Group', isPinned: false, autoCreateWorktrees: false },
  { id: 'grp-2', name: 'Pinned Group', isPinned: true, autoCreateWorktrees: false },
];

const mockGroupActions = {
  groups: mockGroups,
  loading: false,
  createGroup: vi.fn(),
  renameGroup: vi.fn(),
  pinGroup: vi.fn(),
  unpinGroup: vi.fn(),
  deleteGroup: vi.fn(),
  archiveGroup: vi.fn(),
  addWorkstreamToGroup: vi.fn(),
  removeWorkstreamFromGroup: vi.fn(),
};

// ─── Mocks ──────────────────────────────────────────────────────────────────

let mockDrawerGroupId = 'grp-1';

vi.mock('../../../lib/drawer', () => ({
  DrawerContainer: ({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) => (
    <div data-testid="drawer-container" data-title={title}>{children}{footer}</div>
  ),
  useDrawerState: () => ({
    state: {
      mode: {
        type: 'full',
        content: { contentId: 'group-settings', payload: { groupId: mockDrawerGroupId } },
      },
    },
  }),
}));

vi.mock('../../../renderer/contexts/WorkstreamContext', () => ({
  useWorkstreamList: () => ({ projectId: 'proj-1', workstreams: [] }),
}));

vi.mock('../../../renderer/hooks/useWorkstreamGroups', () => ({
  useWorkstreamGroups: () => mockGroupActions,
}));

vi.mock('./GroupDirectoryBranchSection', () => ({
  GroupDirectoryBranchSection: () => <div data-testid="group-directory-branch-section" />,
}));

vi.mock('@tryvienna/ui', () => ({
  DrawerBody: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drawer-body">{children}</div>
  ),
  DrawerPanelFooter: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="drawer-footer" {...props}>{children}</div>
  ),
  InlineEdit: ({ value }: { value: string }) => <input data-testid="inline-edit" defaultValue={value} />,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  ConfirmDialog: () => null,
  Separator: () => <hr />,
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GroupSettingsDrawer', () => {
  it('renders drawer container with group name as title', () => {
    mockDrawerGroupId = 'grp-1';
    render(<GroupSettingsDrawer />);
    expect(screen.getByTestId('drawer-container')).toHaveAttribute('data-title', 'Test Group');
  });

  it('renders drawer body with group content', () => {
    mockDrawerGroupId = 'grp-1';
    render(<GroupSettingsDrawer />);
    expect(screen.getByTestId('drawer-body')).toBeTruthy();
  });

  it('renders inline edit with group name', () => {
    mockDrawerGroupId = 'grp-1';
    render(<GroupSettingsDrawer />);
    const input = screen.getByTestId('inline-edit') as HTMLInputElement;
    expect(input.defaultValue).toBe('Test Group');
  });

  it('renders footer with pin, archive, and delete actions', () => {
    mockDrawerGroupId = 'grp-1';
    render(<GroupSettingsDrawer />);
    expect(screen.getByText('Pin')).toBeTruthy();
    expect(screen.getByText('Archive')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('renders unpin button for pinned group', () => {
    mockDrawerGroupId = 'grp-2';
    render(<GroupSettingsDrawer />);
    expect(screen.getByText('Unpin')).toBeTruthy();
  });

  it('renders loading skeleton for unknown group', () => {
    mockDrawerGroupId = 'grp-unknown';
    const { container } = render(<GroupSettingsDrawer />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('has data-slot attribute on content area', () => {
    mockDrawerGroupId = 'grp-1';
    const { container } = render(<GroupSettingsDrawer />);
    expect(container.querySelector('[data-slot="group-settings-drawer"]')).toBeTruthy();
  });
});
