import type { AuthType, CanvasType } from './types.ts';

const KEBAB_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const VALID_CANVASES: CanvasType[] = ['sidebar', 'drawer', 'menu-bar', 'feed'];
const VALID_AUTH: AuthType[] = ['oauth', 'pat', 'api-key', 'none'];

export function validatePluginName(name: string): string | null {
  if (!name) return 'Plugin name is required';
  if (!KEBAB_PATTERN.test(name)) {
    return 'Plugin name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens';
  }
  return null;
}

export function validateEntityName(name: string): string | null {
  if (!KEBAB_PATTERN.test(name)) {
    return `Invalid entity name "${name}": must be lowercase, start with a letter, and contain only letters, numbers, and hyphens`;
  }
  return null;
}

export function parseCanvases(raw: string): CanvasType[] {
  const parts = raw.split(',').map((s) => s.trim()) as CanvasType[];
  for (const p of parts) {
    if (!VALID_CANVASES.includes(p)) {
      throw new Error(`Invalid canvas "${p}". Valid values: ${VALID_CANVASES.join(', ')}`);
    }
  }
  return parts;
}

export function parseAuth(raw: string): AuthType {
  if (!VALID_AUTH.includes(raw as AuthType)) {
    throw new Error(`Invalid auth "${raw}". Valid values: ${VALID_AUTH.join(', ')}`);
  }
  return raw as AuthType;
}

export function parseEntities(raw: string): string[] {
  if (!raw) return [];
  const names = raw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const name of names) {
    const err = validateEntityName(name);
    if (err) throw new Error(err);
  }
  return names;
}

/** Auto-expand: drawer is always included when sidebar or menu-bar is present */
export function expandCanvases(canvases: CanvasType[]): Set<CanvasType> {
  const set = new Set(canvases);
  if (set.has('sidebar') || set.has('menu-bar')) {
    set.add('drawer');
  }
  return set;
}
