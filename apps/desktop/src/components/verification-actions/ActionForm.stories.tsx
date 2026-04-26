import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ActionForm } from './ActionForm';

const meta: Meta<typeof ActionForm> = {
  title: 'VerificationActions/ActionForm',
  component: ActionForm,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md p-6 bg-surface-sunken">
        <Story />
      </div>
    ),
  ],
  args: {
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ActionForm>;

/** Empty form for adding a new prompt action. */
export const Empty: Story = {
  args: {},
};

/** Pre-filled form for editing an existing action. */
export const WithInitialValues: Story = {
  args: {
    initialLabel: 'Deploy to Staging',
    initialPrompt: 'Deploy the current branch to the staging environment and run smoke tests.',
    submitLabel: 'Save Changes',
  },
};

/** Custom submit label for the add flow. */
export const AddAction: Story = {
  args: {
    submitLabel: 'Add Action',
  },
};
