/**
 * Toaster — Toast notification container built on Sonner
 *
 * @ai-context
 * - Renders toast notifications with automatic theme-aware styling
 * - Place once at the app root
 * - Re-exports the `toast` function for imperatively triggering toasts
 * - Supports success/error/warning/info variants, promises, and custom JSX
 * - Styling uses CSS variables from the design system for automatic theme adaptation
 *
 * @props
 * - theme: "light" | "dark" | "system" — Controls toast appearance (defaults to "system")
 * - All Sonner ToasterProps are supported (position, duration, richColors, etc.)
 *
 * @example
 * ```tsx
 * // 1. Place Toaster at app root
 * <Toaster />
 *
 * // 2. Trigger toasts from anywhere
 * import { toast } from './sonner';
 * toast('Event created');
 * toast.success('Profile updated!');
 * toast.error('Something went wrong');
 * toast.promise(saveData(), {
 *   loading: 'Saving...',
 *   success: 'Saved!',
 *   error: 'Failed to save',
 * });
 * ```
 */
import { Toaster as SonnerToaster, toast, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}

Toaster.displayName = 'Toaster';

export { Toaster, toast };
