import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Calendar } from './calendar';
import type { DateRange } from 'react-day-picker';

const meta = {
  title: 'Data/Calendar',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function CalendarDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return <Calendar mode="single" selected={date} onSelect={setDate} />;
}

export const Default: Story = {
  render: () => <CalendarDemo />,
};

function CalendarRangeDemo() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(new Date().setDate(new Date().getDate() + 7)),
  });

  return <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />;
}

export const Range: Story = {
  render: () => <CalendarRangeDemo />,
};

function CalendarDropdownDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      captionLayout="dropdown"
      fromYear={2020}
      toYear={2030}
    />
  );
}

export const Dropdown: Story = {
  render: () => <CalendarDropdownDemo />,
};
