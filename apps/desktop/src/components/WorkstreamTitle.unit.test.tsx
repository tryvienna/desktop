// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@tryvienna/ui';
import { WorkstreamTitle } from './WorkstreamTitle';

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('WorkstreamTitle', () => {
  it('renders the title text', () => {
    renderWithProviders(<WorkstreamTitle title="My Workstream" status="active" />);
    expect(screen.getByText('My Workstream')).toBeInTheDocument();
  });

  it('renders data-slot="workstream-title"', () => {
    renderWithProviders(<WorkstreamTitle title="Test" status="active" />);
    const el = document.querySelector('[data-slot="workstream-title"]');
    expect(el).toBeInTheDocument();
  });

  it('maps processing status to PROCESSING StatusIcon', () => {
    renderWithProviders(<WorkstreamTitle title="Test" status="processing" />);
    const icon = document.querySelector('[data-status-icon="processing"]');
    expect(icon).toBeInTheDocument();
  });

  it('maps completed_unviewed status to COMPLETED_UNVIEWED StatusIcon', () => {
    renderWithProviders(<WorkstreamTitle title="Done" status="completed_unviewed" />);
    const icon = document.querySelector('[data-status-icon="completed_unviewed"]');
    expect(icon).toBeInTheDocument();
  });

  it('maps active status to ACTIVE StatusIcon', () => {
    renderWithProviders(<WorkstreamTitle title="Ready" status="active" />);
    const icon = document.querySelector('[data-status-icon="active"]');
    expect(icon).toBeInTheDocument();
  });

  it('maps waiting_permission status to NEEDS_REVIEW StatusIcon', () => {
    renderWithProviders(<WorkstreamTitle title="Waiting" status="waiting_permission" />);
    const icon = document.querySelector('[data-status-icon="needs_review"]');
    expect(icon).toBeInTheDocument();
  });

  it('maps idle status to ACTIVE StatusIcon (fallback)', () => {
    renderWithProviders(<WorkstreamTitle title="Idle" status="idle" />);
    const icon = document.querySelector('[data-status-icon="active"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders as a Button when onClick is provided', () => {
    const onClick = vi.fn();
    renderWithProviders(<WorkstreamTitle title="Clickable" status="active" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Clickable' });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick when the button is clicked', () => {
    const onClick = vi.fn();
    renderWithProviders(<WorkstreamTitle title="Clickable" status="active" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clickable' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders as a non-interactive span when onClick is absent', () => {
    renderWithProviders(<WorkstreamTitle title="Display Only" status="active" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const el = document.querySelector('[data-slot="workstream-title"]');
    expect(el!.tagName).toBe('SPAN');
  });

  it('sets aria-label to the full title', () => {
    renderWithProviders(<WorkstreamTitle title="Full Title Here" status="active" />);
    const el = document.querySelector('[data-slot="workstream-title"]');
    expect(el).toHaveAttribute('aria-label', 'Full Title Here');
  });

  it('applies custom className', () => {
    renderWithProviders(<WorkstreamTitle title="Test" status="active" className="custom" />);
    const el = document.querySelector('[data-slot="workstream-title"]');
    expect(el!.className).toContain('custom');
  });
});
