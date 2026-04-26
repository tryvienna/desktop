/**
 * Native Feed Widgets — Registration entry point.
 *
 * @ai-context
 * - Import this module early (e.g., from FeedSection) to ensure widgets are registered
 * - Each widget calls registerNativeWidget() at module scope
 * - To add a new widget: create a component file, import it here, and register it
 */

import { Layers, CheckSquare } from 'lucide-react';
import { registerNativeWidget } from './registry';
import { WorkstreamsWidget } from './WorkstreamsWidget';
import { TasksWidget } from './TasksWidget';

// ─── Register built-in widgets ──────────────────────────────────────────────

registerNativeWidget({
  id: 'workstreams',
  label: 'Workstreams',
  description: 'Shows workstreams needing action or recently completed',
  icon: Layers,
  priority: 100,
  component: WorkstreamsWidget,
  defaultParams: { sections: 'needs_action,completed' },
});

registerNativeWidget({
  id: 'tasks',
  label: 'Tasks',
  description: 'Shows project tasks with filters, sorting, and agent launch',
  icon: CheckSquare,
  priority: 90,
  component: TasksWidget,
  defaultParams: { statuses: 'todo,in_progress' },
});

// ─── Re-exports ─────────────────────────────────────────────────────────────

export {
  getAllNativeWidgets,
  getNativeWidget,
  registerNativeWidget,
  type NativeFeedWidgetConfig,
  type NativeFeedWidgetProps,
} from './registry';
