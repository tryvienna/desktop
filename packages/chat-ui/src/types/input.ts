/**
 * Input Type System
 *
 * Types for the rich chat input stack.
 *
 * @module chat-ui/types/input
 */

/** Generic entity that can be referenced in a message. */
export interface Entity {
  id: string;
  type: string;
  label: string;
  uri?: string;
  metadata?: Record<string, unknown>;
  color?: string;
}

/** Detected trigger for autocomplete (@ for mentions, / for commands). */
export interface Trigger {
  type: 'mention' | 'command';
  character: string;
  query: string;
  position: { start: number; end: number };
}

/** File or context attachment. */
export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  file?: File;
  path?: string;
  previewUrl?: string;
  metadata?: Record<string, unknown>;
}

/** Inline permission request shown in the input area. */
export interface InlinePermission {
  id: string;
  toolName: string;
  description: string;
  status: 'pending' | 'approved' | 'denied';
  metadata?: Record<string, unknown>;
}

/** Rich input value with entities and attachments. */
export interface InputValue {
  plainText: string;
  entities: Entity[];
  attachments: Attachment[];
  html?: string;
}

/** Cursor position in ContentEditable. */
export interface CursorPosition {
  offset: number;
  node: Node | null;
  nodeOffset: number;
  rect: DOMRect | null;
}

/** Configuration for ContentEditable input. */
export interface InputConfig {
  minHeight?: number;
  maxHeight?: number;
  showCharacterCount?: boolean;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  enableDraftPersistence?: boolean;
  draftKey?: string;
  enableRotatingPlaceholder?: boolean;
  placeholderTexts?: string[];
  placeholderInterval?: number;
  placeholderFadeDuration?: number;
  /** Placeholder shown when the input is not focused and empty. Overrides rotating placeholder when unfocused. */
  unfocusedPlaceholder?: string;
}

/** Input component state. */
export interface InputState {
  disabled: boolean;
  isSubmitting: boolean;
  isFocused: boolean;
  characterCount: number;
  isEmpty: boolean;
}
