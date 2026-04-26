import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'Form Controls/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'url', 'tel', 'file'],
    },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Enter text...' },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const Password: Story = {
  args: { type: 'password', placeholder: 'Enter password...' },
};

export const WithError: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="email-err">Email</Label>
      <Input id="email-err" type="email" placeholder="you@example.com" aria-invalid={true} />
      <p className="text-destructive text-sm">Please enter a valid email address.</p>
    </div>
  ),
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled input', disabled: true },
};

export const FileInput: Story = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="file">Upload file</Label>
      <Input id="file" type="file" />
    </div>
  ),
};

export const Search: Story = {
  args: { type: 'search', placeholder: 'Search...' },
};

export const AllTypes: Story = {
  render: () => (
    <div className="grid gap-4 w-80">
      <Input type="text" placeholder="Text input" />
      <Input type="email" placeholder="Email input" />
      <Input type="password" placeholder="Password input" />
      <Input type="number" placeholder="Number input" />
      <Input type="search" placeholder="Search input" />
      <Input type="url" placeholder="URL input" />
      <Input type="tel" placeholder="Phone input" />
    </div>
  ),
};
