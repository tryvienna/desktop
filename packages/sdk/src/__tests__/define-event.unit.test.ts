import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineEvent, isEventDefinition, EventNameSchema } from '../define-event';
import type { EventDefinition } from '../define-event';

describe('defineEvent', () => {
  const validConfig = () => ({
    name: 'pr.referenced',
    description: 'A PR was referenced',
    schema: z.object({ prNumber: z.number() }),
  });

  it('creates a frozen EventDefinition', () => {
    const event = defineEvent(validConfig());
    expect(event.__brand).toBe('EventDefinition');
    expect(event.name).toBe('pr.referenced');
    expect(event.description).toBe('A PR was referenced');
    expect(Object.isFrozen(event)).toBe(true);
  });

  it('preserves the Zod schema for runtime validation', () => {
    const schema = z.object({ value: z.string() });
    const event = defineEvent({ name: 'test.event', description: 'test', schema });
    const result = event.schema.safeParse({ value: 'hello' });
    expect(result.success).toBe(true);
  });

  // ── Name validation ─────────────────────────────────────────────────────

  it('rejects empty name', () => {
    expect(() => defineEvent({ ...validConfig(), name: '' })).toThrow();
  });

  it('rejects name starting with a number', () => {
    expect(() => defineEvent({ ...validConfig(), name: '1event' })).toThrow(/Invalid event name/);
  });

  it('rejects name with uppercase', () => {
    expect(() => defineEvent({ ...validConfig(), name: 'MyEvent' })).toThrow(/Invalid event name/);
  });

  it('rejects name with spaces', () => {
    expect(() => defineEvent({ ...validConfig(), name: 'my event' })).toThrow(/Invalid event name/);
  });

  it('accepts dots, underscores, and hyphens', () => {
    expect(() => defineEvent({ ...validConfig(), name: 'a.b_c-d' })).not.toThrow();
  });

  it('rejects names longer than 128 characters', () => {
    expect(() => defineEvent({ ...validConfig(), name: 'a'.repeat(129) })).toThrow();
  });

  // ── Description validation ──────────────────────────────────────────────

  it('rejects empty description', () => {
    expect(() => defineEvent({ ...validConfig(), description: '' })).toThrow(/description/);
  });

  it('rejects whitespace-only description', () => {
    expect(() => defineEvent({ ...validConfig(), description: '   ' })).toThrow(/description/);
  });

  // ── Schema validation ───────────────────────────────────────────────────

  it('rejects null schema', () => {
    expect(() => defineEvent({ ...validConfig(), schema: null as unknown as z.ZodType })).toThrow(
      /schema/,
    );
  });

  it('rejects non-Zod schema', () => {
    expect(() =>
      defineEvent({ ...validConfig(), schema: { parse: () => {} } as unknown as z.ZodType }),
    ).toThrow(/schema/);
  });
});

describe('isEventDefinition', () => {
  it('returns true for valid EventDefinition', () => {
    const event = defineEvent({
      name: 'test',
      description: 'test',
      schema: z.object({}),
    });
    expect(isEventDefinition(event)).toBe(true);
  });

  it('returns false for plain objects', () => {
    expect(isEventDefinition({ name: 'test' })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isEventDefinition(null)).toBe(false);
    expect(isEventDefinition(undefined)).toBe(false);
  });

  it('returns false for objects with wrong brand', () => {
    expect(isEventDefinition({ __brand: 'SomethingElse' })).toBe(false);
  });
});

describe('EventNameSchema', () => {
  const valid = ['a', 'pr.referenced', 'route.analysis.complete', 'my-event', 'my_event'];
  const invalid = ['', 'A', '1abc', 'hello world', 'UPPER.case'];

  for (const name of valid) {
    it(`accepts '${name}'`, () => {
      expect(EventNameSchema.safeParse(name).success).toBe(true);
    });
  }

  for (const name of invalid) {
    it(`rejects '${name}'`, () => {
      expect(EventNameSchema.safeParse(name).success).toBe(false);
    });
  }
});
