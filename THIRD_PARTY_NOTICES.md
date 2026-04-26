# Third-Party Notices

Vienna is built on open-source components. This document lists the
production dependencies included with Vienna, their licenses, and any
notices required by those licenses.

Regenerate this file by running:

```bash
pnpm licenses list --prod --json > /tmp/licenses.json
# then run the generator script documented in scripts/ (coming)
```

Last generated: 2026-04-24 — 544 production packages.

## License summary

| License | Packages |
|---|---|
| MIT | 431 |
| ISC | 49 |
| BSD-3-Clause | 26 |
| Apache-2.0 | 18 |
| BlueOak-1.0.0 | 5 |
| BSD-2-Clause | 4 |
| Unlicense | 2 |
| 0BSD | 1 |
| LGPL-3.0-or-later | 1 *(see notes)* |
| (BSD-2-Clause OR MIT OR Apache-2.0) | 1 |
| (MIT OR CC0-1.0) | 1 |
| (MIT OR WTFPL) | 1 |
| (MPL-2.0 OR Apache-2.0) | 1 |
| MIT AND ISC | 1 |
| UNLICENSED | 1 *(see notes)* |
| Unknown | 1 *(see notes)* |

All of these are compatible with Vienna's Apache 2.0 license except
as noted below.

## Notes

### LGPL-3.0-or-later: `@img/sharp-libvips-darwin-arm64`

This package ships a prebuilt binary of `libvips`, which is licensed
under LGPL-3.0-or-later. The `sharp` npm package that uses it is
Apache 2.0.

LGPL-3.0 requires that end users be able to replace the LGPL library
with their own (compatible) version. Vienna satisfies this because
the library is distributed as a dynamically loaded native addon
(`.node` file) inside `node_modules`, so users can rebuild or
replace it. The upstream source is available at
https://github.com/libvips/libvips.

### UNLICENSED: `@loomhq/electron-click-through-workaround`

This package is declared `UNLICENSED` in its manifest. The package
provides a macOS Electron click-through workaround authored by Loom.
Vienna currently depends on it in `apps/desktop/src/main.ts`.

**Action:** clarify licensing with the author
(https://github.com/loomhq/ElectronMacOSClickThrough) or replace the
dependency with an equivalent Apache-compatible implementation.

### Unknown: `khroma@2.1.0`

The `khroma` package's manifest omits a `license` field, but its
repository includes an MIT LICENSE file. We treat it as MIT for
compatibility purposes. The upstream repository is at
https://github.com/fabiospampinato/khroma — see its LICENSE file for
the exact text.

## Package list

The following are the production dependencies included with Vienna,
grouped by license. Versions reflect the current lockfile.

### (BSD-2-Clause OR MIT OR Apache-2.0) — 1 packages

- rc@1.2.8

### (MIT OR CC0-1.0) — 1 packages

- type-fest@0.13.1

### (MIT OR WTFPL) — 1 packages

- expand-template@2.0.3

### (MPL-2.0 OR Apache-2.0) — 1 packages

- dompurify@3.2.7

### 0BSD — 1 packages

- tslib@2.8.1

### Apache-2.0 — 18 packages

- @chevrotain/cst-dts-gen@11.1.2
- @chevrotain/gast@11.1.2
- @chevrotain/regexp-to-ast@11.1.2
- @chevrotain/types@11.1.2
- @chevrotain/utils@11.1.2
- @huggingface/transformers@3.8.1
- @img/sharp-darwin-arm64@0.34.5
- @json-render/core@0.16.0
- @json-render/react@0.16.0
- chevrotain@11.1.2
- class-variance-authority@0.7.1
- detect-libc@2.1.2
- flatbuffers@25.9.23
- long@5.3.2
- sharp@0.34.5
- sumchecker@3.0.1
- tunnel-agent@0.6.0
- typescript@5.9.3

### BSD-2-Clause — 4 packages

- dotenv@17.3.1
- extract-zip@2.0.1
- http-cache-semantics@4.2.0
- json-schema-typed@8.0.2

### BSD-3-Clause — 26 packages

- @protobufjs/aspromise@1.1.2
- @protobufjs/base64@1.1.2
- @protobufjs/codegen@2.0.4
- @protobufjs/eventemitter@1.1.0
- @protobufjs/fetch@1.1.0
- @protobufjs/float@1.0.2
- @protobufjs/inquire@1.1.0
- @protobufjs/path@1.1.2
- @protobufjs/pool@1.1.0
- @protobufjs/utf8@1.1.0
- d3-array@2.12.1
- d3-ease@3.0.1
- d3-path@1.0.9
- d3-sankey@0.12.3
- d3-shape@1.3.7
- fast-uri@3.1.0
- global-agent@3.0.0
- highlight.js@11.11.1
- hoist-non-react-statics@3.3.2
- ieee754@1.2.1
- protobufjs@7.5.4
- qs@6.15.0
- react-transition-group@4.4.5
- roarr@2.15.4
- rw@1.3.3
- sprintf-js@1.1.3

### BlueOak-1.0.0 — 5 packages

- chownr@3.0.0
- minimatch@10.2.4
- minipass@7.1.3
- tar@7.5.9
- yallist@5.0.0

### ISC — 49 packages

- @isaacs/fs-minipass@4.0.1
- @pothos/core@4.12.0
- chownr@1.1.4
- d3@7.9.0
- d3-array@3.2.4
- d3-axis@3.0.0
- d3-brush@3.0.0
- d3-chord@3.0.1
- d3-color@3.1.0
- d3-contour@4.0.2
- d3-delaunay@6.0.4
- d3-dispatch@3.0.1
- d3-drag@3.0.0
- d3-dsv@3.0.1
- d3-fetch@3.0.1
- d3-force@3.0.0
- d3-format@3.1.2
- d3-geo@3.1.1
- d3-hierarchy@3.1.2
- d3-interpolate@3.0.1
- d3-path@3.1.0
- d3-polygon@3.0.1
- d3-quadtree@3.0.1
- d3-random@3.0.1
- d3-scale@4.0.2
- d3-scale-chromatic@3.1.0
- d3-selection@3.0.0
- d3-shape@3.2.0
- d3-time@3.1.0
- d3-time-format@4.1.0
- d3-timer@3.0.1
- d3-transition@3.0.1
- d3-zoom@3.0.0
- delaunator@5.0.1
- graceful-fs@4.2.11
- guid-typescript@1.0.9
- inherits@2.0.4
- ini@1.3.8
- internmap@1.0.1
- isexe@2.0.0
- json-stringify-safe@5.0.1
- lucide-react@0.511.0
- once@1.4.0
- semver@6.3.1
- setprototypeof@1.2.0
- split2@4.2.0
- which@2.0.2
- wrappy@1.0.2
- zod-to-json-schema@3.25.1

### LGPL-3.0-or-later — 1 packages

- @img/sharp-libvips-darwin-arm64@1.2.4

### MIT — 431 packages

- @antfu/install-pkg@1.1.0
- @apollo/client@3.14.0
- @babel/runtime@7.28.6
- @braintree/sanitize-url@7.1.2
- @codemirror/autocomplete@6.20.0
- @codemirror/commands@6.10.2
- @codemirror/lang-json@6.0.2
- @codemirror/language@6.12.2
- @codemirror/lint@6.9.4
- @codemirror/search@6.6.0
- @codemirror/state@6.5.4
- @codemirror/view@6.39.15
- @dagrejs/dagre@2.0.4
- @dagrejs/graphlib@3.0.4
- @date-fns/tz@1.4.1
- @electron/get@2.0.3
- @floating-ui/core@1.7.4
- @floating-ui/dom@1.7.5
- @floating-ui/react-dom@2.1.7
- @floating-ui/utils@0.2.10
- @graphql-typed-document-node/core@3.2.0
- @hono/node-server@1.19.10
- @hookform/resolvers@5.2.2
- @huggingface/jinja@0.5.6
- @iconify/types@2.0.0
- @iconify/utils@3.1.0
- @img/colour@1.1.0
- @lezer/common@1.5.1
- @lezer/highlight@1.2.3
- @lezer/json@1.0.3
- @lezer/lr@1.4.8
- @marijn/find-cluster-break@1.0.2
- @mermaid-js/parser@1.0.0
- @modelcontextprotocol/sdk@1.27.1
- @monaco-editor/loader@1.7.0
- @monaco-editor/react@4.7.0
- @parcel/watcher@2.5.6
- @parcel/watcher-darwin-arm64@2.5.6
- @pinojs/redact@0.4.0
- @radix-ui/number@1.1.1
- @radix-ui/primitive@1.1.3
- @radix-ui/react-accessible-icon@1.1.7
- @radix-ui/react-accordion@1.2.12
- @radix-ui/react-alert-dialog@1.1.15
- @radix-ui/react-arrow@1.1.7
- @radix-ui/react-aspect-ratio@1.1.7
- @radix-ui/react-avatar@1.1.10
- @radix-ui/react-checkbox@1.3.3
- @radix-ui/react-collapsible@1.1.12
- @radix-ui/react-collection@1.1.7
- @radix-ui/react-compose-refs@1.1.2
- @radix-ui/react-context@1.1.2
- @radix-ui/react-context-menu@2.2.16
- @radix-ui/react-dialog@1.1.15
- @radix-ui/react-direction@1.1.1
- @radix-ui/react-dismissable-layer@1.1.11
- @radix-ui/react-dropdown-menu@2.1.16
- @radix-ui/react-focus-guards@1.1.3
- @radix-ui/react-focus-scope@1.1.7
- @radix-ui/react-form@0.1.8
- @radix-ui/react-hover-card@1.1.15
- @radix-ui/react-id@1.1.1
- @radix-ui/react-label@2.1.7
- @radix-ui/react-menu@2.1.16
- @radix-ui/react-menubar@1.1.16
- @radix-ui/react-navigation-menu@1.2.14
- @radix-ui/react-one-time-password-field@0.1.8
- @radix-ui/react-password-toggle-field@0.1.3
- @radix-ui/react-popover@1.1.15
- @radix-ui/react-popper@1.2.8
- @radix-ui/react-portal@1.1.9
- @radix-ui/react-presence@1.1.5
- @radix-ui/react-primitive@2.1.3
- @radix-ui/react-progress@1.1.7
- @radix-ui/react-radio-group@1.3.8
- @radix-ui/react-roving-focus@1.1.11
- @radix-ui/react-scroll-area@1.2.10
- @radix-ui/react-select@2.2.6
- @radix-ui/react-separator@1.1.7
- @radix-ui/react-slider@1.3.6
- @radix-ui/react-slot@1.2.3
- @radix-ui/react-switch@1.2.6
- @radix-ui/react-tabs@1.1.13
- @radix-ui/react-toast@1.2.15
- @radix-ui/react-toggle@1.1.10
- @radix-ui/react-toggle-group@1.1.11
- @radix-ui/react-toolbar@1.1.11
- @radix-ui/react-tooltip@1.2.8
- @radix-ui/react-use-callback-ref@1.1.1
- @radix-ui/react-use-controllable-state@1.2.2
- @radix-ui/react-use-effect-event@0.0.2
- @radix-ui/react-use-escape-keydown@1.1.1
- @radix-ui/react-use-is-hydrated@0.1.0
- @radix-ui/react-use-layout-effect@1.1.1
- @radix-ui/react-use-previous@1.1.1
- @radix-ui/react-use-rect@1.1.1
- @radix-ui/react-use-size@1.1.1
- @radix-ui/react-visually-hidden@1.2.3
- @radix-ui/rect@1.1.1
- @sindresorhus/is@4.6.0
- @standard-schema/utils@0.3.0
- @szmarczak/http-timer@4.0.6
- @tabby_ai/hijri-converter@1.0.5
- @tanstack/react-virtual@3.13.21
- @tanstack/virtual-core@3.13.21
- @types/cacheable-request@6.0.3
- @types/d3@7.4.3
- @types/d3-array@3.2.2
- @types/d3-axis@3.0.6
- @types/d3-brush@3.0.6
- @types/d3-chord@3.0.6
- @types/d3-color@3.1.3
- @types/d3-contour@3.0.6
- @types/d3-delaunay@6.0.4
- @types/d3-dispatch@3.0.7
- @types/d3-drag@3.0.7
- @types/d3-dsv@3.0.7
- @types/d3-ease@3.0.2
- @types/d3-fetch@3.0.7
- @types/d3-force@3.0.10
- @types/d3-format@3.0.4
- @types/d3-geo@3.1.0
- @types/d3-hierarchy@3.1.7
- @types/d3-interpolate@3.0.4
- @types/d3-path@3.1.1
- @types/d3-polygon@3.0.2
- @types/d3-quadtree@3.0.6
- @types/d3-random@3.0.3
- @types/d3-scale@4.0.9
- @types/d3-scale-chromatic@3.1.0
- @types/d3-selection@3.0.11
- @types/d3-shape@3.1.8
- @types/d3-time@3.0.4
- @types/d3-time-format@4.0.3
- @types/d3-timer@3.0.2
- @types/d3-transition@3.0.9
- @types/d3-zoom@3.0.8
- @types/geojson@7946.0.16
- @types/http-cache-semantics@4.2.0
- @types/keyv@3.1.4
- @types/node@24.11.0
- @types/react@19.2.14
- @types/react-dom@19.2.3
- @types/responselike@1.0.3
- @types/trusted-types@2.0.7
- @types/yauzl@2.10.3
- @wry/caches@1.0.1
- @wry/context@0.7.4
- @wry/equality@0.5.7
- @wry/trie@0.5.0
- @xyflow/react@12.10.1
- @xyflow/system@0.0.75
- accepts@2.0.0
- acorn@8.16.0
- agent-base@7.1.4
- ajv@8.18.0
- ajv-formats@3.0.1
- aria-hidden@1.2.6
- atomic-sleep@1.0.0
- balanced-match@4.0.4
- base64-js@1.5.1
- better-sqlite3@12.6.2
- bindings@1.2.1
- bl@4.1.0
- body-parser@2.2.2
- boolean@3.2.0
- brace-expansion@5.0.4
- buffer@5.7.1
- buffer-crc32@0.2.13
- bytes@3.1.2
- cacheable-lookup@5.0.4
- cacheable-request@7.0.4
- call-bind-apply-helpers@1.0.2
- call-bound@1.0.4
- chevrotain-allstar@0.3.1
- classcat@5.0.5
- clone-response@1.0.3
- clsx@2.1.1
- cm6-graphql@0.2.1
- cmdk@1.1.1
- codemirror@6.0.2
- commander@7.2.0
- confbox@0.1.8
- content-disposition@1.0.1
- content-type@1.0.5
- cookie@0.7.2
- cookie-signature@1.2.2
- cors@2.8.6
- cose-base@1.0.3
- crelt@1.0.6
- cron-parser@5.5.0
- cross-spawn@7.0.6
- csstype@3.2.3
- cytoscape@3.33.1
- cytoscape-cose-bilkent@4.1.0
- cytoscape-fcose@2.2.0
- dagre-d3-es@7.0.13
- date-fns@4.1.0
- date-fns-jalali@4.1.0-0
- dayjs@1.11.19
- debounce-promise@3.1.2
- debug@4.4.3
- decimal.js-light@2.5.1
- decompress-response@6.0.0
- deep-extend@0.6.0
- defer-to-connect@2.0.1
- define-data-property@1.1.4
- define-properties@1.2.1
- depd@2.0.0
- detect-node@2.1.0
- detect-node-es@1.1.0
- dom-helpers@5.2.1
- dunder-proto@1.0.1
- ee-first@1.1.1
- electron@40.6.1
- embla-carousel@8.6.0
- embla-carousel-react@8.6.0
- embla-carousel-reactive-utils@8.6.0
- encodeurl@2.0.0
- end-of-stream@1.4.5
- env-paths@2.2.1
- es-define-property@1.0.1
- es-errors@1.3.0
- es-object-atoms@1.1.1
- es6-error@4.1.1
- escape-html@1.0.3
- escape-string-regexp@4.0.0
- etag@1.8.1
- eventemitter3@4.0.7
- eventsource@3.0.7
- eventsource-parser@3.0.6
- express@5.2.1
- express-rate-limit@8.2.1
- fast-deep-equal@3.1.3
- fast-equals@5.4.0
- fd-slicer@1.1.0
- file-uri-to-path@1.0.0
- finalhandler@2.1.1
- forwarded@0.2.0
- framer-motion@12.34.3
- fresh@2.0.0
- fs-constants@1.0.0
- fs-extra@8.1.0
- function-bind@1.1.2
- get-intrinsic@1.3.0
- get-nonce@1.0.1
- get-proto@1.0.1
- get-stream@5.2.0
- github-from-package@0.0.0
- globalthis@1.0.4
- gopd@1.2.0
- got@11.8.6
- graphql@16.13.0
- graphql-language-service@5.5.0
- graphql-tag@2.12.6
- graphql-ws@6.0.7
- hachure-fill@0.5.2
- has-property-descriptors@1.0.2
- has-symbols@1.1.0
- hasown@2.0.2
- hono@4.12.5
- http-errors@2.0.1
- http2-wrapper@1.0.3
- https-proxy-agent@7.0.6
- iconv-lite@0.6.3
- ip-address@10.0.1
- ipaddr.js@1.9.1
- is-extglob@2.1.1
- is-glob@4.0.3
- is-promise@4.0.0
- jose@6.1.3
- js-tokens@4.0.0
- json-buffer@3.0.1
- json-logic-js@2.0.5
- json-schema-traverse@1.0.0
- jsonfile@4.0.0
- katex@0.16.33
- keyv@4.5.4
- langium@4.2.1
- layout-base@1.0.2
- lodash@4.17.23
- lodash-es@4.17.23
- loose-envify@1.4.0
- lowercase-keys@2.0.0
- luxon@3.7.2
- marked@14.0.0
- matcher@3.0.0
- math-intrinsics@1.1.0
- media-typer@1.1.0
- merge-descriptors@2.0.0
- mermaid@11.12.3
- mime-db@1.54.0
- mime-types@3.0.2
- mimic-response@1.0.1
- minimist@1.2.8
- minizlib@3.1.0
- mitt@3.0.1
- mixpanel@0.20.0
- mkdirp-classic@0.5.3
- mlly@1.8.0
- monaco-editor@0.55.1
- motion-dom@12.34.3
- motion-utils@12.29.2
- ms@2.1.3
- napi-build-utils@2.0.0
- negotiator@1.0.0
- node-abi@3.87.0
- node-addon-api@3.2.1
- normalize-url@6.1.0
- nullthrows@1.1.1
- object-assign@4.1.1
- object-inspect@1.13.4
- object-keys@1.1.1
- on-exit-leak-free@2.1.2
- on-finished@2.4.1
- onnxruntime-common@1.21.0
- onnxruntime-node@1.21.0
- onnxruntime-web@1.22.0-dev.20250409-89f8206ba4
- optimism@0.18.1
- p-cancelable@2.1.1
- package-manager-detector@1.6.0
- parseurl@1.3.3
- path-data-parser@0.1.0
- path-key@3.1.1
- path-to-regexp@8.3.0
- pathe@2.0.3
- pend@1.2.0
- picomatch@4.0.3
- pino@9.14.0
- pino-abstract-transport@2.0.0
- pino-std-serializers@7.1.0
- pkce-challenge@5.0.1
- pkg-types@1.3.1
- platform@1.3.6
- points-on-curve@0.2.0
- points-on-path@0.2.1
- prebuild-install@7.1.3
- process-warning@5.0.0
- progress@2.0.3
- prop-types@15.8.1
- proxy-addr@2.0.7
- pump@3.0.4
- quick-format-unescaped@4.0.4
- quick-lru@5.1.1
- radix-ui@1.4.3
- range-parser@1.2.1
- raw-body@3.0.2
- react@19.2.4
- react-day-picker@9.14.0
- react-dom@19.2.4
- react-hook-form@7.71.2
- react-is@16.13.1
- react-remove-scroll@2.7.2
- react-remove-scroll-bar@2.3.8
- react-resizable-panels@2.1.9
- react-router@7.13.1
- react-router-dom@7.13.1
- react-smooth@4.0.4
- react-style-singleton@2.2.3
- readable-stream@3.6.2
- real-require@0.2.0
- recharts@2.15.4
- recharts-scale@0.4.5
- regexparam@3.0.0
- rehackt@0.1.0
- require-from-string@2.0.2
- resolve-alpn@1.2.1
- responselike@2.0.1
- roughjs@4.6.6
- router@2.2.0
- safe-buffer@5.2.1
- safe-stable-stringify@2.5.0
- safer-buffer@2.1.2
- scheduler@0.27.0
- semver-compare@1.0.0
- send@1.2.1
- serialize-error@7.0.1
- serve-static@2.2.1
- set-cookie-parser@2.7.2
- shebang-command@2.0.0
- shebang-regex@3.0.0
- side-channel@1.1.0
- side-channel-list@1.0.0
- side-channel-map@1.0.1
- side-channel-weakmap@1.0.2
- simple-concat@1.0.1
- simple-get@4.0.1
- sonic-boom@4.2.1
- sonner@2.0.7
- state-local@1.0.7
- statuses@2.0.2
- string_decoder@1.3.0
- strip-json-comments@2.0.1
- style-mod@4.1.3
- stylis@4.3.6
- symbol-observable@4.0.0
- tailwind-merge@3.5.0
- tar-fs@2.1.4
- tar-stream@2.2.0
- thread-stream@3.1.0
- tiny-invariant@1.3.3
- tinyexec@1.0.2
- toidentifier@1.0.1
- ts-dedent@2.2.0
- ts-invariant@0.10.3
- tw-animate-css@1.4.0
- type-is@2.0.1
- ufo@1.6.3
- undici-types@7.16.0
- universalify@0.1.2
- unpipe@1.0.0
- use-callback-ref@1.3.3
- use-sidecar@1.1.3
- use-sync-external-store@1.6.0
- util-deprecate@1.0.2
- uuid@11.1.0
- vary@1.1.2
- vaul@1.1.2
- vscode-jsonrpc@8.2.0
- vscode-languageserver@9.0.1
- vscode-languageserver-protocol@3.17.5
- vscode-languageserver-textdocument@1.0.12
- vscode-languageserver-types@3.17.5
- vscode-uri@3.1.0
- w3c-keyname@2.2.8
- ws@8.19.0
- yauzl@2.10.0
- zen-observable@0.8.15
- zen-observable-ts@1.2.5
- zod@3.25.76
- zustand@4.5.7

### MIT AND ISC — 1 packages

- victory-vendor@36.9.2

### UNLICENSED — 1 packages

- @loomhq/electron-click-through-workaround@0.0.1

### Unknown — 1 packages

- khroma@2.1.0

### Unlicense — 2 packages

- robust-predicates@3.0.2
- wouter@3.9.0

