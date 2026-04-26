/**
 * Domain-specific navigation icons extracted from @tryvienna/ui nav-sidebar.
 * WorkstreamsIcon and RoutinesIcon are product-specific.
 */
import * as React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

function SvgIcon({
  size = 12,
  stroke,
  fill = 'none',
  strokeWidth = 2,
  className,
  style,
  children,
}: {
  size?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      {children}
    </svg>
  );
}

export const WorkstreamsIcon = React.memo(function WorkstreamsIcon({ size = 12, className, style, color }: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2}
      className={className}
      style={style}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </SvgIcon>
  );
});

export const RoutinesIcon = React.memo(function RoutinesIcon({ size = 12, className, style, color }: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2}
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </SvgIcon>
  );
});
