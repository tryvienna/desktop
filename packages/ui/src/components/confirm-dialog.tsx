/**
 * ConfirmDialog — Convenience wrapper around AlertDialog for confirmation flows
 *
 * @ai-context
 * - Wraps AlertDialog with a simpler API for common confirm/cancel patterns
 * - Supports destructive variant for dangerous actions
 * - No grid fixes needed — uses already-migrated AlertDialog components
 * - Controlled via open/onOpenChange or uncontrolled with trigger
 * - data-slot="confirm-dialog"
 *
 * @example
 * <ConfirmDialog
 *   trigger={<Button variant="destructive">Delete</Button>}
 *   title="Delete item?"
 *   description="This action cannot be undone."
 *   confirmLabel="Delete"
 *   variant="destructive"
 *   onConfirm={() => handleDelete()}
 * />
 *
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Save changes?"
 *   description="Your changes will be saved."
 *   onConfirm={() => handleSave()}
 * />
 */
import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';

interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  size?: 'default' | 'sm';
  children?: React.ReactNode;
}

function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  size = 'default',
  children,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = React.useCallback(async (e: React.MouseEvent) => {
    // Prevent AlertDialogAction from auto-closing so the loading state is visible.
    // We close manually via onOpenChange after the async operation completes.
    e.preventDefault();
    try {
      setLoading(true);
      await onConfirm();
      onOpenChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [onConfirm, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent size={size} data-slot="confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction variant={variant} onClick={handleConfirm} disabled={loading}>
            {loading ? 'Loading...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
