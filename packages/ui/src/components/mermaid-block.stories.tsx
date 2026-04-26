import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MermaidBlock } from './mermaid-block';

const meta = {
  title: 'RichContent/MermaidBlock',
  component: MermaidBlock,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof MermaidBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

const flowChartCode = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E`;

export const FlowChart: Story = {
  args: { code: flowChartCode },
  decorators: [
    (Story) => (
      <React.Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-md" />}>
        <div className="w-[500px]">
          <Story />
        </div>
      </React.Suspense>
    ),
  ],
};

const sequenceDiagramCode = `sequenceDiagram
    participant Client
    participant Server
    participant Database
    Client->>Server: POST /api/users
    Server->>Database: INSERT INTO users
    Database-->>Server: OK
    Server-->>Client: 201 Created`;

export const SequenceDiagram: Story = {
  args: { code: sequenceDiagramCode },
  decorators: [
    (Story) => (
      <React.Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-md" />}>
        <div className="w-[500px]">
          <Story />
        </div>
      </React.Suspense>
    ),
  ],
};
