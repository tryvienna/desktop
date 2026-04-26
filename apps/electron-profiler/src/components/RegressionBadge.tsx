import { Badge } from '@/components/ui/badge';
import type { Regression } from '../api/types';

interface Props {
  regression: Regression;
}

export function RegressionBadge({ regression }: Props) {
  if (regression.severity === 'none') {
    return (
      <Badge variant="outline" className="text-xs">
        {regression.metric}: no change
      </Badge>
    );
  }

  const variant = regression.severity === 'critical' ? 'destructive' : 'secondary';
  const arrow = regression.changePercent > 0 ? '\u2191' : '\u2193';

  return (
    <Badge variant={variant} className="text-xs">
      {regression.metric}: {arrow}
      {Math.abs(regression.changePercent).toFixed(1)}%
    </Badge>
  );
}
