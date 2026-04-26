import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Combobox } from './combobox';

const meta = {
  title: 'Composed/Combobox',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const fruitOptions = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Dragon Fruit', value: 'dragonfruit' },
  { label: 'Elderberry', value: 'elderberry' },
  { label: 'Fig', value: 'fig' },
  { label: 'Grape', value: 'grape' },
  { label: 'Honeydew', value: 'honeydew' },
];

function SingleSelectDemo() {
  const [value, setValue] = React.useState('');
  return (
    <div className="w-64">
      <Combobox
        options={fruitOptions}
        value={value}
        onValueChange={setValue}
        placeholder="Select a fruit..."
        searchPlaceholder="Search fruits..."
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Selected: &quot;{value || '(none)'}&quot;
      </p>
    </div>
  );
}

export const Single: Story = {
  render: () => <SingleSelectDemo />,
};

const tagOptions = [
  { label: 'Bug', value: 'bug' },
  { label: 'Feature', value: 'feature' },
  { label: 'Enhancement', value: 'enhancement' },
  { label: 'Documentation', value: 'docs' },
  { label: 'Performance', value: 'performance' },
  { label: 'Security', value: 'security' },
  { label: 'Testing', value: 'testing' },
];

function MultiSelectDemo() {
  const [values, setValues] = React.useState<string[]>(['bug', 'feature']);
  return (
    <div className="w-72">
      <Combobox
        options={tagOptions}
        value={values}
        onValueChange={setValues}
        multiple
        placeholder="Select tags..."
        searchPlaceholder="Search tags..."
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Selected: {values.length > 0 ? values.join(', ') : '(none)'}
      </p>
    </div>
  );
}

export const Multi: Story = {
  render: () => <MultiSelectDemo />,
};

function CreatableDemo() {
  const [options, setOptions] = React.useState([
    { label: 'React', value: 'react' },
    { label: 'Vue', value: 'vue' },
    { label: 'Svelte', value: 'svelte' },
    { label: 'Angular', value: 'angular' },
  ]);
  const [values, setValues] = React.useState<string[]>(['react']);

  const handleCreate = (inputValue: string) => {
    const newOption = {
      label: inputValue,
      value: inputValue.toLowerCase().replace(/\s+/g, '-'),
    };
    setOptions((prev) => [...prev, newOption]);
    setValues((prev) => [...prev, newOption.value]);
  };

  return (
    <div className="w-72">
      <Combobox
        options={options}
        value={values}
        onValueChange={setValues}
        multiple
        placeholder="Select frameworks..."
        searchPlaceholder="Search or create..."
        onCreateOption={handleCreate}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Selected: {values.length > 0 ? values.join(', ') : '(none)'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Type a new name and select &quot;Create&quot; to add it.
      </p>
    </div>
  );
}

export const Creatable: Story = {
  render: () => <CreatableDemo />,
};
