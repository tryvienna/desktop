/**
 * Pre-defined GraphQL operations for common Vienna platform features.
 *
 * These are typed DocumentNodes that plugins can use directly with
 * usePluginQuery / usePluginMutation from @tryvienna/sdk/react.
 *
 * @example
 * ```tsx
 * import { usePluginMutation } from '@tryvienna/sdk/react';
 * import { SEND_WORKSTREAM_MESSAGE } from '@tryvienna/sdk/graphql';
 *
 * const [send] = usePluginMutation(SEND_WORKSTREAM_MESSAGE);
 * await send({ variables: { workstreamId: '123', text: 'Hello!' } });
 * ```
 */

import gql from 'graphql-tag';

// ── Project Operations ───────────────────────────────────────────────────────

/**
 * Fetch all projects for the current user.
 *
 * Returns list of projects with id, name, createdAt, updatedAt.
 */
export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

// ── Workstream Operations ────────────────────────────────────────────────────

/**
 * Create a new workstream in a project.
 *
 * Variables: `{ input: CreateWorkstreamInput! }`
 * Required input fields: `projectId`, `title`
 * Optional: `groupId`, `groupName`, `model`, `createWorktrees`, `branchName`, `baseBranch`
 *
 * Returns the created workstream with id, title, status.
 */
export const CREATE_WORKSTREAM = gql`
  mutation CreateWorkstream($input: CreateWorkstreamInput!) {
    createWorkstream(input: $input) {
      workstream {
        id
        title
        status
        model
        isPinned
        messageCount
        createdAt
      }
    }
  }
`;

/**
 * Send a text message to a workstream agent. Auto-starts the agent if needed.
 *
 * Variables: `{ workstreamId: ID!, text: String! }`
 *
 * Returns the updated workstream with id, status, messageCount, lastActivityAt, updatedAt.
 */
export const SEND_WORKSTREAM_MESSAGE = gql`
  mutation SendWorkstreamMessage($workstreamId: ID!, $text: String!) {
    sendWorkstreamMessage(workstreamId: $workstreamId, text: $text) {
      workstream {
        id
        status
        messageCount
        lastActivityAt
        updatedAt
      }
    }
  }
`;

/**
 * Set which workstream is focused / active in the UI.
 *
 * Variables: `{ id: ID }` (pass null to clear focus)
 *
 * The app's WorkstreamContext watches the `inFocus` field on the workstream
 * list query and automatically activates the focused workstream.
 */
export const SET_WORKSTREAM_IN_FOCUS = gql`
  mutation SetWorkstreamInFocus($id: ID) {
    setWorkstreamInFocus(id: $id) {
      workstream {
        id
        status
        updatedAt
        inFocus
      }
    }
  }
`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface GetProjectsResult {
  projects: Array<{
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface CreateWorkstreamVariables {
  input: {
    projectId: string;
    title: string;
    groupId?: string;
    groupName?: string;
    model?: string;
    createWorktrees?: boolean;
    branchName?: string;
    baseBranch?: string;
  };
}

export interface CreateWorkstreamResult {
  createWorkstream: {
    workstream: {
      id: string;
      title: string;
      status: string;
      model: string | null;
      isPinned: boolean;
      messageCount: number;
      createdAt: string;
    };
  };
}

export interface SendWorkstreamMessageVariables {
  workstreamId: string;
  text: string;
}

export interface SendWorkstreamMessageResult {
  sendWorkstreamMessage: {
    workstream: {
      id: string;
      status: string;
      messageCount: number;
      lastActivityAt: string;
      updatedAt: string;
    };
  };
}

export interface SetWorkstreamInFocusVariables {
  id: string | null;
}

export interface SetWorkstreamInFocusResult {
  setWorkstreamInFocus: {
    workstream: {
      id: string;
      status: string;
      updatedAt: string;
      inFocus: boolean;
    } | null;
  };
}
