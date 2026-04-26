import type { ReactNode } from 'react';
import { Label } from '@tryvienna/ui';

interface SettingsRowProps {
  label: string;
  description: string;
  htmlFor?: string;
  children: ReactNode;
}

export function SettingsRow({ label, description, htmlFor, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid gap-1">
        <Label htmlFor={htmlFor}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
