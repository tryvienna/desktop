/** Shared props passed to each settings section */
export interface SectionProps {
  settings: Record<string, unknown>;
  updateField: (path: string[], value: unknown) => void;
  deleteField: (path: string[]) => void;
  filter?: string;
}

/** Returns true if the filter matches any of the provided searchable terms */
export function matchesFilter(filter: string | undefined, ...terms: string[]): boolean {
  if (!filter) return true;
  const lower = filter.toLowerCase();
  return terms.some((t) => t.toLowerCase().includes(lower));
}

/**
 * Update a key within a parent object, or delete the parent if the key was the last remaining.
 * Eliminates the repeated cleanup-or-delete pattern across section components.
 */
export function updateNestedOrCleanup(
  parentPath: string[],
  parentObj: Record<string, unknown>,
  key: string,
  value: unknown,
  isEmpty: (v: unknown) => boolean,
  updateField: SectionProps['updateField'],
  deleteField: SectionProps['deleteField'],
): void {
  if (isEmpty(value)) {
    const { [key]: _, ...rest } = parentObj;
    if (Object.keys(rest).length === 0) deleteField(parentPath);
    else updateField(parentPath, rest);
  } else {
    updateField([...parentPath, key], value);
  }
}
