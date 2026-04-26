/**
 * IPC contract barrel — re-exports the merged API definition.
 *
 * This file is safe to import from ANY process (main, preload, renderer, tests).
 * It only contains Zod schema definitions — no main-process dependencies.
 *
 * Note: Workstream and routine operations are now served via GraphQL.
 * Only agent commands/events and the graphql transport remain as IPC.
 */

import { mergeAllApis, mergeAllEvents } from '@vienna/ipc';
import { systemApi } from './system/contract';
import { shellApi } from './shell/contract';
import { loggerApi } from './logger/contract';
import { agentApi, agentEvents } from './agent/contract';
import { graphqlApi, graphqlEvents } from './graphql/contract';
import { workstreamEvents } from './workstream/contract';
import { authApi, authEvents } from './auth/contract';
import { keybindingsApi, keybindingsEvents } from './keybindings/contract';
import { lspApi, lspEvents } from './lsp/contract';
import { fileApi, fileEvents } from './file/contract';
import { filesApi, filesEvents } from './files/contract';
import { feedbackApi } from './feedback/contract';
import { pluginApi, pluginEvents } from './plugin/contract';
import { pluginEventsApi, pluginEventsEvents } from './plugin-events/contract';
import { inboxActionApi, inboxActionEvents } from './inbox-action/contract';
import { oauthApi, oauthEvents } from './oauth/contract';
import { menuEvents } from './menu/contract';
import { claudeSettingsApi } from './claude-settings/contract';
import { feedApi } from './feed/contract';
import { whisperApi, whisperEvents } from './whisper/contract';
import { cliApi } from './cli/contract';
import { zoomApi } from './zoom/contract';
import { focusMonitorApi, focusMonitorEvents } from './focus-monitor/contract';

export const api = mergeAllApis(systemApi, shellApi, loggerApi, agentApi, graphqlApi, authApi, keybindingsApi, lspApi, fileApi, filesApi, feedbackApi, pluginApi, pluginEventsApi, inboxActionApi, oauthApi, claudeSettingsApi, feedApi, whisperApi, cliApi, zoomApi, focusMonitorApi);
export const events = mergeAllEvents(agentEvents, graphqlEvents, workstreamEvents, authEvents, keybindingsEvents, lspEvents, fileEvents, filesEvents, pluginEvents, pluginEventsEvents, inboxActionEvents, oauthEvents, menuEvents, whisperEvents, focusMonitorEvents);
