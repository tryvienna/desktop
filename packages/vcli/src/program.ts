import { Command } from 'commander';
import { registerPluginScaffoldCommand } from './commands/plugin-scaffold.ts';

/**
 * Build and return the fully-configured vcli program.
 * Separated from index.ts so doc generation and tests can introspect
 * the command tree without triggering .parse().
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('vcli')
    .description('Vienna plugin development CLI')
    .version('0.0.1');

  const pluginCmd = program
    .command('plugin')
    .description('Plugin development commands');

  registerPluginScaffoldCommand(pluginCmd);

  return program;
}
