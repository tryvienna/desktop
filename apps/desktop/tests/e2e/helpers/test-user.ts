/**
 * Test user identity generation.
 *
 * Each test run needs unique emails because all tests share the same
 * web app database (Docker). Uses timestamp + counter + random suffix
 * to guarantee uniqueness even under parallel execution.
 */

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

let counter = 0;

/** Generate a unique test user. Each call produces a distinct email. */
export function generateTestUser(overrides?: Partial<TestUser>): TestUser {
  const id = `${Date.now()}-${counter++}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    name: overrides?.name ?? 'E2E Test User',
    email: overrides?.email ?? `e2e-${id}@test.local`,
    password: overrides?.password ?? 'Test-password-123',
  };
}
