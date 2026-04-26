import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('has data-slot="button" attribute', () => {
    const { container } = render(<Button>Test</Button>);
    expect(container.querySelector('[data-slot="button"]')).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(<Button className="custom-class">Test</Button>);
    const button = container.querySelector('[data-slot="button"]')!;
    expect(button.className).toContain('custom-class');
  });

  it('renders as a button element by default', () => {
    const { container } = render(<Button>Test</Button>);
    expect(container.querySelector('button')).toBeTruthy();
  });

  describe('variants', () => {
    it.each(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const)(
      'renders %s variant with data-variant attribute',
      (variant) => {
        const { container } = render(<Button variant={variant}>Test</Button>);
        const button = container.querySelector(`[data-variant="${variant}"]`);
        expect(button).toBeTruthy();
      }
    );
  });

  describe('sizes', () => {
    it.each(['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const)(
      'renders %s size with data-size attribute',
      (size) => {
        const { container } = render(<Button size={size}>T</Button>);
        const button = container.querySelector(`[data-size="${size}"]`);
        expect(button).toBeTruthy();
      }
    );
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    const { getByText } = render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(getByText('Click'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('handles disabled state', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );
    const button = container.querySelector('button')!;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders as child element with asChild prop', () => {
    const { container } = render(
      <Button asChild>
        <a href="/home">Home</a>
      </Button>
    );
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe('/home');
    expect(link!.getAttribute('data-slot')).toBe('button');
    // Should not render a button element
    expect(container.querySelector('button')).toBeNull();
  });
});
