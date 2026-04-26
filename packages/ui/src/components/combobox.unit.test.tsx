import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from './combobox';

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Angular', value: 'angular' },
  { label: 'Svelte', value: 'svelte' },
];

describe('Combobox', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <Combobox options={options} value="" onValueChange={() => {}} placeholder="Select..." />
    );
    expect(container.querySelector('[data-slot="combobox"]')).toBeTruthy();
  });

  it('has data-slot="combobox"', () => {
    const { container } = render(
      <Combobox options={options} value="" onValueChange={() => {}} />
    );
    expect(container.querySelector('[data-slot="combobox"]')).toBeTruthy();
  });

  it('shows placeholder text', () => {
    const { getByText } = render(
      <Combobox options={options} value="" onValueChange={() => {}} placeholder="Pick a framework" />
    );
    expect(getByText('Pick a framework')).toBeTruthy();
  });

  it('shows selected value label', () => {
    const { getByText } = render(
      <Combobox options={options} value="react" onValueChange={() => {}} />
    );
    expect(getByText('React')).toBeTruthy();
  });

  it('merges className', () => {
    const { container } = render(
      <Combobox options={options} value="" onValueChange={() => {}} className="my-combobox" />
    );
    const el = container.querySelector('[data-slot="combobox"]');
    expect(el?.className).toContain('my-combobox');
  });

  it('opens popover on click', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = render(
      <Combobox options={options} value="" onValueChange={() => {}} placeholder="Select..." />
    );
    const trigger = container.querySelector('[data-slot="combobox"]');
    await user.click(trigger!);
    // The command input should be visible when open
    expect(getByRole('combobox')).toBeTruthy();
  });

  it('renders disabled state', () => {
    const { container } = render(
      <Combobox options={options} value="" onValueChange={() => {}} disabled />
    );
    const button = container.querySelector('[data-slot="combobox"] button');
    expect(button?.hasAttribute('disabled')).toBe(true);
  });
});
