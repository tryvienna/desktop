import type { Meta, StoryObj } from '@storybook/react';
import { ChartBlock } from './chart-block';

const meta = {
  title: 'RichContent/ChartBlock',
  component: ChartBlock,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ChartBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

const barChartJson = JSON.stringify({
  type: 'bar',
  title: 'Monthly Revenue',
  xKey: 'month',
  data: [
    { month: 'Jan', revenue: 4200, costs: 2400 },
    { month: 'Feb', revenue: 5800, costs: 3100 },
    { month: 'Mar', revenue: 6200, costs: 2800 },
    { month: 'Apr', revenue: 4900, costs: 2600 },
    { month: 'May', revenue: 7400, costs: 3400 },
    { month: 'Jun', revenue: 8100, costs: 3900 },
  ],
});

export const BarChart: Story = {
  args: { json: barChartJson },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

const lineChartJson = JSON.stringify({
  type: 'line',
  title: 'User Growth',
  xKey: 'month',
  data: [
    { month: 'Jan', users: 1200, sessions: 3400 },
    { month: 'Feb', users: 1800, sessions: 5100 },
    { month: 'Mar', users: 2400, sessions: 6800 },
    { month: 'Apr', users: 3100, sessions: 8200 },
    { month: 'May', users: 4200, sessions: 11000 },
    { month: 'Jun', users: 5600, sessions: 14500 },
  ],
});

export const LineChart: Story = {
  args: { json: lineChartJson },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

const pieChartJson = JSON.stringify({
  type: 'pie',
  title: 'Browser Share',
  xKey: 'browser',
  data: [
    { browser: 'Chrome', share: 65 },
    { browser: 'Safari', share: 19 },
    { browser: 'Firefox', share: 8 },
    { browser: 'Edge', share: 5 },
    { browser: 'Other', share: 3 },
  ],
  series: [{ key: 'share', label: 'Market Share' }],
});

export const PieChart: Story = {
  args: { json: pieChartJson },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};
