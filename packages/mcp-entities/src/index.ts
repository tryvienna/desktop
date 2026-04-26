#!/usr/bin/env node

/**
 * @vienna/mcp-entities — MCP Server Entry Point
 *
 * Exposes Vienna entity operations to Claude via Model Context Protocol.
 * Communicates with the Electron app via Unix socket bridge.
 *
 * Required env: MCP_SOCKET_PATH — path to the instance-specific Unix socket.
 * The Electron app sets this when spawning the MCP server.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server';
import { createBridgeContext } from './bridge';

async function main(): Promise<void> {
  // MCP servers use stderr for logging (stdout is reserved for MCP protocol JSON-RPC).
  // No file-based logger is available at this stage — the process has no log directory.
  // eslint-disable-next-line no-console
  console.error('MCP Entities Server starting...');
  // eslint-disable-next-line no-console
  console.error('Socket path:', process.env['MCP_SOCKET_PATH'] ?? '(not set)');

  const bridge = await createBridgeContext();
  // eslint-disable-next-line no-console
  console.error('Connected to Electron app via bridge');

  const server = createMcpServer(bridge);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown: clean up socket on termination
  const shutdown = () => {
    // eslint-disable-next-line no-console
    console.error('MCP Entities Server shutting down...');
    bridge.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // eslint-disable-next-line no-console
  console.error('MCP Entities Server running');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', error);
  process.exit(1);
});
