/**
 * generate-sdk-reference.ts
 *
 * Reads the @tryvienna/sdk TypeScript source with ts-morph and generates
 * a comprehensive API reference in Markdown format for VitePress.
 *
 * Run:  pnpm --filter @vienna/docs generate:reference
 */

import { Project, SyntaxKind, type SourceFile, type Node, type Symbol as TsSymbol } from 'ts-morph';
import { resolve, dirname } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(__dirname, '..');
const SDK_ROOT = resolve(DOCS_ROOT, '../../packages/sdk');
const OUTPUT_PATH = resolve(DOCS_ROOT, 'reference/sdk.md');

// ─── ts-morph project ───────────────────────────────────────────────────────

const project = new Project({
  tsConfigFilePath: resolve(SDK_ROOT, 'tsconfig.json'),
  skipAddingFilesFromTsConfig: false,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Known JSDoc tags to filter out (vs package names like @vienna/...) */
const JSDOC_TAGS = new Set([
  '@param', '@returns', '@return', '@example', '@throws', '@see',
  '@since', '@deprecated', '@module', '@type', '@typedef', '@template',
  '@default', '@readonly', '@override', '@implements', '@extends',
  '@augments', '@callback', '@property', '@memberof', '@enum',
]);

function isJsDocTag(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('@')) return false;
  const tag = trimmed.split(/[\s({]/)[0]!;
  return JSDOC_TAGS.has(tag);
}

function getJsDoc(node: Node): string {
  const jsDocs = (node as any).getJsDocs?.();
  if (!jsDocs?.length) return '';
  return jsDocs
    .map((d: any) => {
      // Always parse raw text to preserve @-prefixed package names
      const raw: string = d.getText?.() ?? '';
      return raw
        .replace(/^\/\*\*\s*/, '')
        .replace(/\s*\*\/$/, '')
        .replace(/^\s*\*\s?/gm, '')
        .split('\n')
        .filter((line: string) => !isJsDocTag(line))
        .join('\n')
        .trim();
    })
    .join('\n')
    .trim();
}

function getJsDocTags(node: Node): Array<{ tagName: string; text: string }> {
  const jsDocs = (node as any).getJsDocs?.();
  if (!jsDocs?.length) return [];
  const tags: Array<{ tagName: string; text: string }> = [];
  for (const doc of jsDocs) {
    for (const tag of doc.getTags?.() ?? []) {
      tags.push({
        tagName: tag.getTagName(),
        text: tag.getComment?.() ?? tag.getText?.()?.replace(/@\w+\s*/, '') ?? '',
      });
    }
  }
  return tags;
}

function getExample(node: Node): string | null {
  const tags = getJsDocTags(node);
  const exampleTag = tags.find((t) => t.tagName === 'example');
  if (!exampleTag) return null;
  return exampleTag.text.trim();
}

function escapeType(t: string): string {
  return t.replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}

// ─── Extraction ─────────────────────────────────────────────────────────────

interface FunctionInfo {
  name: string;
  signatures: string[];
  description: string;
  example: string | null;
  params: Array<{ name: string; type: string; optional: boolean; description: string }>;
  returnType: string;
  typeParams: string;
}

interface InterfaceInfo {
  name: string;
  description: string;
  typeParams: string;
  properties: Array<{ name: string; type: string; optional: boolean; description: string }>;
  methods: Array<{ name: string; signature: string; description: string }>;
}

interface ClassInfo {
  name: string;
  description: string;
  typeParams: string;
  constructorParams: Array<{ name: string; type: string; optional: boolean; description: string }>;
  properties: Array<{ name: string; type: string; description: string }>;
  methods: Array<{ name: string; signature: string; description: string; returnType: string }>;
}

interface TypeAliasInfo {
  name: string;
  description: string;
  typeText: string;
}

interface ConstInfo {
  name: string;
  description: string;
  type: string;
  value: string;
}

/** Extract function signature text, stopping at the function body opening brace. */
function extractSignature(text: string): string | null {
  // For overload declarations (end with ;), return the whole thing
  const trimmed = text.trim();
  if (trimmed.endsWith(';')) {
    return trimmed;
  }

  // Strategy: track parens/angles, braces, and whether we're in a return type annotation.
  // After the parameter list `)`, a `:` signals a return type annotation.
  // The return type may contain `{...}` (inline object types).
  // The function body `{` is the first `{` at braceDepth === 0 AFTER the return type is complete.
  let parenDepth = 0;
  let braceDepth = 0;
  let inString = false;
  let stringChar = '';
  let pastParams = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (ch === stringChar && text[i - 1] !== '\\') inString = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '(' || ch === '<') parenDepth++;
    if (ch === ')' || ch === '>') {
      parenDepth--;
      if (parenDepth === 0 && ch === ')') pastParams = true;
    }
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;

    // The function body starts with `{` when we are past params,
    // all parens/angles are closed, and braces just opened to depth 1
    // (the body `{` increments braceDepth from 0 to 1).
    // But inline return type objects ALSO do this.
    // Differentiate: the body `{` is followed by a newline or code,
    // while return type `{` is followed by property names.
    // Simplest: the body `{` is the LAST `{` that brings braceDepth to 1
    // when parenDepth === 0 and pastParams.
    // Strategy: continue scanning; every time we see `{` at the right conditions,
    // record the position. The last such position wins.
  }

  // Fallback: find body `{` by looking for the last `{` at the transition
  // from braceDepth 0→1 after the param list.
  // Re-scan for this.
  parenDepth = 0;
  braceDepth = 0;
  inString = false;
  stringChar = '';
  pastParams = false;
  let lastBodyCandidate = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (ch === stringChar && text[i - 1] !== '\\') inString = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '(' || ch === '<') parenDepth++;
    if (ch === ')' || ch === '>') {
      parenDepth--;
      if (parenDepth === 0 && ch === ')') pastParams = true;
    }
    if (ch === '{') {
      if (pastParams && parenDepth === 0 && braceDepth === 0) {
        lastBodyCandidate = i;
      }
      braceDepth++;
    }
    if (ch === '}') braceDepth--;
  }

  if (lastBodyCandidate > 0) {
    return text.slice(0, lastBodyCandidate).trim();
  }
  return text.split('\n')[0]?.trim() ?? null;
}

function extractFunction(sourceFile: SourceFile, name: string): FunctionInfo | null {
  const fns = sourceFile.getFunctions().filter((f) => f.getName() === name && f.isExported());
  if (fns.length === 0) return null;

  // Collect all overload signatures + implementation
  const allDecls = sourceFile.getFunctions().filter((f) => f.getName() === name);
  const signatures: string[] = [];
  let description = '';
  let example: string | null = null;
  const params: FunctionInfo['params'] = [];
  let returnType = '';
  let typeParams = '';

  for (const fn of allDecls) {
    // Extract signature up to the function body (not splitting on { which breaks default values)
    const text = fn.getText();
    // Find the opening brace of the function body by matching balanced parens first
    const sig = extractSignature(text);
    if (sig) {
      const cleaned = sig.replace(/^export\s+/, '').replace(/;$/, '');
      signatures.push(cleaned);
    }

    const doc = getJsDoc(fn);
    if (doc && !description) description = doc;

    const ex = getExample(fn);
    if (ex && !example) example = ex;
  }

  // Use the implementation (last) or first for param info
  const impl = allDecls[allDecls.length - 1]!;
  typeParams = impl.getTypeParameters().map((tp) => tp.getText()).join(', ');
  if (typeParams) typeParams = `<${typeParams}>`;

  for (const param of impl.getParameters()) {
    const paramJsDocs = getJsDocTags(impl).filter(
      (t) => t.tagName === 'param' && t.text.startsWith(param.getName()),
    );
    const typeText = param.getTypeNode()?.getText() ?? param.getType().getText(param);
    params.push({
      name: param.getName(),
      type: typeText,
      optional: param.isOptional(),
      description: paramJsDocs[0]?.text.replace(param.getName(), '').replace(/^\s*-?\s*/, '') ?? '',
    });
  }

  const retNode = impl.getReturnTypeNode()?.getText();
  returnType = retNode ?? impl.getReturnType().getText(impl);

  return { name, signatures, description, example, params, returnType, typeParams };
}

function extractInterface(sourceFile: SourceFile, name: string): InterfaceInfo | null {
  const iface = sourceFile.getInterface(name);
  if (!iface) return null;

  const description = getJsDoc(iface);
  const typeParams = iface.getTypeParameters().map((tp) => tp.getText()).join(', ');

  const properties: InterfaceInfo['properties'] = [];
  const methods: InterfaceInfo['methods'] = [];

  for (const prop of iface.getProperties()) {
    // Prefer the source type node text (preserves alias names) over expanded type
    const typeText = prop.getTypeNode()?.getText() ?? prop.getType().getText(prop);
    properties.push({
      name: prop.getName(),
      type: typeText,
      optional: prop.hasQuestionToken(),
      description: getJsDoc(prop),
    });
  }

  for (const method of iface.getMethods()) {
    const sig = method.getText().replace(/;$/, '');
    methods.push({
      name: method.getName(),
      signature: sig,
      description: getJsDoc(method),
    });
  }

  return {
    name,
    description,
    typeParams: typeParams ? `<${typeParams}>` : '',
    properties,
    methods,
  };
}

function extractClass(sourceFile: SourceFile, name: string): ClassInfo | null {
  const cls = sourceFile.getClass(name);
  if (!cls) return null;

  const description = getJsDoc(cls);
  const typeParams = cls.getTypeParameters().map((tp) => tp.getText()).join(', ');

  const constructorParams: ClassInfo['constructorParams'] = [];
  const ctor = cls.getConstructors()[0];
  if (ctor) {
    for (const param of ctor.getParameters()) {
      const typeText = param.getTypeNode()?.getText() ?? param.getType().getText(param);
      constructorParams.push({
        name: param.getName(),
        type: typeText,
        optional: param.isOptional(),
        description: '',
      });
    }
  }

  const properties: ClassInfo['properties'] = [];
  for (const prop of cls.getProperties()) {
    if (prop.hasModifier(SyntaxKind.PrivateKeyword)) continue;
    const typeText = prop.getTypeNode()?.getText() ?? prop.getType().getText(prop);
    properties.push({
      name: prop.getName(),
      type: typeText,
      description: getJsDoc(prop),
    });
  }
  // Include getters
  for (const getter of cls.getGetAccessors()) {
    if (getter.hasModifier(SyntaxKind.PrivateKeyword)) continue;
    const typeText = getter.getReturnTypeNode()?.getText() ?? getter.getReturnType().getText(getter);
    properties.push({
      name: getter.getName(),
      type: typeText,
      description: getJsDoc(getter),
    });
  }

  const methods: ClassInfo['methods'] = [];
  for (const method of cls.getMethods()) {
    if (method.hasModifier(SyntaxKind.PrivateKeyword)) continue;
    const params = method
      .getParameters()
      .map((p) => {
        const opt = p.isOptional() ? '?' : '';
        const pType = p.getTypeNode()?.getText() ?? p.getType().getText(p);
        return `${p.getName()}${opt}: ${pType}`;
      })
      .join(', ');
    const ret = method.getReturnTypeNode()?.getText() ?? method.getReturnType().getText(method);
    methods.push({
      name: method.getName(),
      signature: `${method.getName()}(${params}): ${ret}`,
      description: getJsDoc(method),
      returnType: ret,
    });
  }

  return {
    name,
    description,
    typeParams: typeParams ? `<${typeParams}>` : '',
    constructorParams,
    properties,
    methods,
  };
}

function extractTypeAlias(sourceFile: SourceFile, name: string): TypeAliasInfo | null {
  const typeAlias = sourceFile.getTypeAlias(name);
  if (!typeAlias) return null;

  return {
    name,
    description: getJsDoc(typeAlias),
    typeText: typeAlias.getType().getText(typeAlias),
  };
}

// ─── Source file loading ────────────────────────────────────────────────────

function getSourceFile(relativePath: string): SourceFile {
  const fullPath = resolve(SDK_ROOT, relativePath);
  const sf = project.getSourceFile(fullPath);
  if (!sf) throw new Error(`Source file not found: ${fullPath}`);
  return sf;
}

// ─── Markdown generators ───────────────────────────────────────────────────

function renderFunctionSection(fn: FunctionInfo, headingLevel = 3): string {
  const h = '#'.repeat(headingLevel);
  const lines: string[] = [];

  lines.push(`${h} ${fn.name}()`);
  lines.push('');

  if (fn.description) {
    lines.push(fn.description);
    lines.push('');
  }

  // Show the primary (non-implementation) signature, or all if multiple overloads
  const sigs = fn.signatures.length > 1
    ? fn.signatures.slice(0, -1) // Overloads only, skip implementation
    : fn.signatures;

  lines.push('```typescript');
  for (const sig of sigs) {
    lines.push(sig);
  }
  lines.push('```');
  lines.push('');

  if (fn.params.length > 0) {
    lines.push('| Parameter | Type | Required | Description |');
    lines.push('|-----------|------|----------|-------------|');
    for (const p of fn.params) {
      const typeStr = escapeType(shortenType(p.type));
      lines.push(`| \`${p.name}\` | \`${typeStr}\` | ${p.optional ? 'No' : 'Yes'} | ${p.description} |`);
    }
    lines.push('');
  }

  if (fn.returnType) {
    lines.push(`**Returns:** \`${escapeType(shortenType(fn.returnType))}\``);
    lines.push('');
  }

  if (fn.example) {
    lines.push(fn.example);
    lines.push('');
  }

  return lines.join('\n');
}

function escapeAngleBrackets(s: string): string {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInterfaceSection(iface: InterfaceInfo, headingLevel = 3): string {
  const h = '#'.repeat(headingLevel);
  const lines: string[] = [];
  const displayName = iface.typeParams
    ? `${iface.name}${escapeAngleBrackets(iface.typeParams)}`
    : iface.name;

  lines.push(`${h} ${displayName}`);
  lines.push('');

  if (iface.description) {
    lines.push(iface.description);
    lines.push('');
  }

  if (iface.properties.length > 0) {
    lines.push('| Property | Type | Required | Description |');
    lines.push('|----------|------|----------|-------------|');
    for (const p of iface.properties) {
      const typeStr = escapeType(shortenType(p.type));
      lines.push(`| \`${p.name}\` | \`${typeStr}\` | ${p.optional ? 'No' : 'Yes'} | ${p.description} |`);
    }
    lines.push('');
  }

  if (iface.methods.length > 0) {
    lines.push('**Methods**');
    lines.push('');
    for (const m of iface.methods) {
      const escapedSig = escapeAngleBrackets(shortenType(m.signature));
      lines.push(`- \`${escapedSig}\` — ${m.description || '*No description*'}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderClassSection(cls: ClassInfo, headingLevel = 3): string {
  const h = '#'.repeat(headingLevel);
  const lines: string[] = [];
  const displayName = cls.typeParams
    ? `${cls.name}${escapeAngleBrackets(cls.typeParams)}`
    : cls.name;

  lines.push(`${h} ${displayName}`);
  lines.push('');

  if (cls.description) {
    lines.push(cls.description);
    lines.push('');
  }

  if (cls.constructorParams.length > 0) {
    lines.push('**Constructor**');
    lines.push('');
    lines.push('| Parameter | Type | Required |');
    lines.push('|-----------|------|----------|');
    for (const p of cls.constructorParams) {
      const typeStr = escapeType(shortenType(p.type));
      lines.push(`| \`${p.name}\` | \`${typeStr}\` | ${p.optional ? 'No' : 'Yes'} |`);
    }
    lines.push('');
  }

  if (cls.properties.length > 0) {
    lines.push('**Properties**');
    lines.push('');
    lines.push('| Property | Type | Description |');
    lines.push('|----------|------|-------------|');
    for (const p of cls.properties) {
      const typeStr = escapeType(shortenType(p.type));
      lines.push(`| \`${p.name}\` | \`${typeStr}\` | ${p.description} |`);
    }
    lines.push('');
  }

  if (cls.methods.length > 0) {
    lines.push('**Methods**');
    lines.push('');
    lines.push('| Method | Returns | Description |');
    lines.push('|--------|---------|-------------|');
    for (const m of cls.methods) {
      const sigShort = escapeType(shortenType(m.signature));
      const retShort = escapeType(shortenType(m.returnType));
      lines.push(`| \`${sigShort}\` | \`${retShort}\` | ${m.description} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderTypeAliasSection(ta: TypeAliasInfo, headingLevel = 3): string {
  const h = '#'.repeat(headingLevel);
  const lines: string[] = [];

  lines.push(`${h} ${ta.name}`);
  lines.push('');

  if (ta.description) {
    lines.push(ta.description);
    lines.push('');
  }

  const typeText = shortenType(ta.typeText);
  lines.push('```typescript');
  lines.push(`type ${ta.name} = ${typeText}`);
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

/** Shorten overly-verbose inferred types to something readable. */
function shortenType(t: string): string {
  // Trim import(...) qualifiers
  let result = t.replace(/import\([^)]+\)\./g, '');

  // Replace well-known expanded types with their alias names
  const typeReplacements: Array<[RegExp, string]> = [
    // BaseEntity full expansion → BaseEntity
    [/\{\s*type:\s*string;\s*id:\s*string;\s*uri:\s*string;\s*title:\s*string;[^}]*updatedAt\?[^}]*\}/g, 'BaseEntity'],
    // EntityDisplayMetadata expansion → EntityDisplayMetadata (match any object starting with emoji + colors)
    [/\{[^{}]*emoji:\s*string;[^{}]*colors:\s*\{[^}]+\}[^}]*\}/g, 'EntityDisplayMetadata'],
    // EntityCacheConfig expansion → EntityCacheConfig
    [/\{\s*ttl:\s*number;\s*maxSize\?:\s*number\s*\|\s*undefined;?\s*\}/g, 'EntityCacheConfig'],
    // EntityURIPath expansion → EntityURIPath
    [/\{\s*segments:\s*readonly\s*string\[\]\s*\}/g, 'EntityURIPath'],
    // PluginIcon union expansion
    [/\{\s*svg:\s*string;?\s*\}\s*\|\s*\{\s*png:\s*string;?\s*\}\s*\|\s*\{\s*path:\s*string;?\s*\}/g, 'PluginIcon'],
    // Note: we intentionally do NOT strip `| undefined` — it's part of the type
  ];

  for (const [pattern, replacement] of typeReplacements) {
    result = result.replace(pattern, replacement);
  }

  // Always collapse multiline types to single line (needed for table cells)
  result = result.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ');

  return result;
}

// ─── Main generation ────────────────────────────────────────────────────────

function generate(): string {
  const sections: string[] = [];

  // ── Header ──
  sections.push(`---
outline: [2, 3]
---

# Plugin SDK Reference

Complete API reference for \`@tryvienna/sdk\` — the type-safe foundation for Vienna's plugin, integration, and entity system.

::: tip Auto-generated
This reference is generated from the \`@tryvienna/sdk\` source code.
Regenerate with \`pnpm --filter @vienna/docs generate:reference\`.
:::

## Installation

\`@tryvienna/sdk\` is a workspace package — import it directly in any Vienna plugin or package:

\`\`\`typescript
// Main entry — definitions, URIs, types, registries
import { definePlugin, defineIntegration, defineEntity } from '@tryvienna/sdk';

// React hooks — renderer-only
import { useEntity, useEntities, usePluginQuery } from '@tryvienna/sdk/react';

// Codegen helper — build tooling only
import { createPluginCodegenConfig } from '@tryvienna/sdk/codegen';
\`\`\`

Three entry points serve different contexts:

| Entry Point | Use | Process |
|-------------|-----|---------|
| \`@tryvienna/sdk\` | Definitions, types, URIs, registries | Any |
| \`@tryvienna/sdk/react\` | React hooks, providers, cache utils | Renderer only |
| \`@tryvienna/sdk/codegen\` | GraphQL codegen config factory | Build tooling |
`);

  // ── Definition Factories ──
  sections.push(generateDefinitionFactories());

  // ── URI Utilities ──
  sections.push(generateURIUtilities());

  // ── React Hooks ──
  sections.push(generateReactHooks());

  // ── Core Types ──
  sections.push(generateCoreTypes());

  // ── Canvas Types ──
  sections.push(generateCanvasTypes());

  // ── Schema Builder ──
  sections.push(generateSchemaBuilder());

  // ── Classes (PluginSystem, EntityRegistry, etc.) ──
  sections.push(generateClasses());

  // ── Cache ──
  sections.push(generateCache());

  // ── Errors ──
  sections.push(generateErrors());

  // ── Testing Utilities ──
  sections.push(generateTesting());

  // ── Codegen ──
  sections.push(generateCodegen());

  // ── Zod Schemas ──
  sections.push(generateSchemas());

  return sections.join('\n---\n\n');
}

// ─── Section generators ─────────────────────────────────────────────────────

function generateDefinitionFactories(): string {
  const lines: string[] = [];
  lines.push('## Definition Factories');
  lines.push('');
  lines.push('The three `define*` factories are the primary API for plugins. Each validates its input, returns an immutable definition object, and provides URI helpers.');
  lines.push('');

  // defineEntity
  const defineEntityFile = getSourceFile('src/define-entity.ts');
  const defineEntityFn = extractFunction(defineEntityFile, 'defineEntity');
  if (defineEntityFn) {
    lines.push(renderFunctionSection(defineEntityFn));
    lines.push(`::: tip
\`defineEntity()\` validates the \`type\` against \`EntityTypeSchema\` (lowercase alphanumeric + underscore, 1-64 chars) and freezes the returned object.
:::`);
    lines.push('');
  }

  // EntityDefinitionConfig
  const entityDefConfig = extractInterface(defineEntityFile, 'EntityDefinitionConfig');
  if (entityDefConfig) {
    lines.push(renderInterfaceSection(entityDefConfig, 4));
  }

  // EntityDefinition
  const entityDef = extractInterface(defineEntityFile, 'EntityDefinition');
  if (entityDef) {
    lines.push(renderInterfaceSection(entityDef, 4));
  }

  // EntityDrawerProps, EntityCardProps
  const drawerProps = extractInterface(defineEntityFile, 'EntityDrawerProps');
  if (drawerProps) {
    lines.push(renderInterfaceSection(drawerProps, 4));
  }

  const cardProps = extractInterface(defineEntityFile, 'EntityCardProps');
  if (cardProps) {
    lines.push(renderInterfaceSection(cardProps, 4));
  }

  const containerProps = extractInterface(defineEntityFile, 'DrawerContainerProps');
  if (containerProps) {
    lines.push(renderInterfaceSection(containerProps, 4));
  }

  lines.push('**Example**');
  lines.push('');
  lines.push(`\`\`\`typescript
import { defineEntity } from '@tryvienna/sdk';
import type { EntityDrawerProps, EntityCardProps } from '@tryvienna/sdk';

// Custom entity drawer component
function PRDrawer({ uri, DrawerContainer, onNavigate }: EntityDrawerProps) {
  const { entity, loading } = useEntity(uri);
  if (loading || !entity) return null;

  return (
    <DrawerContainer title={entity.title}>
      <PRDetailView uri={uri} />
    </DrawerContainer>
  );
}

// Custom entity card/chip component (inline preview)
function PRCard({ uri, label }: EntityCardProps) {
  return <span>{label ?? uri}</span>;
}

export const githubPrEntity = defineEntity({
  type: 'github_pr',
  name: 'GitHub Pull Request',
  icon: { svg: '<svg>...</svg>' },
  uri: ['owner', 'repo', 'number'],
  display: {
    emoji: '🔀',
    colors: { bg: '#dafbe1', text: '#116329', border: '#aceebb' },
  },
  cache: { ttl: 30_000, maxSize: 200 },

  // UI overrides — custom rendering when this entity appears in the app
  ui: {
    drawer: PRDrawer,  // Shown when user clicks to expand this entity
    card: PRCard,      // Inline chip/card shown in lists and references
  },
});

// Build a URI
const uri = githubPrEntity.createURI({
  owner: 'anthropics', repo: 'sdk', number: '42',
});
// => '@vienna//github_pr/anthropics/sdk/42'

// Parse a URI
const { type, id } = githubPrEntity.parseURI(uri);
// => { type: 'github_pr', id: { owner: 'anthropics', repo: 'sdk', number: '42' } }
\`\`\``);
  lines.push('');

  lines.push('---');
  lines.push('');

  // defineIntegration
  const defineIntFile = getSourceFile('src/define-integration.ts');
  const defineIntFn = extractFunction(defineIntFile, 'defineIntegration');
  if (defineIntFn) {
    lines.push(renderFunctionSection(defineIntFn));
  }

  const intConfig = extractInterface(defineIntFile, 'IntegrationConfig');
  if (intConfig) {
    lines.push(renderInterfaceSection(intConfig, 4));
  }

  const intDef = extractInterface(getSourceFile('src/types.ts'), 'IntegrationDefinition');
  if (intDef) {
    lines.push(renderInterfaceSection(intDef, 4));
  }

  lines.push('**Example**');
  lines.push('');
  lines.push(`\`\`\`typescript
import { defineIntegration } from '@tryvienna/sdk';
import type { SchemaBuilder } from '@tryvienna/sdk';

interface GitHubClient {
  getPR(owner: string, repo: string, number: number): Promise<PRData>;
}

export const githubIntegration = defineIntegration<GitHubClient>({
  id: 'github',
  name: 'GitHub',
  icon: { svg: '<svg>...</svg>' },
  oauth: {
    providers: [{
      providerId: 'github',
      displayName: 'GitHub',
      flow: {
        grantType: 'authorization_code',
        clientId: 'your-client-id',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['repo', 'read:user'],
      },
    }],
  },
  createClient: async (ctx) => {
    const token = await ctx.oauth?.getAccessToken('github');
    if (!token) return null;
    return new GitHubClient(token);
  },
  schema: (builder) => registerGitHubSchema(builder),
});
\`\`\``);
  lines.push('');

  lines.push('---');
  lines.push('');

  // definePlugin
  const definePluginFile = getSourceFile('src/define-plugin.ts');
  const definePluginFn = extractFunction(definePluginFile, 'definePlugin');
  if (definePluginFn) {
    lines.push(renderFunctionSection(definePluginFn));
  }

  const pluginConfig = extractInterface(definePluginFile, 'PluginConfig');
  if (pluginConfig) {
    lines.push(renderInterfaceSection(pluginConfig, 4));
  }

  const pluginDef = extractInterface(definePluginFile, 'PluginDefinition');
  if (pluginDef) {
    lines.push(renderInterfaceSection(pluginDef, 4));
  }

  lines.push('**Example**');
  lines.push('');
  lines.push(`\`\`\`typescript
import { definePlugin } from '@tryvienna/sdk';

export const githubPlugin = definePlugin({
  id: 'github',
  name: 'GitHub',
  icon: { svg: '<svg>...</svg>' },
  integrations: [githubIntegration],
  entities: [githubPrEntity, githubIssueEntity],
  canvases: {
    'nav-sidebar': {
      component: GitHubSidebar,
      label: 'GitHub',
      icon: '🐙',
      priority: 80,
    },
    drawer: {
      component: GitHubDrawer,
      label: 'GitHub Settings',
    },
  },
  allowedDomains: ['api.github.com'],
});
\`\`\``);
  lines.push('');

  // Type guards
  lines.push('### Type Guards');
  lines.push('');
  lines.push('```typescript');
  lines.push('function isEntityDefinition(value: unknown): value is EntityDefinition');
  lines.push('function isIntegrationDefinition(value: unknown): value is IntegrationDefinition');
  lines.push('function isPluginDefinition(value: unknown): value is PluginDefinition');
  lines.push('```');
  lines.push('');
  lines.push('Runtime type checks using the `__brand` discriminator on each definition type.');
  lines.push('');

  return lines.join('\n');
}

function generateURIUtilities(): string {
  const lines: string[] = [];
  const sf = getSourceFile('src/uri.ts');

  lines.push('## URI Utilities');
  lines.push('');
  lines.push('Entity URIs follow the pattern `@vienna//<type>/<segment1>/<segment2>/...` with optional labels appended as `?label=<base64>`.');
  lines.push('');
  lines.push('```');
  lines.push('@vienna//project/abc123');
  lines.push('@vienna//github_pr/owner/repo/42');
  lines.push('@vienna//project/abc123?label=TXkgUHJvamVjdA==');
  lines.push('```');
  lines.push('');

  // ENTITY_URI_SCHEME
  lines.push("### ENTITY_URI_SCHEME");
  lines.push('');
  lines.push("```typescript");
  lines.push("const ENTITY_URI_SCHEME = '@vienna//'");
  lines.push("```");
  lines.push('');
  lines.push('The URI scheme prefix. All entity URIs start with this string.');
  lines.push('');

  const fnNames = [
    'buildEntityURI',
    'buildEntityURIWithLabel',
    'parseEntityURI',
    'parseEntityURIWithLabel',
    'getEntityTypeFromURI',
    'isEntityURI',
    'extractLabel',
    'compareEntityURIs',
  ];

  for (const name of fnNames) {
    const fn = extractFunction(sf, name);
    if (fn) {
      lines.push(renderFunctionSection(fn));
    }
  }

  lines.push('**Usage example**');
  lines.push('');
  lines.push(`\`\`\`typescript
import {
  buildEntityURI,
  parseEntityURI,
  isEntityURI,
  compareEntityURIs,
  ENTITY_URI_SCHEME,
} from '@tryvienna/sdk';

// Build
const uri = buildEntityURI('github_pr', { owner: 'acme', repo: 'app', number: '7' }, {
  segments: ['owner', 'repo', 'number'],
});
// => '@vienna//github_pr/acme/app/7'

// Parse
const { type, id } = parseEntityURI(uri, { segments: ['owner', 'repo', 'number'] });
// => { type: 'github_pr', id: { owner: 'acme', repo: 'app', number: '7' } }

// Validate
isEntityURI('@vienna//project/abc');  // true
isEntityURI('not-a-uri');            // false

// Compare (ignores labels)
compareEntityURIs(
  '@vienna//project/abc?label=Zm9v',
  '@vienna//project/abc',
); // true
\`\`\``);
  lines.push('');

  return lines.join('\n');
}

function generateReactHooks(): string {
  const lines: string[] = [];

  lines.push('## React Hooks');
  lines.push('');
  lines.push('Import from `@tryvienna/sdk/react` (or re-exported from the root). These hooks read the Apollo client from `<PluginDataProvider>` — plugins never import Apollo directly.');
  lines.push('');

  // useEntity
  const useEntityFile = getSourceFile('src/react/useEntity.ts');
  const useEntityFn = extractFunction(useEntityFile, 'useEntity');
  if (useEntityFn) {
    lines.push(renderFunctionSection(useEntityFn));
  }

  const useEntityOpts = extractInterface(useEntityFile, 'UseEntityOptions');
  if (useEntityOpts) {
    lines.push(renderInterfaceSection(useEntityOpts, 4));
  }

  const useEntityResult = extractInterface(useEntityFile, 'UseEntityResult');
  if (useEntityResult) {
    lines.push(renderInterfaceSection(useEntityResult, 4));
  }

  lines.push(`\`\`\`tsx
import { useEntity } from '@tryvienna/sdk/react';

function PRDetail({ uri }: { uri: string }) {
  const { entity, loading, error, refetch } = useEntity(uri);

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!entity) return <NotFound />;

  return <div>{entity.title}</div>;
}
\`\`\``);
  lines.push('');

  // useEntities
  const useEntitiesFile = getSourceFile('src/react/useEntities.ts');
  const useEntitiesFn = extractFunction(useEntitiesFile, 'useEntities');
  if (useEntitiesFn) {
    lines.push(renderFunctionSection(useEntitiesFn));
  }

  const useEntitiesOpts = extractInterface(useEntitiesFile, 'UseEntitiesOptions');
  if (useEntitiesOpts) {
    lines.push(renderInterfaceSection(useEntitiesOpts, 4));
  }

  const useEntitiesResult = extractInterface(useEntitiesFile, 'UseEntitiesResult');
  if (useEntitiesResult) {
    lines.push(renderInterfaceSection(useEntitiesResult, 4));
  }

  lines.push(`\`\`\`tsx
import { useEntities } from '@tryvienna/sdk/react';

function InboxList() {
  const { entities, loading } = useEntities({
    type: 'google_gmail_thread',
    query: 'in:inbox',
    limit: 20,
    pollInterval: 30_000,
  });

  return (
    <ul>
      {entities.map((e) => (
        <li key={e.uri}>{e.title}</li>
      ))}
    </ul>
  );
}
\`\`\``);
  lines.push('');

  // usePluginQuery
  lines.push('### usePluginQuery()');
  lines.push('');
  lines.push('Run custom GraphQL queries through the plugin data context. Supports full type inference with `TypedDocumentNode` from codegen.');
  lines.push('');
  lines.push('```typescript');
  lines.push('// With TypedDocumentNode (codegen) — types inferred automatically');
  lines.push('function usePluginQuery<TData, TVariables>(');
  lines.push('  query: TypedDocumentNode<TData, TVariables>,');
  lines.push('  options?: Omit<QueryHookOptions<TData, TVariables>, "client">,');
  lines.push('): QueryResult<TData, TVariables>');
  lines.push('');
  lines.push('// With plain DocumentNode — pass type parameters manually');
  lines.push('function usePluginQuery<TData, TVariables>(');
  lines.push('  query: DocumentNode,');
  lines.push('  options?: Omit<QueryHookOptions<TData, TVariables>, "client">,');
  lines.push('): QueryResult<TData, TVariables>');
  lines.push('```');
  lines.push('');
  lines.push(`\`\`\`tsx
// With codegen — fully typed, no manual generics
import { usePluginQuery } from '@tryvienna/sdk/react';
import { GET_GITHUB_ISSUE } from '../client/operations';

const { data } = usePluginQuery(GET_GITHUB_ISSUE, {
  variables: { owner: 'foo', repo: 'bar', issueNumber: 1 },
});
// data?.githubIssue is fully typed

// Without codegen — manual type parameters
import { usePluginQuery, gql } from '@tryvienna/sdk/react';

const GET_REPOS = gql\\\`query { repos { name } }\\\`;
const { data } = usePluginQuery<{ repos: { name: string }[] }>(GET_REPOS);
\`\`\``);
  lines.push('');

  // usePluginMutation
  lines.push('### usePluginMutation()');
  lines.push('');
  lines.push('Run custom GraphQL mutations. Same overload pattern as `usePluginQuery`.');
  lines.push('');
  lines.push('```typescript');
  lines.push('// With TypedDocumentNode (codegen) — types inferred automatically');
  lines.push('function usePluginMutation<TData, TVariables>(');
  lines.push('  mutation: TypedDocumentNode<TData, TVariables>,');
  lines.push('  options?: Omit<MutationHookOptions<TData, TVariables>, "client">,');
  lines.push('): MutationTuple<TData, TVariables>');
  lines.push('');
  lines.push('// With plain DocumentNode — pass type parameters manually');
  lines.push('function usePluginMutation<TData, TVariables>(');
  lines.push('  mutation: DocumentNode,');
  lines.push('  options?: Omit<MutationHookOptions<TData, TVariables>, "client">,');
  lines.push('): MutationTuple<TData, TVariables>');
  lines.push('```');
  lines.push('');
  lines.push(`\`\`\`tsx
import { usePluginMutation } from '@tryvienna/sdk/react';
import { MERGE_PR } from '../client/operations';

function MergeButton({ uri }: { uri: string }) {
  const [mergePR, { loading }] = usePluginMutation(MERGE_PR);

  return (
    <button onClick={() => mergePR({ variables: { uri } })} disabled={loading}>
      Merge
    </button>
  );
}
\`\`\``);
  lines.push('');

  // usePluginClient, useHostApi
  lines.push('### usePluginClient()');
  lines.push('');
  lines.push('Access the raw Apollo client from the plugin data context.');
  lines.push('');
  lines.push('```typescript');
  lines.push('function usePluginClient(): ApolloClient<any>');
  lines.push('```');
  lines.push('');
  lines.push('::: warning');
  lines.push('Must be used within a `<PluginDataProvider>`. Throws if no provider is found.');
  lines.push(':::');
  lines.push('');

  lines.push('### useHostApi()');
  lines.push('');
  lines.push('Access the host API for credential management, OAuth flows, and proxied fetch.');
  lines.push('');
  lines.push('```typescript');
  lines.push('function useHostApi(): PluginHostApi');
  lines.push('```');
  lines.push('');
  lines.push('See [PluginHostApi](#pluginhostapi) for the full interface.');
  lines.push('');

  // Cache utilities
  lines.push('### invalidateEntity()');
  lines.push('');
  lines.push('Evict a cached entity and refetch all active queries.');
  lines.push('');
  lines.push('```typescript');
  lines.push('function invalidateEntity(');
  lines.push('  client: ApolloClient<any>,');
  lines.push('  typename: string,');
  lines.push('  id?: string,');
  lines.push('  keyFields?: Record<string, string>,');
  lines.push('): void');
  lines.push('```');
  lines.push('');
  lines.push(`\`\`\`typescript
import { usePluginClient, invalidateEntity } from '@tryvienna/sdk/react';

const client = usePluginClient();
// Invalidate by URI (Entity type uses 'uri' as keyField)
invalidateEntity(client, 'Entity', undefined, { uri });
\`\`\``);
  lines.push('');

  lines.push('### updateCachedEntity()');
  lines.push('');
  lines.push('Update specific fields on a cached entity without a network request.');
  lines.push('');
  lines.push('```typescript');
  lines.push('function updateCachedEntity(');
  lines.push('  client: ApolloClient<any>,');
  lines.push('  typename: string,');
  lines.push('  id: string,');
  lines.push('  fields: Record<string, unknown>,');
  lines.push('  keyFields?: Record<string, string>,');
  lines.push('): void');
  lines.push('```');
  lines.push('');
  lines.push(`\`\`\`typescript
import { usePluginClient, updateCachedEntity } from '@tryvienna/sdk/react';

const client = usePluginClient();
// Optimistically update a cached entity's title
updateCachedEntity(client, 'GitHubPR', 'pr-123', {
  state: 'merged',
  title: 'Updated title',
});
\`\`\``);
  lines.push('');

  // PluginDataProvider
  lines.push('### PluginDataProvider');
  lines.push('');
  lines.push('Host app wraps plugin components with this provider to inject the Apollo client and host API. Plugins never use this directly.');
  lines.push('');
  lines.push('```tsx');
  lines.push('// Host app usage:');
  lines.push("import { PluginDataProvider } from '@tryvienna/sdk/react';");
  lines.push('');
  lines.push('<PluginDataProvider client={apolloClient} hostApi={hostApi}>');
  lines.push('  {pluginContent}');
  lines.push('</PluginDataProvider>');
  lines.push('```');
  lines.push('');

  // gql
  lines.push('### gql');
  lines.push('');
  lines.push('Re-exported from `graphql-tag` for convenience. Use to write inline GraphQL operations.');
  lines.push('');
  lines.push("```typescript");
  lines.push("import { gql } from '@tryvienna/sdk/react';");
  lines.push('');
  lines.push('const GET_REPOS = gql`');
  lines.push('  query GetRepos {');
  lines.push('    repos { name url }');
  lines.push('  }');
  lines.push('`;');
  lines.push("```");
  lines.push('');

  return lines.join('\n');
}

function generateCoreTypes(): string {
  const lines: string[] = [];
  const typesFile = getSourceFile('src/types.ts');

  lines.push('## Core Types');
  lines.push('');

  // BaseEntity
  const schemasFile = getSourceFile('src/schemas.ts');
  lines.push('### BaseEntity');
  lines.push('');
  lines.push('The minimal entity shape returned by all entity queries. Every entity in the system satisfies this interface.');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface BaseEntity {');
  lines.push('  id: string;');
  lines.push('  type: string;');
  lines.push('  uri: string;');
  lines.push('  title: string;');
  lines.push('  description?: string;');
  lines.push('  createdAt?: number;');
  lines.push('  updatedAt?: number;');
  lines.push('  metadata?: Record<string, unknown>;');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // PluginIcon
  lines.push('### PluginIcon');
  lines.push('');
  lines.push('Static icon asset for plugins, integrations, and entities.');
  lines.push('');
  lines.push('```typescript');
  lines.push('type PluginIcon =');
  lines.push('  | { svg: string }    // Inline SVG markup');
  lines.push('  | { png: string }    // Base64-encoded PNG');
  lines.push('  | { path: string }   // Relative path to icon file');
  lines.push('```');
  lines.push('');

  // SecureStorage
  const secureStorage = extractInterface(typesFile, 'SecureStorage');
  if (secureStorage) {
    lines.push(renderInterfaceSection(secureStorage));
  }

  // PluginLogger
  const pluginLogger = extractInterface(typesFile, 'PluginLogger');
  if (pluginLogger) {
    lines.push(renderInterfaceSection(pluginLogger));
  }

  // AuthContext
  const authContext = extractInterface(typesFile, 'AuthContext');
  if (authContext) {
    lines.push(renderInterfaceSection(authContext));
  }

  // EntityContext
  lines.push('### EntityContext&lt;TIntegrations&gt;');
  lines.push('');
  lines.push('Context provided to entity resolve/search/action handlers. Integration clients are pre-resolved and typed via the integrations map.');
  lines.push('');
  lines.push('```typescript');
  lines.push('type EntityContext<TIntegrations> = {');
  lines.push('  storage: SecureStorage;');
  lines.push('  logger: PluginLogger;');
  lines.push('  integrations: {');
  lines.push('    [K in keyof TIntegrations]: IntegrationAccessor<ClientOf<TIntegrations[K]>>;');
  lines.push('  };');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // IntegrationAccessor
  const intAccessor = extractInterface(typesFile, 'IntegrationAccessor');
  if (intAccessor) {
    lines.push(renderInterfaceSection(intAccessor));
  }

  // SearchQuery
  const searchQuery = extractInterface(typesFile, 'SearchQuery');
  if (searchQuery) {
    lines.push(renderInterfaceSection(searchQuery));
  }

  // ClientOf
  lines.push('### ClientOf&lt;T&gt;');
  lines.push('');
  lines.push('Infer the client type from an `IntegrationDefinition`.');
  lines.push('');
  lines.push('```typescript');
  lines.push('type ClientOf<T> = T extends IntegrationDefinition<infer C> ? C : never');
  lines.push('```');
  lines.push('');

  // OAuth types
  lines.push('### OAuth Types');
  lines.push('');

  const oauthConfig = extractInterface(typesFile, 'OAuthConfig');
  if (oauthConfig) {
    lines.push(renderInterfaceSection(oauthConfig, 4));
  }

  const oauthProvider = extractInterface(typesFile, 'OAuthProviderConfig');
  if (oauthProvider) {
    lines.push(renderInterfaceSection(oauthProvider, 4));
  }

  lines.push('#### OAuthFlowConfig');
  lines.push('');
  lines.push('Union of the three supported grant types:');
  lines.push('');
  lines.push('```typescript');
  lines.push('type OAuthFlowConfig =');
  lines.push('  | OAuthAuthorizationCodeConfig');
  lines.push('  | OAuthDeviceCodeConfig');
  lines.push('  | OAuthManualCodeConfig');
  lines.push('```');
  lines.push('');

  const authCodeConfig = extractInterface(typesFile, 'OAuthAuthorizationCodeConfig');
  if (authCodeConfig) {
    lines.push(renderInterfaceSection(authCodeConfig, 4));
  }

  const deviceCodeConfig = extractInterface(typesFile, 'OAuthDeviceCodeConfig');
  if (deviceCodeConfig) {
    lines.push(renderInterfaceSection(deviceCodeConfig, 4));
  }

  const manualCodeConfig = extractInterface(typesFile, 'OAuthManualCodeConfig');
  if (manualCodeConfig) {
    lines.push(renderInterfaceSection(manualCodeConfig, 4));
  }

  const oauthTokenData = extractInterface(typesFile, 'OAuthTokenData');
  if (oauthTokenData) {
    lines.push(renderInterfaceSection(oauthTokenData, 4));
  }

  const oauthAccessor = extractInterface(typesFile, 'OAuthAccessor');
  if (oauthAccessor) {
    lines.push(renderInterfaceSection(oauthAccessor, 4));
  }

  // EntitySource
  lines.push('### EntitySource');
  lines.push('');
  lines.push('```typescript');
  lines.push("type EntitySource = 'builtin' | 'integration'");
  lines.push('```');
  lines.push('');

  // EntityDisplayMetadata and sub-types
  lines.push('### EntityDisplayMetadata');
  lines.push('');
  lines.push('Display metadata for automatic entity styling in the UI.');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface EntityDisplayMetadata {');
  lines.push('  emoji: string;');
  lines.push('  colors: EntityDisplayColors;');
  lines.push('  description?: string;');
  lines.push('  filterDescriptions?: FilterDescription[];');
  lines.push('  outputFields?: OutputField[];');
  lines.push('}');
  lines.push('');
  lines.push('interface EntityDisplayColors {');
  lines.push('  bg: string;    // Background CSS color');
  lines.push('  text: string;  // Text CSS color');
  lines.push('  border: string; // Border CSS color');
  lines.push('}');
  lines.push('');
  lines.push('interface FilterDescription {');
  lines.push('  name: string;');
  lines.push('  type: string;');
  lines.push('  description: string;');
  lines.push('}');
  lines.push('');
  lines.push('interface OutputField {');
  lines.push('  key: string;');
  lines.push('  label: string;');
  lines.push('  metadataPath: string;');
  lines.push('  format?: string;');
  lines.push('}');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

function generateCanvasTypes(): string {
  const lines: string[] = [];
  const canvasFile = getSourceFile('src/canvas.ts');

  lines.push('## Canvas Types');
  lines.push('');
  lines.push('Plugins contribute UI to three canvas slots. Each canvas type has a config interface (what plugins provide) and a props interface (what the host injects at render time).');
  lines.push('');

  // CanvasType
  lines.push('### CanvasType');
  lines.push('');
  lines.push("```typescript");
  lines.push("type CanvasType = 'nav-sidebar' | 'drawer' | 'menu-bar'");
  lines.push("```");
  lines.push('');

  // CanvasLogger
  lines.push('### CanvasLogger');
  lines.push('');
  lines.push('A stripped-down logger for canvas components. Same as `PluginLogger` but without `child()`.');
  lines.push('');
  lines.push('```typescript');
  lines.push("type CanvasLogger = Omit<PluginLogger, 'child'>");
  lines.push('```');
  lines.push('');

  // PluginHostApi
  const hostApi = extractInterface(canvasFile, 'PluginHostApi');
  if (hostApi) {
    lines.push(renderInterfaceSection(hostApi));
  }

  // CredentialStatusEntry, OAuthProviderStatusEntry
  const credStatus = extractInterface(canvasFile, 'CredentialStatusEntry');
  if (credStatus) {
    lines.push(renderInterfaceSection(credStatus, 4));
  }
  const oauthStatus = extractInterface(canvasFile, 'OAuthProviderStatusEntry');
  if (oauthStatus) {
    lines.push(renderInterfaceSection(oauthStatus, 4));
  }

  lines.push(`\`\`\`tsx
import { useHostApi } from '@tryvienna/sdk/react';

function GitHubSettings({ integrationId }: { integrationId: string }) {
  const hostApi = useHostApi();

  const handleConnect = async () => {
    const result = await hostApi.startOAuthFlow(integrationId, 'github');
    if (!result.success) console.error(result.error);
  };

  const handleSetToken = async (token: string) => {
    await hostApi.setCredential(integrationId, 'personal_access_token', token);
  };

  return <button onClick={handleConnect}>Connect GitHub</button>;
}
\`\`\``);
  lines.push('');

  // Nav Sidebar
  lines.push('### Nav Sidebar');
  lines.push('');
  const navConfig = extractInterface(canvasFile, 'NavSidebarCanvasConfig');
  if (navConfig) {
    lines.push(renderInterfaceSection(navConfig, 4));
  }
  const navProps = extractInterface(canvasFile, 'NavSidebarCanvasProps');
  if (navProps) {
    lines.push(renderInterfaceSection(navProps, 4));
  }

  lines.push(`\`\`\`tsx
// Nav sidebar component — renders in the left sidebar
function GitHubSidebar({ pluginId, openEntityDrawer, hostApi, logger }: NavSidebarCanvasProps) {
  const { entities, loading } = useEntities({ type: 'github_pr', limit: 10 });

  return (
    <div>
      {entities.map((pr) => (
        <button key={pr.uri} onClick={() => openEntityDrawer(pr.uri)}>
          {pr.title}
        </button>
      ))}
    </div>
  );
}
\`\`\``);
  lines.push('');

  // Drawer
  lines.push('### Drawer');
  lines.push('');
  const drawerConfig = extractInterface(canvasFile, 'DrawerCanvasConfig');
  if (drawerConfig) {
    lines.push(renderInterfaceSection(drawerConfig, 4));
  }
  const drawerProps = extractInterface(canvasFile, 'PluginDrawerCanvasProps');
  if (drawerProps) {
    lines.push(renderInterfaceSection(drawerProps, 4));
  }
  const drawerActions = extractInterface(canvasFile, 'PluginDrawerActions');
  if (drawerActions) {
    lines.push(renderInterfaceSection(drawerActions, 4));
  }

  lines.push(`\`\`\`tsx
// Drawer component — plugin-level settings/detail panel
function GitHubDrawer({ pluginId, payload, drawer, hostApi }: PluginDrawerCanvasProps) {
  return (
    <div>
      <h2>GitHub Settings</h2>
      <button onClick={() => drawer.push({ view: 'tokens' })}>
        Manage Tokens
      </button>
      {drawer.canPop && (
        <button onClick={drawer.pop}>Back</button>
      )}
    </div>
  );
}
\`\`\``);
  lines.push('');

  // Menu Bar
  lines.push('### Menu Bar');
  lines.push('');
  const menuConfig = extractInterface(canvasFile, 'MenuBarCanvasConfig');
  if (menuConfig) {
    lines.push(renderInterfaceSection(menuConfig, 4));
  }
  const menuBarProps = extractInterface(canvasFile, 'MenuBarCanvasProps');
  if (menuBarProps) {
    lines.push(renderInterfaceSection(menuBarProps, 4));
  }
  const menuBarIconProps = extractInterface(canvasFile, 'MenuBarIconProps');
  if (menuBarIconProps) {
    lines.push(renderInterfaceSection(menuBarIconProps, 4));
  }

  lines.push(`\`\`\`tsx
// Menu bar icon — renders in the top-right icon bar
function WeatherIcon({ pluginId }: MenuBarIconProps) {
  return <span>🌤</span>;
}

// Menu bar popover — shown when the icon is clicked
function WeatherPopover({ pluginId, onClose }: MenuBarCanvasProps) {
  return (
    <div>
      <h3>Weather</h3>
      <p>72°F — Sunny</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
\`\`\``);
  lines.push('');

  // PluginCanvases
  const pluginCanvases = extractInterface(canvasFile, 'PluginCanvases');
  if (pluginCanvases) {
    lines.push(renderInterfaceSection(pluginCanvases));
  }

  // PluginFetch
  const fetchOpts = extractInterface(canvasFile, 'PluginFetchOptions');
  if (fetchOpts) {
    lines.push(renderInterfaceSection(fetchOpts));
  }

  const fetchResult = extractInterface(canvasFile, 'PluginFetchResult');
  if (fetchResult) {
    lines.push(renderInterfaceSection(fetchResult));
  }

  lines.push(`\`\`\`tsx
// Fetch external API via the host (bypasses renderer CSP)
const hostApi = useHostApi();
const result = await hostApi.fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-74.0', {
  method: 'GET',
  headers: { 'Accept': 'application/json' },
});
if (result.ok) {
  const data = JSON.parse(result.body);
}
\`\`\``);
  lines.push('');

  return lines.join('\n');
}

function generateSchemaBuilder(): string {
  const lines: string[] = [];
  const sbFile = getSourceFile('src/schema-builder.ts');

  lines.push('## Schema Builder');
  lines.push('');
  lines.push('The `SchemaBuilder` interface provides a typed subset of the Pothos API for plugins to extend the GraphQL schema. Plugins receive it in their integration\'s `schema` callback — no direct Pothos dependency needed.');
  lines.push('');

  const sb = extractInterface(sbFile, 'SchemaBuilder');
  if (sb) {
    lines.push(renderInterfaceSection(sb));
  }

  // entityObjectType config
  const entityObjConfig = extractInterface(sbFile, 'EntityObjectTypeConfig');
  if (entityObjConfig) {
    lines.push(renderInterfaceSection(entityObjConfig));
  }

  const entityHandlerConfig = extractInterface(sbFile, 'EntityHandlerConfig');
  if (entityHandlerConfig) {
    lines.push(renderInterfaceSection(entityHandlerConfig));
  }

  const entityPayload = extractInterface(sbFile, 'EntityPayloadShape');
  if (entityPayload) {
    lines.push(renderInterfaceSection(entityPayload));
  }

  lines.push('**Example — extending the schema**');
  lines.push('');
  lines.push(`\`\`\`typescript
import type { SchemaBuilder } from '@tryvienna/sdk';
import { githubPrEntity } from './entities';
import { githubIntegration } from './integration';

export function registerGitHubSchema(b: SchemaBuilder): void {
  // Create entity-backed type with auto-generated queries
  const GitHubPR = b.entityObjectType<PRData>(githubPrEntity, {
    integrations: { github: githubIntegration },
    fields: (t) => ({
      number: t.exposeInt('number'),
      state: t.exposeString('state'),
      author: t.exposeString('author'),
      additions: t.exposeInt('additions'),
      deletions: t.exposeInt('deletions'),
    }),
    resolve: async (id, ctx) => {
      const client = ctx.integrations.github.client;
      if (!client) return null;
      return client.getPR(id.owner, id.repo, Number(id.number));
    },
    search: async (query, ctx) => {
      const client = ctx.integrations.github.client;
      if (!client) return [];
      return client.searchPRs(query.query ?? '', query.limit);
    },
  });

  // Mutation payload
  const MergePayload = b.entityPayload('MergeGitHubPr', GitHubPR, 'pr');

  b.mutationFields((t) => ({
    mergeGitHubPr: t.field({
      type: MergePayload,
      args: { uri: t.arg.string({ required: true }) },
      resolve: async (_, args, ctx) => {
        // ... merge logic
        return { success: true, entity: mergedPR };
      },
    }),
  }));
}
\`\`\``);
  lines.push('');

  return lines.join('\n');
}

function generateClasses(): string {
  const lines: string[] = [];

  lines.push('## Registries');
  lines.push('');
  lines.push('Runtime registries that hold definitions and route operations. Most plugins use `PluginSystem` (the unified registry); the lower-level `EntityRegistry` and `IntegrationRegistry` are used internally by `@vienna/graphql`.');
  lines.push('');

  // PluginSystem
  const psFile = getSourceFile('src/plugin-system.ts');
  const ps = extractClass(psFile, 'PluginSystem');
  if (ps) {
    lines.push(renderClassSection(ps));
  }

  // EntityHandlers
  const regFile = getSourceFile('src/registry.ts');
  const entityHandlers = extractInterface(regFile, 'EntityHandlers');
  if (entityHandlers) {
    lines.push(renderInterfaceSection(entityHandlers));
  }

  // EntityRegistry
  const er = extractClass(regFile, 'EntityRegistry');
  if (er) {
    lines.push(renderClassSection(er));
  }

  // IntegrationRegistry
  const ir = extractClass(regFile, 'IntegrationRegistry');
  if (ir) {
    lines.push(renderClassSection(ir));
  }

  // Resolved canvas types
  lines.push('### Resolved Canvas Types');
  lines.push('');
  lines.push('Returned by `PluginSystem` canvas query methods. Pairs the canvas config with the owning plugin ID.');
  lines.push('');
  for (const name of ['ResolvedNavSidebar', 'ResolvedDrawer', 'ResolvedMenuBar', 'ResolvedEntityDrawer']) {
    const iface = extractInterface(psFile, name);
    if (iface) {
      lines.push(renderInterfaceSection(iface, 4));
    }
  }

  return lines.join('\n');
}

function generateCache(): string {
  const lines: string[] = [];
  const cacheFile = getSourceFile('src/cache.ts');

  lines.push('## Cache');
  lines.push('');

  const cache = extractClass(cacheFile, 'EntityCache');
  if (cache) {
    lines.push(renderClassSection(cache));
  }

  lines.push(`\`\`\`typescript
import { EntityCache } from '@tryvienna/sdk';

const cache = new EntityCache<PRData>({ ttl: 30_000, maxSize: 200 });

cache.set('key', prData);
const hit = cache.get('key');     // PRData | undefined
cache.invalidate('key');          // Remove specific entry
const pruned = cache.prune();     // Remove expired, returns count
cache.clear();                    // Remove all
\`\`\``);
  lines.push('');

  return lines.join('\n');
}

function generateErrors(): string {
  const lines: string[] = [];
  const errFile = getSourceFile('src/errors.ts');

  lines.push('## Errors');
  lines.push('');

  const uriErr = extractClass(errFile, 'EntityURIError');
  if (uriErr) {
    lines.push(renderClassSection(uriErr));
  }

  lines.push('**Error codes:** `INVALID_FORMAT` · `MISSING_ENTITY_TYPE` · `MISSING_PATH` · `INVALID_ENTITY_TYPE` · `INVALID_PATH_SEGMENT` · `INVALID_LABEL_ENCODING` · `SEGMENT_COUNT_MISMATCH`');
  lines.push('');

  const defErr = extractClass(errFile, 'EntityDefinitionError');
  if (defErr) {
    lines.push(renderClassSection(defErr));
  }

  lines.push('### Type Guards');
  lines.push('');
  lines.push('```typescript');
  lines.push('function isEntityURIError(error: unknown): error is EntityURIError');
  lines.push('function isEntityDefinitionError(error: unknown): error is EntityDefinitionError');
  lines.push('```');
  lines.push('');
  lines.push(`\`\`\`typescript
import { parseEntityURI, isEntityURIError } from '@tryvienna/sdk';

try {
  parseEntityURI('bad-uri');
} catch (err) {
  if (isEntityURIError(err)) {
    console.log(err.code); // 'INVALID_FORMAT'
    console.log(err.uri);  // 'bad-uri'
  }
}
\`\`\``);
  lines.push('');

  return lines.join('\n');
}

function generateTesting(): string {
  const lines: string[] = [];
  const testFile = getSourceFile('src/testing.ts');

  lines.push('## Testing Utilities');
  lines.push('');
  lines.push('In-memory mocks and a structured test harness. Import from `@tryvienna/sdk`.');
  lines.push('');

  // LogEntry
  const logEntry = extractInterface(testFile, 'LogEntry');
  if (logEntry) {
    lines.push(renderInterfaceSection(logEntry));
  }

  // MockSecureStorage
  const mockStorage = extractClass(testFile, 'MockSecureStorage');
  if (mockStorage) {
    lines.push(renderClassSection(mockStorage));
  }

  // MockPluginLogger
  const mockLogger = extractClass(testFile, 'MockPluginLogger');
  if (mockLogger) {
    lines.push(renderClassSection(mockLogger));
  }

  // MockOAuthAccessor
  const mockOAuth = extractClass(testFile, 'MockOAuthAccessor');
  if (mockOAuth) {
    lines.push(renderClassSection(mockOAuth));
  }

  // MockIntegrationAccessor
  const mockInt = extractClass(testFile, 'MockIntegrationAccessor');
  if (mockInt) {
    lines.push(renderClassSection(mockInt));
  }

  // createMockEntityContext
  const createMockCtx = extractFunction(testFile, 'createMockEntityContext');
  if (createMockCtx) {
    lines.push(renderFunctionSection(createMockCtx));
  }

  // createTestHarness
  const createHarness = extractFunction(testFile, 'createTestHarness');
  if (createHarness) {
    lines.push(renderFunctionSection(createHarness));
  }

  // EntityTestHarness
  const testHarness = extractInterface(testFile, 'EntityTestHarness');
  if (testHarness) {
    lines.push(renderInterfaceSection(testHarness));
  }

  lines.push('**Example**');
  lines.push('');
  lines.push(`\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { createTestHarness, MockIntegrationAccessor } from '@tryvienna/sdk';
import { githubPrEntity } from './entities';

describe('GitHub PR Entity', () => {
  it('creates and parses URIs', () => {
    const harness = createTestHarness(githubPrEntity);

    const uri = harness.createURI({ owner: 'acme', repo: 'app', number: '42' });
    expect(uri).toBe('@vienna//github_pr/acme/app/42');

    const { id } = harness.parseURI(uri);
    expect(id.owner).toBe('acme');
    expect(id.number).toBe('42');
  });

  it('provides mock context for handler tests', () => {
    const mockGitHub = new MockIntegrationAccessor(mockGitHubClient);
    const harness = createTestHarness(githubPrEntity, { github: mockGitHub });

    // harness.ctx can be passed to resolve/search handlers
    expect(harness.ctx.integrations.github.client).toBe(mockGitHubClient);
    expect(harness.logger.entries).toEqual([]);
  });
});
\`\`\``);
  lines.push('');

  return lines.join('\n');
}

function generateCodegen(): string {
  const lines: string[] = [];

  lines.push('## Codegen');
  lines.push('');
  lines.push('Import from `@tryvienna/sdk/codegen`. Creates a standard `@graphql-codegen/client-preset` configuration for plugins.');
  lines.push('');
  lines.push('### createPluginCodegenConfig()');
  lines.push('');
  lines.push('```typescript');
  lines.push('function createPluginCodegenConfig(options?: PluginCodegenOptions): CodegenConfig');
  lines.push('```');
  lines.push('');

  lines.push('| Option | Type | Default | Description |');
  lines.push('|--------|------|---------|-------------|');
  lines.push("| `schemaPath` | `string` | `'../graphql/schema.graphql'` | Path to the shared schema |");
  lines.push("| `documentsGlob` | `string` | `'src/client/operations.ts'` | Glob for operation documents |");
  lines.push("| `outputDir` | `string` | `'./src/client/generated/'` | Output directory for types |");
  lines.push('');

  lines.push(`\`\`\`typescript
// In your plugin's codegen.ts:
import { createPluginCodegenConfig } from '@tryvienna/sdk/codegen';

export default createPluginCodegenConfig();
// Or with custom paths:
export default createPluginCodegenConfig({
  schemaPath: '../../packages/graphql/schema.graphql',
  documentsGlob: 'src/**/*.graphql',
});
\`\`\``);
  lines.push('');

  return lines.join('\n');
}

function generateSchemas(): string {
  const lines: string[] = [];

  lines.push('## Zod Schemas');
  lines.push('');
  lines.push('All TypeScript types in the SDK derive from Zod schemas via `z.infer<>`. These are the validation source of truth — use them for runtime validation at system boundaries.');
  lines.push('');

  const schemas = [
    { name: 'EntityTypeSchema', desc: 'Entity type ID: lowercase alphanumeric + underscore, 1-64 chars, starts with letter.' },
    { name: 'PathSegmentSchema', desc: 'URI path segment: non-empty, max 256 chars, no control characters.' },
    { name: 'EntityURIPathSchema', desc: 'URI path config: `{ segments: readonly string[] }` with at least one segment.' },
    { name: 'BaseEntitySchema', desc: 'Minimal entity: `{ id, type, uri, title, description?, createdAt?, updatedAt?, metadata? }`.' },
    { name: 'EntitySourceSchema', desc: "Enum: `'builtin' | 'integration'`." },
    { name: 'EntityDisplayColorsSchema', desc: 'Color triplet: `{ bg, text, border }` as CSS color strings.' },
    { name: 'EntityDisplayMetadataSchema', desc: 'Full display config: `{ emoji, colors, description?, filterDescriptions?, outputFields? }`.' },
    { name: 'PaletteFilterSpecSchema', desc: 'Filter spec for the command palette: `{ key, label, aliases?, values[] }`.' },
    { name: 'EntityCacheConfigSchema', desc: 'Cache config: `{ ttl: number, maxSize?: number }`.' },
    { name: 'EntityTypeSummarySchema', desc: 'Discovery summary: `{ type, displayName, icon, source, uriExample, display? }`.' },
    { name: 'PluginIconSchema', desc: 'Union: `{ svg } | { png } | { path }`.' },
    { name: 'IntegrationSummarySchema', desc: 'Integration discovery: `{ id, name, icon, description?, hasOAuth, status, credentials? }`.' },
  ];

  lines.push('| Schema | Description |');
  lines.push('|--------|-------------|');
  for (const s of schemas) {
    lines.push(`| \`${s.name}\` | ${s.desc} |`);
  }
  lines.push('');

  lines.push(`\`\`\`typescript
import { EntityTypeSchema, BaseEntitySchema } from '@tryvienna/sdk';

// Validate at runtime
const result = EntityTypeSchema.safeParse('github_pr');
if (result.success) {
  // result.data is a validated EntityType
}

// Infer TypeScript types
type EntityType = z.infer<typeof EntityTypeSchema>;
type BaseEntity = z.infer<typeof BaseEntitySchema>;
\`\`\``);
  lines.push('');

  return lines.join('\n');
}

// ─── Run ────────────────────────────────────────────────────────────────────

const markdown = generate();
mkdirSync(resolve(DOCS_ROOT, 'reference'), { recursive: true });
writeFileSync(OUTPUT_PATH, markdown, 'utf-8');

const lineCount = markdown.split('\n').length;
// eslint-disable-next-line no-console
console.log(`Generated ${OUTPUT_PATH} (${lineCount} lines)`);
