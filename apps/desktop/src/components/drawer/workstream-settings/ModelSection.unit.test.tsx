// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSection } from './ModelSection';
import type { Workstream } from '../../../renderer/contexts/WorkstreamContext';

vi.mock('@tryvienna/ui', () => ({
  ContentSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="content-section" data-title={title}>{children}</div>
  ),
  ModelSelector: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <select
      data-testid="model-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="haiku">Haiku</option>
      <option value="sonnet">Sonnet</option>
      <option value="opus">Opus</option>
    </select>
  ),
}));

const mockWorkstream: Workstream = {
  id: 'ws-1',
  title: 'Test',
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

describe('ModelSection', () => {
  it('renders in a content section with "Model" title', () => {
    render(<ModelSection workstream={mockWorkstream} onModelChange={vi.fn()} />);
    expect(screen.getByTestId('content-section')).toHaveAttribute('data-title', 'Model');
  });

  it('renders model selector with current model value', () => {
    render(<ModelSection workstream={mockWorkstream} onModelChange={vi.fn()} />);
    expect(screen.getByTestId('model-selector')).toHaveValue('sonnet');
  });

  it('calls onModelChange when model changes', () => {
    const onChange = vi.fn();
    render(<ModelSection workstream={mockWorkstream} onModelChange={onChange} />);
    fireEvent.change(screen.getByTestId('model-selector'), { target: { value: 'opus' } });
    expect(onChange).toHaveBeenCalledWith('opus');
  });

  it('does not call onModelChange when selecting same model', () => {
    const onChange = vi.fn();
    render(<ModelSection workstream={mockWorkstream} onModelChange={onChange} />);
    fireEvent.change(screen.getByTestId('model-selector'), { target: { value: 'sonnet' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('defaults to sonnet when model is null', () => {
    const ws = { ...mockWorkstream, model: null };
    render(<ModelSection workstream={ws} onModelChange={vi.fn()} />);
    expect(screen.getByTestId('model-selector')).toHaveValue('sonnet');
  });
});
