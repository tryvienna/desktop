/**
 * @vienna/file-search — Shared file search primitives.
 *
 * Provides fuzzy scoring, language detection, and ignore rules used by the
 * entity palette, Monaco editor, file tree, and command palette.
 *
 * @packageDocumentation
 */

// Fuzzy scoring
export { fuzzyScore, fuzzyMatch, fuzzyScoreMulti, type SearchField } from './fuzzy-score';

// Language detection
export { LANGUAGE_MAP, LSP_SUPPORTED_LANGUAGES, detectLanguage } from './language-map';

// Ignore rules
export {
  EXCLUDED_DIRS,
  EXCLUDED_EXTENSIONS,
  BINARY_EXTENSIONS,
  isExcludedDir,
  isExcludedExtension,
  isEditableFile,
  isReadOnlyPath,
} from './ignore-rules';
