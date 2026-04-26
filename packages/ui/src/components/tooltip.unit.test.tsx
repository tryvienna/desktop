import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

beforeAll(() => {
  // Radix tooltip content uses ResizeObserver internally
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('Tooltip', () => {
  it('renders trigger element', () => {
    const { getByText } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(getByText('Hover me')).toBeTruthy();
  });

  it('has data-slot="tooltip-trigger" on trigger', () => {
    const { container } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(container.querySelector('[data-slot="tooltip-trigger"]')).toBeTruthy();
  });

  it('renders trigger as a button by default', () => {
    const { container } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    const trigger = container.querySelector('[data-slot="tooltip-trigger"]')!;
    expect(trigger.tagName).toBe('BUTTON');
  });

  it('renders tooltip content when open', () => {
    const { baseElement } = render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Visible tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(baseElement.querySelector('[data-slot="tooltip-content"]')).toBeTruthy();
  });

  it('does not render content in DOM when closed', () => {
    const { baseElement } = render(
      <TooltipProvider>
        <Tooltip open={false}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Hidden tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(baseElement.querySelector('[data-slot="tooltip-content"]')).toBeNull();
  });

  it('accepts className on TooltipContent', () => {
    const { baseElement } = render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent className="custom-tip">Tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    const content = baseElement.querySelector('[data-slot="tooltip-content"]')!;
    expect(content.className).toContain('custom-tip');
  });
});
