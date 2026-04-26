// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TitleSection } from './TitleSection';
import type { Workstream } from '../../../renderer/contexts/WorkstreamContext';

vi.mock('@tryvienna/ui', () => ({
  StatusBadge: ({ label }: { label: string }) => (
    <span data-testid="status-badge">{label}</span>
  ),
  InlineEdit: ({
    value,
    onSave,
    placeholder,
  }: {
    value: string;
    onSave: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="inline-edit"
      defaultValue={value}
      placeholder={placeholder}
      onBlur={(e) => onSave(e.target.value)}
    />
  ),
}));

const mockWorkstream: Workstream = {
  id: 'ws-1',
  title: 'My Workstream',
  status: 'active',
  model: 'sonnet',
  isPinned: false,
  messageCount: 5,
  lastActivityAt: '2026-03-01T12:00:00Z',
  archivedAt: null,
  createdAt: '2026-02-01T12:00:00Z',
  updatedAt: '2026-03-01T12:00:00Z',
  isRoutineWorkstream: false,
  groupId: null,
};

describe('TitleSection', () => {
  it('renders status badge', () => {
    render(<TitleSection workstream={mockWorkstream} onTitleSave={vi.fn()} />);
    expect(screen.getByTestId('status-badge')).toBeTruthy();
  });

  it('renders status badge with formatted label', () => {
    render(<TitleSection workstream={mockWorkstream} onTitleSave={vi.fn()} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Active');
  });

  it('renders inline edit with current title', () => {
    render(<TitleSection workstream={mockWorkstream} onTitleSave={vi.fn()} />);
    const input = screen.getByTestId('inline-edit') as HTMLInputElement;
    expect(input.defaultValue).toBe('My Workstream');
  });

  it('calls onTitleSave with trimmed value on blur', () => {
    const onSave = vi.fn();
    render(<TitleSection workstream={mockWorkstream} onTitleSave={onSave} />);
    const input = screen.getByTestId('inline-edit') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  New Title  ' } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith('New Title');
  });

  it('does not call onTitleSave if title unchanged', () => {
    const onSave = vi.fn();
    render(<TitleSection workstream={mockWorkstream} onTitleSave={onSave} />);
    const input = screen.getByTestId('inline-edit') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My Workstream' } });
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onTitleSave if value is empty', () => {
    const onSave = vi.fn();
    render(<TitleSection workstream={mockWorkstream} onTitleSave={onSave} />);
    const input = screen.getByTestId('inline-edit') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('has data-slot attribute', () => {
    const { container } = render(
      <TitleSection workstream={mockWorkstream} onTitleSave={vi.fn()} />
    );
    expect(container.querySelector('[data-slot="title-section"]')).toBeTruthy();
  });
});
