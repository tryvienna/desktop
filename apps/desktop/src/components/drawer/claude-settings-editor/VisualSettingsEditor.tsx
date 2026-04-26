import { useEffect, useRef, useState } from 'react';
import { Input } from '@tryvienna/ui';
import { Search } from 'lucide-react';
import type { SectionProps } from './types';
import { ModelLanguageSection } from './ModelLanguageSection';
import { BehaviorSection } from './BehaviorSection';
import { PermissionsSection } from './PermissionsSection';
import { SandboxSection } from './SandboxSection';
import { AttributionSection } from './AttributionSection';
import { HooksSection } from './HooksSection';
import { EnvVarsSection } from './EnvVarsSection';
import { AdvancedSection } from './AdvancedSection';

type VisualSettingsEditorProps = Omit<SectionProps, 'filter'>;

export function VisualSettingsEditor(props: VisualSettingsEditorProps) {
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus search on mount with a small delay for drawer animation
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const sectionProps = { ...props, filter };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter settings..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <ModelLanguageSection {...sectionProps} />
      <BehaviorSection {...sectionProps} />
      <PermissionsSection {...sectionProps} />
      <SandboxSection {...sectionProps} />
      <AttributionSection {...sectionProps} />
      <HooksSection {...sectionProps} />
      <EnvVarsSection {...sectionProps} />
      <AdvancedSection {...sectionProps} />
    </div>
  );
}
