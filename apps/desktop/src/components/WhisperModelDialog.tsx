/**
 * WhisperModelDialog — First-time setup dialog for downloading Whisper models.
 *
 * Shows when the user first tries to use voice input and the models aren't
 * cached locally yet. Downloads tiny (~41MB) and base (~77MB) q8 models.
 *
 * The user can dismiss the dialog while download continues in the background —
 * the mic button will show a download indicator and clicking it reopens this dialog.
 */

import type { DownloadProgress } from '../hooks/useVoiceInput';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@tryvienna/ui';
import { Mic } from 'lucide-react';

interface WhisperModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether a download is currently in progress */
  downloading: boolean;
  /** Step-level progress info */
  downloadProgress: DownloadProgress | null;
  /** Error message from a failed download */
  downloadError: string | null;
  /** Start the model download */
  onDownload: () => void;
  /** Approximate download size in bytes */
  downloadSize: number;
  /** Which models are missing */
  missingModels: string[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${Math.round(bytes / 1_000_000)} MB`;
}

export function WhisperModelDialog({
  open,
  onOpenChange,
  downloading,
  downloadProgress,
  downloadError,
  onDownload,
  downloadSize,
}: WhisperModelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-surface-tertiary flex h-10 w-10 items-center justify-center rounded-full">
              <Mic className="text-foreground-secondary h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Set Up Voice Input</DialogTitle>
              <DialogDescription>
                Download speech recognition models to enable voice-to-text.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <p className="text-foreground-secondary text-sm">
            Vienna uses on-device speech recognition for privacy — your voice never leaves your
            computer.{' '}
            {downloading
              ? `Downloading ${formatBytes(downloadSize)}…`
              : `This requires a one-time download of ${formatBytes(downloadSize)}.`}
          </p>

          {downloading && (
            <div className="flex flex-col gap-2">
              {/* Progress bar — show indeterminate state before first progress event */}
              <div className="bg-primary/20 relative h-2 w-full overflow-hidden rounded-full">
                {downloadProgress ? (
                  <div
                    className="bg-primary absolute inset-y-0 left-0 transition-all duration-300"
                    style={{ width: `${Math.min(downloadProgress.overallPercent, 100)}%` }}
                  />
                ) : (
                  <div className="bg-primary absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full" />
                )}
              </div>
              <p className="text-foreground-tertiary text-xs">
                {downloadProgress
                  ? `Downloading model ${downloadProgress.currentIndex + 1} of ${downloadProgress.totalModels} (${downloadProgress.currentModel}) — ${Math.round(downloadProgress.overallPercent)}%`
                  : 'Preparing download…'}
              </p>
            </div>
          )}

          {downloadError && (
            <p className="text-destructive text-sm">
              Download failed: {downloadError}
            </p>
          )}
        </div>

        <DialogFooter>
          {downloading ? (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Continue in Background
            </Button>
          ) : downloadError ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onDownload}>
                Retry Download
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
