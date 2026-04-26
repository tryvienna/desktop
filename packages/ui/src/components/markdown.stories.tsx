import type { Meta, StoryObj } from '@storybook/react';
import { Markdown } from './markdown';

const meta = {
  title: 'RichContent/Markdown',
  component: Markdown,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMarkdown = `# Heading 1

## Heading 2

### Heading 3

This is a paragraph with **bold text**, *italic text*, and a [link](https://example.com).

- First item
- Second item
  - Nested item
- Third item

1. Ordered one
2. Ordered two
3. Ordered three

> This is a blockquote with some wisdom.

Here is some \`inline code\` in a sentence.

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

---

| Column A | Column B | Column C |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`;

export const Default: Story = {
  args: { content: sampleMarkdown },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
};

export const SmallSize: Story = {
  args: { content: sampleMarkdown, size: 'sm' },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
};

const codeMarkdown = `## Code Highlighting

TypeScript example:

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  if (!response.ok) throw new Error('User not found');
  return response.json();
}
\`\`\`

Python example:

\`\`\`python
from dataclasses import dataclass

@dataclass
class User:
    id: str
    name: str
    email: str

def greet(user: User) -> str:
    return f"Hello, {user.name}!"
\`\`\`

JSON example:

\`\`\`json
{
  "name": "vienna-ui",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0",
    "tailwindcss": "^4.0.0"
  }
}
\`\`\`

Shell example:

\`\`\`bash
#!/bin/bash
echo "Installing dependencies..."
npm install
npm run build
\`\`\`
`;

export const CodeHighlighting: Story = {
  args: { content: codeMarkdown },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
};
