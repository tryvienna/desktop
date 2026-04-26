/**
 * Schema Utilities — Parse introspection into a browseable tree
 */

import type {
  IntrospectionQuery,
  IntrospectionType,
  IntrospectionField,
  IntrospectionInputValue,
  IntrospectionTypeRef,
} from 'graphql';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TypeCategory = 'root' | 'object' | 'input' | 'enum' | 'scalar' | 'union' | 'interface';

export interface SchemaField {
  name: string;
  description: string | null;
  typeName: string;
  typeKind: string;
  isDeprecated: boolean;
  args: SchemaArg[];
}

export interface SchemaArg {
  name: string;
  description: string | null;
  typeName: string;
  defaultValue: string | null;
}

export interface SchemaEnumValue {
  name: string;
  description: string | null;
  isDeprecated: boolean;
}

export interface SchemaTypeInfo {
  name: string;
  kind: string;
  description: string | null;
  category: TypeCategory;
  fields: SchemaField[];
  inputFields: SchemaArg[];
  enumValues: SchemaEnumValue[];
}

export interface CategorizedTypes {
  root: SchemaTypeInfo[];
  object: SchemaTypeInfo[];
  input: SchemaTypeInfo[];
  enum: SchemaTypeInfo[];
  scalar: SchemaTypeInfo[];
  union: SchemaTypeInfo[];
  interface: SchemaTypeInfo[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resolveTypeName(typeRef: IntrospectionTypeRef): string {
  switch (typeRef.kind) {
    case 'NON_NULL':
      return `${resolveTypeName(typeRef.ofType)}!`;
    case 'LIST':
      return `[${resolveTypeName(typeRef.ofType)}]`;
    default:
      return typeRef.name ?? 'Unknown';
  }
}

function resolveBaseTypeName(typeRef: IntrospectionTypeRef): string {
  switch (typeRef.kind) {
    case 'NON_NULL':
    case 'LIST':
      return resolveBaseTypeName(typeRef.ofType);
    default:
      return typeRef.name ?? 'Unknown';
  }
}

function parseArgs(args: readonly IntrospectionInputValue[]): SchemaArg[] {
  return args.map((arg) => ({
    name: arg.name,
    description: arg.description ?? null,
    typeName: resolveTypeName(arg.type),
    defaultValue: arg.defaultValue ?? null,
  }));
}

function parseFields(fields: readonly IntrospectionField[]): SchemaField[] {
  return fields.map((field) => ({
    name: field.name,
    description: field.description ?? null,
    typeName: resolveTypeName(field.type),
    typeKind: resolveBaseTypeName(field.type),
    isDeprecated: field.isDeprecated,
    args: parseArgs(field.args),
  }));
}

function getCategory(type: IntrospectionType, rootTypeNames: Set<string>): TypeCategory {
  if (rootTypeNames.has(type.name)) return 'root';
  switch (type.kind) {
    case 'OBJECT':
      return 'object';
    case 'INPUT_OBJECT':
      return 'input';
    case 'ENUM':
      return 'enum';
    case 'SCALAR':
      return 'scalar';
    case 'UNION':
      return 'union';
    case 'INTERFACE':
      return 'interface';
    default:
      return 'object';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseIntrospection(introspection: IntrospectionQuery): CategorizedTypes {
  const schema = introspection.__schema;
  const rootTypeNames = new Set<string>();
  if (schema.queryType) rootTypeNames.add(schema.queryType.name);
  if (schema.mutationType) rootTypeNames.add(schema.mutationType.name);
  if (schema.subscriptionType) rootTypeNames.add(schema.subscriptionType.name);

  const result: CategorizedTypes = {
    root: [],
    object: [],
    input: [],
    enum: [],
    scalar: [],
    union: [],
    interface: [],
  };

  for (const type of schema.types) {
    // Skip internal types
    if (type.name.startsWith('__')) continue;

    const category = getCategory(type, rootTypeNames);
    const info: SchemaTypeInfo = {
      name: type.name,
      kind: type.kind,
      description: type.description ?? null,
      category,
      fields: 'fields' in type && type.fields ? parseFields(type.fields) : [],
      inputFields: 'inputFields' in type && type.inputFields ? parseArgs(type.inputFields) : [],
      enumValues:
        'enumValues' in type && type.enumValues
          ? type.enumValues.map((v) => ({
              name: v.name,
              description: v.description ?? null,
              isDeprecated: v.isDeprecated,
            }))
          : [],
    };

    result[category].push(info);
  }

  // Sort each category alphabetically
  for (const cat of Object.keys(result) as TypeCategory[]) {
    result[cat].sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
}

/** Extract the base type name from a type string like "[Project!]!" → "Project" */
export function extractBaseType(typeName: string): string {
  return typeName.replace(/[[\]!]/g, '');
}
