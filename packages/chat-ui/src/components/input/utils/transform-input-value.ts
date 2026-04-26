/**
 * Transform rich InputValue to plain text with entity URIs and file paths
 *
 * This module handles the conversion from the rich ChatInputComposed format
 * to plain text that can be sent to the backend/agent.
 */

import type { InputValue, Entity, Attachment } from '../../../types/input';

/**
 * Convert entity to URI format
 * Format: [[vienna://type/id]]
 *
 * Example: { id: '1', type: 'workstream', label: 'fix login bug' }
 *       -> [[vienna://workstream/1]]
 */
export function entityToURI(entity: Entity): string {
  return `[[vienna://${entity.type}/${entity.id}]]`;
}

/**
 * Format attachment as text line with path and metadata
 *
 * Example: { name: 'screenshot.png', path: '/Users/...', size: 2400000, mimeType: 'image/png' }
 *       -> - /Users/.../screenshot.png (image/png, 2.3 MB)
 */
export function attachmentToText(attachment: Attachment): string {
  const path = attachment.path || attachment.name;
  const sizeMB = (attachment.size / (1024 * 1024)).toFixed(1);
  return `- ${path} (${attachment.mimeType}, ${sizeMB} MB)`;
}

/**
 * Transform rich InputValue to plain text with URIs and file paths
 *
 * Process:
 * 1. Start with plainText from contentEditable
 * 2. Replace entity labels with URIs (e.g., "@fix login bug" -> "[[vienna://workstream/1]]")
 * 3. Append file paths as a list at the end
 *
 * Example input:
 * {
 *   plainText: "Hey can you help with @fix login bug? See attached:",
 *   entities: [{ id: '1', type: 'workstream', label: 'fix login bug' }],
 *   attachments: [{ name: 'screenshot.png', path: '/Users/...', size: 2400000, mimeType: 'image/png' }]
 * }
 *
 * Example output:
 * ```
 * Hey can you help with [[vienna://workstream/1]]? See attached:
 *
 * Attachments:
 * - /Users/.../screenshot.png (image/png, 2.3 MB)
 * ```
 */
export function transformInputValueToPlainText(value: InputValue): string {
  let text = value.plainText;

  // Replace entity mentions with URIs
  // Note: We need to find "@entityLabel" patterns and replace with URIs
  // This assumes the plainText contains the entity labels prefixed with @
  for (const entity of value.entities) {
    // Escape special regex characters in the label
    const escapedLabel = entity.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const labelRegex = new RegExp(`@${escapedLabel}`, 'g');
    text = text.replace(labelRegex, entityToURI(entity));
  }

  // Add attachments section for non-image files only (images are sent as content blocks)
  const nonImageAttachments = value.attachments?.filter(
    (a) => !a.mimeType.startsWith('image/') || !a.previewUrl
  );
  if (nonImageAttachments && nonImageAttachments.length > 0) {
    text = text.trim();
    text += '\n\nAttachments:\n';
    text += nonImageAttachments.map(attachmentToText).join('\n');
  }

  return text;
}
