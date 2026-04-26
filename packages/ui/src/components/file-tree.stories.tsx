import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileTree } from './file-tree';

const meta = {
  title: 'Domain/FileTree',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const PROJECT_FILES = [
  {
    name: 'src',
    type: 'directory' as const,
    children: [
      {
        name: 'components',
        type: 'directory' as const,
        children: [
          { name: 'button.tsx', type: 'file' as const },
          { name: 'button.stories.tsx', type: 'file' as const },
          { name: 'input.tsx', type: 'file' as const },
          { name: 'dialog.tsx', type: 'file' as const },
          { name: 'index.ts', type: 'file' as const },
        ],
      },
      {
        name: 'hooks',
        type: 'directory' as const,
        children: [
          { name: 'use-mobile.ts', type: 'file' as const },
          { name: 'index.ts', type: 'file' as const },
        ],
      },
      {
        name: 'utils',
        type: 'directory' as const,
        children: [{ name: 'cn.ts', type: 'file' as const }],
      },
      { name: 'index.ts', type: 'file' as const },
      { name: 'styles.css', type: 'file' as const },
    ],
  },
  {
    name: 'tests',
    type: 'directory' as const,
    children: [
      { name: 'setup.ts', type: 'file' as const },
      { name: 'smoke.unit.test.tsx', type: 'file' as const },
    ],
  },
  { name: 'package.json', type: 'file' as const },
  { name: 'tsconfig.json', type: 'file' as const },
  { name: 'README.md', type: 'file' as const },
  { name: '.gitignore', type: 'file' as const },
  { name: '.env', type: 'file' as const },
];

export const Default: Story = {
  render: () => (
    <div className="w-72 p-2 border border-border rounded-lg bg-background">
      <FileTree items={PROJECT_FILES} defaultExpanded={new Set(['src', 'src/components'])} />
    </div>
  ),
};

function InteractiveDemo() {
  const [selected, setSelected] = React.useState<string | undefined>(undefined);
  return (
    <div className="flex gap-4">
      <div className="w-72 p-2 border border-border rounded-lg bg-background">
        <FileTree
          items={PROJECT_FILES}
          defaultExpanded={new Set(['src', 'src/components'])}
          onFileClick={setSelected}
          selectedPath={selected}
        />
      </div>
      <div className="w-48 p-4 border border-border rounded-lg bg-background">
        <p className="text-sm text-muted-foreground">
          {selected ? `Selected: ${selected}` : 'Click a file to select'}
        </p>
      </div>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};

const MULTI_LANG = [
  {
    name: 'src',
    type: 'directory' as const,
    children: [
      { name: 'main.py', type: 'file' as const },
      { name: 'server.go', type: 'file' as const },
      { name: 'app.rs', type: 'file' as const },
      { name: 'index.html', type: 'file' as const },
      { name: 'styles.scss', type: 'file' as const },
      { name: 'query.sql', type: 'file' as const },
      { name: 'schema.graphql', type: 'file' as const },
      { name: 'config.yaml', type: 'file' as const },
      { name: 'data.json', type: 'file' as const },
      { name: 'deploy.sh', type: 'file' as const },
    ],
  },
  { name: 'Dockerfile', type: 'file' as const },
  { name: 'Cargo.toml', type: 'file' as const },
  { name: 'go.mod', type: 'file' as const },
  { name: 'requirements.txt', type: 'file' as const },
];

export const MultiLanguage: Story = {
  render: () => (
    <div className="w-72 p-2 border border-border rounded-lg bg-background">
      <FileTree items={MULTI_LANG} defaultExpanded={new Set(['src'])} />
    </div>
  ),
};
