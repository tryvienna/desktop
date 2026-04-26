import { memo, useCallback } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@tryvienna/ui';
import { useDrawerActions } from '../lib/drawer';
import { feedbackContent } from './drawer/content';

export const FeedbackButton = memo(function FeedbackButton() {
  const { openFull } = useDrawerActions();

  const handleClick = useCallback(() => {
    openFull(feedbackContent());
  }, [openFull]);

  return (
    <Button
      data-testid="feedback-button"
      variant="ghost"
      size="default"
      className="w-full justify-start gap-3 px-4 py-3"
      onClick={handleClick}
    >
      <MessageSquarePlus size={18} />
      Feedback
    </Button>
  );
});
