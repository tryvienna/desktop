import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  StatusBadge,
  StatusIndicator,
  getStatusColor,
  getStatusDisplayLabel,
  type SemanticStatus,
} from './status';

describe('StatusBadge', () => {
  it('renders with semantic status', () => {
    const { getByText } = render(<StatusBadge status="done" />);
    expect(getByText('Done')).toBeTruthy();
  });

  it('renders custom label when provided', () => {
    const { getByText } = render(<StatusBadge status="done" label="Finished" />);
    expect(getByText('Finished')).toBeTruthy();
  });

  it('has data-slot="status-badge"', () => {
    const { container } = render(<StatusBadge status="active" />);
    expect(container.querySelector('[data-slot="status-badge"]')).toBeTruthy();
  });

  it('renders pill variant (default)', () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.querySelector('[data-slot="status-badge"]');
    expect(badge?.className).toContain('rounded-full');
  });

  it('renders dot variant', () => {
    const { container } = render(<StatusBadge status="active" variant="dot" />);
    const badge = container.querySelector('[data-slot="status-badge"]');
    expect(badge).toBeTruthy();
    // Dot variant has a child span for the dot
    expect(badge?.querySelector('span')).toBeTruthy();
  });

  it('renders text variant', () => {
    const { getByText } = render(<StatusBadge status="error" variant="text" />);
    expect(getByText('Error')).toBeTruthy();
  });

  it('merges className', () => {
    const { container } = render(<StatusBadge status="active" className="my-class" />);
    const badge = container.querySelector('[data-slot="status-badge"]');
    expect(badge?.className).toContain('my-class');
  });

  it.each(['todo', 'pending', 'in_progress', 'active', 'done', 'completed', 'blocked', 'cancelled', 'error'] as SemanticStatus[])(
    'renders status "%s" without error',
    (status) => {
      const { container } = render(<StatusBadge status={status} />);
      expect(container.querySelector('[data-slot="status-badge"]')).toBeTruthy();
    }
  );

  it('renders custom (non-semantic) status as text', () => {
    const { getByText } = render(<StatusBadge status="custom_status" />);
    expect(getByText('custom_status')).toBeTruthy();
  });
});

describe('StatusIndicator', () => {
  it.each(['done', 'completed', 'in_progress', 'active', 'cancelled', 'blocked', 'error', 'todo', 'pending'] as SemanticStatus[])(
    'renders icon for status "%s"',
    (status) => {
      const { container } = render(<StatusIndicator status={status} />);
      expect(container.querySelector('svg')).toBeTruthy();
    }
  );

  it('merges className', () => {
    const { container } = render(<StatusIndicator status="done" className="my-icon" />);
    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal || svg?.getAttribute('class')).toContain('my-icon');
  });

  it('respects size prop', () => {
    const { container } = render(<StatusIndicator status="done" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('24');
    expect(svg?.getAttribute('height')).toBe('24');
  });
});

describe('getStatusColor', () => {
  it('returns correct color for semantic statuses', () => {
    expect(getStatusColor('done')).toBe('green');
    expect(getStatusColor('error')).toBe('red');
    expect(getStatusColor('active')).toBe('blue');
    expect(getStatusColor('in_progress')).toBe('amber');
    expect(getStatusColor('todo')).toBe('gray');
  });

  it('returns gray for unknown status', () => {
    expect(getStatusColor('unknown')).toBe('gray');
  });
});

describe('getStatusDisplayLabel', () => {
  it('returns correct labels for semantic statuses', () => {
    expect(getStatusDisplayLabel('done')).toBe('Done');
    expect(getStatusDisplayLabel('in_progress')).toBe('Active');
    expect(getStatusDisplayLabel('error')).toBe('Error');
  });

  it('returns custom label when provided', () => {
    expect(getStatusDisplayLabel('done', 'Complete!')).toBe('Complete!');
  });

  it('returns raw status for unknown status', () => {
    expect(getStatusDisplayLabel('custom')).toBe('custom');
  });
});
