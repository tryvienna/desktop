/**
 * Palette Types — Type definitions for Command and Entity Palette systems
 *
 * @ai-context
 * - Core types: PaletteTab, PaletteSection, KeyboardShortcut
 * - Filter system: PaletteFilterDefinition, ActivePaletteFilter, ParsedPaletteQuery
 * - Entity palette: Entity, EntityType, EntityReference (vienna:// URI), EntityPaletteDataProvider
 * - Command palette: Command, CommandCategory, CommandPaletteDataProvider
 * - Flow system: FlowDefinition, FlowScreen, FlowScreenProps
 * - Component props: EntityPaletteProps, CommandPaletteProps, PaletteHandle
 */

import type { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic palette tab configuration.
 * Used for filtering results by category/type.
 */
export interface PaletteTab {
  /** Unique tab identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional short label for compact display */
  shortLabel?: string;
}

/**
 * Generic palette section for grouped results.
 * Supports streaming/progressive loading per section.
 */
export interface PaletteSection<T> {
  /** Unique section identifier */
  id: string;
  /** Display label */
  label: string;
  /** Items in this section */
  items: T[];
  /** Whether this section is still loading */
  isLoading?: boolean;
}

/**
 * Keyboard shortcut definition.
 */
export interface KeyboardShortcut {
  /** Modifier keys */
  modifiers: Array<'cmd' | 'ctrl' | 'alt' | 'shift'>;
  /** Main key */
  key: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PALETTE FILTER SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A selectable value within a filter category.
 */
export interface PaletteFilterValue {
  /** Canonical identifier used in keyword syntax (e.g., "in-progress") */
  id: string;
  /** Human-readable label (e.g., "In Progress") */
  label: string;
  /**
   * Alternative keywords accepted in the key:value syntax.
   * E.g., ["wip", "active"] lets the user type "status:wip".
   */
  aliases?: string[];
  /** Optional icon shown in the dropdown */
  icon?: ReactNode;
  /**
   * Semantic color token name (without the `text-` prefix).
   * Maps to design tokens: "success", "warning", "error", "brand", "muted", "info", "ai".
   */
  colorToken?: string;
  /** Optional description shown in dropdown */
  description?: string;
}

/**
 * A filter category for an entity type.
 * Appears as a button in the filter bar; clicking opens a value picker dropdown.
 *
 * @example
 * ```typescript
 * const statusFilter: PaletteFilterDefinition = {
 *   key: 'status',
 *   label: 'Status',
 *   aliases: ['s'],
 *   values: [
 *     { id: 'todo',        label: 'Todo',        colorToken: 'muted' },
 *     { id: 'in-progress', label: 'In Progress', colorToken: 'brand', aliases: ['wip'] },
 *     { id: 'done',        label: 'Done',        colorToken: 'success' },
 *     { id: 'cancelled',   label: 'Cancelled',   colorToken: 'muted' },
 *   ],
 * };
 * ```
 */
export interface PaletteFilterDefinition {
  /**
   * Filter key used in keyword syntax (e.g., "status" → type "status:done").
   * Must be lowercase, no spaces.
   */
  key: string;
  /** Human-readable label shown on the filter button */
  label: string;
  /**
   * Alternative key names accepted in keyword syntax.
   * E.g., ['s'] lets the user type "s:done" as shorthand for "status:done".
   */
  aliases?: string[];
  /** Available filter values */
  values: PaletteFilterValue[];
}

/**
 * An active filter selection.
 * Multiple values within the same key are OR'd together.
 * Multiple keys are AND'd together.
 *
 * @example
 * // (status=done OR status=cancelled) AND priority=high
 * [
 *   { key: 'status',   values: ['done', 'cancelled'] },
 *   { key: 'priority', values: ['high'] },
 * ]
 */
export interface ActivePaletteFilter {
  /** Filter key (matches PaletteFilterDefinition.key) */
  key: string;
  /** Selected value IDs (OR logic within this key) */
  values: string[];
}

/**
 * Result of parsing keyword filters from a search string.
 *
 * @example
 * // Input: "status:done priority:high bug fix"
 * // Output:
 * {
 *   textQuery: "bug fix",
 *   filters: [
 *     { key: "status",   values: ["done"] },
 *     { key: "priority", values: ["high"] },
 *   ]
 * }
 */
export interface ParsedPaletteQuery {
  /** Remaining query text after extracting key:value tokens */
  textQuery: string;
  /** Parsed filters extracted from key:value tokens */
  filters: ActivePaletteFilter[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION PALETTE (Entity Search)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Entity types for entity palette.
 *
 * Widened to `string` so that dynamically registered entity types
 * (via EntityRegistry) are automatically accepted. The well-known
 * values are kept as a const array for reference and static icon mapping.
 */
export type EntityType = string;

/** Well-known entity types with static icon/color mappings. */
export const WELL_KNOWN_ENTITY_TYPES = [
  // Integrations
  'linear',
  'github_pr',
  'github_issue',
  'gmail',
  'calendar_event',
  'drive_file',
  'slack',
  'sentry_issue',
  // Local
  'local_file',
  'workstream',
  'skill',
  // Generic
  'contact',
  'note',
  'bookmark',
] as const;

/**
 * Metadata for displaying entity status and context.
 */
export interface EntityMetadata {
  /** Status label (e.g., "In Progress", "Open", "Merged") */
  status?: string;
  /** Visual variant for status badge */
  statusVariant?: 'default' | 'active' | 'completed' | 'error' | 'warning';
  /** Time indicator (e.g., "2h ago", "Tomorrow 3pm") */
  time?: string;
  /** Numeric indicator (e.g., PR number "#142") */
  number?: string;
  /** Author or assignee name */
  author?: string;
  /** Priority level */
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  /** Skill-specific: whether the skill is enabled */
  enabled?: boolean;
  /** Skill-specific: whether the skill is pinned */
  pinned?: boolean;
  /** Skill-specific: whether the skill is installed (vs remote) */
  installed?: boolean;
  /** Skill-specific: usage count */
  useCount?: number;
  /** Skill-specific: scope (global/project/remote) */
  scope?: 'global' | 'project' | 'remote';
  /** Skill-specific: source (local/skills.sh/github) */
  source?: 'local' | 'skills.sh' | 'github';
}

/**
 * Entity data structure for entity palette items.
 */
export interface Entity {
  /** Unique identifier */
  id: string;
  /** Entity type - determines icon and color */
  type: EntityType;
  /** Canonical entity URI (e.g., @vienna//workstream/abc123) — provided by defineEntity.createURI */
  uri?: string;
  /** Primary display text */
  title: string;
  /** Secondary description or context */
  subtitle?: string;
  /** Source integration name (e.g., "Linear", "GitHub") */
  source?: string;
  /** Reference to source (e.g., "owner/repo" for GitHub skills) */
  sourceRef?: string;
  /** Additional metadata for display */
  metadata?: EntityMetadata;
  /** Timestamp for sorting recents (unix ms) */
  lastAccessedAt?: number;
  /** Custom icon override */
  icon?: ReactNode;
}

/**
 * Entity reference URI format: vienna://<type>/<id>?label=<human-readable>
 * Used when inserting entities into chat input as clickable chips.
 *
 * @example
 * ```typescript
 * const ref = new EntityReference({
 *   type: 'linear',
 *   id: 'DRF-123',
 *   label: 'Fix authentication bug'
 * });
 *
 * ref.toURI(); // "vienna://linear/DRF-123?label=Fix%20authentication%20bug"
 * ```
 */
export class EntityReference {
  constructor(
    public readonly type: EntityType,
    public readonly id: string,
    public readonly label: string
  ) {}

  /**
   * Convert to vienna:// URI format.
   */
  toURI(): string {
    const encodedLabel = encodeURIComponent(this.label);
    return `vienna://${this.type}/${this.id}?label=${encodedLabel}`;
  }

  /**
   * Parse vienna:// URI into EntityReference.
   */
  static fromURI(uri: string): EntityReference | null {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'vienna:') return null;

      const type = url.hostname as EntityType;
      const id = url.pathname.slice(1); // Remove leading slash
      const label = url.searchParams.get('label');

      if (!type || !id || !label) return null;

      return new EntityReference(type, id, decodeURIComponent(label));
    } catch {
      return null;
    }
  }

  /**
   * Create from Entity object.
   */
  static fromEntity(entity: Entity): EntityReference {
    return new EntityReference(entity.type, entity.id, entity.title);
  }
}

/**
 * Data provider interface for entity palette.
 * Implement this to connect to your entity data sources.
 */
export interface EntityPaletteDataProvider {
  /**
   * Search entities with optional type filter and active palette filters.
   * Can return sections for grouped results or flat array.
   *
   * @param query - Search query string
   * @param typeFilter - Optional entity type to filter by
   * @param filters - Active palette filters (key:value pairs from filter bar or keyword syntax)
   * @param signal - AbortSignal for request cancellation
   * @returns Array of sections or flat array of entities
   */
  search(
    query: string,
    typeFilter?: string,
    filters?: ActivePaletteFilter[],
    signal?: AbortSignal
  ): Promise<PaletteSection<Entity>[] | Entity[]>;

  /**
   * Get recently accessed entities.
   *
   * @param limit - Maximum number of recents to return
   * @returns Array of recently accessed entities
   */
  getRecents(limit?: number): Promise<Entity[]>;

  /**
   * Mark an entity as accessed (for recents tracking).
   * Provider should handle persistence.
   *
   * @param entity - Entity that was accessed
   */
  markAccessed(entity: Entity): void;

  /**
   * Check if a specific entity type's integration is connected.
   *
   * @param type - Entity type to check
   * @returns True if integration is connected and available
   */
  isSourceConnected(type: EntityType): boolean;

  /**
   * Get filter definitions for a specific entity type tab.
   * Called when the palette switches to a type-specific tab to populate the filter bar.
   * Returns an empty array if the type declares no filters.
   *
   * @param type - Entity type (e.g., 'linear', 'github_pr')
   * @returns Array of filter definitions for that type
   */
  getFiltersForType?(type: string): Promise<PaletteFilterDefinition[]>;

  /**
   * Get the initial active filters to pre-populate the filter bar on mount.
   * Providers can use this to restore previously saved filter state from localStorage.
   * Called once when the palette mounts.
   *
   * @returns Array of initially active filters
   */
  getInitialFilters?(): ActivePaletteFilter[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Command categories for organizing actions.
 */
export type CommandCategory =
  | 'claude' // Claude Code slash commands
  | 'navigation' // Navigate between views/panels
  | 'workstream' // Workstream management
  | 'skill' // Installed skills
  | 'file' // File operations
  | 'edit' // Editing commands
  | 'view' // View toggles
  | 'ai' // AI assistant commands
  | 'integrations' // Integration management
  | 'settings' // Application settings
  | 'developer' // Developer tools
  | 'help'; // Help and documentation

/**
 * Command data structure for command palette items.
 */
export interface Command {
  /** Unique identifier */
  id: string;
  /** Command category */
  category: CommandCategory;
  /** Primary display text */
  title: string;
  /** Description of what the command does */
  description?: string;
  /** Keyboard shortcut */
  shortcut?: KeyboardShortcut;
  /** Whether command is currently disabled */
  disabled?: boolean;
  /** Reason why command is disabled (shown instead of description) */
  disabledReason?: string;
  /** Custom icon override */
  icon?: ReactNode;
  /** Additional keywords for fuzzy search */
  keywords?: string[];
  /** Whether this command has a multi-step flow */
  hasFlow?: boolean;
  /** Raw command body (used by custom Claude commands for placeholder interpolation) */
  body?: string;
}

/**
 * Data provider interface for command palette.
 * Implement this to provide commands and handle execution.
 */
export interface CommandPaletteDataProvider {
  /**
   * Get all commands, optionally filtered by category.
   *
   * @param categoryFilter - Optional category to filter by
   * @returns Array of commands
   */
  getCommands(categoryFilter?: string): Promise<Command[]>;

  /**
   * Search commands by query and optional category.
   *
   * @param query - Search query string
   * @param categoryFilter - Optional category to filter by
   * @param signal - AbortSignal for request cancellation
   * @returns Array of matching commands
   */
  search(query: string, categoryFilter?: string, signal?: AbortSignal): Promise<Command[]>;

  /**
   * Get recently used commands.
   *
   * @param limit - Maximum number of recents to return
   * @returns Array of recently used commands
   */
  getRecents(limit?: number): Promise<Command[]>;

  /**
   * Execute a command.
   *
   * @param command - Command to execute
   * @throws Error if execution fails
   */
  execute(command: Command): Promise<void>;

  /**
   * Mark a command as recently used.
   * Provider should handle persistence.
   *
   * @param command - Command that was executed
   */
  markRecent(command: Command): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW SYSTEM (Multi-Step Flows)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Props passed to each flow screen render function.
 */
export interface FlowScreenProps<TData = Record<string, unknown>> {
  /** Current flow data */
  data: TData;
  /** Update flow data (merges with existing) */
  setData: (updates: Partial<TData>) => void;
  /** Navigate to next screen */
  onNext: () => void;
  /** Navigate to previous screen */
  onBack: () => void;
  /** Complete the flow with result */
  onComplete: (result: unknown) => void;
  /** Cancel the flow */
  onCancel: () => void;
  /** Current screen index */
  screenIndex: number;
  /** Total number of screens */
  totalScreens: number;
}

/**
 * Flow screen definition.
 */
export interface FlowScreen<TData = Record<string, unknown>> {
  /** Unique screen identifier */
  id: string;
  /** Render function for this screen */
  render: (props: FlowScreenProps<TData>) => ReactNode;
}

/**
 * Flow definition for multi-step command flows.
 *
 * @example
 * ```typescript
 * const createTicketFlow: FlowDefinition = {
 *   id: 'create-linear-ticket',
 *   screens: [
 *     {
 *       id: 'select-project',
 *       render: ({ onNext, setData }) => (
 *         <PaletteScreen>
 *           <PaletteHeader title="Select Project" />
 *           <PaletteBody>
 *             {projects.map(p => (
 *               <PaletteListItem onClick={() => {
 *                 setData({ projectId: p.id });
 *                 onNext();
 *               }}>
 *                 {p.name}
 *               </PaletteListItem>
 *             ))}
 *           </PaletteBody>
 *         </PaletteScreen>
 *       ),
 *     },
 *   ],
 *   onComplete: async (data) => {
 *     await createTicket(data);
 *   },
 *   onCancel: () => console.log('Cancelled'),
 * };
 * ```
 */
export interface FlowDefinition<TData = Record<string, unknown>> {
  /** Unique flow identifier */
  id: string;
  /** Flow screens in order */
  screens: FlowScreen<TData>[];
  /** Called when flow completes successfully */
  onComplete: (result: TData) => void | Promise<void>;
  /** Called when flow is cancelled */
  onCancel: () => void;
  /** Initial flow data */
  initialData?: Partial<TData>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Props for NavigationPalette component.
 */
export interface EntityPaletteProps {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Called when palette should close */
  onClose: () => void;
  /** Called when an entity is selected */
  onSelect: (entity: Entity) => void;
  /** Data provider for search and recents */
  dataProvider: EntityPaletteDataProvider;
  /** Current search query (controlled) */
  query?: string;
  /** Active tab for filtering */
  activeTab?: string;
  /** Called when tab changes */
  onTabChange?: (tabId: string) => void;
  /** Tab configuration */
  tabs?: PaletteTab[];
  /** Maximum results to display */
  maxResults?: number;
  /** Additional className */
  className?: string;
  /** Called when user wants to connect an integration */
  onConnectIntegration?: (type: EntityType) => void;
  /** Icon hints from entity registry, mapping type → Lucide icon name */
  iconHints?: Record<string, string>;
  /** Active filters applied to the current tab */
  activeFilters?: ActivePaletteFilter[];
  /** Called when filters change (from filter bar UI or keyword syntax) */
  onFiltersChange?: (filters: ActivePaletteFilter[]) => void;
}

/**
 * Props for CommandPalette component.
 */
export interface CommandPaletteProps {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Called when palette should close */
  onClose: () => void;
  /** Called when a command is executed */
  onExecute: (command: Command) => void;
  /** Data provider for commands */
  dataProvider: CommandPaletteDataProvider;
  /** Current search query (controlled) */
  query?: string;
  /** Active tab for filtering */
  activeTab?: string;
  /** Called when tab changes */
  onTabChange?: (tabId: string) => void;
  /** Tab configuration */
  tabs?: PaletteTab[];
  /** Maximum results to display */
  maxResults?: number;
  /** Additional className */
  className?: string;
  /** Flow registry for multi-step commands */
  flowRegistry?: Record<string, FlowDefinition>;
  /**
   * Factory for a fallback "escape hatch" command shown at the bottom of the
   * palette whenever there is a query. Receives the current query and should
   * return a Command to display, or undefined to hide the fallback.
   */
  fallbackCommand?: (query: string) => Command | undefined;
}

/**
 * Props for ChatInputWithPalettes component.
 */
export interface ChatInputWithPalettesProps {
  /** Data provider for entity palette (entity search) */
  navigationProvider: EntityPaletteDataProvider;
  /** Data provider for command palette */
  commandProvider: CommandPaletteDataProvider;
  /** Called when user sends a message (Enter without shift) */
  onSend?: (message: string) => void;
  /** Called when an entity is selected from entity palette */
  onEntitySelect?: (entity: Entity) => void;
  /** Called when a command is executed from command palette */
  onCommandExecute?: (command: Command) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Flow registry for multi-step commands */
  flowRegistry?: Record<string, FlowDefinition>;
}

/**
 * Imperative handle for palette components.
 * Use with forwardRef to delegate keyboard events.
 */
export interface PaletteHandle {
  /** Handle keyboard events - returns true if handled */
  handleKeyDown: (event: React.KeyboardEvent) => boolean;
  /** Whether a flow is currently active (for hiding outer search input) */
  isFlowActive?: boolean;
}
