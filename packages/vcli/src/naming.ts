import type { NamingContext, EntityNaming } from './types.ts';

/** 'my-plugin' → 'my_plugin' */
export function toSnakeCase(kebab: string): string {
  return kebab.replace(/-/g, '_');
}

/** 'my-plugin' → 'MyPlugin' */
export function toPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/** 'my-plugin' → 'myPlugin' */
export function toCamelCase(kebab: string): string {
  const pascal = toPascalCase(kebab);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** 'my-plugin' → 'My Plugin' */
export function toTitleCase(kebab: string): string {
  return kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function buildNamingContext(pluginName: string): NamingContext {
  return {
    pluginName,
    pluginId: toSnakeCase(pluginName),
    displayName: toTitleCase(pluginName),
    pascalName: toPascalCase(pluginName),
    camelName: toCamelCase(pluginName),
  };
}

export function buildEntityNaming(entityName: string): EntityNaming {
  return {
    entityName,
    entityType: toSnakeCase(entityName),
    entityDisplayName: toTitleCase(entityName),
    entityPascal: toPascalCase(entityName),
    entityCamel: toCamelCase(entityName),
  };
}
