/**
 * useAttachments — Manages file attachments for chat input
 *
 * @ai-context
 * - Validates file size and MIME type before adding
 * - Generates image previews via FileReader
 * - Returns { attachments, addFile, addFiles, removeAttachment, clearAttachments }
 *
 * @example
 * const { attachments, addFile, removeAttachment } = useAttachments({ maxAttachments: 5 });
 */

import { useState, useCallback } from 'react';

import type { Attachment } from '../types/input';

export interface UseAttachmentsOptions {
  maxAttachments?: number;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  onChange?: (attachments: Attachment[]) => void;
}

export interface UseAttachmentsReturn {
  attachments: Attachment[];
  addFile: (file: File) => Promise<void>;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  isAtMaxLimit: boolean;
  error: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

export function useAttachments(options: UseAttachmentsOptions = {}): UseAttachmentsReturn {
  const {
    maxAttachments = 10,
    maxFileSize = 10 * 1024 * 1024,
    allowedMimeTypes,
    onChange,
  } = options;

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxFileSize) {
        return `File "${file.name}" is too large. Maximum size is ${formatBytes(maxFileSize)}.`;
      }
      if (allowedMimeTypes && !allowedMimeTypes.some((type) => file.type.match(type))) {
        return `File type "${file.type}" is not allowed.`;
      }
      return null;
    },
    [maxFileSize, allowedMimeTypes]
  );

  const generatePreview = useCallback(async (file: File): Promise<string | undefined> => {
    if (!file.type.startsWith('image/')) return undefined;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }, []);

  const addFile = useCallback(
    async (file: File) => {
      setError(null);
      if (attachments.length >= maxAttachments) {
        setError(`Maximum ${maxAttachments} attachments allowed.`);
        return;
      }
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      const previewUrl = await generatePreview(file);
      const attachment: Attachment = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        file,
        path: (file as File & { path?: string }).path ?? '',
        previewUrl,
        metadata: { lastModified: file.lastModified },
      };
      const next = [...attachments, attachment];
      setAttachments(next);
      onChange?.(next);
    },
    [attachments, maxAttachments, validateFile, generatePreview, onChange]
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) await addFile(file);
    },
    [addFile]
  );

  const removeAttachment = useCallback(
    (id: string) => {
      setError(null);
      const next = attachments.filter((a) => a.id !== id);
      setAttachments(next);
      onChange?.(next);
    },
    [attachments, onChange]
  );

  const clearAttachments = useCallback(() => {
    setError(null);
    setAttachments([]);
    onChange?.([]);
  }, [onChange]);

  return {
    attachments,
    addFile,
    addFiles,
    removeAttachment,
    clearAttachments,
    isAtMaxLimit: attachments.length >= maxAttachments,
    error,
  };
}
