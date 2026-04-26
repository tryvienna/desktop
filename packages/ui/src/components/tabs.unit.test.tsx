import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

describe('Tabs', () => {
  function renderTabs(defaultValue = 'a') {
    return render(
      <Tabs defaultValue={defaultValue}>
        <TabsList>
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>
    );
  }

  it('renders with default value', () => {
    const { getByText } = renderTabs('a');
    expect(getByText('Tab A')).toBeTruthy();
    expect(getByText('Tab B')).toBeTruthy();
  });

  it('shows correct tab content for default value', () => {
    const { getByText, queryByText } = renderTabs('a');
    expect(getByText('Content A')).toBeTruthy();
    // Tab B content should not be visible (Radix hides inactive tabs)
    expect(queryByText('Content B')).toBeNull();
  });

  it('shows second tab content when defaultValue is "b"', () => {
    const { getByText, queryByText } = renderTabs('b');
    expect(getByText('Content B')).toBeTruthy();
    expect(queryByText('Content A')).toBeNull();
  });

  it('has data-slot attributes on all parts', () => {
    const { container } = renderTabs();
    expect(container.querySelector('[data-slot="tabs"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="tabs-list"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="tabs-trigger"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="tabs-content"]')).toBeTruthy();
  });

  it('marks active trigger with data-state="active"', () => {
    const { container } = renderTabs('a');
    const triggers = container.querySelectorAll('[data-slot="tabs-trigger"]');
    const triggerA = Array.from(triggers).find((t) => t.textContent === 'Tab A')!;
    const triggerB = Array.from(triggers).find((t) => t.textContent === 'Tab B')!;
    expect(triggerA.getAttribute('data-state')).toBe('active');
    expect(triggerB.getAttribute('data-state')).toBe('inactive');
  });

  it('handles controlled value', () => {
    const { getByText, queryByText } = render(
      <Tabs value="b">
        <TabsList>
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>
    );
    expect(getByText('Content B')).toBeTruthy();
    expect(queryByText('Content A')).toBeNull();
  });

  it('accepts className on Tabs root', () => {
    const { container } = render(
      <Tabs defaultValue="a" className="custom-tabs">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content</TabsContent>
      </Tabs>
    );
    const tabs = container.querySelector('[data-slot="tabs"]')!;
    expect(tabs.className).toContain('custom-tabs');
  });
});
