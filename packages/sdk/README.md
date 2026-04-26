# @tryvienna/sdk

Plugin SDK for building Vienna integrations. Define entities, connect external APIs, extend the GraphQL schema, and contribute UI surfaces — all from a single package.

## Installation

```bash
pnpm add @tryvienna/sdk
```

## Quick Start

A minimal plugin definition:

```ts
import { definePlugin, defineIntegration } from "@tryvienna/sdk";
import { MyDrawer } from "./ui/MyDrawer";

const myApi = defineIntegration({
  id: "my_api",
  name: "My API",
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>' },
  createClient: async () => ({}),
});

export const myPlugin = definePlugin({
  id: "my_plugin",
  name: "My Plugin",
  description: "A simple Vienna plugin",
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>' },
  integrations: [myApi],
  canvases: {
    "nav-sidebar": { component: MyDrawer, label: "My Plugin", priority: 50 },
    drawer: { component: MyDrawer, label: "My Plugin" },
  },
});
```

## Documentation

- [Full documentation](https://tryvienna.dev/docs) — API references, canvas surfaces, entity definitions, schema extensions, and more.
- [Build your first plugin](https://tryvienna.dev/docs/plugins/tutorial) — Step-by-step tutorial from zero to a working plugin.

## License

Apache-2.0
