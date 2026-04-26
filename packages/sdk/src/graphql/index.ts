/**
 * @tryvienna/sdk/graphql
 *
 * Pre-defined GraphQL operations for common Vienna platform features.
 * Use with usePluginQuery / usePluginMutation from @tryvienna/sdk/react.
 *
 * For convenience hooks that wrap these operations, see @tryvienna/sdk/react
 * (e.g., useWorkstream).
 */

export {
  GET_PROJECTS,
  type GetProjectsResult,
  CREATE_WORKSTREAM,
  type CreateWorkstreamVariables,
  type CreateWorkstreamResult,
  SEND_WORKSTREAM_MESSAGE,
  type SendWorkstreamMessageVariables,
  type SendWorkstreamMessageResult,
  SET_WORKSTREAM_IN_FOCUS,
  type SetWorkstreamInFocusVariables,
  type SetWorkstreamInFocusResult,
} from './operations';
