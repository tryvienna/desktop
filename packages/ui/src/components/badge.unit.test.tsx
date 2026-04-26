import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders with children', () => {
    const { getByText } = render(<Badge>New</Badge>);
    expect(getByText('New')).toBeTruthy();
  });

  it('has data-slot="badge" attribute', () => {
    const { container } = render(<Badge>Test</Badge>);
    expect(container.querySelector('[data-slot="badge"]')).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>);
    const badge = container.querySelector('[data-slot="badge"]')!;
    expect(badge.className).toContain('custom-class');
  });

  it('renders as a span element by default', () => {
    const { container } = render(<Badge>Test</Badge>);
    const badge = container.querySelector('[data-slot="badge"]')!;
    expect(badge.tagName).toBe('SPAN');
  });

  describe('variants', () => {
    it.each(['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const)(
      'renders %s variant with data-variant attribute',
      (variant) => {
        const { container } = render(<Badge variant={variant}>Test</Badge>);
        const badge = container.querySelector(`[data-variant="${variant}"]`);
        expect(badge).toBeTruthy();
      }
    );
  });

  it('defaults to the "default" variant', () => {
    const { container } = render(<Badge>Test</Badge>);
    expect(container.querySelector('[data-variant="default"]')).toBeTruthy();
  });

  it('renders as child element with asChild prop', () => {
    const { container } = render(
      <Badge asChild>
        <a href="/status">Active</a>
      </Badge>
    );
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('data-slot')).toBe('badge');
    expect(link!.textContent).toBe('Active');
    // Should not render a span element
    expect(container.querySelector('span')).toBeNull();
  });
});
