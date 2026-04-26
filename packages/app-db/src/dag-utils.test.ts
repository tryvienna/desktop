import { describe, it, expect } from 'vitest';
import { wouldCreateCycle, topologicalSort, expandTransitiveDependencies } from './dag-utils';
import { HexColorSchema } from './schemas';

describe('wouldCreateCycle', () => {
  it('detects self-loop', () => {
    expect(wouldCreateCycle([], 'A', 'A')).toBe(true);
  });

  it('returns false for independent labels', () => {
    expect(wouldCreateCycle([], 'A', 'B')).toBe(false);
  });

  it('detects direct cycle', () => {
    const edges = [{ labelId: 'B', dependsOnLabelId: 'A' }]; // B depends on A
    // Adding A depends on B → A → B → A cycle
    expect(wouldCreateCycle(edges, 'A', 'B')).toBe(true);
  });

  it('detects transitive cycle', () => {
    const edges = [
      { labelId: 'B', dependsOnLabelId: 'A' }, // B depends on A
      { labelId: 'C', dependsOnLabelId: 'B' }, // C depends on B
    ];
    // Adding A depends on C → A → C → B → A
    expect(wouldCreateCycle(edges, 'A', 'C')).toBe(true);
  });

  it('allows valid dependency', () => {
    const edges = [
      { labelId: 'B', dependsOnLabelId: 'A' }, // B depends on A
    ];
    // Adding C depends on B is fine (no cycle: C → B → A)
    expect(wouldCreateCycle(edges, 'C', 'B')).toBe(false);
  });

  it('allows diamond dependencies', () => {
    const edges = [
      { labelId: 'B', dependsOnLabelId: 'A' },
      { labelId: 'C', dependsOnLabelId: 'A' },
    ];
    // Adding D depends on B is fine (D → B → A, D doesn't create cycle)
    expect(wouldCreateCycle(edges, 'D', 'B')).toBe(false);
    // Adding D depends on C is also fine
    expect(wouldCreateCycle(edges, 'D', 'C')).toBe(false);
  });
});

describe('topologicalSort', () => {
  it('returns single stage for independent labels', () => {
    const stages = topologicalSort(['A', 'B', 'C'], []);
    expect(stages).toHaveLength(1);
    expect(stages[0]).toHaveLength(3);
  });

  it('sorts a linear chain into separate stages', () => {
    const edges = [
      { labelId: 'B', dependsOnLabelId: 'A' },
      { labelId: 'C', dependsOnLabelId: 'B' },
    ];
    const stages = topologicalSort(['A', 'B', 'C'], edges);
    expect(stages).toHaveLength(3);
    expect(stages[0]).toEqual(['A']);
    expect(stages[1]).toEqual(['B']);
    expect(stages[2]).toEqual(['C']);
  });

  it('groups parallel labels into the same stage', () => {
    const edges = [
      { labelId: 'B', dependsOnLabelId: 'A' },
      { labelId: 'C', dependsOnLabelId: 'A' },
    ];
    const stages = topologicalSort(['A', 'B', 'C'], edges);
    expect(stages).toHaveLength(2);
    expect(stages[0]).toEqual(['A']);
    expect(stages[1].sort()).toEqual(['B', 'C']);
  });

  it('handles diamond dependency', () => {
    // A → B, A → C, B → D, C → D
    const edges = [
      { labelId: 'B', dependsOnLabelId: 'A' },
      { labelId: 'C', dependsOnLabelId: 'A' },
      { labelId: 'D', dependsOnLabelId: 'B' },
      { labelId: 'D', dependsOnLabelId: 'C' },
    ];
    const stages = topologicalSort(['A', 'B', 'C', 'D'], edges);
    expect(stages).toHaveLength(3);
    expect(stages[0]).toEqual(['A']);
    expect(stages[1].sort()).toEqual(['B', 'C']);
    expect(stages[2]).toEqual(['D']);
  });

  it('filters edges to only relevant labels', () => {
    const edges = [
      { labelId: 'B', dependsOnLabelId: 'A' },
      { labelId: 'C', dependsOnLabelId: 'B' },
    ];
    // Only sort A and B — edge to C is ignored
    const stages = topologicalSort(['A', 'B'], edges);
    expect(stages).toHaveLength(2);
    expect(stages[0]).toEqual(['A']);
    expect(stages[1]).toEqual(['B']);
  });

  it('throws on cycle with involved label IDs in message', () => {
    const edges = [
      { labelId: 'B', dependsOnLabelId: 'A' },
      { labelId: 'A', dependsOnLabelId: 'B' },
    ];
    expect(() => topologicalSort(['A', 'B'], edges)).toThrow('involved labels');
  });

  it('handles empty input', () => {
    const stages = topologicalSort([], []);
    expect(stages).toHaveLength(0);
  });
});

describe('expandTransitiveDependencies', () => {
  it('returns the input when no dependencies', () => {
    const result = expandTransitiveDependencies(['A', 'B'], []);
    expect(result.sort()).toEqual(['A', 'B']);
  });

  it('includes direct dependencies', () => {
    const edges = [{ labelId: 'A', dependsOnLabelId: 'B' }];
    const result = expandTransitiveDependencies(['A'], edges);
    expect(result.sort()).toEqual(['A', 'B']);
  });

  it('includes transitive dependencies', () => {
    const edges = [
      { labelId: 'A', dependsOnLabelId: 'B' },
      { labelId: 'B', dependsOnLabelId: 'C' },
    ];
    const result = expandTransitiveDependencies(['A'], edges);
    expect(result.sort()).toEqual(['A', 'B', 'C']);
  });

  it('deduplicates shared dependencies', () => {
    const edges = [
      { labelId: 'A', dependsOnLabelId: 'C' },
      { labelId: 'B', dependsOnLabelId: 'C' },
    ];
    const result = expandTransitiveDependencies(['A', 'B'], edges);
    expect(result.sort()).toEqual(['A', 'B', 'C']);
  });

  it('handles diamond pattern', () => {
    const edges = [
      { labelId: 'A', dependsOnLabelId: 'B' },
      { labelId: 'A', dependsOnLabelId: 'C' },
      { labelId: 'B', dependsOnLabelId: 'D' },
      { labelId: 'C', dependsOnLabelId: 'D' },
    ];
    const result = expandTransitiveDependencies(['A'], edges);
    expect(result.sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('handles empty input', () => {
    const result = expandTransitiveDependencies([], [{ labelId: 'A', dependsOnLabelId: 'B' }]);
    expect(result).toHaveLength(0);
  });
});

describe('HexColorSchema', () => {
  it('accepts valid 6-digit hex colors', () => {
    expect(HexColorSchema.safeParse('#3B82F6').success).toBe(true);
    expect(HexColorSchema.safeParse('#FF0000').success).toBe(true);
    expect(HexColorSchema.safeParse('#000000').success).toBe(true);
    expect(HexColorSchema.safeParse('#ffffff').success).toBe(true);
  });

  it('accepts valid 3-digit hex colors', () => {
    expect(HexColorSchema.safeParse('#F00').success).toBe(true);
    expect(HexColorSchema.safeParse('#abc').success).toBe(true);
  });

  it('rejects invalid color strings', () => {
    expect(HexColorSchema.safeParse('red').success).toBe(false);
    expect(HexColorSchema.safeParse('rgb(255,0,0)').success).toBe(false);
    expect(HexColorSchema.safeParse('#GGGGGG').success).toBe(false);
    expect(HexColorSchema.safeParse('#12345').success).toBe(false);
    expect(HexColorSchema.safeParse('').success).toBe(false);
    expect(HexColorSchema.safeParse('#12345678').success).toBe(false);
    // CSS injection attempt
    expect(HexColorSchema.safeParse('red; background-image: url(evil)').success).toBe(false);
  });
});
