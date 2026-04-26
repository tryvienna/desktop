import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { dismiss: vi.fn() },
}));

import { toast } from 'sonner';
import { NotificationToast, CUSTOM_TOAST_CLASS } from './notification-toast';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NotificationToast', () => {
  it('renders title', () => {
    const { getByText } = render(<NotificationToast id="1" title="Hello" />);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('renders description when provided', () => {
    const { getByText } = render(
      <NotificationToast id="1" title="Title" description="Details here" />
    );
    expect(getByText('Details here')).toBeTruthy();
  });

  it('does not render description when omitted', () => {
    const { container } = render(<NotificationToast id="1" title="Title" />);
    expect(container.querySelector('[data-slot="notification-toast-description"]')).toBeNull();
  });

  it('applies data-slot="notification-toast"', () => {
    const { container } = render(<NotificationToast id="1" title="T" />);
    expect(container.querySelector('[data-slot="notification-toast"]')).toBeTruthy();
  });

  it('applies data-variant attribute', () => {
    const { container } = render(<NotificationToast id="1" title="T" variant="error" />);
    expect(container.querySelector('[data-variant="error"]')).toBeTruthy();
  });

  it.each(['success', 'error', 'warning', 'info'] as const)(
    'renders icon for %s variant',
    (variant) => {
      const { container } = render(<NotificationToast id="1" title="T" variant={variant} />);
      expect(container.querySelector('svg')).toBeTruthy();
    }
  );

  it('does not render icon for default variant', () => {
    const { container } = render(<NotificationToast id="1" title="T" variant="default" />);
    // Only the close button has an SVG, not a status icon
    const svgs = container.querySelectorAll('svg');
    // close button X icon is inside [data-slot="notification-toast-close"]
    const statusIcons = Array.from(svgs).filter(
      (svg) => !svg.closest('[data-slot="notification-toast-close"]')
    );
    expect(statusIcons).toHaveLength(0);
  });

  it('calls onClick and dismisses on body click', () => {
    const onClick = vi.fn();
    const { container } = render(
      <NotificationToast id="42" title="Click me" onClick={onClick} />
    );
    fireEvent.click(container.querySelector('[data-slot="notification-toast"]')!);
    expect(onClick).toHaveBeenCalledOnce();
    expect(toast.dismiss).toHaveBeenCalledWith('42');
  });

  it('does not call onClick when clicking action button', () => {
    const onClick = vi.fn();
    const actionClick = vi.fn();
    const { getByText } = render(
      <NotificationToast
        id="1"
        title="T"
        onClick={onClick}
        actions={[{ label: 'Allow', onClick: actionClick }]}
      />
    );
    fireEvent.click(getByText('Allow'));
    expect(actionClick).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
    expect(toast.dismiss).toHaveBeenCalledWith('1');
  });

  it('does not call onClick when clicking close button', () => {
    const onClick = vi.fn();
    const { container } = render(
      <NotificationToast id="1" title="T" onClick={onClick} />
    );
    fireEvent.click(container.querySelector('[data-slot="notification-toast-close"]')!);
    expect(onClick).not.toHaveBeenCalled();
    expect(toast.dismiss).toHaveBeenCalledWith('1');
  });

  it('renders action buttons', () => {
    const { getByText } = render(
      <NotificationToast
        id="1"
        title="T"
        actions={[
          { label: 'Allow', onClick: vi.fn() },
          { label: 'Deny', onClick: vi.fn() },
        ]}
      />
    );
    expect(getByText('Allow')).toBeTruthy();
    expect(getByText('Deny')).toBeTruthy();
  });

  it('dismisses on action button click', () => {
    const action = vi.fn();
    const { getByText } = render(
      <NotificationToast id="7" title="T" actions={[{ label: 'Go', onClick: action }]} />
    );
    fireEvent.click(getByText('Go'));
    expect(action).toHaveBeenCalledOnce();
    expect(toast.dismiss).toHaveBeenCalledWith('7');
  });

  it('applies cursor-pointer when onClick is set', () => {
    const { container } = render(
      <NotificationToast id="1" title="T" onClick={vi.fn()} />
    );
    const el = container.querySelector('[data-slot="notification-toast"]')!;
    expect(el.className).toContain('cursor-pointer');
  });

  it('does not apply cursor-pointer when onClick is not set', () => {
    const { container } = render(<NotificationToast id="1" title="T" />);
    const el = container.querySelector('[data-slot="notification-toast"]')!;
    expect(el.className).not.toContain('cursor-pointer');
  });

  it('exports CUSTOM_TOAST_CLASS', () => {
    expect(CUSTOM_TOAST_CLASS).toContain('!bg-transparent');
    expect(CUSTOM_TOAST_CLASS).toContain('!border-0');
    expect(CUSTOM_TOAST_CLASS).toContain('!shadow-none');
  });
});
