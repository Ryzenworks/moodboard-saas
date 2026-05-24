/**
 * Moodboard Logo — Unified brand mark
 * 
 * A 2×2 grid of rounded squares, one accent-colored.
 * Used across: sidebar, favicon, extension, onboarding, settings, board cards.
 */

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Use board color for accent square instead of global --color-accent */
  tinted?: boolean;
}

export function MoodboardLogo({ size = 16, className, style, tinted }: LogoProps) {
  const gap = size * 0.12;
  const radius = size * 0.08;
  const cellSize = (size - gap) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      style={style}
      aria-label="Moodboard"
    >
      {/* Top-left */}
      <rect x={0} y={0} width={cellSize} height={cellSize} rx={radius} fill="currentColor" opacity={tinted ? 0.45 : 0.9} />
      {/* Top-right */}
      <rect x={cellSize + gap} y={0} width={cellSize} height={cellSize} rx={radius} fill="currentColor" opacity={tinted ? 0.45 : 0.9} />
      {/* Bottom-left — accent */}
      <rect x={0} y={cellSize + gap} width={cellSize} height={cellSize} rx={radius} fill={tinted ? 'currentColor' : 'var(--color-accent, #056DFA)'} opacity={tinted ? 1 : undefined} />
      {/* Bottom-right */}
      <rect x={cellSize + gap} y={cellSize + gap} width={cellSize} height={cellSize} rx={radius} fill="currentColor" opacity={tinted ? 0.45 : 0.9} />
    </svg>
  );
}

