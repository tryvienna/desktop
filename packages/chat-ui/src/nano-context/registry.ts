/**
 * NanoContext Type Registry
 *
 * Plugin-extensible registry for custom NanoContext types.
 *
 * @module chat-ui/NanoContext/registry
 */

import type React from 'react';
import { createContext, useContext } from 'react';
import type { NanoContextIcon, PluginNanoContext, NanoContextWidgetProps } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Registration Type
// ─────────────────────────────────────────────────────────────────────────────

export interface NanoContextTypeRegistration {
  typeId: string;
  pluginId: string;
  label: string;
  icon: NanoContextIcon;
  serializeMetadata?: (metadata: Record<string, unknown>) => string;
  PreviewComponent?: React.ComponentType<{ context: PluginNanoContext }>;
  WidgetComponent?: React.ComponentType<NanoContextWidgetProps>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

export class NanoContextTypeRegistry {
  private registrations = new Map<string, NanoContextTypeRegistration>();

  register(registration: NanoContextTypeRegistration): void {
    this.registrations.set(registration.typeId, registration);
  }

  unregister(typeId: string): void {
    this.registrations.delete(typeId);
  }

  get(typeId: string): NanoContextTypeRegistration | undefined {
    return this.registrations.get(typeId);
  }

  getByPlugin(pluginId: string): NanoContextTypeRegistration[] {
    return Array.from(this.registrations.values()).filter((r) => r.pluginId === pluginId);
  }

  getAll(): NanoContextTypeRegistration[] {
    return Array.from(this.registrations.values());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// React Context
// ─────────────────────────────────────────────────────────────────────────────

const NanoContextTypeRegistryContext = createContext<NanoContextTypeRegistry | null>(null);

export const NanoContextTypeRegistryProvider = NanoContextTypeRegistryContext.Provider;

export function useNanoContextTypeRegistry(): NanoContextTypeRegistry {
  const registry = useContext(NanoContextTypeRegistryContext);
  if (!registry) {
    throw new Error(
      'useNanoContextTypeRegistry must be used within a NanoContextTypeRegistryProvider'
    );
  }
  return registry;
}

export function useNanoContextTypeRegistryOptional(): NanoContextTypeRegistry | null {
  return useContext(NanoContextTypeRegistryContext);
}
