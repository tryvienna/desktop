/**
 * AccountSettings — Account section in the Settings page.
 *
 * Shows login/signup buttons for anonymous users, or account info
 * and a logout button for authenticated users.
 */

import { useState } from 'react';
import { Button } from '@tryvienna/ui';
import { useAuth } from '../../providers/AuthProvider';

export function AccountSettings() {
  const { isAuthenticated, userId, email, login, signup, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<unknown>, label: string) => {
    setError(null);
    try {
      await action();
    } catch {
      setError(`${label} failed. Please try again.`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="grid gap-6">
        <div className="rounded-lg border border-border bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground">
            You&apos;re using Vienna without an account. Sign in to sync your data across devices
            and access additional features.
          </p>

          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}

          <div className="mt-4 flex gap-3">
            <Button onClick={() => void handleAction(login, 'Sign in')} size="sm">
              Sign in
            </Button>
            <Button onClick={() => void handleAction(signup, 'Sign up')} variant="outline" size="sm">
              Create account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-lg border border-border bg-muted/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Signed in</p>
            {email && <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>}
            <p className="mt-0.5 text-xs text-muted-foreground font-mono">{userId}</p>
          </div>
          <Button onClick={() => void handleAction(logout, 'Sign out')} variant="outline" size="sm">
            Sign out
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
