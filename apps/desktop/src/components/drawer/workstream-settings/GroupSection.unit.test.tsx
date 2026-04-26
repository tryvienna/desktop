// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupSection } from './GroupSection';
import type { WorkstreamGroup } from '../../../renderer/hooks/useWorkstreamsNavSections';

vi.mock('@tryvienna/ui', () => ({
  ContentSection: ({ title, children, ...props }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`section-${title.toLowerCase()}`} {...props}>{children}</div>
  ),
  Combobox: ({
    value,
    onValueChange,
    options,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    options: Array<{ label: string; value: string }>;
    placeholder?: string;
  }) => {
    return (
      <div data-testid="combobox" data-value={value}>
        {options.map((o) => (
          <button key={o.value} data-testid={`option-${o.value}`} onClick={() => onValueChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  },
}));

const mockGroups: WorkstreamGroup[] = [
  { id: 'grp-1', name: 'Frontend', emoji: null, isPinned: false, autoCreateWorktrees: false },
  { id: 'grp-2', name: 'Backend', emoji: null, isPinned: true, autoCreateWorktrees: false },
];

describe('GroupSection', () => {
  it('renders in a content section titled "Scope"', () => {
    render(<GroupSection currentGroupId={null} groups={mockGroups} onGroupChange={vi.fn()} />);
    expect(screen.getByTestId('section-scope')).toBeTruthy();
  });

  it('has data-slot attribute', () => {
    render(<GroupSection currentGroupId={null} groups={mockGroups} onGroupChange={vi.fn()} />);
    expect(screen.getByTestId('section-scope').getAttribute('data-slot')).toBe('group-section');
  });

  it('shows "None" option plus all groups', () => {
    render(<GroupSection currentGroupId={null} groups={mockGroups} onGroupChange={vi.fn()} />);
    expect(screen.getByTestId('option-__none__')).toBeTruthy();
    expect(screen.getByTestId('option-grp-1')).toBeTruthy();
    expect(screen.getByTestId('option-grp-2')).toBeTruthy();
  });

  it('sets combobox value to __none__ when currentGroupId is null', () => {
    render(<GroupSection currentGroupId={null} groups={mockGroups} onGroupChange={vi.fn()} />);
    expect(screen.getByTestId('combobox').getAttribute('data-value')).toBe('__none__');
  });

  it('sets combobox value to group id when assigned', () => {
    render(<GroupSection currentGroupId="grp-1" groups={mockGroups} onGroupChange={vi.fn()} />);
    expect(screen.getByTestId('combobox').getAttribute('data-value')).toBe('grp-1');
  });

  it('calls onGroupChange with group id when selecting a group', () => {
    const onGroupChange = vi.fn();
    render(<GroupSection currentGroupId={null} groups={mockGroups} onGroupChange={onGroupChange} />);
    fireEvent.click(screen.getByTestId('option-grp-1'));
    expect(onGroupChange).toHaveBeenCalledWith('grp-1');
  });

  it('calls onGroupChange with null when selecting None', () => {
    const onGroupChange = vi.fn();
    render(<GroupSection currentGroupId="grp-1" groups={mockGroups} onGroupChange={onGroupChange} />);
    fireEvent.click(screen.getByTestId('option-__none__'));
    expect(onGroupChange).toHaveBeenCalledWith(null);
  });

  it('does not call onGroupChange when selecting current group', () => {
    const onGroupChange = vi.fn();
    render(<GroupSection currentGroupId="grp-1" groups={mockGroups} onGroupChange={onGroupChange} />);
    fireEvent.click(screen.getByTestId('option-grp-1'));
    expect(onGroupChange).not.toHaveBeenCalled();
  });
});
