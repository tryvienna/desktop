/**
 * Intent Classifier — Local multi-signal operation scorer
 *
 * Enhances the `graphql.operations` MCP tool by scoring search queries
 * against a pre-built catalog of GraphQL operations. Uses tokenization,
 * synonym expansion, kind inference, and input field matching to find
 * the best operations for natural language queries like "add the bug
 * label to issue #193".
 *
 * Runs entirely in-process — no API calls, no subprocesses.
 * Sub-millisecond per classification. Lazily caches the schema catalog.
 *
 * Only invoked when Claude calls `graphql_operations` — NOT on every
 * user message. Falls back to string matching if classification returns
 * no results.
 *
 * @module main/agent/intent-classifier
 */

import {
  isNonNullType,
  isListType,
  isInputObjectType,
  type GraphQLOutputType,
  type GraphQLInputType,
} from 'graphql';
import type { Logger } from '@vienna/logger';
import { getSchema } from '@vienna/graphql/schema';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IntentClassifierDeps {
  log: Logger;
}

export interface ClassificationResult {
  operationNames: string[];
  confidence: 'high' | 'medium' | 'low';
  latencyMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Synonym & Stop Word Tables
// ─────────────────────────────────────────────────────────────────────────────

/** Groups of semantically related action words.
 *  Words can appear in multiple groups — "add" means both "create" and "update"
 *  (e.g. "add an issue" = create, "add label to issue" = update). */
const SYNONYM_GROUPS: string[][] = [
  ['create', 'add', 'new', 'make', 'open', 'start', 'insert'],
  ['update', 'edit', 'change', 'modify', 'set', 'rename', 'move', 'patch', 'add', 'remove'],
  ['delete', 'remove', 'destroy', 'drop', 'close', 'archive', 'clear'],
  ['search', 'find', 'list', 'query', 'lookup', 'fetch', 'get', 'show', 'view', 'browse'],
  ['assign', 'attach', 'link', 'connect'],
  ['unassign', 'detach', 'unlink', 'disconnect'],
];

/** word → set of related words (including itself) */
const RELATED_WORDS = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  const groupSet = new Set(group);
  for (const word of group) {
    const existing = RELATED_WORDS.get(word);
    if (existing) {
      for (const w of groupSet) existing.add(w);
    } else {
      RELATED_WORDS.set(word, new Set(groupSet));
    }
  }
}

/** Words that imply a write/mutation operation */
const MUTATION_WORDS = new Set([
  'add', 'remove', 'update', 'create', 'delete', 'edit', 'change', 'modify',
  'assign', 'unassign', 'close', 'reopen', 'merge', 'move', 'rename', 'archive',
  'set', 'make', 'open', 'start', 'drop', 'destroy', 'clear', 'insert', 'patch',
  'attach', 'detach', 'link', 'unlink', 'connect', 'disconnect',
]);

/** Words that imply a read/query operation */
const QUERY_WORDS = new Set([
  'search', 'find', 'list', 'get', 'show', 'fetch', 'lookup', 'query',
  'check', 'view', 'read', 'browse',
]);

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'from', 'for', 'in', 'on', 'of', 'with', 'by',
  'and', 'or', 'is', 'it', 'my', 'me', 'all', 'do', 'this', 'that', 'these',
  'those', 'what', 'which', 'how', 'can', 'could', 'would', 'should', 'please',
  'i', 'want', 'need', 'like', 'try', 'just', 'also',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Weights
// ─────────────────────────────────────────────────────────────────────────────

const W_NAME_EXACT = 10;    // query word exactly matches a name token
const W_NAME_SYNONYM = 7;   // query word has a synonym in name tokens
const W_INPUT_FIELD = 6;    // query word matches an input field name
const W_KIND_MATCH = 5;     // inferred kind matches operation kind
const W_KIND_MISMATCH = -3; // inferred kind conflicts with operation kind
const W_DESC = 2;           // query word appears in description
const W_RETURN_TYPE = 2;    // query word matches return type tokens
const W_CONTEXT = 1;        // recent conversation keyword overlaps with name

const SCORE_THRESHOLD = 8;  // minimum score to include in results

// ─────────────────────────────────────────────────────────────────────────────
// Tokenization Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Split camelCase/PascalCase into lowercase tokens: "githubUpdateIssue" → ["github", "update", "issue"] */
function splitCamelCase(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/);
}

/** Simple plural stemmer: "issues" → "issue", "labels" → "label" */
function stem(word: string): string {
  if (word.length > 3 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 3 && word.endsWith('es') && !word.endsWith('ss')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
  return word;
}

/** Tokenize free text into stemmed, non-stop words */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s_\-,.;:!?#()[\]{}'"]+/)
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem);
}

/** Unwrap NonNull/List wrappers to get the base type name */
function unwrapTypeName(type: GraphQLOutputType): string {
  let unwrapped: GraphQLOutputType = type;
  while (isNonNullType(unwrapped) || isListType(unwrapped)) {
    unwrapped = unwrapped.ofType;
  }
  return unwrapped.toString().toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog Entry
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogEntry {
  name: string;
  kind: 'query' | 'mutation';
  nameTokens: string[];
  descTokens: string[];
  inputFieldTokens: string[];
  returnTypeTokens: string[];
}

function buildCatalog(): CatalogEntry[] {
  const schema = getSchema();
  const entries: CatalogEntry[] = [];

  const typePairs: Array<['query' | 'mutation', ReturnType<typeof schema.getQueryType>]> = [
    ['query', schema.getQueryType()],
    ['mutation', schema.getMutationType()],
  ];

  for (const [kind, type] of typePairs) {
    if (!type) continue;
    const fields = type.getFields();
    for (const [name, field] of Object.entries(fields)) {
      if (name.startsWith('__')) continue;

      // Collect input field names from all args (one level deep into InputObjectTypes)
      const inputFieldTokens: string[] = [];
      for (const arg of field.args) {
        inputFieldTokens.push(stem(arg.name.toLowerCase()));
        let unwrapped: GraphQLInputType = arg.type;
        while (isNonNullType(unwrapped) || isListType(unwrapped)) {
          unwrapped = unwrapped.ofType;
        }
        if (isInputObjectType(unwrapped)) {
          for (const f of Object.values(unwrapped.getFields())) {
            inputFieldTokens.push(stem(f.name.toLowerCase()));
          }
        }
      }

      entries.push({
        name,
        kind,
        nameTokens: splitCamelCase(name).map(stem),
        descTokens: tokenize(field.description ?? ''),
        inputFieldTokens,
        returnTypeTokens: splitCamelCase(unwrapTypeName(field.type)).map(stem),
      });
    }
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scorer
// ─────────────────────────────────────────────────────────────────────────────

function scoreOperation(
  queryTokens: string[],
  impliedKind: 'mutation' | 'query' | null,
  contextTokens: Set<string>,
  entry: CatalogEntry,
): number {
  let score = 0;

  for (const qt of queryTokens) {
    // 1. Exact name token match
    if (entry.nameTokens.includes(qt)) {
      score += W_NAME_EXACT;
      continue; // Don't double-count synonym for the same word
    }

    // 2. Synonym match against name tokens
    const related = RELATED_WORDS.get(qt);
    if (related && entry.nameTokens.some((nt) => related.has(nt))) {
      score += W_NAME_SYNONYM;
      continue;
    }

    // 3. Input field match
    if (entry.inputFieldTokens.includes(qt)) {
      score += W_INPUT_FIELD;
      continue;
    }

    // 4. Return type match
    if (entry.returnTypeTokens.includes(qt)) {
      score += W_RETURN_TYPE;
      continue;
    }

    // 5. Description match (weakest signal)
    if (entry.descTokens.includes(qt)) {
      score += W_DESC;
    }
  }

  // 6. Kind match/mismatch bonus
  if (impliedKind) {
    score += entry.kind === impliedKind ? W_KIND_MATCH : W_KIND_MISMATCH;
  }

  // 7. Context keyword overlap (very low weight, tie-breaker)
  if (contextTokens.size > 0) {
    for (const ct of contextTokens) {
      if (entry.nameTokens.includes(ct)) {
        score += W_CONTEXT;
      }
    }
  }

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Classifier
// ─────────────────────────────────────────────────────────────────────────────

export class IntentClassifier {
  private catalog: CatalogEntry[] | null = null;
  private log: Logger;

  constructor(deps: IntentClassifierDeps) {
    this.log = deps.log.child({ service: 'IntentClassifier' });
  }

  /** Invalidate the catalog cache (e.g. after schema changes / plugin load) */
  invalidateCache(): void {
    this.catalog = null;
  }

  /** No-op — local classifier has no external resources */
  async shutdown(): Promise<void> {
    // Nothing to clean up
  }

  /**
   * Classify a search query and return the best matching operation names.
   * Runs entirely in-process using multi-signal scoring.
   *
   * @param query - The search query from the MCP tool call
   * @param recentMessages - Recent conversation messages for context
   * @returns Classification result or null if no operations score above threshold
   */
  async classify(query: string, recentMessages: string[] = []): Promise<ClassificationResult | null> {
    const start = Date.now();

    try {
      if (!this.catalog) {
        this.catalog = buildCatalog();
        this.log.debug('Built classifier catalog', { entryCount: this.catalog.length });
      }

      const queryTokens = tokenize(query);
      if (queryTokens.length === 0) return null;

      // Infer intended operation kind from action words
      const impliedKind = queryTokens.some((t) => MUTATION_WORDS.has(t))
        ? 'mutation' as const
        : queryTokens.some((t) => QUERY_WORDS.has(t))
          ? 'query' as const
          : null;

      // Extract context keywords from recent messages (lightweight tie-breaker)
      const contextTokens = new Set<string>();
      for (const msg of recentMessages.slice(-4)) {
        for (const token of tokenize(msg.slice(0, 300))) {
          if (!STOP_WORDS.has(token)) contextTokens.add(token);
        }
      }
      // Cap context tokens to avoid noise
      const cappedContext = new Set([...contextTokens].slice(0, 30));

      // Score all operations
      const scored = this.catalog
        .map((entry) => ({
          name: entry.name,
          score: scoreOperation(queryTokens, impliedKind, cappedContext, entry),
        }))
        .filter((s) => s.score >= SCORE_THRESHOLD)
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0) {
        this.log.debug('No operations above threshold', { query, queryTokens });
        return null;
      }

      // Take top 3, but only if they're within 40% of the top score
      const topScore = scored[0]!.score;
      const cutoff = topScore * 0.6;
      const topResults = scored.filter((s) => s.score >= cutoff).slice(0, 3);

      const confidence: 'high' | 'medium' | 'low' =
        topScore >= 20 ? 'high' :
        topScore >= 12 ? 'medium' :
        'low';

      const latencyMs = Date.now() - start;
      this.log.info('Classification result', {
        query,
        queryTokens,
        impliedKind,
        operationNames: topResults.map((r) => r.name),
        scores: topResults.map((r) => r.score),
        confidence,
        latencyMs,
      });

      return {
        operationNames: topResults.map((r) => r.name),
        confidence,
        latencyMs,
      };
    } catch (error) {
      this.log.warn('Intent classification failed', {
        query,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - start,
      });
      return null;
    }
  }
}
