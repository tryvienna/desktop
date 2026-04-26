import type { Meta, StoryObj } from '@storybook/react';
import { FileTypeIcon, TypeScriptFileIcon, type FileIconType } from './file-icons';

const meta = {
  title: 'Domain/FileIcons',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ALL_TYPES: { type: FileIconType; label: string }[] = [
  { type: 'typescript', label: 'TypeScript' },
  { type: 'javascript', label: 'JavaScript' },
  { type: 'react', label: 'React/TSX' },
  { type: 'vue', label: 'Vue' },
  { type: 'svelte', label: 'Svelte' },
  { type: 'python', label: 'Python' },
  { type: 'go', label: 'Go' },
  { type: 'rust', label: 'Rust' },
  { type: 'java', label: 'Java' },
  { type: 'kotlin', label: 'Kotlin' },
  { type: 'swift', label: 'Swift' },
  { type: 'csharp', label: 'C#' },
  { type: 'cpp', label: 'C++' },
  { type: 'c', label: 'C' },
  { type: 'ruby', label: 'Ruby' },
  { type: 'php', label: 'PHP' },
  { type: 'json', label: 'JSON' },
  { type: 'yaml', label: 'YAML' },
  { type: 'toml', label: 'TOML' },
  { type: 'xml', label: 'XML' },
  { type: 'sql', label: 'SQL' },
  { type: 'graphql', label: 'GraphQL' },
  { type: 'html', label: 'HTML' },
  { type: 'css', label: 'CSS' },
  { type: 'scss', label: 'SCSS' },
  { type: 'less', label: 'LESS' },
  { type: 'shell', label: 'Shell' },
  { type: 'powershell', label: 'PowerShell' },
  { type: 'markdown', label: 'Markdown' },
  { type: 'pdf', label: 'PDF' },
  { type: 'word', label: 'Word' },
  { type: 'excel', label: 'Excel' },
  { type: 'powerpoint', label: 'PowerPoint' },
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'video', label: 'Video' },
  { type: 'audio', label: 'Audio' },
  { type: 'archive', label: 'Archive' },
  { type: 'git', label: 'Git' },
  { type: 'env', label: 'Env' },
  { type: 'folder', label: 'Folder' },
  { type: 'folder-open', label: 'Folder Open' },
  { type: 'file', label: 'Generic File' },
];

export const AllIcons: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      {ALL_TYPES.map(({ type, label }) => (
        <div key={type} className="flex items-center gap-2 px-2 py-1">
          <FileTypeIcon type={type} size={20} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <TypeScriptFileIcon size={12} />
      <TypeScriptFileIcon size={16} />
      <TypeScriptFileIcon size={20} />
      <TypeScriptFileIcon size={24} />
      <TypeScriptFileIcon size={32} />
    </div>
  ),
};
