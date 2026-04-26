// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupTitleSection } from './GroupTitleSection';
import type { WorkstreamGroup } from '../../../renderer/hooks/useWorkstreamsNavSections';

vi.mock('@tryvienna/ui', () => ({
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

const mockGroup: WorkstreamGroup = {
  id: 'grp-1',
  name: 'My Group',
  isPinned: false,
  autoCreateWorktrees: false,
};

describe('GroupTitleSection', () => {
  it('renders inline edit with current name', () => {
    render(<GroupTitleSection group={mockGroup} onNameSave={vi.fn()} />);
    const input = screen.getByTestId('inline-edit') as HTMLInputElement;
    expect(input.defaultValue).toBe('My Group');
  });

  it('renders group name label', () => {
    render(<GroupTitleSection group={mockGroup} onNameSave={vi.fn()} />);
    expect(screen.getByText('Group Name')).toBeTruthy();
  });

  it('calls onNameSave with trimmed value on blur', () => {
    const onSave = vi.fn();
    render(<GroupTitleSection group={mockGroup} onNameSave={onSave} />);
    const input = screen.getByTestId('inline-edit') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  New Name  ' } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith('New Name');
  });

  it('does not call onNameSave if name unchanged', () => {
    const onSave = vi.fn();
    render(<GroupTitleSection group={mockGroup} onNameSave={onSave} />);
    const input = screen.getByTestId('inline-edit') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My Group' } });
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onNameSave if value is empty', () => {
    const onSave = vi.fn();
    render(<GroupTitleSection group={mockGroup} onNameSave={onSave} />);
    const input = screen.getByTestId('inline-edit') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('has data-slot attribute', () => {
    const { container } = render(
      <GroupTitleSection group={mockGroup} onNameSave={vi.fn()} />,
    );
    expect(container.querySelector('[data-slot="group-title-section"]')).toBeTruthy();
  });
});
