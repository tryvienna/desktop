import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePluginName,
  validateEntityName,
  parseCanvases,
  parseAuth,
  parseEntities,
  expandCanvases,
} from '../validation.ts';

describe('validatePluginName', () => {
  it('accepts valid kebab-case names', () => {
    assert.equal(validatePluginName('my-plugin'), null);
    assert.equal(validatePluginName('github'), null);
    assert.equal(validatePluginName('my-cool-plugin'), null);
    assert.equal(validatePluginName('plugin123'), null);
  });

  it('rejects empty name', () => {
    assert.notEqual(validatePluginName(''), null);
  });

  it('rejects uppercase', () => {
    assert.notEqual(validatePluginName('MyPlugin'), null);
  });

  it('rejects names starting with number', () => {
    assert.notEqual(validatePluginName('123plugin'), null);
  });

  it('rejects names with underscores', () => {
    assert.notEqual(validatePluginName('my_plugin'), null);
  });

  it('rejects names with spaces', () => {
    assert.notEqual(validatePluginName('my plugin'), null);
  });
});

describe('validateEntityName', () => {
  it('accepts valid kebab-case names', () => {
    assert.equal(validateEntityName('task'), null);
    assert.equal(validateEntityName('linear-issue'), null);
  });

  it('rejects uppercase', () => {
    assert.notEqual(validateEntityName('Task'), null);
  });

  it('rejects names starting with number', () => {
    assert.notEqual(validateEntityName('1task'), null);
  });
});

describe('parseCanvases', () => {
  it('parses single canvas', () => {
    assert.deepEqual(parseCanvases('sidebar'), ['sidebar']);
  });

  it('parses multiple canvases', () => {
    assert.deepEqual(parseCanvases('sidebar,drawer'), ['sidebar', 'drawer']);
  });

  it('parses all three canvases', () => {
    assert.deepEqual(parseCanvases('sidebar,drawer,menu-bar'), ['sidebar', 'drawer', 'menu-bar']);
  });

  it('trims whitespace', () => {
    assert.deepEqual(parseCanvases('sidebar, drawer'), ['sidebar', 'drawer']);
  });

  it('throws on invalid canvas', () => {
    assert.throws(() => parseCanvases('invalid'), /Invalid canvas/);
  });

  it('throws on partially invalid input', () => {
    assert.throws(() => parseCanvases('sidebar,invalid'), /Invalid canvas/);
  });
});

describe('parseAuth', () => {
  it('accepts all valid auth types', () => {
    assert.equal(parseAuth('oauth'), 'oauth');
    assert.equal(parseAuth('pat'), 'pat');
    assert.equal(parseAuth('api-key'), 'api-key');
    assert.equal(parseAuth('none'), 'none');
  });

  it('throws on invalid auth', () => {
    assert.throws(() => parseAuth('invalid'), /Invalid auth/);
  });
});

describe('parseEntities', () => {
  it('returns empty array for empty string', () => {
    assert.deepEqual(parseEntities(''), []);
  });

  it('parses single entity', () => {
    assert.deepEqual(parseEntities('task'), ['task']);
  });

  it('parses multiple entities', () => {
    assert.deepEqual(parseEntities('task,comment'), ['task', 'comment']);
  });

  it('trims whitespace', () => {
    assert.deepEqual(parseEntities('task, comment'), ['task', 'comment']);
  });

  it('throws on invalid entity name', () => {
    assert.throws(() => parseEntities('Invalid'), /Invalid entity name/);
  });
});

describe('expandCanvases', () => {
  it('adds drawer when sidebar is present', () => {
    const result = expandCanvases(['sidebar']);
    assert.equal(result.has('sidebar'), true);
    assert.equal(result.has('drawer'), true);
  });

  it('adds drawer when menu-bar is present', () => {
    const result = expandCanvases(['menu-bar']);
    assert.equal(result.has('menu-bar'), true);
    assert.equal(result.has('drawer'), true);
  });

  it('keeps drawer when already present', () => {
    const result = expandCanvases(['sidebar', 'drawer']);
    assert.equal(result.has('sidebar'), true);
    assert.equal(result.has('drawer'), true);
    assert.equal(result.size, 2);
  });

  it('does not add drawer when only drawer specified', () => {
    const result = expandCanvases(['drawer']);
    assert.equal(result.has('drawer'), true);
    assert.equal(result.size, 1);
  });

  it('expands sidebar + menu-bar to include drawer', () => {
    const result = expandCanvases(['sidebar', 'menu-bar']);
    assert.equal(result.has('sidebar'), true);
    assert.equal(result.has('menu-bar'), true);
    assert.equal(result.has('drawer'), true);
    assert.equal(result.size, 3);
  });
});
