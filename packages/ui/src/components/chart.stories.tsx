import type { Meta, StoryObj } from '@storybook/react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from './chart';
import type { ChartConfig } from './chart';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const meta = {
  title: 'Data/Chart',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const barData = [
  { month: 'Jan', revenue: 1200, expenses: 900 },
  { month: 'Feb', revenue: 1800, expenses: 1100 },
  { month: 'Mar', revenue: 2200, expenses: 1300 },
  { month: 'Apr', revenue: 1600, expenses: 1000 },
  { month: 'May', revenue: 2400, expenses: 1400 },
  { month: 'Jun', revenue: 2800, expenses: 1600 },
];

const barConfig = {
  revenue: { label: 'Revenue', color: 'oklch(0.7 0.15 250)' },
  expenses: { label: 'Expenses', color: 'oklch(0.65 0.2 150)' },
} satisfies ChartConfig;

export const BarChartStory: Story = {
  name: 'Bar Chart',
  render: () => (
    <div className="w-[400px]">
      <ChartContainer config={barConfig}>
        <BarChart data={barData}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
          <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  ),
};

const lineData = [
  { month: 'Jan', users: 400, sessions: 240 },
  { month: 'Feb', users: 600, sessions: 380 },
  { month: 'Mar', users: 550, sessions: 420 },
  { month: 'Apr', users: 780, sessions: 500 },
  { month: 'May', users: 900, sessions: 620 },
  { month: 'Jun', users: 1100, sessions: 780 },
];

const lineConfig = {
  users: { label: 'Users', color: 'oklch(0.7 0.15 250)' },
  sessions: { label: 'Sessions', color: 'oklch(0.65 0.2 150)' },
} satisfies ChartConfig;

export const LineChartStory: Story = {
  name: 'Line Chart',
  render: () => (
    <div className="w-[400px]">
      <ChartContainer config={lineConfig}>
        <LineChart data={lineData}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="users"
            stroke="var(--color-users)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="sessions"
            stroke="var(--color-sessions)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  ),
};

const pieData = [
  { name: 'chrome', value: 275, fill: 'var(--color-chrome)' },
  { name: 'safari', value: 200, fill: 'var(--color-safari)' },
  { name: 'firefox', value: 187, fill: 'var(--color-firefox)' },
  { name: 'edge', value: 173, fill: 'var(--color-edge)' },
  { name: 'other', value: 90, fill: 'var(--color-other)' },
];

const pieConfig = {
  chrome: { label: 'Chrome', color: 'oklch(0.7 0.15 250)' },
  safari: { label: 'Safari', color: 'oklch(0.65 0.2 150)' },
  firefox: { label: 'Firefox', color: 'oklch(0.7 0.18 30)' },
  edge: { label: 'Edge', color: 'oklch(0.6 0.15 300)' },
  other: { label: 'Other', color: 'oklch(0.55 0.1 200)' },
} satisfies ChartConfig;

export const PieChartStory: Story = {
  name: 'Pie Chart',
  render: () => (
    <div className="w-[400px]">
      <ChartContainer config={pieConfig}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
          />
        </PieChart>
      </ChartContainer>
    </div>
  ),
};
