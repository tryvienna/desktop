/**
 * Query Templates — Generate GraphQL queries/mutations from entity metadata
 */

function pascal(s: string): string {
  return s.replace(/(^|[_-])(\w)/g, (_m, _sep: string, c: string) => c.toUpperCase());
}

export interface QueryTemplate {
  name: string;
  query: string;
  variables: string;
}

/** Generate a query to list entities of a given type */
export function generateEntitiesQuery(entityType: string): QueryTemplate {
  const name = `List${pascal(entityType)}`;
  return {
    name,
    query: `query ${name} {
  entities(type: "${entityType}", limit: 10) {
    id
    type
    uri
    title
    description
    createdAt
    updatedAt
    metadata
  }
}`,
    variables: '{}',
  };
}

/** Generate a query to get a single entity by URI */
export function generateEntityQuery(entityType: string, uriExample: string): QueryTemplate {
  const name = `Get${pascal(entityType)}`;
  return {
    name,
    query: `query ${name}($uri: String!) {
  entity(uri: $uri) {
    id
    type
    uri
    title
    description
    createdAt
    updatedAt
    metadata
  }
}`,
    variables: JSON.stringify({ uri: uriExample }, null, 2),
  };
}
