import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command';
import { Button } from './button';
import {
  CalendarIcon,
  SmileIcon,
  CalculatorIcon,
  SettingsIcon,
  UserIcon,
  CreditCardIcon,
} from 'lucide-react';

const meta = {
  title: 'Menus/Command',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md md:min-w-[450px]">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <CalendarIcon /> Calendar
          </CommandItem>
          <CommandItem>
            <SmileIcon /> Search Emoji
          </CommandItem>
          <CommandItem>
            <CalculatorIcon /> Calculator
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <UserIcon /> Profile
            <CommandShortcut>Cmd+P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <CreditCardIcon /> Billing
            <CommandShortcut>Cmd+B</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <SettingsIcon /> Settings
            <CommandShortcut>Cmd+,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

function CommandDialogDemo() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Press{' '}
          <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none">
            Cmd+K
          </kbd>
        </p>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open Command Palette
        </Button>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <CalendarIcon /> Calendar
            </CommandItem>
            <CommandItem>
              <SmileIcon /> Search Emoji
            </CommandItem>
            <CommandItem>
              <CalculatorIcon /> Calculator
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>
              <UserIcon /> Profile
              <CommandShortcut>Cmd+P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <CreditCardIcon /> Billing
              <CommandShortcut>Cmd+B</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <SettingsIcon /> Settings
              <CommandShortcut>Cmd+,</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export const Dialog: Story = {
  render: () => <CommandDialogDemo />,
};

export const Empty: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md md:min-w-[450px]">
      <CommandInput placeholder="Search for something..." value="xyznonexistent" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <CalendarIcon /> Calendar
          </CommandItem>
          <CommandItem>
            <SmileIcon /> Search Emoji
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
