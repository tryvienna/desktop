import { useEffect, useRef } from 'react';

interface CreateMenuProps {
  anchor: { top: number; left: number };
  onNewWorkstream: () => void;
  onNewGroup: () => void;
  onClose: () => void;
}

export function CreateMenu({ anchor, onNewWorkstream, onNewGroup, onClose }: CreateMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Focus the menu when it opens
  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  return (
    <div
      ref={menuRef}
      tabIndex={-1}
      className="fixed z-[200] min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      style={{ top: anchor.top, left: anchor.left }}
    >
      <button
        type="button"
        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onNewWorkstream}
      >
        New Workstream
      </button>
      <button
        type="button"
        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onNewGroup}
      >
        New Group
      </button>
    </div>
  );
}
