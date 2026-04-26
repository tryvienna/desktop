// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupDirectoryBranchSection } from './GroupDirectoryBranchSection';
import type { GroupDirectoryState } from '../../../renderer/hooks/useGroupDirectoryBranchState';

// ─── Mock state ──────────────────────────────────────────────────────────────

const mockHandlers = {
  handleBranchSelect: vi.fn(),
  handleBranchRemove: vi.fn(),
  handleAddDirectory: vi.fn(),
  handleRemoveDirectory: vi.fn(),
  handleAutoCreateWorktreesChange: vi.fn(),
  refetch: vi.fn(),
};

let mockDirectories: GroupDirectoryState[] = [];
let mockIsLoading = false;
let mockAutoCreateWorktrees = false;

vi.mock('../../../renderer/hooks/useGroupDirectoryBranchState', () => ({
  useGroupDirectoryBranchState: () => ({
    directories: mockDirectories,
    isLoading: mockIsLoading,
    autoCreateWorktrees: mockAutoCreateWorktrees,
    ...mockHandlers,
  }),
}));

vi.mock('@vienna/logger/renderer', () => ({
  createRendererLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@vienna/ipc/renderer', () => ({
  getApi: () => ({
    shell: { pickDirectory: vi.fn().mockResolvedValue({ path: '/new/dir' }) },
  }),
}));

vi.mock('../../../ipc', () => ({ api: {} }));

vi.mock('../../../renderer/utils/git', () => ({
  shortenPath: (p: string) => p,
  getDirectoryName: (p: string) => p.split('/').pop() ?? p,
}));

// Minimal UI mocks
vi.mock('@tryvienna/ui', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  Button: ({ children, onClick, disabled, ...props }: Record<string, unknown>) => (
    <button onClick={onClick as () => void} disabled={disabled as boolean} {...props}>
      {children as React.ReactNode}
    </button>
  ),
  Input: vi.fn().mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ ref, ...props }: Record<string, unknown>) => <input {...props} />,
  ),
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContentSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      data-testid="auto-create-switch"
    >
      {checked ? 'On' : 'Off'}
    </button>
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDir(overrides: Partial<GroupDirectoryState> = {}): GroupDirectoryState {
  return {
    path: '/Users/will/project',
    name: 'project',
    label: null,
    isGitRepo: true,
    selectedBranch: null,
    baseBranch: 'main',
    branches: [
      { name: 'main', isCurrent: true, isRemote: false },
      { name: 'dev', isCurrent: false, isRemote: false },
    ],
    isLoading: false,
    error: null,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GroupDirectoryBranchSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDirectories = [];
    mockIsLoading = false;
    mockAutoCreateWorktrees = false;
  });

  it('shows loading state', () => {
    mockIsLoading = true;
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.getByText('Loading directories...')).toBeTruthy();
  });

  it('shows empty state when no directories', () => {
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.getByText(/No directories configured/)).toBeTruthy();
  });

  it('shows add directory button', () => {
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.getByText('Add directory')).toBeTruthy();
  });

  it('renders directory row with name and path', () => {
    mockDirectories = [makeDir()];
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.getByText('project')).toBeTruthy();
    expect(screen.getByText('/Users/will/project')).toBeTruthy();
  });

  it('shows "Not a git repo" for non-git directories', () => {
    mockDirectories = [makeDir({ isGitRepo: false })];
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.getByText('Not a git repo')).toBeTruthy();
  });

  it('shows branch dropdown for git repo directories', () => {
    mockDirectories = [makeDir({ selectedBranch: 'feature/xyz' })];
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.getByText('feature/xyz')).toBeTruthy();
  });

  it('shows "default" when no branch selected', () => {
    mockDirectories = [makeDir()];
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.getByText('default')).toBeTruthy();
  });

  it('does not show worktree isolation section when no directories', () => {
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.queryByText('Auto-create worktrees')).toBeNull();
  });

  it('shows worktree isolation section when directories exist', () => {
    mockDirectories = [makeDir()];
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.getByText('Auto-create worktrees')).toBeTruthy();
    expect(screen.getByText(/Each new workstream gets its own branch/)).toBeTruthy();
  });

  it('toggle calls handleAutoCreateWorktreesChange', () => {
    mockDirectories = [makeDir()];
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    fireEvent.click(screen.getByTestId('auto-create-switch'));
    expect(mockHandlers.handleAutoCreateWorktreesChange).toHaveBeenCalledWith(true);
  });

  it('has data-slot attribute', () => {
    const { container } = render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(container.querySelector('[data-slot="group-directory-branch-section"]')).toBeTruthy();
  });

  it('renders remove button for each directory', () => {
    mockDirectories = [makeDir()];
    const { container } = render(<GroupDirectoryBranchSection groupId="grp-1" />);
    const removeBtn = container.querySelector('button[title="Remove directory"]');
    expect(removeBtn).toBeTruthy();
  });

  it('renders multiple directories', () => {
    mockDirectories = [
      makeDir({ path: '/a', name: 'alpha' }),
      makeDir({ path: '/b', name: 'beta' }),
    ];
    render(<GroupDirectoryBranchSection groupId="grp-1" />);
    expect(screen.getByText('alpha')).toBeTruthy();
    expect(screen.getByText('beta')).toBeTruthy();
  });
});
