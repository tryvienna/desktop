import type { TemplateContext } from '../types.ts';

export function renderIntegration(ctx: TemplateContext): string {
  const { naming, auth } = ctx;
  const id = naming.pluginId;
  const name = naming.displayName;
  const pascal = naming.pascalName;
  const camel = naming.camelName;

  switch (auth) {
    case 'oauth':
      return renderOAuthIntegration(id, name, pascal, camel);
    case 'pat':
      return renderPATIntegration(id, name, pascal, camel);
    case 'api-key':
      return renderApiKeyIntegration(id, name, pascal, camel);
    case 'none':
      return renderNoAuthIntegration(id, name, pascal, camel);
  }
}

function renderOAuthIntegration(id: string, name: string, pascal: string, camel: string): string {
  return `/**
 * ${name} Integration — OAuth PKCE + PAT fallback.
 *
 * Supports OAuth authorization_code flow with PKCE and falls back to
 * a personal access token stored in secure storage.
 */

import { defineIntegration } from '@tryvienna/sdk';
import type { IntegrationDefinition } from '@tryvienna/sdk';
import { register${pascal}Schema } from './schema';

// TODO: Import your API client type
// import type { YourClient } from 'your-api-client';
type ${pascal}Client = Record<string, unknown>;

const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';

export const ${camel}Integration: IntegrationDefinition<${pascal}Client> = defineIntegration<${pascal}Client>({
  id: '${id}',
  name: '${name}',
  description: '${name} API integration',
  icon: { svg: ICON_SVG },

  oauth: {
    providers: [{
      providerId: '${id}',
      displayName: '${name}',
      icon: '${id}',
      required: false,
      flow: {
        grantType: 'authorization_code',
        clientId: '',
        clientIdKey: '${id}_oauth_client_id',
        clientSecretKey: '${id}_oauth_client_secret',
        // TODO: Set your OAuth provider URLs
        authorizationUrl: 'https://example.com/oauth/authorize',
        tokenUrl: 'https://example.com/oauth/token',
        scopes: ['read'],
        pkce: { enabled: true },
        redirectPort: 19284,
      },
    }],
  },

  credentials: ['personal_access_token', '${id}_oauth_client_id', '${id}_oauth_client_secret'],

  createClient: async (ctx) => {
    // Try OAuth first
    if (ctx.oauth) {
      const token = await ctx.oauth.getAccessToken('${id}');
      if (token) {
        // TODO: Create your API client with the OAuth token
        return { token };
      }
    }

    // Fallback to PAT
    const pat = await ctx.storage.get('personal_access_token');
    if (pat) {
      // TODO: Create your API client with the PAT
      return { token: pat };
    }

    ctx.logger.warn('No ${name} token configured');
    return null;
  },

  schema: register${pascal}Schema,
});
`;
}

function renderPATIntegration(id: string, name: string, pascal: string, camel: string): string {
  return `/**
 * ${name} Integration — Personal Access Token authentication.
 */

import { defineIntegration } from '@tryvienna/sdk';
import type { IntegrationDefinition } from '@tryvienna/sdk';
import { register${pascal}Schema } from './schema';

// TODO: Import your API client type
type ${pascal}Client = Record<string, unknown>;

const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';

export const ${camel}Integration: IntegrationDefinition<${pascal}Client> = defineIntegration<${pascal}Client>({
  id: '${id}',
  name: '${name}',
  description: '${name} API integration',
  icon: { svg: ICON_SVG },

  credentials: ['personal_access_token'],

  createClient: async (ctx) => {
    const pat = await ctx.storage.get('personal_access_token');
    if (!pat) {
      ctx.logger.warn('No ${name} token configured');
      return null;
    }

    // TODO: Create your API client with the token
    return { token: pat };
  },

  schema: register${pascal}Schema,
});
`;
}

function renderApiKeyIntegration(id: string, name: string, pascal: string, camel: string): string {
  return `/**
 * ${name} Integration — API key authentication.
 */

import { defineIntegration } from '@tryvienna/sdk';
import type { IntegrationDefinition } from '@tryvienna/sdk';
import { register${pascal}Schema } from './schema';

// TODO: Import your API client type
type ${pascal}Client = Record<string, unknown>;

const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';

export const ${camel}Integration: IntegrationDefinition<${pascal}Client> = defineIntegration<${pascal}Client>({
  id: '${id}',
  name: '${name}',
  description: '${name} API integration',
  icon: { svg: ICON_SVG },

  credentials: ['api_key'],

  createClient: async (ctx) => {
    const apiKey = await ctx.storage.get('api_key');
    if (!apiKey) {
      ctx.logger.warn('No ${name} API key configured');
      return null;
    }

    // TODO: Create your API client with the API key
    return { apiKey };
  },

  schema: register${pascal}Schema,
});
`;
}

function renderNoAuthIntegration(id: string, name: string, pascal: string, camel: string): string {
  return `/**
 * ${name} Integration — no authentication required.
 *
 * API calls are made in the main process via GraphQL resolvers.
 */

import { defineIntegration } from '@tryvienna/sdk';
import { register${pascal}Schema } from './schema';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ${pascal}Client {}

export const ${camel}Integration = defineIntegration<${pascal}Client>({
  id: '${id}',
  name: '${name}',
  description: '${name} integration',
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>' },

  // No auth required — always return a client
  createClient: async () => ({}),

  schema: register${pascal}Schema,
});
`;
}
