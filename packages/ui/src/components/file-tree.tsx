/**
 * FileTree — File directory tree view with language-aware icons
 *
 * @ai-context
 * - Renders hierarchical file/directory structure
 * - Auto-detects file type icons from file extensions
 * - Folders expand/collapse with chevron + folder icon
 * - Supports selection and click handlers
 * - All spacing on 8pt grid
 * - data-slot="file-tree"
 *
 * @example
 * <FileTree
 *   items={[
 *     { name: 'src', type: 'directory', children: [
 *       { name: 'index.tsx', type: 'file' },
 *       { name: 'utils.ts', type: 'file' },
 *     ]},
 *     { name: 'package.json', type: 'file' },
 *   ]}
 * />
 */
import * as React from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { FileTypeIcon, FolderIcon, FolderOpenIcon, getFileIconType } from './file-icons';

interface FileTreeItem {
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeItem[];
  /** Override auto-detected icon type */
  iconType?: string;
}

interface FileTreeProps extends React.ComponentProps<'div'> {
  items: FileTreeItem[];
  /** Called when a file is clicked */
  onFileClick?: (path: string) => void;
  /** Currently selected file path */
  selectedPath?: string;
  /** Set of initially expanded directory paths */
  defaultExpanded?: Set<string>;
}

function FileTree({
  items,
  onFileClick,
  selectedPath,
  defaultExpanded,
  className,
  ...props
}: FileTreeProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(defaultExpanded ?? new Set());

  const toggleDir = React.useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return (
    <div data-slot="file-tree" className={cn('text-sm', className)} {...props}>
      {items.map((item) => (
        <FileTreeNode
          key={item.name}
          item={item}
          path={item.name}
          depth={0}
          expanded={expanded}
          toggleDir={toggleDir}
          onFileClick={onFileClick}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}

interface FileTreeNodeProps {
  item: FileTreeItem;
  path: string;
  depth: number;
  expanded: Set<string>;
  toggleDir: (path: string) => void;
  onFileClick?: (path: string) => void;
  selectedPath?: string;
}

function FileTreeNode({
  item,
  path,
  depth,
  expanded,
  toggleDir,
  onFileClick,
  selectedPath,
}: FileTreeNodeProps) {
  const isDir = item.type === 'directory';
  const isOpen = expanded.has(path);
  const isSelected = selectedPath === path;
  const paddingLeft = depth * 16 + 4; // 16px per level + 4px base

  if (isDir) {
    return (
      <>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 w-full py-1 px-1 rounded-sm text-left transition-colors',
            'hover:bg-accent/50 text-foreground',
            isSelected && 'bg-accent'
          )}
          style={{ paddingLeft }}
          onClick={() => toggleDir(path)}
          data-slot="file-tree-directory"
        >
          <ChevronRightIcon
            className={cn(
              'size-3 shrink-0 text-muted-foreground transition-transform duration-150',
              isOpen && 'rotate-90'
            )}
          />
          {isOpen ? (
            <FolderOpenIcon size={16} className="text-muted-foreground shrink-0" />
          ) : (
            <FolderIcon size={16} className="text-muted-foreground shrink-0" />
          )}
          <span className="truncate ml-1">{item.name}</span>
        </button>
        {isOpen && item.children && (
          <div data-slot="file-tree-children">
            {item.children.map((child) => (
              <FileTreeNode
                key={child.name}
                item={child}
                path={`${path}/${child.name}`}
                depth={depth + 1}
                expanded={expanded}
                toggleDir={toggleDir}
                onFileClick={onFileClick}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        )}
      </>
    );
  }

  const iconType = getFileIconType(item.name);

  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-1 w-full py-1 px-1 rounded-sm text-left transition-colors',
        'hover:bg-accent/50',
        isSelected ? 'bg-accent text-foreground' : 'text-muted-foreground'
      )}
      style={{ paddingLeft }}
      onClick={() => onFileClick?.(path)}
      data-slot="file-tree-file"
    >
      {/* Spacer matching chevron width to align icons with folder icons */}
      <span className="size-3 shrink-0" aria-hidden />
      <FileTypeIcon type={iconType} size={16} className="shrink-0" />
      <span className="truncate ml-1">{item.name}</span>
    </button>
  );
}

export { FileTree };
export type { FileTreeItem, FileTreeProps };
