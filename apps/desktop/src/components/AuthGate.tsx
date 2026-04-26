/**
 * AuthGate — Wraps the app and shows a login screen if not authenticated.
 *
 * When unauthenticated, shows a simple sign-in/sign-up screen.
 * When authenticated, renders children (the main app).
 */

import type { ReactNode } from 'react';
import { useAuth } from '../providers/AuthProvider';

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, login, signup } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-500">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-neutral-950 text-white">
        <h1 className="text-3xl font-bold tracking-tight">Vienna</h1>
        <p className="mt-2 text-sm text-neutral-500">Sign in to get started</p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => void login()}
            className="rounded-lg bg-white px-8 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
          <button
            onClick={() => void signup()}
            className="rounded-lg border border-neutral-700 px-8 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500"
          >
            Create account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
