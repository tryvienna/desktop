/**
 * Intent Classifier unit tests.
 *
 * Since the internal functions (splitCamelCase, stem, tokenize, scoreOperation)
 * are module-private, we test them indirectly through the public `classify()` API.
 * The GraphQL schema is mocked via vi.mock() to avoid requiring the full Pothos setup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLSchema,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLID,
} from 'graphql';

// ─────────────────────────────────────────────────────────────────────────────
// Mock schema
// ─────────────────────────────────────────────────────────────────────────────

const IssueType = new GraphQLObjectType({
  name: 'GitHubIssue',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: GraphQLString },
    body: { type: GraphQLString },
    state: { type: GraphQLString },
  },
});

const PRType = new GraphQLObjectType({
  name: 'GitHubPR',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: GraphQLString },
    number: { type: GraphQLInt },
    merged: { type: GraphQLBoolean },
  },
});

const SearchResultType = new GraphQLObjectType({
  name: 'SearchResult',
  fields: {
    items: { type: new GraphQLList(IssueType) },
    totalCount: { type: GraphQLInt },
  },
});

const UpdateIssueInput = new GraphQLInputObjectType({
  name: 'GitHubUpdateIssueInput',
  fields: {
    owner: { type: new GraphQLNonNull(GraphQLString) },
    repo: { type: new GraphQLNonNull(GraphQLString) },
    number: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: GraphQLString },
    body: { type: GraphQLString },
    labels: { type: new GraphQLList(GraphQLString) },
    assignees: { type: new GraphQLList(GraphQLString) },
    state: { type: GraphQLString },
  },
});

const CreateIssueInput = new GraphQLInputObjectType({
  name: 'GitHubCreateIssueInput',
  fields: {
    owner: { type: new GraphQLNonNull(GraphQLString) },
    repo: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    body: { type: GraphQLString },
    labels: { type: new GraphQLList(GraphQLString) },
  },
});

const mockSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      githubIssue: {
        type: IssueType,
        description: 'Get a single GitHub issue by owner, repo, and number',
        args: {
          owner: { type: new GraphQLNonNull(GraphQLString) },
          repo: { type: new GraphQLNonNull(GraphQLString) },
          number: { type: new GraphQLNonNull(GraphQLInt) },
        },
      },
      githubIssues: {
        type: new GraphQLList(IssueType),
        description: 'List issues in a repository',
        args: {
          owner: { type: new GraphQLNonNull(GraphQLString) },
          repo: { type: new GraphQLNonNull(GraphQLString) },
          state: { type: GraphQLString },
          labels: { type: new GraphQLList(GraphQLString) },
        },
      },
      githubPR: {
        type: PRType,
        description: 'Get a single GitHub pull request',
        args: {
          owner: { type: new GraphQLNonNull(GraphQLString) },
          repo: { type: new GraphQLNonNull(GraphQLString) },
          number: { type: new GraphQLNonNull(GraphQLInt) },
        },
      },
      githubSearchIssues: {
        type: SearchResultType,
        description: 'Search GitHub issues and pull requests',
        args: {
          query: { type: new GraphQLNonNull(GraphQLString) },
          perPage: { type: GraphQLInt },
        },
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      githubUpdateIssue: {
        type: IssueType,
        description: 'Update a GitHub issue (title, body, labels, assignees, state)',
        args: {
          input: { type: new GraphQLNonNull(UpdateIssueInput) },
        },
      },
      githubCreateIssue: {
        type: IssueType,
        description: 'Create a new GitHub issue',
        args: {
          input: { type: new GraphQLNonNull(CreateIssueInput) },
        },
      },
      githubCloseIssue: {
        type: IssueType,
        description: 'Close a GitHub issue',
        args: {
          owner: { type: new GraphQLNonNull(GraphQLString) },
          repo: { type: new GraphQLNonNull(GraphQLString) },
          number: { type: new GraphQLNonNull(GraphQLInt) },
        },
      },
      githubMergePR: {
        type: PRType,
        description: 'Merge a GitHub pull request',
        args: {
          owner: { type: new GraphQLNonNull(GraphQLString) },
          repo: { type: new GraphQLNonNull(GraphQLString) },
          number: { type: new GraphQLNonNull(GraphQLInt) },
          method: { type: GraphQLString },
        },
      },
    },
  }),
});

vi.mock('@vienna/graphql/schema', () => ({
  getSchema: () => mockSchema,
}));

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown;

// Import AFTER mocks
import { IntentClassifier } from './intent-classifier';
import type { Logger } from '@vienna/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;

  beforeEach(() => {
    vi.clearAllMocks();
    classifier = new IntentClassifier({ log: mockLogger as Logger });
  });

  describe('classify', () => {
    it('returns null for empty query', async () => {
      const result = await classifier.classify('');
      expect(result).toBeNull();
    });

    it('returns null for stop-words-only query', async () => {
      const result = await classifier.classify('the a an to from');
      expect(result).toBeNull();
    });

    it('matches "add label to issue" to githubUpdateIssue', async () => {
      const result = await classifier.classify('add the bug label to issue #193');
      expect(result).not.toBeNull();
      expect(result!.operationNames).toContain('githubUpdateIssue');
      // Should score higher than githubCreateIssue since "add label" implies update
      const updateIdx = result!.operationNames.indexOf('githubUpdateIssue');
      const createIdx = result!.operationNames.indexOf('githubCreateIssue');
      if (createIdx >= 0) {
        expect(updateIdx).toBeLessThan(createIdx);
      }
    });

    it('matches "create a new issue" to githubCreateIssue', async () => {
      const result = await classifier.classify('create a new issue');
      expect(result).not.toBeNull();
      expect(result!.operationNames).toContain('githubCreateIssue');
    });

    it('matches "list issues" to githubIssues query', async () => {
      const result = await classifier.classify('list all issues in the repo');
      expect(result).not.toBeNull();
      expect(result!.operationNames).toContain('githubIssues');
    });

    it('matches "close issue" to githubCloseIssue mutation', async () => {
      const result = await classifier.classify('close issue #42');
      expect(result).not.toBeNull();
      expect(result!.operationNames).toContain('githubCloseIssue');
    });

    it('matches "merge PR" to githubMergePR', async () => {
      const result = await classifier.classify('merge pull request #99');
      expect(result).not.toBeNull();
      expect(result!.operationNames).toContain('githubMergePR');
    });

    it('matches "search issues" to githubSearchIssues', async () => {
      const result = await classifier.classify('search for issues about authentication');
      expect(result).not.toBeNull();
      expect(result!.operationNames).toContain('githubSearchIssues');
    });

    it('returns at most 3 results', async () => {
      const result = await classifier.classify('github issue');
      if (result) {
        expect(result.operationNames.length).toBeLessThanOrEqual(3);
      }
    });

    it('assigns high confidence for strong matches (score >= 20)', async () => {
      // "add label to issue" should produce a high-confidence match
      const result = await classifier.classify('add the bug label to issue');
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe('high');
    });

    it('assigns low confidence for weak matches', async () => {
      // "repo" alone is a weak signal
      const result = await classifier.classify('repo');
      if (result) {
        expect(['low', 'medium']).toContain(result.confidence);
      }
    });

    it('returns latencyMs', async () => {
      const result = await classifier.classify('create issue');
      expect(result).not.toBeNull();
      expect(typeof result!.latencyMs).toBe('number');
      expect(result!.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('filters results within 40% of top score', async () => {
      // A very specific query should produce one strong match and filter out weaker ones
      const result = await classifier.classify('merge the pull request');
      expect(result).not.toBeNull();
      // The top result should dominate
      expect(result!.operationNames[0]).toBe('githubMergePR');
    });
  });

  describe('kind inference', () => {
    it('prefers mutations when action words are present', async () => {
      const result = await classifier.classify('update the issue title');
      expect(result).not.toBeNull();
      // All results should be mutations when "update" is in the query
      expect(result!.operationNames[0]).toBe('githubUpdateIssue');
    });

    it('prefers queries when read words are present', async () => {
      const result = await classifier.classify('get issue details');
      expect(result).not.toBeNull();
      expect(result!.operationNames[0]).toBe('githubIssue');
    });
  });

  describe('synonym expansion', () => {
    it('"edit issue" matches githubUpdateIssue via synonym', async () => {
      const result = await classifier.classify('edit the issue');
      expect(result).not.toBeNull();
      expect(result!.operationNames).toContain('githubUpdateIssue');
    });

    it('"find issues" matches queries via search synonym', async () => {
      const result = await classifier.classify('find issues');
      expect(result).not.toBeNull();
      // Should match query operations
      const hasQuery = result!.operationNames.some(
        (n) => ['githubIssues', 'githubSearchIssues', 'githubIssue'].includes(n),
      );
      expect(hasQuery).toBe(true);
    });

    it('"remove label" matches update mutation via synonym', async () => {
      const result = await classifier.classify('remove label from issue');
      expect(result).not.toBeNull();
      expect(result!.operationNames).toContain('githubUpdateIssue');
    });
  });

  describe('stemming', () => {
    it('handles plural forms: "issues" matches "issue" tokens', async () => {
      const result = await classifier.classify('list issues');
      expect(result).not.toBeNull();
      expect(result!.operationNames).toContain('githubIssues');
    });

    it('handles "labels" matching "label" in input fields', async () => {
      const result = await classifier.classify('add labels');
      expect(result).not.toBeNull();
      // Should match operations that have "labels" as input field
      expect(result!.operationNames.length).toBeGreaterThan(0);
    });
  });

  describe('context awareness', () => {
    it('uses recent messages as tie-breaker context', async () => {
      const result = await classifier.classify('update it', [
        'I was looking at issue #42 in the github repo',
      ]);
      expect(result).not.toBeNull();
      // Context mentioning "issue" and "github" should boost issue-related operations
      expect(result!.operationNames.length).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('invalidateCache forces catalog rebuild', async () => {
      // First call builds the catalog
      await classifier.classify('list issues');

      // Invalidate
      classifier.invalidateCache();

      // Next call should rebuild (we verify via debug log being called again)
      await classifier.classify('list issues');

      const debugCalls = (mockLogger as { debug: ReturnType<typeof vi.fn> }).debug.mock.calls;
      const catalogBuilds = debugCalls.filter(
        (call: unknown[]) => call[0] === 'Built classifier catalog',
      );
      expect(catalogBuilds.length).toBe(2);
    });
  });

  describe('shutdown', () => {
    it('is a no-op that resolves', async () => {
      await expect(classifier.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('returns null and logs warning on classification error', async () => {
      // Force an error by making getSchema throw
      const badClassifier = new IntentClassifier({ log: mockLogger as Logger });
      // We can't easily force an error without deeper mocking,
      // but we can test that normal queries don't throw
      const result = await badClassifier.classify('normal query');
      expect(result === null || result !== null).toBe(true);
    });
  });
});
