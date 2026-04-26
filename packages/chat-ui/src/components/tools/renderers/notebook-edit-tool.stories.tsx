// NotebookEditTool Stories — Jupyter notebook cell editing renderer
//
// NotebookEdit modifies cells in .ipynb notebooks.
// Input: { notebook_path, cell_number, new_source, cell_type? }.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { NotebookEditTool } from './notebook-edit-tool';

const meta: Meta<typeof NotebookEditTool> = {
  title: 'Tools/Renderers/notebook-edit-tool',
  component: NotebookEditTool,
  tags: ['autodocs'],
  args: { messageId: 'msg-1', onApprove: fn(), onDeny: fn() },
};

export default meta;
type Story = StoryObj<typeof NotebookEditTool>;

/** Code cell edit — completed */
export const CodeCell: Story = {
  args: {
    toolUse: {
      id: 'tool-1',
      name: 'NotebookEdit',
      input: {
        notebook_path: 'notebooks/analysis.ipynb',
        cell_number: 3,
        new_source: 'import pandas as pd\nimport matplotlib.pyplot as plt\n\ndf = pd.read_csv("data.csv")\ndf.head()',
      },
      status: 'complete',
      result: { success: true, output: '' },
    },
  },
};

/** Markdown cell edit */
export const MarkdownCell: Story = {
  args: {
    toolUse: {
      id: 'tool-2',
      name: 'NotebookEdit',
      input: {
        notebook_path: 'notebooks/report.ipynb',
        cell_number: 0,
        new_source: '# Data Analysis Report\n\nThis notebook analyzes quarterly sales data.',
        cell_type: 'markdown',
      },
      status: 'complete',
      result: { success: true, output: '' },
    },
  },
};

/** Currently editing */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-3',
      name: 'NotebookEdit',
      input: {
        notebook_path: 'notebooks/train.ipynb',
        cell_number: 7,
        new_source: '',
      },
      status: 'running',
    },
  },
};

/** Needs permission */
export const NeedsPermission: Story = {
  args: {
    toolUse: {
      id: 'tool-4',
      name: 'NotebookEdit',
      input: {
        notebook_path: 'notebooks/production.ipynb',
        cell_number: 2,
        new_source: 'model.fit(X_train, y_train, epochs=100)',
      },
      status: 'pending_permission',
      requestId: 'req-001',
    },
  },
};
