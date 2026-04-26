/**
 * Module-level signal for invalidating Claude Settings discovery.
 *
 * @ai-context
 * - Emitted by use-skills after install/uninstall so the nav sidebar refreshes
 * - Consumed by useClaudeSettingsNavSection to re-run discovery + clear cache
 */

type Listener = () => void;
const listeners = new Set<Listener>();

export function onClaudeSettingsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitClaudeSettingsChanged(): void {
  for (const l of listeners) l();
}
