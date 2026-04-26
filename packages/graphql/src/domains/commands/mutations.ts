/**
 * Command Mutations — GraphQL mutation fields for command execution.
 *
 * @ai-context
 * Single mutation to execute a command by ID. Delegates to
 * ctx.command.execute() and returns an ExecuteCommandPayload.
 *
 * @module graphql/domains/commands/mutations
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { ExecuteCommandPayloadRef } from './types';

builder.mutationFields((t) => ({
  executeCommand: t.field({
    type: ExecuteCommandPayloadRef,
    description: 'Execute a command by ID',
    args: {
      commandId: t.arg.string({ required: true }),
      args: t.arg({ type: 'JSON' }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.command) {
        throw new GraphQLError('Command registry not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const argsRecord = args.args as Record<string, unknown> | undefined;
      return ctx.command.execute(args.commandId, argsRecord ?? undefined);
    },
  }),

  rescanClaudeCommands: t.field({
    type: 'Boolean',
    description: 'Re-scan .claude/commands directories for Claude custom commands',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.command) {
        throw new GraphQLError('Command registry not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      // Gather project directories from all projects
      const projects = ctx.db.projects.listAll();
      const projectDirs: string[] = [];
      for (const project of projects) {
        const dirs = ctx.db.projectDirectories.getByProject(project.id);
        for (const dir of dirs) {
          projectDirs.push(dir.path);
        }
      }
      await ctx.command.rescanClaudeCommands(projectDirs);
      return true;
    },
  }),
}));
