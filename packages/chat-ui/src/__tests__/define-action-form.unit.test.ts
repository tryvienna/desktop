/**
 * defineActionForm Unit Tests
 *
 * Tests the form definition factory: validation, step configuration,
 * ComboboxStep resolveOnInput/onSelectOption, and active step filtering.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import { defineActionForm, ActionFormDefinitionError } from '../action-form/define-action-form';
import type { ActionFormOption } from '../action-form/define-action-form';

describe('defineActionForm', () => {
  describe('basic validation', () => {
    it('creates a valid form definition', () => {
      const form = defineActionForm({
        id: 'test-form',
        title: 'Test',
        steps: [
          { id: 'name', header: 'Name', question: 'Enter name', type: 'text', required: true },
        ],
        onSubmit: vi.fn(),
      });

      expect(form.id).toBe('test-form');
      expect(form.title).toBe('Test');
      expect(form.steps).toHaveLength(1);
    });

    it('throws on empty id', () => {
      expect(() => defineActionForm({
        id: '',
        title: 'Test',
        steps: [{ id: 's', header: 'S', question: 'Q', type: 'text' }],
        onSubmit: vi.fn(),
      })).toThrow(ActionFormDefinitionError);
    });

    it('throws on duplicate step ids', () => {
      expect(() => defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [
          { id: 'dup', header: 'A', question: 'Q', type: 'text' },
          { id: 'dup', header: 'B', question: 'Q', type: 'text' },
        ],
        onSubmit: vi.fn(),
      })).toThrow(/duplicate step id/);
    });

    it('throws on select step without options or resolve', () => {
      expect(() => defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [
          { id: 'sel', header: 'S', question: 'Q', type: 'select' } as any,
        ],
        onSubmit: vi.fn(),
      })).toThrow(/must have either/);
    });
  });

  describe('combobox step validation', () => {
    it('accepts combobox with resolve only', () => {
      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [{
          id: 'dir',
          header: 'Dir',
          question: 'Pick dir',
          type: 'combobox',
          resolve: async () => [{ value: '/tmp', label: '/tmp' }],
        }],
        onSubmit: vi.fn(),
      });
      expect(form.steps[0]!.id).toBe('dir');
    });

    it('accepts combobox with resolveOnInput only (no options/resolve)', () => {
      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [{
          id: 'dir',
          header: 'Dir',
          question: 'Pick dir',
          type: 'combobox',
          resolveOnInput: async (_text: string) => [],
        }],
        onSubmit: vi.fn(),
      });
      expect(form.steps[0]!.id).toBe('dir');
    });

    it('throws on combobox with no options, resolve, or resolveOnInput', () => {
      expect(() => defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [{
          id: 'dir',
          header: 'Dir',
          question: 'Pick dir',
          type: 'combobox',
        } as any],
        onSubmit: vi.fn(),
      })).toThrow(/must have either/);
    });

    it('accepts combobox with both resolve and resolveOnInput', () => {
      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [{
          id: 'dir',
          header: 'Dir',
          question: 'Pick dir',
          type: 'combobox',
          resolve: async () => [{ value: '/home', label: '/home' }],
          resolveOnInput: async (text: string) => [{ value: text, label: text }],
          onSelectOption: async (value: string) => value,
        }],
        onSubmit: vi.fn(),
      });
      expect(form.steps[0]!.id).toBe('dir');
    });
  });

  describe('active step filtering', () => {
    it('returns all steps when no disabled IDs', () => {
      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [
          { id: 'a', header: 'A', question: 'Q', type: 'text', required: true },
          { id: 'b', header: 'B', question: 'Q', type: 'text', skippable: true, defaultEnabled: true },
          { id: 'c', header: 'C', question: 'Q', type: 'text', skippable: true, defaultEnabled: false },
        ],
        onSubmit: vi.fn(),
      });

      const active = form.getActiveSteps();
      expect(active.map(s => s.id)).toEqual(['a', 'b']);
    });

    it('toggles disabled step back on', () => {
      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [
          { id: 'a', header: 'A', question: 'Q', type: 'text', required: true },
          { id: 'b', header: 'B', question: 'Q', type: 'text', skippable: true, defaultEnabled: false },
        ],
        onSubmit: vi.fn(),
      });

      // 'b' is defaultEnabled: false. Passing it in disabledStepIds toggles it ON.
      const active = form.getActiveSteps(['b']);
      expect(active.map(s => s.id)).toEqual(['a', 'b']);
    });

    it('never disables required steps', () => {
      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [
          { id: 'a', header: 'A', question: 'Q', type: 'text', required: true },
        ],
        onSubmit: vi.fn(),
      });

      const active = form.getActiveSteps(['a']);
      expect(active.map(s => s.id)).toEqual(['a']);
    });
  });

  describe('ComboboxStep onSelectOption contract', () => {
    it('onSelectOption returning a string replaces the value', async () => {
      let capturedValue = '';
      const onSelectOption = vi.fn(async (value: string) => {
        if (value === '__browse__') return '/picked/path';
        return value;
      });

      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [{
          id: 'dir',
          header: 'Dir',
          question: 'Pick dir',
          type: 'combobox',
          resolve: async () => [
            { value: '/tmp', label: '/tmp' },
            { value: '__browse__', label: 'Browse…' },
          ],
          onSelectOption,
        }],
        onSubmit: vi.fn(),
      });

      // Simulate selecting "Browse…"
      const step = form.getStep('dir') as any;
      const result = await step.onSelectOption('__browse__');
      expect(result).toBe('/picked/path');
      expect(onSelectOption).toHaveBeenCalledWith('__browse__');
    });

    it('onSelectOption returning null cancels advancement', async () => {
      const onSelectOption = vi.fn(async (_value: string) => null);

      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [{
          id: 'dir',
          header: 'Dir',
          question: 'Pick dir',
          type: 'combobox',
          resolve: async () => [{ value: '__browse__', label: 'Browse…' }],
          onSelectOption,
        }],
        onSubmit: vi.fn(),
      });

      const step = form.getStep('dir') as any;
      const result = await step.onSelectOption('__browse__');
      expect(result).toBeNull();
    });
  });

  describe('ComboboxStep resolveOnInput contract', () => {
    it('resolveOnInput returns dynamic options for a given input', async () => {
      const resolveOnInput = vi.fn(async (text: string): Promise<ActionFormOption[]> => {
        if (text.startsWith('/home')) {
          return [
            { value: '/home/user/', label: 'user', description: '/home/user/' },
            { value: '/home/admin/', label: 'admin', description: '/home/admin/' },
          ];
        }
        return [];
      });

      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [{
          id: 'dir',
          header: 'Dir',
          question: 'Pick dir',
          type: 'combobox',
          resolveOnInput,
        }],
        onSubmit: vi.fn(),
      });

      const step = form.getStep('dir') as any;
      const results = await step.resolveOnInput('/home');
      expect(results).toHaveLength(2);
      expect(results[0].value).toBe('/home/user/');
      expect(resolveOnInput).toHaveBeenCalledWith('/home');
    });

    it('resolveOnInput returns empty for non-path input', async () => {
      const resolveOnInput = vi.fn(async (_text: string): Promise<ActionFormOption[]> => []);

      const form = defineActionForm({
        id: 'test',
        title: 'Test',
        steps: [{
          id: 'dir',
          header: 'Dir',
          question: 'Pick dir',
          type: 'combobox',
          resolveOnInput,
        }],
        onSubmit: vi.fn(),
      });

      const step = form.getStep('dir') as any;
      const results = await step.resolveOnInput('foo');
      expect(results).toHaveLength(0);
    });
  });
});
