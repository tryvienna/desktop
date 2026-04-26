/**
 * Shared Modules — Platform modules available to customized plugins in the renderer.
 *
 * When a customized plugin's renderer bundle is evaluated, it uses `require()` calls
 * for externalized dependencies. This map provides those modules from the host app
 * so plugins share the same React instance, sdk, etc.
 *
 * Module IDs are defined in platform-externals.ts (single source of truth).
 * This file provides the actual runtime values for the renderer process.
 */

import type { PlatformModuleId } from './platform-externals';
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as ReactDom from 'react-dom';
import * as ViennaSdk from '@tryvienna/sdk';
import * as ViennaSdkReact from '@tryvienna/sdk/react';
import * as ViennaSdkGraphql from '@tryvienna/sdk/graphql';
import * as Zod from 'zod';
import * as GraphQL from 'graphql';
import * as GraphQLTag from 'graphql-tag';
import * as ApolloClient from '@apollo/client';
import * as ViennaGraphql from '@vienna/graphql';
import * as ViennaUi from '@tryvienna/ui';
import * as ViennaUiFeed from '@tryvienna/ui/feed';
import * as LucideReact from 'lucide-react';

export const SHARED_MODULES: Record<PlatformModuleId | string, unknown> = {
  'react': React,
  'react/jsx-runtime': ReactJsxRuntime,
  'react-dom': ReactDom,
  '@tryvienna/sdk': ViennaSdk,
  '@tryvienna/sdk/react': ViennaSdkReact,
  '@tryvienna/sdk/graphql': ViennaSdkGraphql,
  'zod': Zod,
  'graphql': GraphQL,
  'graphql-tag': GraphQLTag,
  '@apollo/client': ApolloClient,
  '@vienna/graphql': ViennaGraphql,
  '@tryvienna/ui': ViennaUi,
  '@tryvienna/ui/feed': ViennaUiFeed,
  'lucide-react': LucideReact,
};
