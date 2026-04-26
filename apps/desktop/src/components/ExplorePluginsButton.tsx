import { memo, useCallback } from 'react';
import { Puzzle } from 'lucide-react';
import { Button } from '@tryvienna/ui';
import { useDrawerActions } from '../lib/drawer';
import { pluginStoreContent } from './drawer/content';

export const ExplorePluginsButton = memo(function ExplorePluginsButton() {
  const { openFull } = useDrawerActions();

  const handleClick = useCallback(() => {
    openFull(pluginStoreContent());
  }, [openFull]);

  return (
    <Button
      data-testid="explore-plugins-button"
      variant="ghost"
      size="default"
      className="w-full justify-start gap-3 px-4 py-3"
      onClick={handleClick}
    >
      <Puzzle size={18} />
      Explore Plugins
    </Button>
  );
});
