import claudeLogoPng from '../assets/claude-logo.png';

interface ClaudeLogoProps {
  size?: number;
  className?: string;
}

export function ClaudeLogo({ size = 14, className }: ClaudeLogoProps) {
  return (
    <img
      src={claudeLogoPng}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
