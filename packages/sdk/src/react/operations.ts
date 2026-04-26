/**
 * GraphQL document nodes for entity operations.
 *
 * These must stay in sync with the field selections in
 * @vienna/graphql/client/operations.ts (GET_ENTITY, GET_ENTITIES).
 * If the Entity type gains new fields, update both files.
 */
import gql from 'graphql-tag';

const ENTITY_FIELDS = `
  id
  type
  uri
  title
  description
  createdAt
  updatedAt
`;

export const GET_ENTITY = gql`
  query GetEntity($uri: String!) {
    entity(uri: $uri) {
      ${ENTITY_FIELDS}
    }
  }
`;

export const GET_ENTITIES = gql`
  query GetEntities($type: String!, $query: String, $filters: JSON, $limit: Int) {
    entities(type: $type, query: $query, filters: $filters, limit: $limit) {
      ${ENTITY_FIELDS}
    }
  }
`;
