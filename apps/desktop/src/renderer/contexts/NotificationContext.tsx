/**
 * NotificationContext — Provides the generic notification service to the React tree.
 *
 * @ai-context
 * - Lightweight context wrapping createNotificationService
 * - useNotifications() hook for consuming the service
 * - Service instance is stable (created once via useMemo)
 * - No domain-specific logic — domain callers compose via service options
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  createNotificationService,
  type NotificationService,
} from '../services/notification-service';

const NotificationContext = createContext<NotificationService | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const service = useMemo(() => createNotificationService(), []);

  return (
    <NotificationContext.Provider value={service}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationService {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within <NotificationProvider>');
  }
  return ctx;
}
