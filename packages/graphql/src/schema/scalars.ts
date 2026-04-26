/**
 * Custom GraphQL Scalars — DateTime and JSON.
 *
 * @module graphql/schema/scalars
 */

import { GraphQLScalarType, Kind } from 'graphql';
import type { ValueNode } from 'graphql';
import { builder } from './builder';

// ─────────────────────────────────────────────────────────────────────────────
// DateTime — accepts ISO strings or unix timestamps, always serializes as ISO
// ─────────────────────────────────────────────────────────────────────────────

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 date-time string or unix timestamp (ms)',
  serialize(value) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    throw new TypeError(`DateTime cannot serialize value: ${value}`);
  },
  parseValue(value) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return new Date(value).toISOString();
    throw new TypeError(`DateTime cannot parse value: ${value}`);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) return ast.value;
    if (ast.kind === Kind.INT) return new Date(parseInt(ast.value, 10)).toISOString();
    throw new TypeError(`DateTime cannot parse literal of kind: ${ast.kind}`);
  },
});

builder.addScalarType('DateTime', DateTimeScalar);

// ─────────────────────────────────────────────────────────────────────────────
// JSON — pass-through for arbitrary JSON values
// ─────────────────────────────────────────────────────────────────────────────

function parseJsonLiteral(ast: ValueNode): unknown {
  if (ast.kind === Kind.STRING) return ast.value;
  if (ast.kind === Kind.INT) return parseInt(ast.value, 10);
  if (ast.kind === Kind.FLOAT) return parseFloat(ast.value);
  if (ast.kind === Kind.BOOLEAN) return ast.value;
  if (ast.kind === Kind.NULL) return null;
  if (ast.kind === Kind.LIST) return ast.values.map(parseJsonLiteral);
  if (ast.kind === Kind.OBJECT) {
    const obj: Record<string, unknown> = {};
    for (const field of ast.fields) {
      obj[field.name.value] = parseJsonLiteral(field.value);
    }
    return obj;
  }
  throw new TypeError(`JSON cannot parse literal of kind: ${ast.kind}`);
}

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral: parseJsonLiteral,
});

builder.addScalarType('JSON', JSONScalar);
