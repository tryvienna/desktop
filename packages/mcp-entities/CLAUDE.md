# @vienna/mcp-entities

MCP server exposing Vienna entity operations to Claude via Model Context Protocol.

## Architecture

Three clean layers:

1. **Transport** (`bridge.ts`) — Unix socket NDJSON client implementing `ToolContext`
2. **Handlers** (`tools/*.ts`) — Pure async functions: `(validatedInput, ctx) → ToolResult`
3. **Formatters** (`format.ts`) — Pure functions: `(data) → markdown string`

In tests, bypass the bridge entirely — inject real `EntityRegistry`/`IntegrationRegistry` from `@tryvienna/sdk` with mock entity definitions.

## Key Interfaces

- **`ToolContext`** (`types.ts`) — Abstraction over registry access. Bridge in prod, direct registries in tests.
- **`ToolResult`** (`types.ts`) — Standard MCP response: `{ content: [{ type: 'text', text }], isError? }`.

## Adding a New Tool

1. Add Zod input schema in `schemas.ts`
2. Create handler in `tools/<name>.ts` — pure function `(input, ctx) => ToolResult`
3. Add formatter(s) in `format.ts` if needed
4. Register in `TOOLS` array in `server.ts`
5. Add unit test in `__tests__/<name>.unit.test.ts`
6. Add formatter test(s) in `__tests__/format.unit.test.ts`

## Conventions

- Handlers NEVER validate input (schema does that), catch errors (router does that), or access globals
- All formatting in `format.ts` — handlers call formatters, never build markdown inline
- `ToolContext` is the ONLY dependency for handlers — no direct registry imports
- Socket path via `MCP_SOCKET_PATH` env var — ensures isolation between Electron instances

## Commands

```bash
pnpm test:unit          # Run tests
pnpm typecheck          # Type-check
pnpm lint               # Lint
```
