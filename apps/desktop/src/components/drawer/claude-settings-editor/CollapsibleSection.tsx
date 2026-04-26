import { type ReactNode, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, icon, defaultOpen = true, forceOpen, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = forceOpen ?? open;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-accent/30"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
        {icon}
        {title}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-4 px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
