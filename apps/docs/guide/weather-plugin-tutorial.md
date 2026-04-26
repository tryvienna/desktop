# Weather Plugin Tutorial

This tutorial walks you through building a **Weather** plugin — a menu-bar canvas that shows the current temperature, a 7-day forecast popover, hourly drill-down drawers, and a settings panel. By the end, you'll understand plugin canvases, integration definitions, cross-component state management, and the full plugin packaging lifecycle.

**What you'll build:**
- A **menu-bar icon** that shows the current weather emoji and temperature
- A **popover** with current conditions and a 7-day forecast
- A **drawer** for hourly forecast detail when you click a day
- A **settings drawer** with geocoding search and temperature unit selection
- A **plugin package** that auto-discovers and registers itself

<video src="/weather-plugin.webm" autoplay loop muted playsinline style="border-radius: 8px; margin-top: 16px; max-width: 100%;" />

**Prerequisites:** Familiarity with the [Plugin Development Guide](/guide/plugin-development). This tutorial focuses on the **menu-bar canvas** — a new canvas type not covered in the main guide.

[[toc]]

---

## 1. Architecture Overview

The weather plugin is structured as a standalone package in the monorepo:

```
packages/plugin-weather/
├── package.json
├── tsconfig.json
├── codegen.ts                ← GraphQL codegen config
└── src/
    ├── index.ts              ← Plugin definition (entry point)
    ├── integration.ts        ← Integration metadata + schema callback
    ├── schema.ts             ← GraphQL types + query resolvers (main process)
    ├── api.ts                ← Open-Meteo API functions (main process)
    ├── client/
    │   ├── operations.ts     ← GraphQL operations (TypedDocumentNode)
    │   └── generated/        ← Auto-generated types from codegen
    └── ui/
        ├── weather-data.ts   ← TypeScript types
        ├── useWeatherSettings.ts     ← Persistent settings hook
        ├── useWeatherForecast.ts     ← GraphQL query hook (Apollo)
        ├── WeatherMenuBarIcon.tsx    ← Icon canvas (32px button)
        ├── WeatherMenuBarContent.tsx ← Popover canvas (forecast)
        ├── WeatherPluginDrawer.tsx   ← Drawer router
        ├── WeatherSettingsDrawer.tsx ← Settings panel
        └── WeatherDayDrawer.tsx      ← Hourly detail view
```

::: info NO `renderer.ts` NEEDED
This plugin doesn't need a separate `src/renderer.ts` because its API layer (`api.ts`) uses only `fetch()` — a browser-safe API. Plugins that import Node built-ins (`node:fs`, `node:child_process`) in their schema resolvers should provide a `renderer.ts` with canvases only. See the [Plugin Development Guide](/guide/plugin-development#_3-4b-main-vs-renderer-separate-entry-points) for details.
:::

### Data flow

```
Open-Meteo API
    ^
    | native fetch() in main process (GraphQL resolvers)
    |
GraphQL schema (Pothos — registered via integration.schema callback)
    |
    v
IPC: graphql.execute()
    ^
    | Apollo Client (usePluginQuery from @tryvienna/sdk/react)
    |
useWeatherForecast (Apollo cache)
    |
    v
WeatherMenuBarIcon ── WeatherMenuBarContent ── WeatherDayDrawer
                              |
                              v
                      WeatherSettingsDrawer ── useWeatherSettings (localStorage)
```

Data is fetched through **GraphQL**, not through the plugin fetch proxy. The integration's `schema` callback registers GraphQL types and queries on the Pothos builder. Resolvers run in the main process where native `fetch()` is available — no CSP restrictions. The renderer uses `usePluginQuery` (a wrapper around Apollo's `useQuery`) to consume the data, benefiting from Apollo's normalized cache.

### Canvas types

Vienna plugins contribute UI through **canvases** — named slots where plugin components render:

| Canvas | Where it renders | Props |
|--------|-----------------|-------|
| `nav-sidebar` | Left navigation panel | `PluginNavSidebarProps` |
| `drawer` | Right-side tabbed drawer | `PluginDrawerCanvasProps` |
| `menu-bar` | TopBar trailing slot (top-right) | Icon: `MenuBarIconProps`, Content: `MenuBarCanvasProps` |

The **menu-bar** canvas is unique — it has two components:
1. **Icon** — renders inside a 32px ghost button in the TopBar
2. **Content** — renders in a popover when the icon is clicked

---

## 2. Create the Package

### 2.1 Package configuration

```json
// packages/plugin-weather/package.json
{
  "name": "@vienna/plugin-weather",
  "version": "0.0.1",
  "private": true,
  "description": "Weather forecast menu bar plugin",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "codegen": "graphql-codegen --config codegen.ts",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "dependencies": {
    "@tryvienna/sdk": "workspace:*",
    "zod": "^3.25.67"
  },
  "peerDependencies": {
    "@apollo/client": ">=3.0.0",
    "@vienna/graphql": "workspace:*",
    "@tryvienna/ui": "workspace:*",
    "graphql": ">=16.0.0",
    "react": ">=18.0.0"
  },
  "peerDependenciesMeta": {
    "@apollo/client": { "optional": true },
    "@vienna/graphql": { "optional": true },
    "@tryvienna/ui": { "optional": true },
    "graphql": { "optional": true },
    "react": { "optional": true }
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^6.1.2",
    "@graphql-codegen/client-preset": "^5.2.3",
    "@graphql-typed-document-node/core": "^3.2.0",
    "@types/node": "^25.3.2",
    "@types/react": "^19.0.0",
    "@vienna/graphql": "workspace:*",
    "tsx": "^4.20.3",
    "typescript": "^5.9.3"
  }
}
```

::: tip AUTO-DISCOVERY
Plugins in `packages/plugin-*` are auto-discovered by the main process. The `exports` field pointing to `./src/index.ts` is all you need — no manual registration in `main.ts`.
:::

### 2.2 TypeScript configuration

```json
// packages/plugin-weather/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["node", "react"],
    "noImplicitAny": false
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

::: warning PLUGIN UI QUIRK
Plugin UI components run inside an esbuild-bundled CJS module evaluated in the renderer. Setting `noImplicitAny: false` avoids issues with the shared module map resolution. Components that need further escape hatches can use `// @ts-nocheck` as a pragma.
:::

---

## 3. Define Types

Start with the data types that flow through the entire plugin:

```typescript
// src/ui/weather-data.ts

export interface HourlyForecast {
  hour: number;        // 0-23
  temp: number;        // Rounded integer in user's units
  condition: string;   // Human-readable (e.g., "Partly Cloudy")
  icon: string;        // Weather emoji (e.g., "⛅")
  precipitation: number; // 0-100 percentage
  humidity: number;    // 0-100 percentage
  wind: number;        // Rounded integer (mph or km/h)
}

export interface DayForecast {
  date: string;        // ISO date (e.g., "2026-03-20")
  dayName: string;     // "Today", "Tomorrow", "Mon", "Tue", etc.
  high: number;
  low: number;
  condition: string;
  icon: string;
  precipitation: number; // Max across all hours
  hourly: HourlyForecast[];
}

export interface GeocodingResult {
  name: string;
  country: string;
  admin1?: string;     // State/region
  latitude: number;
  longitude: number;
}
```

These are pure interfaces — no runtime cost, no dependencies. Every other file in the plugin imports from here.

---

## 4. Build the API Layer

### 4.1 GraphQL schema approach

Instead of routing HTTP calls through a fetch proxy, the weather plugin extends Vienna's GraphQL schema with custom types and queries. Resolvers run in the **main process** where native `fetch()` is available — no CSP restrictions.

**How it works:**

```
Renderer                          Main process
─────────────────                 ─────────────────
usePluginQuery(GET_WEATHER_FORECAST)
    → Apollo Client
    → IPC: graphql.execute ───→   Pothos schema resolver
                                       ↓
                                  Native fetch() → Open-Meteo API
                                       ↓
                                  Return typed data
    ← GraphQL response ──────
```

The plugin defines a `schema.ts` that registers types and queries. The integration's `schema` callback wires this into the Pothos builder. On the renderer side, `usePluginQuery` (from `@tryvienna/sdk/react`) queries the data via Apollo.

### 4.2 Main-process API functions

The API layer lives in `src/api.ts` and uses native `fetch()` (available in Node 22+):

```typescript
// src/api.ts

import type { DayForecast, GeocodingResult } from './ui/weather-data';

interface OpenMeteoForecastResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
    precipitation_probability: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
  };
}

interface OpenMeteoGeocodingResponse {
  results?: Array<{
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }>;
}

function wmoToCondition(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: 'Sunny', icon: '☀️' };
  if (code <= 3) return { condition: 'Partly Cloudy', icon: '⛅' };
  if (code <= 48) return { condition: 'Fog', icon: '🌫️' };
  if (code <= 67) return { condition: 'Rain', icon: '🌧️' };
  if (code <= 77) return { condition: 'Snow', icon: '🌨️' };
  if (code <= 82) return { condition: 'Rain', icon: '🌧️' };
  if (code <= 99) return { condition: 'Thunderstorm', icon: '⛈️' };
  return { condition: 'Cloudy', icon: '☁️' };
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
  units: string,
): Promise<DayForecast[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weathercode');
  url.searchParams.set('hourly', 'temperature_2m,weathercode,precipitation_probability,relative_humidity_2m,wind_speed_10m');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('temperature_unit', units);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);

  const data: OpenMeteoForecastResponse = await res.json();
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return data.daily.time.map((date, i) => {
    const weatherInfo = wmoToCondition(data.daily.weathercode[i] ?? 0);

    const hourlyStart = i * 24;
    const hourly: DayForecast['hourly'] = [];
    for (let h = 0; h < 24; h++) {
      const idx = hourlyStart + h;
      const hourWeather = wmoToCondition(data.hourly.weathercode[idx] ?? 0);
      hourly.push({
        hour: h,
        temp: Math.round(data.hourly.temperature_2m[idx] ?? 0),
        condition: hourWeather.condition,
        icon: hourWeather.icon,
        precipitation: data.hourly.precipitation_probability[idx] ?? 0,
        humidity: data.hourly.relative_humidity_2m[idx] ?? 0,
        wind: Math.round(data.hourly.wind_speed_10m[idx] ?? 0),
      });
    }

    const maxPrecip = Math.max(...hourly.map((h) => h.precipitation));

    let dayName: string;
    if (i === 0) {
      dayName = 'Today';
    } else if (i === 1) {
      dayName = 'Tomorrow';
    } else {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dayName = dayNames[d.getDay()] ?? '';
    }

    return {
      date: date ?? '',
      dayName,
      high: Math.round(data.daily.temperature_2m_max[i] ?? 0),
      low: Math.round(data.daily.temperature_2m_min[i] ?? 0),
      condition: weatherInfo.condition,
      icon: weatherInfo.icon,
      precipitation: maxPrecip,
      hourly,
    };
  });
}

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query.trim());
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'en');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);

  const data: OpenMeteoGeocodingResponse = await res.json();
  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}
```

::: tip MAIN PROCESS ONLY
This file runs in the main process as part of GraphQL resolvers. It uses native `fetch()` — no CSP restrictions, no plugin fetch proxy needed.
:::

### 4.3 GraphQL schema registration

The `schema.ts` file registers GraphQL types and queries on the Pothos builder, following the same pattern as the GitHub plugin:

```typescript
// src/schema.ts

import * as weatherApi from './api';

export function registerWeatherSchema(rawBuilder: unknown): void {
  const builder = rawBuilder as any;

  // Define types
  const WeatherHourlyRef = builder.objectRef('WeatherHourlyForecast');
  builder.objectType(WeatherHourlyRef, {
    description: 'Hourly weather forecast data',
    fields: (t) => ({
      hour: t.exposeInt('hour'),
      temp: t.exposeInt('temp'),
      condition: t.exposeString('condition'),
      icon: t.exposeString('icon'),
      precipitation: t.exposeInt('precipitation'),
      humidity: t.exposeInt('humidity'),
      wind: t.exposeInt('wind'),
    }),
  });

  const WeatherDayRef = builder.objectRef('WeatherDayForecast');
  builder.objectType(WeatherDayRef, {
    description: 'Daily weather forecast with hourly breakdown',
    fields: (t) => ({
      id: t.id({ resolve: (day) => day.date }),
      date: t.exposeString('date'),
      dayName: t.exposeString('dayName'),
      high: t.exposeInt('high'),
      low: t.exposeInt('low'),
      condition: t.exposeString('condition'),
      icon: t.exposeString('icon'),
      precipitation: t.exposeInt('precipitation'),
      hourly: t.field({ type: [WeatherHourlyRef], resolve: (day) => day.hourly }),
    }),
  });

  const WeatherGeocodingRef = builder.objectRef('WeatherGeocodingResult');
  builder.objectType(WeatherGeocodingRef, {
    description: 'A geocoding result from location search',
    fields: (t) => ({
      id: t.id({ resolve: (r) => `${r.latitude},${r.longitude}` }),
      name: t.exposeString('name'),
      country: t.exposeString('country'),
      admin1: t.exposeString('admin1', { nullable: true }),
      latitude: t.field({ type: 'Float', resolve: (r) => r.latitude }),
      longitude: t.field({ type: 'Float', resolve: (r) => r.longitude }),
    }),
  });

  // Register queries
  builder.queryFields((t) => ({
    weatherForecast: t.field({
      type: [WeatherDayRef],
      args: {
        latitude: t.arg({ type: 'Float', required: true }),
        longitude: t.arg({ type: 'Float', required: true }),
        units: t.arg.string({ required: true }),
      },
      resolve: async (_root, args) =>
        weatherApi.fetchForecast(args.latitude, args.longitude, args.units),
    }),

    weatherGeocodingSearch: t.field({
      type: [WeatherGeocodingRef],
      args: { query: t.arg.string({ required: true }) },
      resolve: async (_root, args) => {
        const results = await weatherApi.searchLocations(args.query);
        return results.map((r) => ({ ...r, id: `${r.latitude},${r.longitude}` }));
      },
    }),
  }));
}
```

### 4.4 GraphQL operations (renderer)

Define typed operations for the renderer to consume:

```typescript
// src/client/operations.ts

import { graphql } from './generated/gql';

export const GET_WEATHER_FORECAST = graphql(`
  query GetWeatherForecast($latitude: Float!, $longitude: Float!, $units: String!) {
    weatherForecast(latitude: $latitude, longitude: $longitude, units: $units) {
      id date dayName high low condition icon precipitation
      hourly { hour temp condition icon precipitation humidity wind }
    }
  }
`);

export const SEARCH_WEATHER_LOCATIONS = graphql(`
  query SearchWeatherLocations($query: String!) {
    weatherGeocodingSearch(query: $query) {
      id name country admin1 latitude longitude
    }
  }
`);
```

### 4.5 Codegen setup

Create a codegen config that uses the sdk helper:

```typescript
// codegen.ts
import { createPluginCodegenConfig } from '@tryvienna/sdk/codegen';
export default createPluginCodegenConfig();
```

Then register the weather schema in the codegen pipeline:

```typescript
// packages/graphql/src/schema/plugin-schemas.ts

import { registerWeatherSchema } from '../../../plugin-weather/src/schema';

export function registerPluginSchemas(): void {
  const codegenRegistry = new EntityRegistry();
  const schemaBuilder = createEntitySchemaBuilder(codegenRegistry);

  registerGitHubSchema(schemaBuilder);
  registerWeatherSchema(schemaBuilder); // Add weather types to schema
}
```

Run codegen after schema changes:

```bash
pnpm --filter @vienna/graphql schema:print -- --write  # Regenerate schema.graphql
pnpm --filter @vienna/plugin-weather codegen           # Generate typed operations
```

### 4.6 Using queries in hooks

The `usePluginQuery` hook (from `@tryvienna/sdk/react`) wraps Apollo's `useQuery` with the plugin's pre-configured client:

```typescript
// src/ui/useWeatherForecast.ts

import { usePluginQuery } from '@tryvienna/sdk/react';
import { GET_WEATHER_FORECAST } from '../client/operations';

export function useWeatherForecast() {
  const { settings } = useWeatherSettings();
  const { data, loading, refetch } = usePluginQuery(GET_WEATHER_FORECAST, {
    variables: { latitude: settings.latitude, longitude: settings.longitude, units: settings.units },
    fetchPolicy: 'cache-and-network',
  });
  return { forecast: data?.weatherForecast ?? [], loading, refetch, ... };
}
```

And in the settings drawer for geocoding:

```typescript
// src/ui/WeatherSettingsDrawer.tsx

import { usePluginQuery } from '@tryvienna/sdk/react';
import { SEARCH_WEATHER_LOCATIONS } from '../client/operations';

const { data: searchData, loading: searching } = usePluginQuery(SEARCH_WEATHER_LOCATIONS, {
  variables: { query: debouncedQuery },
  skip: debouncedQuery.length < 2,
  fetchPolicy: 'network-only',
});
const searchResults = searchData?.weatherGeocodingSearch ?? [];
```

::: tip APOLLO CACHE
Apollo's InMemoryCache handles caching automatically. No manual module-level cache needed. Use `fetchPolicy: 'cache-and-network'` to show cached data immediately while fetching fresh data in the background.
:::

---

## 5. Settings Persistence

### 5.1 The settings hook

Plugin settings need to persist across app restarts and synchronize across multiple components (the menu bar, the popover, and the settings drawer all read the same settings).

```typescript
// src/ui/useWeatherSettings.ts

import { useState, useEffect, useCallback } from 'react';

export interface WeatherSettings {
  locationName: string;
  latitude: number;
  longitude: number;
  units: 'fahrenheit' | 'celsius';
}

export const DEFAULT_SETTINGS: WeatherSettings = {
  locationName: 'San Francisco, CA',
  latitude: 37.7749,
  longitude: -122.4194,
  units: 'fahrenheit',
};

const STORAGE_KEY = 'vienna-plugin:weather:settings';
const CHANGE_EVENT = 'vienna-plugin:weather:settings-changed';
```

The pattern uses **localStorage** for persistence and **CustomEvent** for cross-component sync:

```typescript
function loadSettings(): WeatherSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: WeatherSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // eslint-disable-next-line no-restricted-properties
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // localStorage unavailable — ignore
  }
}
```

::: tip eslint-disable-next-line no-restricted-properties
Vienna normally prohibits direct `window.*` access (enforced by ESLint). Plugin UI code running inside the evaluated bundle gets a pass — use the pragma `// eslint-disable-next-line no-restricted-properties` before `window.addEventListener`, `window.dispatchEvent`, `window.localStorage`, etc.
:::

The hook itself:

```typescript
export function useWeatherSettings() {
  const [settings, setSettingsState] = useState(loadSettings);

  // Listen for changes from other components
  useEffect(() => {
    const handler = () => setSettingsState(loadSettings());
    // eslint-disable-next-line no-restricted-properties
    window.addEventListener(CHANGE_EVENT, handler);
    // eslint-disable-next-line no-restricted-properties
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const updateSettings = useCallback((patch: Partial<WeatherSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings };
}
```

### 5.2 Cross-component sync pattern

When the settings drawer updates the location, the menu bar icon needs to re-render with the new temperature. The `CustomEvent` pattern makes this automatic:

```
Settings Drawer: updateSettings({ latitude: 48.8566, ... })
    → saveSettings() → localStorage.setItem() + window.dispatchEvent()
    → Menu Bar Icon: useEffect handler fires → setSettingsState(loadSettings())
    → useWeatherForecast detects changed settings → re-fetches forecast
    → Icon re-renders with new temperature
```

---

## 6. Data-Fetching Hook

The `useWeatherForecast` hook is the central data layer. It uses `usePluginQuery` from `@tryvienna/sdk/react` to fetch weather data through GraphQL:

```typescript
// src/ui/useWeatherForecast.ts

import { usePluginQuery } from '@tryvienna/sdk/react';
import { useWeatherSettings } from './useWeatherSettings';
import { GET_WEATHER_FORECAST } from '../client/operations';

export function useWeatherForecast() {
  const { settings } = useWeatherSettings();
  const { latitude, longitude, units, locationName } = settings;

  const { data, loading, error, refetch } = usePluginQuery(GET_WEATHER_FORECAST, {
    variables: { latitude, longitude, units },
    fetchPolicy: 'cache-and-network',
  });

  return {
    forecast: data?.weatherForecast ?? [],
    loading,
    error: error?.message ?? null,
    refetch,
    locationName,
    units,
  };
}
```

::: tip APOLLO CACHE REPLACES MANUAL CACHING
Compare this to a manual approach with module-level cache, fetch IDs, and race condition handling. Apollo handles all of this:
1. **Caching** — `InMemoryCache` normalizes and caches query results automatically
2. **Deduplication** — Multiple components mounting simultaneously share the same in-flight request
3. **Race conditions** — Apollo only applies the response from the most recent variable set
4. **Refetch** — Call `refetch()` to force fresh data from the server
5. **Cache-and-network** — Shows cached data immediately while fetching fresh data in the background
:::

---

## 7. Menu Bar Canvas

### 7.1 The icon component

The icon renders inside the TopBar's 32px ghost button. It shows the current weather emoji and temperature:

```tsx
// src/ui/WeatherMenuBarIcon.tsx

import type { MenuBarIconProps } from '@tryvienna/sdk';
import { useWeatherForecast } from './useWeatherForecast';

export function WeatherMenuBarIcon(_props: MenuBarIconProps) {
  const { forecast } = useWeatherForecast();
  const today = forecast[0];

  if (!today) return <span>--</span>;

  // Show current hour's temperature instead of daily high
  const currentHour = new Date().getHours();
  const hourly = today.hourly?.find((h) => h.hour === currentHour);
  const temp = hourly ? hourly.temp : today.high;
  const icon = hourly ? hourly.icon : today.icon;

  return (
    <span className="flex items-center gap-0.5 text-[11px] font-medium tabular-nums">
      <span>{icon}</span>
      <span>{temp}°</span>
    </span>
  );
}
```

**Key design decisions:**
- Uses `tabular-nums` so the width doesn't jump as temperature changes
- Shows the **current hour's** temperature, not the daily high — this is what users expect
- `text-[11px]` fits cleanly within the 32px button height
- Falls back to `--` while loading (not a spinner — too distracting for the menu bar)

### 7.2 The popover component

The popover opens when the user clicks the icon. It shows current conditions and a clickable 7-day forecast:

```tsx
// src/ui/WeatherMenuBarContent.tsx

import type { MenuBarCanvasProps } from '@tryvienna/sdk';
import { useWeatherForecast } from './useWeatherForecast';

export function WeatherMenuBarContent({ openPluginDrawer }: MenuBarCanvasProps) {
  const { forecast, loading, locationName, units } = useWeatherForecast();
  const unitLabel = units === 'celsius' ? 'C' : 'F';

  if (loading && forecast.length === 0) {
    return <div className="text-sm text-muted-foreground px-2 py-1">Loading...</div>;
  }

  const today = forecast[0];
  const currentHour = new Date().getHours();
  const currentHourly = today?.hourly?.find((h) => h.hour === currentHour);

  return (
    <div className="flex flex-col gap-3" style={{ minWidth: 320 }}>
      {/* Header: location + settings gear */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{locationName}</span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={() => openPluginDrawer({ view: 'settings', label: 'Weather Settings' })}
          aria-label="Weather settings"
        >
          {/* Settings gear SVG */}
        </button>
      </div>

      {/* Current conditions */}
      {today && currentHourly && (
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{currentHourly.icon}</span>
          <div>
            <div className="text-2xl font-semibold tabular-nums">
              {currentHourly.temp}°{unitLabel}
            </div>
            <div className="text-xs text-muted-foreground">{currentHourly.condition}</div>
          </div>
          <div className="ml-auto text-right text-xs text-muted-foreground tabular-nums">
            <div>H: {today.high}° L: {today.low}°</div>
            <div>{currentHourly.precipitation}% rain</div>
          </div>
        </div>
      )}

      <div className="border-t border-border" />

      {/* 7-day forecast — each day opens a drawer */}
      <div className="flex flex-col gap-0.5">
        {forecast.map((day) => (
          <button
            key={day.date}
            type="button"
            className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left"
            onClick={() => openPluginDrawer({
              view: 'day',
              date: day.date,
              label: `${day.icon} ${day.dayName}`,
            })}
          >
            <span className="w-16 text-xs text-muted-foreground truncate">{day.dayName}</span>
            <span className="text-sm">{day.icon}</span>
            <span className="flex-1 text-xs text-muted-foreground truncate">{day.condition}</span>
            <span className="text-xs tabular-nums text-foreground">{day.high}°</span>
            <span className="text-xs tabular-nums text-muted-foreground">{day.low}°</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 7.3 The `openPluginDrawer` callback

The `MenuBarCanvasProps` provide an `openPluginDrawer` function. Calling it:

1. Closes the popover
2. Opens the plugin's drawer canvas with the given payload

The payload is free-form `Record<string, unknown>`. By convention, use a `view` field to route between different drawer views:

```typescript
// Open settings in a full-width drawer
openPluginDrawer({ view: 'settings', label: 'Weather Settings' });

// Open hourly detail in a tabbed drawer
openPluginDrawer({ view: 'day', date: '2026-03-20', label: '⛅ Today' });
```

The `label` field becomes the tab title in the drawer.

---

## 8. Drawer Canvas

### 8.1 Drawer router

The drawer canvas receives a `payload` from `openPluginDrawer`. Route between views:

```tsx
// src/ui/WeatherPluginDrawer.tsx

import type { PluginDrawerCanvasProps } from '@tryvienna/sdk';
import { WeatherDayDrawer } from './WeatherDayDrawer';
import { WeatherSettingsDrawer } from './WeatherSettingsDrawer';

export function WeatherPluginDrawer({ payload }: PluginDrawerCanvasProps) {
  const view = (payload.view as string) ?? 'settings';

  switch (view) {
    case 'day':
      return <WeatherDayDrawer date={payload.date as string} />;
    case 'settings':
    default:
      return <WeatherSettingsDrawer />;
  }
}
```

### 8.2 Settings drawer

The settings drawer uses `usePluginQuery` with a debounced query variable and `skip` to control when the geocoding search fires:

```tsx
// src/ui/WeatherSettingsDrawer.tsx

import { usePluginQuery } from '@tryvienna/sdk/react';
import {
  DrawerBody, ContentSection,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Button, Input,
} from '@tryvienna/ui';
import { useWeatherSettings } from './useWeatherSettings';
import { SEARCH_WEATHER_LOCATIONS } from '../client/operations';
```

The geocoding search is debounced with `setTimeout`. Apollo handles race conditions automatically — only the response matching the current `debouncedQuery` variable is applied:

```tsx
const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');

// Debounce the search input
useEffect(() => {
  if (searchQuery.trim().length < 2) {
    setDebouncedQuery('');
    return;
  }
  const timeout = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
  return () => clearTimeout(timeout);
}, [searchQuery]);

// Geocoding search via GraphQL
const { data: searchData, loading: searching } = usePluginQuery(SEARCH_WEATHER_LOCATIONS, {
  variables: { query: debouncedQuery },
  skip: debouncedQuery.length < 2,
  fetchPolicy: 'network-only',
});

const searchResults = searchData?.weatherGeocodingSearch ?? [];
```

### 8.3 Day detail drawer

The hourly forecast view uses `DrawerBody` with inline styles for the data grid:

```tsx
// src/ui/WeatherDayDrawer.tsx

import { useMemo } from 'react';
import { DrawerBody } from '@tryvienna/ui';
import { useWeatherForecast } from './useWeatherForecast';

export function WeatherDayDrawer({ date }: { date: string }) {
  const { forecast, units } = useWeatherForecast();
  const day = useMemo(
    () => forecast.find((d) => d.date === date) ?? null,
    [forecast, date],
  );

  if (!day) {
    return (
      <DrawerBody>
        <div style={{ padding: 16, color: '#888' }}>No forecast data for this date.</div>
      </DrawerBody>
    );
  }

  return (
    <DrawerBody>
      {/* Day summary header */}
      {/* Column headers: Time, Temp, Condition, Rain, Wind */}
      {/* 24 hourly rows */}
      {day.hourly.map((hour) => <HourRow key={hour.hour} hour={hour} />)}
    </DrawerBody>
  );
}
```

---

## 9. Plugin Definition

### 9.1 The integration

The integration defines metadata and registers the GraphQL schema via the `schema` callback:

```typescript
// src/integration.ts

import { defineIntegration } from '@tryvienna/sdk';
import { registerWeatherSchema } from './schema';

const CLOUD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" ...><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>';

export const weatherApiIntegration = defineIntegration({
  id: 'weather_api',
  name: 'Weather (Open-Meteo)',
  description: 'Free weather forecast and geocoding via Open-Meteo API',
  icon: { svg: CLOUD_SVG },
  createClient: async () => ({}),
  schema: registerWeatherSchema,
});
```

::: tip SCHEMA CALLBACK
The `schema` callback is invoked at plugin load time with the Pothos builder. This is where GraphQL types and queries are registered. See section 4.3 for the full `registerWeatherSchema` implementation.
:::

::: info PluginIcon TYPE
The `icon` field requires a `PluginIcon` object — not a string. Use one of:
- `{ svg: '<svg>...</svg>' }` — inline SVG markup
- `{ png: 'base64...' }` — base64-encoded PNG
- `{ path: './icon.svg' }` — relative path to icon file
:::

### 9.2 The plugin entry point

The `definePlugin()` call ties everything together:

```typescript
// src/index.ts

import { definePlugin } from '@tryvienna/sdk';
import { weatherApiIntegration } from './integration';
import { WeatherPluginDrawer } from './ui/WeatherPluginDrawer';
import { WeatherMenuBarIcon } from './ui/WeatherMenuBarIcon';
import { WeatherMenuBarContent } from './ui/WeatherMenuBarContent';

const CLOUD_SVG = '<svg ...>...</svg>';

export const weatherPlugin = definePlugin({
  id: 'weather',
  name: 'Weather',
  description: 'Weather forecast in the menu bar',
  icon: { svg: CLOUD_SVG },

  integrations: [weatherApiIntegration],
  entities: [],

  canvases: {
    drawer: {
      component: WeatherPluginDrawer,
      label: 'Weather',
    },
    'menu-bar': {
      icon: WeatherMenuBarIcon,
      component: WeatherMenuBarContent,
      label: 'Weather',
      priority: 30,
    },
  },
});
```

### Canvas configuration

| Field | Type | Description |
|-------|------|-------------|
| `icon` | `ComponentType<MenuBarIconProps>` | Renders inside the 32px ghost button |
| `component` | `ComponentType<MenuBarCanvasProps>` | Renders in the popover |
| `label` | `string` | Tooltip text + accessibility label |
| `priority` | `number` | Sort order (lower = further right). Default: 50 |

---

## 10. Host Infrastructure

For menu-bar canvases to render, the host app needs two pieces of infrastructure.

### 10.1 The `usePluginMenuBarItems` hook

This hook queries the plugin system for all registered menu-bar canvases, filters by install state, and renders them as Radix Popover buttons:

```tsx
// apps/desktop/src/renderer/hooks/usePluginMenuBarItems.tsx

import { usePluginSystem, usePluginSystemVersion, usePluginErrors } from '../contexts/PluginSystemContext';
import { usePluginInstallState } from './usePluginInstallState';
import { PluginErrorBoundary } from '../../components/PluginErrorBoundary';

export function usePluginMenuBarItems(): ReactNode {
  const pluginSystem = usePluginSystem();
  const pluginVersion = usePluginSystemVersion();
  const { isInstalled } = usePluginInstallState();
  const { errors: pluginErrors } = usePluginErrors();
  const [openId, setOpenId] = useState<string | null>(null);

  // Get all menu-bar canvases, filtered by install state
  const allMenuBarItems = useMemo(
    () => pluginSystem.getMenuBarItems(),
    [pluginSystem, pluginVersion],
  );

  const menuBarItems = useMemo(
    () => allMenuBarItems.filter(({ pluginId }) => isInstalled(pluginId)),
    [allMenuBarItems, isInstalled],
  );

  // ... render Popover + Tooltip for each item
}
```

**Key details:**
- Only **one popover** can be open at a time (managed by `openId` state)
- Each icon and content component is wrapped in `PluginErrorBoundary` — a plugin crash never brings down the app
- The `createOpenPluginDrawer` callback closes the popover before opening the drawer
- Settings views open as full drawers (`openFull`), day views open as tabs (`openTab`)

### 10.2 Wire into ContentArea

Pass the menu bar items to the TopBar's `trailing` slot:

```tsx
// apps/desktop/src/components/ContentArea.tsx

import { usePluginMenuBarItems } from '../renderer/hooks/usePluginMenuBarItems';

export function ContentArea({ children }: { children?: ReactNode }) {
  const menuBarItems = usePluginMenuBarItems();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden"
         style={{ backgroundColor: 'var(--surface-elevated)' }}>
      <TopBar center={<ActiveWorkstreamTitle />} trailing={menuBarItems} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
```

---

## 11. Reactivity: Install State Sync

When a user installs a plugin in the plugin store, the menu-bar needs to immediately show the new icon — without a page refresh.

### The problem

`usePluginInstallState` uses `usePersistedState`, which stores data in `localStorage` via `useState`. Each call to `usePersistedState('pluginInstallState')` creates a **separate React state**. When the store updates one instance, other instances don't know about the change.

### The solution

Add cross-instance sync to `usePersistedState` via CustomEvent:

```typescript
// apps/desktop/src/storage.ts

const SYNC_EVENT = 'vienna:storage-sync';

function emitStorageSync(storageKey: string): void {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key: storageKey } }));
}

export function usePersistedState<K extends StorageKey>(name: K) {
  const entry = storageRegistry[name];

  const readFromStorage = useCallback((): StorageValue<K> => {
    const raw = window.localStorage.getItem(entry.key);
    // ... parse and validate ...
  }, [entry]);

  const [value, setValue] = useState<StorageValue<K>>(readFromStorage);

  // Listen for sync events from other hook instances
  useEffect(() => {
    const handler = (e: Event) => {
      const { key } = (e as CustomEvent<{ key: string }>).detail;
      if (key === entry.key) {
        setValue(readFromStorage());
      }
    };
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, [entry.key, readFromStorage]);

  const update = useCallback((v: StorageValue<K>) => {
    setValue(v);
    window.localStorage.setItem(entry.key, JSON.stringify(v));
    emitStorageSync(entry.key); // Notify other instances
  }, [entry]);

  return [value, update];
}
```

This pattern ensures:
1. Store drawer installs plugin → `setInstallMap({...})` + `emitStorageSync()`
2. `usePluginMenuBarItems` receives the event → re-reads localStorage → updates `isInstalled`
3. Menu bar re-renders with the new plugin icon — instantly

---

## 12. Complete File Listing

### New files

| File | Purpose |
|------|---------|
| `packages/plugin-weather/package.json` | Package configuration |
| `packages/plugin-weather/tsconfig.json` | TypeScript configuration |
| `packages/plugin-weather/codegen.ts` | GraphQL codegen config |
| `packages/plugin-weather/src/index.ts` | Plugin entry point (`definePlugin`) |
| `packages/plugin-weather/src/integration.ts` | Integration metadata + schema callback |
| `packages/plugin-weather/src/schema.ts` | GraphQL types + query resolvers (main process) |
| `packages/plugin-weather/src/api.ts` | Open-Meteo API functions (main process, native fetch) |
| `packages/plugin-weather/src/client/operations.ts` | TypedDocumentNode GraphQL operations |
| `packages/plugin-weather/src/client/generated/` | Auto-generated types from codegen |
| `packages/plugin-weather/src/ui/weather-data.ts` | TypeScript interfaces |
| `packages/plugin-weather/src/ui/useWeatherSettings.ts` | Persistent settings hook |
| `packages/plugin-weather/src/ui/useWeatherForecast.ts` | GraphQL query hook (Apollo via usePluginQuery) |
| `packages/plugin-weather/src/ui/WeatherMenuBarIcon.tsx` | Menu-bar icon (32px button) |
| `packages/plugin-weather/src/ui/WeatherMenuBarContent.tsx` | Menu-bar popover (forecast) |
| `packages/plugin-weather/src/ui/WeatherPluginDrawer.tsx` | Drawer view router |
| `packages/plugin-weather/src/ui/WeatherSettingsDrawer.tsx` | Settings panel |
| `packages/plugin-weather/src/ui/WeatherDayDrawer.tsx` | Hourly detail view |
| `apps/desktop/src/renderer/hooks/usePluginMenuBarItems.tsx` | Menu-bar rendering hook |

### Modified files

| File | Change |
|------|--------|
| `apps/desktop/src/components/ContentArea.tsx` | Wire `trailing` slot with menu-bar items |
| `apps/desktop/src/storage.ts` | Add cross-instance sync for `usePersistedState` |
| `packages/graphql/src/schema/plugin-schemas.ts` | Register weather schema for codegen |

---

## 13. Checklist

Before shipping your menu-bar plugin:

- [ ] Plugin ID is lowercase alphanumeric + underscores
- [ ] `PluginIcon` uses `{ svg: '...' }` — not a bare string
- [ ] `definePlugin` uses `name` (not `displayName`)
- [ ] Integration has `schema` callback to register GraphQL types + queries
- [ ] API functions live in main-process files (not `ui/`) and use native `fetch()`
- [ ] GraphQL operations defined in `src/client/operations.ts` with `graphql()` tag
- [ ] Renderer hooks use `usePluginQuery` from `@tryvienna/sdk/react`
- [ ] Schema registered in `plugin-schemas.ts` for codegen
- [ ] `codegen.ts` configured with `createPluginCodegenConfig()`
- [ ] `// eslint-disable-next-line no-restricted-properties` before every `window.*` call
- [ ] Settings sync across components (CustomEvent or `usePersistedState`)
- [ ] Loading states handled gracefully (no spinners in the menu bar — use `--` placeholder)
- [ ] `tabular-nums` on all numeric displays to prevent layout shift
- [ ] Plugin crash contained by `PluginErrorBoundary` wrapping icon and content
- [ ] `pnpm typecheck --filter=@vienna/plugin-weather` passes
- [ ] `pnpm --filter @vienna/plugin-weather codegen` generates types successfully
- [ ] Plugin auto-discovers via `packages/plugin-*` naming convention
