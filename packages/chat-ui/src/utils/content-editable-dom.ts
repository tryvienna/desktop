/**
 * ContentEditable DOM Utilities
 *
 * Shared DOM manipulation helpers for ContentEditable-based hooks.
 * Extracted to avoid duplication between useMentionAutocomplete and useCommandTrigger.
 *
 * @module chat-ui/utils/content-editable-dom
 */

/**
 * Get the caret character offset within a container element.
 * Uses the Selection API and Range cloning.
 */
export function getCaretCharacterOffsetWithin(element: Node): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
}

/**
 * Find the DOM node and local offset at a given character position
 * within a container element. Handles text nodes and BR elements.
 */
export function findNodeAtOffset(
  container: Node,
  targetOffset: number
): { node: Node | null; offset: number } {
  let currentOffset = 0;
  let foundNode: Node | null = null;
  let foundOffset = 0;

  function traverse(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length || 0;
      if (currentOffset + length >= targetOffset) {
        foundNode = node;
        foundOffset = targetOffset - currentOffset;
        return true;
      }
      currentOffset += length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as Element).tagName === 'BR') {
        currentOffset += 1;
        if (currentOffset >= targetOffset) {
          foundNode = node;
          foundOffset = 0;
          return true;
        }
      }

      for (const child of Array.from(node.childNodes)) {
        if (traverse(child)) {
          return true;
        }
      }
    }

    return false;
  }

  traverse(container);
  return { node: foundNode, offset: foundOffset };
}

/**
 * Calculate character offset from start of a container to a target node/offset.
 * Used by useCursorPosition to compute absolute cursor position.
 */
export function getCharacterOffsetFromStart(
  container: Node,
  targetNode: Node,
  targetOffset: number
): number {
  let offset = 0;
  let found = false;

  function traverse(node: Node): void {
    if (found) return;

    if (node === targetNode) {
      offset += targetOffset;
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length || 0;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as Element).tagName === 'BR') {
        offset += 1;
      }

      for (const child of Array.from(node.childNodes)) {
        traverse(child);
        if (found) return;
      }
    }
  }

  traverse(container);
  return offset;
}

/**
 * Extract text from a DOM node, converting entity chips and paste chips to markup.
 * Traverses the DOM tree and preserves entity URIs and paste references.
 */
export function extractTextWithEntities(node: Node): string {
  let result = '';

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent || '';
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element;

      // Check for paste chip (has data-paste-id)
      const pasteId = element.getAttribute('data-paste-id');
      if (pasteId) {
        result += `[paste://${pasteId}]`;
        continue;
      }

      // Check for entity chip (has data-entity-uri or data-entity-type)
      const entityUri = element.getAttribute('data-entity-uri');
      const entityType = element.getAttribute('data-entity-type');
      const entityId = element.getAttribute('data-entity-id');
      const entityLabel = element.getAttribute('data-entity-label');

      if (entityUri || (entityType && entityId)) {
        let uri = entityUri;

        if (!uri && entityType && entityId) {
          uri = `@vienna//${entityType}/${entityId}`;
          if (entityLabel) {
            try {
              const base64Label = btoa(entityLabel);
              uri += `?label=${base64Label}`;
            } catch {
              // If btoa fails (non-ASCII), skip the label
            }
          }
        }

        if (uri) {
          let normalizedUri = uri;
          if (normalizedUri.startsWith('vienna://')) {
            normalizedUri = '@vienna//' + normalizedUri.slice(9);
          } else if (!normalizedUri.startsWith('@vienna//')) {
            normalizedUri = '@vienna//' + normalizedUri;
          }
          result += `[${normalizedUri}]`;
        } else {
          result += element.textContent || '';
        }
      } else if (element.tagName === 'BR') {
        result += '\n';
      } else if (element.tagName === 'DIV' || element.tagName === 'P') {
        if (result.length > 0 && !result.endsWith('\n')) {
          result += '\n';
        }
        result += extractTextWithEntities(element);
      } else {
        result += extractTextWithEntities(element);
      }
    }
  }

  return result;
}
