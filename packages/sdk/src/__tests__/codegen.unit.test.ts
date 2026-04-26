import { describe, expect, it } from 'vitest';

import { createPluginCodegenConfig } from '../codegen';

describe('createPluginCodegenConfig', () => {
  it('returns correct defaults when called with no options', () => {
    const config = createPluginCodegenConfig();

    expect(config.schema).toBe('../graphql/schema.graphql');
    expect(config.documents).toEqual(['src/client/operations.ts']);

    const generated = config.generates['./src/client/generated/'];
    expect(generated).toBeDefined();
    expect(generated!.preset).toBe('client');
    expect(generated!.config.useTypeImports).toBe(true);
    expect(generated!.config.enumsAsTypes).toBe(true);
  });

  it('includes standard scalar overrides', () => {
    const config = createPluginCodegenConfig();
    const generated = config.generates['./src/client/generated/'];

    expect(generated!.config.scalars).toEqual({
      DateTime: 'string | number',
      JSON: 'Record<string, unknown>',
    });
  });

  it('allows overriding schemaPath', () => {
    const config = createPluginCodegenConfig({ schemaPath: './custom/schema.graphql' });
    expect(config.schema).toBe('./custom/schema.graphql');
  });

  it('allows overriding documentsGlob', () => {
    const config = createPluginCodegenConfig({ documentsGlob: 'src/**/*.graphql' });
    expect(config.documents).toEqual(['src/**/*.graphql']);
  });

  it('allows overriding outputDir', () => {
    const config = createPluginCodegenConfig({ outputDir: './src/generated/' });
    expect(config.generates['./src/generated/']).toBeDefined();
    expect(config.generates['./src/client/generated/']).toBeUndefined();
  });

  it('allows overriding all options at once', () => {
    const config = createPluginCodegenConfig({
      schemaPath: 'a.graphql',
      documentsGlob: 'b.ts',
      outputDir: 'c/',
    });

    expect(config.schema).toBe('a.graphql');
    expect(config.documents).toEqual(['b.ts']);
    expect(config.generates['c/']).toBeDefined();
  });

  it('passes undefined options without error', () => {
    const config = createPluginCodegenConfig(undefined);
    expect(config.schema).toBe('../graphql/schema.graphql');
  });
});
