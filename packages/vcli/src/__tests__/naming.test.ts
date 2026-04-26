import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toSnakeCase,
  toPascalCase,
  toCamelCase,
  toTitleCase,
  buildNamingContext,
  buildEntityNaming,
} from '../naming.ts';

describe('toSnakeCase', () => {
  it('converts simple kebab to snake', () => {
    assert.equal(toSnakeCase('my-plugin'), 'my_plugin');
  });

  it('handles single word', () => {
    assert.equal(toSnakeCase('plugin'), 'plugin');
  });

  it('handles multiple hyphens', () => {
    assert.equal(toSnakeCase('my-cool-plugin'), 'my_cool_plugin');
  });
});

describe('toPascalCase', () => {
  it('converts simple kebab to PascalCase', () => {
    assert.equal(toPascalCase('my-plugin'), 'MyPlugin');
  });

  it('handles single word', () => {
    assert.equal(toPascalCase('plugin'), 'Plugin');
  });

  it('handles multiple parts', () => {
    assert.equal(toPascalCase('my-cool-plugin'), 'MyCoolPlugin');
  });
});

describe('toCamelCase', () => {
  it('converts simple kebab to camelCase', () => {
    assert.equal(toCamelCase('my-plugin'), 'myPlugin');
  });

  it('handles single word', () => {
    assert.equal(toCamelCase('plugin'), 'plugin');
  });

  it('handles multiple parts', () => {
    assert.equal(toCamelCase('my-cool-plugin'), 'myCoolPlugin');
  });
});

describe('toTitleCase', () => {
  it('converts simple kebab to Title Case', () => {
    assert.equal(toTitleCase('my-plugin'), 'My Plugin');
  });

  it('handles single word', () => {
    assert.equal(toTitleCase('plugin'), 'Plugin');
  });

  it('handles multiple parts', () => {
    assert.equal(toTitleCase('my-cool-plugin'), 'My Cool Plugin');
  });
});

describe('buildNamingContext', () => {
  it('builds complete naming context', () => {
    const ctx = buildNamingContext('my-plugin');
    assert.deepEqual(ctx, {
      pluginName: 'my-plugin',
      pluginId: 'my_plugin',
      displayName: 'My Plugin',
      pascalName: 'MyPlugin',
      camelName: 'myPlugin',
    });
  });

  it('works with single-word names', () => {
    const ctx = buildNamingContext('github');
    assert.deepEqual(ctx, {
      pluginName: 'github',
      pluginId: 'github',
      displayName: 'Github',
      pascalName: 'Github',
      camelName: 'github',
    });
  });
});

describe('buildEntityNaming', () => {
  it('builds complete entity naming', () => {
    const entity = buildEntityNaming('linear-issue');
    assert.deepEqual(entity, {
      entityName: 'linear-issue',
      entityType: 'linear_issue',
      entityDisplayName: 'Linear Issue',
      entityPascal: 'LinearIssue',
      entityCamel: 'linearIssue',
    });
  });

  it('works with single-word entity names', () => {
    const entity = buildEntityNaming('task');
    assert.deepEqual(entity, {
      entityName: 'task',
      entityType: 'task',
      entityDisplayName: 'Task',
      entityPascal: 'Task',
      entityCamel: 'task',
    });
  });
});
