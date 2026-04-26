/**
 * Chart — Recharts wrapper with theming, tooltips, and legends
 *
 * @ai-context
 * - Wraps Recharts ResponsiveContainer for auto-sizing
 * - Injects `<style>` tag with CSS custom properties per theme
 * - Colors referenced as `var(--color-{key})` in Recharts fill/stroke props
 * - ChartConfig maps data keys to labels, colors, and optional icons
 * - ChartTooltipContent and ChartLegendContent auto-read config from context
 * - 8pt grid: gap-2, py-2, px-3 in tooltip container
 * - Default aspect-video ratio, override with className
 *
 * @example
 * ```tsx
 * const config: ChartConfig = {
 *   revenue: { label: "Revenue", color: "oklch(0.7 0.15 250)" },
 *   expenses: { label: "Expenses", theme: { light: "#ef4444", dark: "#f87171" } },
 * };
 *
 * <ChartContainer config={config}>
 *   <BarChart data={data}>
 *     <Bar dataKey="revenue" fill="var(--color-revenue)" />
 *     <Bar dataKey="expenses" fill="var(--color-expenses)" />
 *     <ChartTooltip content={<ChartTooltipContent />} />
 *     <ChartLegend content={<ChartLegendContent />} />
 *   </BarChart>
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '../utils/cn';

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const;

/**
 * ChartConfig — Configuration object for chart data series.
 *
 * @ai-context
 * - Keys correspond to data field names in your dataset
 * - `color` sets a single color for both light and dark themes
 * - `theme` allows different colors per theme: `{ light: "...", dark: "..." }`
 * - Colors become CSS custom properties: `--color-{key}`
 * - `label` is used in tooltips and legends
 * - `icon` renders a custom icon in tooltips/legends instead of the color dot
 */
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

/**
 * useChart — Access chart configuration context.
 * Must be used within a `<ChartContainer>`.
 *
 * @ai-context
 * - Throws if used outside ChartContainer
 *
 * @returns {{ config: ChartConfig }}
 */
function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }

  return context;
}

/**
 * ChartContainer — Wrapper for Recharts charts that provides theming,
 * responsive sizing, and consistent styling. Injects CSS custom properties
 * for chart colors.
 *
 * @ai-context
 * - Wraps Recharts ResponsiveContainer for auto-sizing
 * - Injects `<style>` tag with CSS custom properties per theme
 * - Colors referenced as `var(--color-{key})` in Recharts fill/stroke props
 * - Default aspect-video ratio, override with className
 * - Overrides Recharts internal styles (grid lines, cursors, etc.) via deep selectors
 */
function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join('\n')}
}
`
          )
          .join('\n'),
      }}
    />
  );
};

/**
 * ChartTooltip — Re-export of Recharts Tooltip. Use with ChartTooltipContent
 * for themed tooltips.
 *
 * @ai-context
 * - Pass `content={<ChartTooltipContent />}` for styled tooltip
 * - All Recharts Tooltip props supported (cursor, animationDuration, etc.)
 */
const ChartTooltip = RechartsPrimitive.Tooltip;

/**
 * ChartTooltipContent — Styled tooltip content for Recharts charts.
 * Reads chart config for labels, colors, and icons.
 *
 * @ai-context
 * - Auto-reads ChartConfig from context for labels and icons
 * - Supports custom `formatter` prop from Recharts
 * - Indicator styles: dot (circle), line (bar), dashed (dashed border)
 * - Nested label layout when single series with non-dot indicator
 * - 8pt grid: gap-2, py-2, px-3
 *
 * @props
 * - `indicator` — "dot" | "line" | "dashed" (visual style, default: "dot")
 * - `hideLabel` — Hide the tooltip header label
 * - `hideIndicator` — Hide color indicators
 * - `nameKey` — Override which data key to use for series names
 * - `labelKey` — Override which data key to use for the label
 */
function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: 'line' | 'dot' | 'dashed';
    nameKey?: string;
    labelKey?: string;
  }) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === 'string'
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn('font-medium', labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== 'dot';

  return (
    <div
      className={cn(
        'border-border/50 bg-background grid min-w-[8rem] items-start gap-2 rounded-lg border px-3 py-2 text-xs shadow-xl',
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-2">
        {payload
          .filter((item) => item.type !== 'none')
          .map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload.fill || item.color;

            return (
              <div
                key={item.dataKey}
                className={cn(
                  '[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5',
                  indicator === 'dot' && 'items-center'
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
                            {
                              'h-2.5 w-2.5': indicator === 'dot',
                              'w-1': indicator === 'line',
                              'w-0 border-[1.5px] border-dashed bg-transparent':
                                indicator === 'dashed',
                              'my-0.5': nestLabel && indicator === 'dashed',
                            }
                          )}
                          style={
                            {
                              '--color-bg': indicatorColor,
                              '--color-border': indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        'flex flex-1 justify-between leading-none',
                        nestLabel ? 'items-end' : 'items-center'
                      )}
                    >
                      <div className="grid gap-2">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

/**
 * ChartLegend — Re-export of Recharts Legend. Use with ChartLegendContent
 * for themed legends.
 *
 * @ai-context
 * - Pass `content={<ChartLegendContent />}` for styled legend
 */
const ChartLegend = RechartsPrimitive.Legend;

/**
 * ChartLegendContent — Styled legend content for Recharts charts.
 *
 * @ai-context
 * - Reads ChartConfig from context for labels and icons
 * - Renders colored dots or custom icons per series
 *
 * @props
 * - `hideIcon` — Hide color indicators (default: false)
 * - `nameKey` — Override which data key to use for legend labels
 * - `verticalAlign` — "top" | "bottom" (affects padding)
 */
function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: React.ComponentProps<'div'> &
  Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
    hideIcon?: boolean;
    nameKey?: string;
  }) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className
      )}
    >
      {payload
        .filter((item) => item.type !== 'none')
        .map((item) => {
          const key = `${nameKey || item.dataKey || 'value'}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={item.value}
              className={cn(
                '[&>svg]:text-muted-foreground flex items-center gap-2 [&>svg]:h-3 [&>svg]:w-3'
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const payloadPayload =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  useChart,
};
