// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FooterActions } from './FooterActions';
import type { Workstream } from '../../../renderer/contexts/WorkstreamContext';

vi.mock('@tryvienna/ui', () => ({
  Button: ({
    children,
    onClick,
    variant,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
  DrawerPanelFooter: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="drawer-footer" {...props}>{children}</div>
  ),
  ConfirmDialog: ({
    open,
    title,
    onConfirm,
    variant,
  }: {
    open: boolean;
    title: string;
    onConfirm: () => void;
    variant?: string;
  }) => {
    return open ? (
      <div data-testid={`dialog-${title.toLowerCase().replace(/\s+/g, '-')}`} data-variant={variant}>
        <span>{title}</span>
        <button data-testid={`confirm-${title.toLowerCase().replace(/\s+/g, '-')}`} onClick={onConfirm}>Confirm</button>
      </div>
    ) : null;
  },
}));

const baseWorkstream: Workstream = {
  id: 'ws-1',
  title: 'Test Workstream',
  status: 'active',
  model: 'sonnet',
  isPinned: false,
  messageCount: 0,
  lastActivityAt: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  isRoutineWorkstream: false,
  groupId: null,
};

const defaultProps = {
  workstream: baseWorkstream,
  onPin: vi.fn(),
  onUnpin: vi.fn(),
  onArchive: vi.fn(),
  onDelete: vi.fn(),
};

describe('FooterActions', () => {
  it('renders pin button when not pinned', () => {
    render(<FooterActions {...defaultProps} />);
    expect(screen.getByText('Pin')).toBeTruthy();
    expect(screen.queryByText('Unpin')).toBeNull();
  });

  it('renders unpin button when pinned', () => {
    const ws = { ...baseWorkstream, isPinned: true };
    render(<FooterActions {...defaultProps} workstream={ws} />);
    expect(screen.getByText('Unpin')).toBeTruthy();
    expect(screen.queryByText('Pin')).toBeNull();
  });

  it('calls onPin when pin button clicked', () => {
    const onPin = vi.fn();
    render(<FooterActions {...defaultProps} onPin={onPin} />);
    fireEvent.click(screen.getByText('Pin'));
    expect(onPin).toHaveBeenCalledOnce();
  });

  it('calls onUnpin when unpin button clicked', () => {
    const onUnpin = vi.fn();
    const ws = { ...baseWorkstream, isPinned: true };
    render(<FooterActions {...defaultProps} workstream={ws} onUnpin={onUnpin} />);
    fireEvent.click(screen.getByText('Unpin'));
    expect(onUnpin).toHaveBeenCalledOnce();
  });

  it('shows archive dialog when archive clicked', () => {
    render(<FooterActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Archive'));
    expect(screen.getByTestId('dialog-archive-workstream')).toBeTruthy();
  });

  it('calls onArchive when archive confirmed', () => {
    const onArchive = vi.fn();
    render(<FooterActions {...defaultProps} onArchive={onArchive} />);
    fireEvent.click(screen.getByText('Archive'));
    fireEvent.click(screen.getByTestId('confirm-archive-workstream'));
    expect(onArchive).toHaveBeenCalledOnce();
  });

  it('shows delete dialog when delete clicked', () => {
    render(<FooterActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByTestId('dialog-delete-workstream')).toBeTruthy();
  });

  it('calls onDelete when delete confirmed', () => {
    const onDelete = vi.fn();
    render(<FooterActions {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByTestId('confirm-delete-workstream'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('has data-slot attribute on footer', () => {
    render(<FooterActions {...defaultProps} />);
    expect(screen.getByTestId('drawer-footer').getAttribute('data-slot')).toBe('footer-actions');
  });
});
