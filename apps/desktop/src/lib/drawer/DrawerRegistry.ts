/**
 * DrawerRegistry — Priority-sorted content registration and resolution engine.
 *
 * @ai-context
 * - Class-based registry with match() + render() pattern for content resolution
 * - Registrations sorted by priority descending (higher = checked first)
 * - register() returns an unregister function for cleanup
 * - getRenderer() iterates priority order, returns first match
 * - Supports useSyncExternalStore via subscribe() + getVersion()
 * - Global singleton exported as globalDrawerRegistry
 * - Priority convention: built-in = 100, plugin entity-drawers = 60, plugin drawers = 50
 */

import type {
  DrawerRegistration,
  DrawerContentDescriptor,
  DrawerRenderFn,
} from './types';

export class DrawerRegistry {
  private registrations: DrawerRegistration[] = [];
  private listeners = new Set<() => void>();
  private version = 0;

  register(registration: DrawerRegistration): () => void {
    this.registrations.push(registration);
    this.registrations.sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
    this.version++;
    this.notify();

    return () => {
      const idx = this.registrations.indexOf(registration);
      if (idx !== -1) {
        this.registrations.splice(idx, 1);
        this.version++;
        this.notify();
      }
    };
  }

  registerAll(registrations: DrawerRegistration[]): () => void {
    const unregisters = registrations.map((r) => this.register(r));
    return () => unregisters.forEach((fn) => fn());
  }

  getRenderer(content: DrawerContentDescriptor): DrawerRenderFn | null {
    for (const reg of this.registrations) {
      if (reg.match(content)) {
        return reg.render;
      }
    }
    return null;
  }

  hasRenderer(content: DrawerContentDescriptor): boolean {
    return this.getRenderer(content) !== null;
  }

  render(content: DrawerContentDescriptor) {
    const renderer = this.getRenderer(content);
    return renderer ? renderer(content) : null;
  }

  getRegistrationCount(): number {
    return this.registrations.length;
  }

  getAllRegistrations(): readonly DrawerRegistration[] {
    return this.registrations;
  }

  getVersion(): number {
    return this.version;
  }

  /** Subscribe for useSyncExternalStore integration */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.registrations = [];
    this.version++;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const globalDrawerRegistry = new DrawerRegistry();
