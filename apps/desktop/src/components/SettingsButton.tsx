import { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Button } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';

export const SettingsButton = memo(function SettingsButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/settings';

  return (
    <Button
      data-testid="settings-button"
      variant="ghost"
      size="default"
      className={cn(
        'w-full justify-start gap-3 px-4 py-3',
        isActive && 'bg-accent text-accent-foreground',
      )}
      onClick={() => navigate('/settings')}
    >
      <Settings size={18} />
      Settings
    </Button>
  );
});
