/**
 * @vienna/agent-db — SQLite persistence layer for agent sessions and events.
 *
 * @module agent-db
 */

export { openDatabase, closeDatabase } from './database';
export type { AgentDatabaseOptions } from './database';

export { SessionRepository } from './sessions';
export { EventRepository } from './events';
export type { UserMessageHistoryItem } from './events';
export { PermissionRuleRepository } from './permissions';
export { DirectoryRepository } from './directories';
