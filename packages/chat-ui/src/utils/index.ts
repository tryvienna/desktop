/**
 * Utilities
 *
 * @module chat-ui/utils
 */

// Format
export { formatDuration, truncateText, cleanCliOutput } from './format';

// Entity URI
export {
  parseEntityMarkup,
  parseEntityURI,
  buildEntityURI,
  buildEntityMarkup,
  containsEntityMarkup,
  encodeLabel,
  getEntityDisplayLabel,
  type ParsedEntityURI,
  type ParsedSegment,
  type TextSegment,
  type EntitySegment,
  type EntityDisplayMode,
} from './entity-uri';

// Entity Styles
export {
  getEntityColors,
  getEntityIcon,
  ENTITY_TYPE_COLORS,
  ENTITY_TYPE_ICONS,
  ENTITY_CHIP_STYLES,
  ENTITY_CHIP_ICON_STYLES,
  ENTITY_CHIP_LABEL_STYLES,
  type EntityColors,
} from './entity-styles';

// Entity Metadata Cache
export {
  setEntityTypeMetadata,
  getEntityTypeMetadata,
  setEntityTypeMetadataBatch,
  clearEntityTypeMetadataCache,
  type CachedEntityMetadata,
} from './entity-metadata-cache';

// Fuzzy Search
export { createCommandSearch, type SearchableCommand } from './fuzzy-search';

// Filter Keyword Parser
export {
  parseKeywordFilters,
  filtersToKeywords,
  mergeFilters,
  type FilterDefinition,
  type FilterValueDefinition,
  type ActiveFilter,
  type ParsedFilterQuery,
} from './filter-keyword-parser';

// Paste Markup
export {
  buildPasteMarkup,
  parsePasteMarkup,
  containsPasteMarkup,
  stripPasteMarkup,
  decodePasteMarkupToPlainText,
  encodePasteContent,
  decodePasteContent,
  setSessionPasteContent,
  getSessionPasteContent,
  PASTE_CHAR_THRESHOLD,
  PASTE_LINE_THRESHOLD,
  PASTE_PREVIEW_LENGTH,
  type PasteBlob,
  type ParsedPasteMarkup,
  type PasteTextSegment,
} from './paste-markup';

// Token Usage
export {
  formatTokens,
  formatCost,
  computeUsageDisplay,
  DEFAULT_CONTEXT_WINDOW,
  type UsageDisplayValues,
} from './token-usage';

// ContentEditable DOM Helpers
export {
  getCaretCharacterOffsetWithin,
  findNodeAtOffset,
  getCharacterOffsetFromStart,
  extractTextWithEntities,
} from './content-editable-dom';
