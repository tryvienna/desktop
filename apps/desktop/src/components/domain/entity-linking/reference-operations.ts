/**
 * Shared GraphQL operations and helpers for workstream references.
 *
 * Used by both WorkstreamReferences and ReferenceDetailDrawer.
 */

import { gql } from '@apollo/client';

export const GET_WORKSTREAM_REFERENCES = gql`
  query GetWorkstreamReferences($workstreamId: ID!) {
    workstreamReferences(workstreamId: $workstreamId) {
      workstreamId
      entityUri
      entityType
      entityTitle
      externalUrl
      firstReferencedAt
    }
  }
`;

export const REMOVE_WORKSTREAM_REFERENCE = gql`
  mutation RemoveWorkstreamReference($workstreamId: ID!, $entityUri: String!) {
    removeWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri) {
      workstream { id updatedAt }
    }
  }
`;

export const PROMOTE_WORKSTREAM_REFERENCE = gql`
  mutation PromoteWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {
    promoteWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {
      workstream { id updatedAt }
    }
  }
`;

/** Extract the human-readable ID portion from a Vienna entity URI. */
export function getIdFromUri(uri: string): string {
  const parts = uri.replace(/^@vienna\/\//, '').split('/');
  return parts.slice(1).join('/') || parts[0] || uri;
}

/** Format a date string as a relative time (e.g. "5m ago", "2d ago"). */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Format a date string as an absolute time (e.g. "Apr 7, 2026, 3:45 PM"). */
export function formatAbsoluteTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
