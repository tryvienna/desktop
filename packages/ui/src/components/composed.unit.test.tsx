import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { EmptyState } from './empty-state';
import { LoadingState } from './loading-state';

describe('EmptyState', () => {
  it('renders title', () => {
    const { getByText } = render(<EmptyState title="No items" />);
    expect(getByText('No items')).toBeTruthy();
  });

  it('renders description', () => {
    const { getByText } = render(<EmptyState title="No items" description="Create one to start" />);
    expect(getByText('Create one to start')).toBeTruthy();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <EmptyState title="Empty" icon={<svg data-testid="icon" />} />
    );
    expect(container.querySelector('[data-testid="icon"]')).toBeTruthy();
  });

  it('renders action when provided', () => {
    const { getByText } = render(
      <EmptyState title="Empty" action={<button>Create</button>} />
    );
    expect(getByText('Create')).toBeTruthy();
  });

  it('has data-slot="empty-state"', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('[data-slot="empty-state"]')).toBeTruthy();
  });

  it('merges className', () => {
    const { container } = render(<EmptyState title="Empty" className="my-empty" />);
    const el = container.querySelector('[data-slot="empty-state"]');
    expect(el?.className).toContain('my-empty');
  });

  it('does not render icon container when no icon', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelectorAll('[data-slot="empty-state"] > div')[0]?.querySelector('svg')).toBeNull();
  });
});

describe('LoadingState', () => {
  it('renders spinner', () => {
    const { container } = render(<LoadingState />);
    expect(container.querySelector('[data-slot="spinner"]')).toBeTruthy();
  });

  it('renders label when provided', () => {
    const { getByText } = render(<LoadingState label="Loading..." />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders description when provided', () => {
    const { getByText } = render(<LoadingState label="Loading" description="Please wait" />);
    expect(getByText('Please wait')).toBeTruthy();
  });

  it('has data-slot="loading-state"', () => {
    const { container } = render(<LoadingState />);
    expect(container.querySelector('[data-slot="loading-state"]')).toBeTruthy();
  });

  it('merges className', () => {
    const { container } = render(<LoadingState className="my-loading" />);
    const el = container.querySelector('[data-slot="loading-state"]');
    expect(el?.className).toContain('my-loading');
  });

  it('renders inline variant', () => {
    const { container } = render(<LoadingState variant="inline" label="Working" />);
    const el = container.querySelector('[data-slot="loading-state"]');
    expect(el?.className).toContain('flex');
    expect(el?.className).toContain('items-center');
  });

  it('renders centered variant by default', () => {
    const { container } = render(<LoadingState />);
    const el = container.querySelector('[data-slot="loading-state"]');
    expect(el?.className).toContain('justify-center');
  });
});
