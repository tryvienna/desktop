// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShortcutBadge } from './ShortcutBadge';

describe('ShortcutBadge', () => {
  it('renders modifier and key badges on mac', () => {
    render(
      <ShortcutBadge
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
        platform="mac"
      />
    );

    expect(screen.getByText('⌘')).toBeInTheDocument();
    expect(screen.getByText('⇧')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('renders text labels on other platforms', () => {
    render(
      <ShortcutBadge
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
        platform="other"
      />
    );

    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('Shift')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('renders special key labels', () => {
    render(
      <ShortcutBadge
        shortcut={{ modifiers: ['cmd'], key: 'enter' }}
        platform="mac"
      />
    );

    expect(screen.getByText('↵')).toBeInTheDocument();
  });

  it('uses <kbd> elements', () => {
    const { container } = render(
      <ShortcutBadge
        shortcut={{ modifiers: ['cmd'], key: 'b' }}
        platform="mac"
      />
    );

    const kbdElements = container.querySelectorAll('kbd');
    expect(kbdElements).toHaveLength(2); // modifier + key
  });
});
