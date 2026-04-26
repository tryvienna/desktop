# @tryvienna/ui

A source-distributed React component library for Vienna plugin developers, built on Radix UI, Tailwind CSS v4, and CVA.

## Installation

```bash
pnpm add @tryvienna/ui
```

Peer dependencies: `react`, `react-dom`, `lucide-react`, and the Radix UI primitives used by the components you consume. See `peerDependencies` in `package.json` for the full list.

## Quick Start

Import the stylesheet once at your plugin's root, then use components:

```tsx
import "@tryvienna/ui/styles.css";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@tryvienna/ui";

function MyPlugin() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello from my plugin</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => alert("Clicked")}>Get Started</Button>
      </CardContent>
    </Card>
  );
}
```

## Import Patterns

```tsx
import { Button, Dialog, cn } from "@tryvienna/ui";           // everything
import { Button, Input } from "@tryvienna/ui/components";      // components only
import { useCompactMode } from "@tryvienna/ui/hooks";          // hooks only
import { cn } from "@tryvienna/ui/utils";                      // utilities only
import "@tryvienna/ui/styles.css";                             // stylesheet (once)
```

## Documentation

For the full component catalog, theming guide, and API reference, visit:

**[tryvienna.dev/docs](https://tryvienna.dev/docs)**

## License

Apache-2.0
