// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkstreamSettingsDrawer } from './WorkstreamSettingsDrawer';
import { workstreamSettingsContent } from '../content';

// ─── Mock WorkstreamContext ──────────────────────────────────────────────────

const mockWorkstreams = [
  {
    id: 'ws-1',
    title: 'Test Workstream',
    status: 'active',
    model: 'sonnet',
    isPinned: false,
    isRoutineWorkstream: false,
    groupId: null,
    messageCount: 5,
    lastActivityAt: '2026-03-01T12:00:00Z',
    createdAt: '2026-02-01T12:00:00Z',
    updatedAt: '2026-03-01T12:00:00Z',
  },
];

const mockActions = {
  updateWorkstreamTitle: vi.fn(),
  switchWorkstreamModel: vi.fn(),
  pinWorkstream: vi.fn(),
  unpinWorkstream: vi.fn(),
  archiveWorkstream: vi.fn(),
  unarchiveWorkstream: vi.fn(),
  deleteWorkstream: vi.fn(),
  setActiveWorkstream: vi.fn(),
  createWorkstream: vi.fn(),
};

vi.mock('../../../renderer/contexts/WorkstreamContext', () => ({
  useWorkstreamState: () => ({
    projectId: 'proj-1',
    workstreams: mockWorkstreams,
    activeWorkstreamId: 'ws-1',
    loading: false,
    error: null,
  }),
  useWorkstreamActions: () => mockActions,
}));

// ─── Mock Drawer Library ────────────────────────────────────────────────────

vi.mock('../../../lib/drawer', () => ({
  DrawerContainer: ({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) => (
    <div data-testid="drawer-container" data-title={title}>{children}{footer}</div>
  ),
}));

// ─── Mock @tryvienna/ui ────────────────────────────────────────────────────────

vi.mock('@tryvienna/ui', () => ({
  DrawerBody: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drawer-body">{children}</div>
  ),
  DrawerPanelFooter: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="drawer-footer" {...props}>{children}</div>
  ),
  Separator: () => <hr data-testid="separator" />,
  StatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
  InlineEdit: ({ value }: { value: string }) => <input defaultValue={value} />,
  ContentSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`section-${title.toLowerCase()}`}>{children}</div>
  ),
  ModelSelector: ({ value }: { value: string }) => <div data-testid="model-selector">{value}</div>,
  MetadataList: ({ items }: { items: Array<{ label: string; value: string }> }) => (
    <dl>
      {items.map((i) => (
        <div key={i.label}><dt>{i.label}</dt><dd>{i.value}</dd></div>
      ))}
    </dl>
  ),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  ConfirmDialog: () => null,
}));

describe('WorkstreamSettingsDrawer', () => {
  it('renders drawer container with workstream title', () => {
    workstreamSettingsContent('ws-1');
    render(<WorkstreamSettingsDrawer />);
    expect(screen.getByTestId('drawer-container')).toHaveAttribute('data-title', 'Test Workstream');
  });

  it('renders all sections for existing workstream', () => {
    workstreamSettingsContent('ws-1');
    render(<WorkstreamSettingsDrawer />);
    expect(screen.getByTestId('drawer-body')).toBeTruthy();
    expect(screen.getByText('Test Workstream')).toBeTruthy();
  });

  it('renders loading skeleton for unknown workstream', () => {
    workstreamSettingsContent('ws-unknown');
    const { container } = render(<WorkstreamSettingsDrawer />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders separators between sections', () => {
    workstreamSettingsContent('ws-1');
    render(<WorkstreamSettingsDrawer />);
    expect(screen.getAllByTestId('separator').length).toBe(3);
  });

  it('renders footer actions', () => {
    workstreamSettingsContent('ws-1');
    render(<WorkstreamSettingsDrawer />);
    expect(screen.getByText('Pin')).toBeTruthy();
    expect(screen.getByText('Archive')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('handles non-workstream-settings content gracefully', () => {
    const { container } = render(<WorkstreamSettingsDrawer />);
    // Should show loading state since workstream won't be found
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
