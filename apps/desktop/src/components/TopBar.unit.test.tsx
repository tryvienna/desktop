// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('renders a header element with data-slot="top-bar"', () => {
    render(<TopBar />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute('data-slot', 'top-bar');
  });

  it('renders with 40px height', () => {
    render(<TopBar />);
    const header = screen.getByRole('banner');
    expect(header.style.height).toBe('40px');
  });

  it('sets WebkitAppRegion to drag for macOS window dragging', () => {
    render(<TopBar />);
    const header = screen.getByRole('banner');
    // WebkitAppRegion is a non-standard CSS property; check via style attribute
    expect(header.style).toHaveProperty('WebkitAppRegion', 'drag');
  });

  it('renders center slot content', () => {
    render(<TopBar center={<span data-testid="center">Center Content</span>} />);
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByText('Center Content')).toBeInTheDocument();
  });

  it('renders trailing slot content', () => {
    render(<TopBar trailing={<span data-testid="trailing">Trailing Content</span>} />);
    expect(screen.getByTestId('trailing')).toBeInTheDocument();
    expect(screen.getByText('Trailing Content')).toBeInTheDocument();
  });

  it('renders both center and trailing slots simultaneously', () => {
    render(
      <TopBar
        center={<span>Center</span>}
        trailing={<span>Trailing</span>}
      />,
    );
    expect(screen.getByText('Center')).toBeInTheDocument();
    expect(screen.getByText('Trailing')).toBeInTheDocument();
  });

  it('renders empty when no slots are provided', () => {
    render(<TopBar />);
    const header = screen.getByRole('banner');
    // No center or trailing data-slot wrappers when slots are empty
    expect(header.querySelector('[data-slot="top-bar-center"]')).not.toBeInTheDocument();
    expect(header.querySelector('[data-slot="top-bar-trailing"]')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TopBar className="custom-class" />);
    const header = screen.getByRole('banner');
    expect(header.className).toContain('custom-class');
  });

  it('wraps center slot in a no-drag region', () => {
    render(<TopBar center={<span>Title</span>} />);
    const centerSlot = screen.getByRole('banner').querySelector('[data-slot="top-bar-center"]') as HTMLElement;
    expect(centerSlot).toBeInTheDocument();
    expect(centerSlot.style).toHaveProperty('WebkitAppRegion', 'no-drag');
  });

  it('wraps trailing slot in a no-drag region', () => {
    render(<TopBar trailing={<span>Action</span>} />);
    const trailingSlot = screen.getByRole('banner').querySelector('[data-slot="top-bar-trailing"]') as HTMLElement;
    expect(trailingSlot).toBeInTheDocument();
    expect(trailingSlot.style).toHaveProperty('WebkitAppRegion', 'no-drag');
  });
});
