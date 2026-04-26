import { useState } from 'react';

/** Only allow HTTPS URLs and data:image/ URIs. */
export function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface FeedImageProps {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Safe image component for feed cards.
 * Validates URL scheme, lazy-loads, and hides on error.
 */
export function FeedImage({ src, alt = '', className }: FeedImageProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden || !isAllowedImageUrl(src)) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setHidden(true)}
    />
  );
}
