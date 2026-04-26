// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupFooterActions } from './GroupFooterActions';
import type { WorkstreamGroup } from '../../../renderer/hooks/useWorkstreamsNavSections';

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

const baseGroup: WorkstreamGroup = {
  id: 'grp-1',
  name: 'Test Group',
  isPinned: false,
  autoCreateWorktrees: false,
};

const defaultProps = {
  group: baseGroup,
  onPin: vi.fn(),
  onUnpin: vi.fn(),
  onDelete: vi.fn(),
  onArchive: vi.fn(),
};

describe('GroupFooterActions', () => {
  it('renders pin button when not pinned', () => {
    render(<GroupFooterActions {...defaultProps} />);
    expect(screen.getByText('Pin')).toBeTruthy();
    expect(screen.queryByText('Unpin')).toBeNull();
  });

  it('renders unpin button when pinned', () => {
    const group = { ...baseGroup, isPinned: true };
    render(<GroupFooterActions {...defaultProps} group={group} />);
    expect(screen.getByText('Unpin')).toBeTruthy();
    expect(screen.queryByText('Pin')).toBeNull();
  });

  it('calls onPin when pin button clicked', () => {
    const onPin = vi.fn();
    render(<GroupFooterActions {...defaultProps} onPin={onPin} />);
    fireEvent.click(screen.getByText('Pin'));
    expect(onPin).toHaveBeenCalledOnce();
  });

  it('calls onUnpin when unpin button clicked', () => {
    const onUnpin = vi.fn();
    const group = { ...baseGroup, isPinned: true };
    render(<GroupFooterActions {...defaultProps} group={group} onUnpin={onUnpin} />);
    fireEvent.click(screen.getByText('Unpin'));
    expect(onUnpin).toHaveBeenCalledOnce();
  });

  it('shows delete dialog when delete clicked', () => {
    render(<GroupFooterActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByTestId('dialog-delete-group')).toBeTruthy();
  });

  it('calls onDelete when delete confirmed', () => {
    const onDelete = vi.fn();
    render(<GroupFooterActions {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByTestId('confirm-delete-group'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('delete dialog has destructive variant', () => {
    render(<GroupFooterActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByTestId('dialog-delete-group').getAttribute('data-variant')).toBe('destructive');
  });

  it('shows archive dialog when archive clicked', () => {
    render(<GroupFooterActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Archive'));
    expect(screen.getByTestId('dialog-archive-group')).toBeTruthy();
  });

  it('calls onArchive when archive confirmed', () => {
    const onArchive = vi.fn();
    render(<GroupFooterActions {...defaultProps} onArchive={onArchive} />);
    fireEvent.click(screen.getByText('Archive'));
    fireEvent.click(screen.getByTestId('confirm-archive-group'));
    expect(onArchive).toHaveBeenCalledOnce();
  });

  it('has data-slot attribute on footer', () => {
    render(<GroupFooterActions {...defaultProps} />);
    expect(screen.getByTestId('drawer-footer').getAttribute('data-slot')).toBe('group-footer-actions');
  });
});
