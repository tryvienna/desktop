import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  it('renders with placeholder', () => {
    const { container } = render(<Input placeholder="Type here" />);
    const input = container.querySelector('input')!;
    expect(input.placeholder).toBe('Type here');
  });

  it('has data-slot="input" attribute', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('[data-slot="input"]')).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(<Input className="custom-class" />);
    const input = container.querySelector('input')!;
    expect(input.className).toContain('custom-class');
  });

  it('handles value and onChange', () => {
    const onChange = vi.fn();
    const { container } = render(<Input value="hello" onChange={onChange} />);
    const input = container.querySelector('input')!;
    expect(input.value).toBe('hello');
    fireEvent.change(input, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('handles disabled state', () => {
    const { container } = render(<Input disabled />);
    const input = container.querySelector('input')!;
    expect(input.disabled).toBe(true);
  });

  it.each(['text', 'password', 'email'] as const)('handles type="%s"', (type) => {
    const { container } = render(<Input type={type} />);
    const input = container.querySelector('input')!;
    expect(input.type).toBe(type);
  });

  it('renders as an input element', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('input')).toBeTruthy();
  });

  it('supports aria-invalid for error states', () => {
    const { container } = render(<Input aria-invalid />);
    const input = container.querySelector('input')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
