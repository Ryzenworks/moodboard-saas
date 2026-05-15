/**
 * 4-point sparkle/star icon — inline SVG for crisp rendering.
 * Uses currentColor so it inherits any text color applied via className or style.
 */
export function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M50 0 C50 0, 62 38, 100 50 C62 62, 50 100, 50 100 C50 100, 38 62, 0 50 C38 38, 50 0, 50 0Z" />
    </svg>
  );
}
