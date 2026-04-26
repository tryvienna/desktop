import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './select';

describe('Select', () => {
  it('renders trigger with placeholder', () => {
    const { getByRole } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(getByRole('combobox')).toBeTruthy();
  });

  it('has data-slot on trigger', () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(container.querySelector('[data-slot="select-trigger"]')).toBeTruthy();
  });

  it('merges className on trigger', () => {
    const { container } = render(
      <Select>
        <SelectTrigger className="custom-trigger">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    const trigger = container.querySelector('[data-slot="select-trigger"]');
    expect(trigger?.className).toContain('custom-trigger');
  });

  it('renders disabled state', () => {
    const { container } = render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    const trigger = container.querySelector('[data-slot="select-trigger"]');
    expect(trigger?.hasAttribute('data-disabled')).toBe(true);
  });

  it('shows selected value', () => {
    const { getByRole } = render(
      <Select defaultValue="apple">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(getByRole('combobox').textContent).toContain('Apple');
  });

  it('renders placeholder text', () => {
    const { getByText } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(getByText('Select a fruit...')).toBeTruthy();
  });

  it('has data-slot on SelectValue', () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(container.querySelector('[data-slot="select-value"]')).toBeTruthy();
  });
});
