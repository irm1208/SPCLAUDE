/** Inline S&P mark — transparent background, white lettering with a light-blue &.
 *  Every call site already wraps this in its own coloured container, so the mark
 *  should NOT carry its own background.  The favicon.svg is kept for browser tabs.
 */
export interface SaltPepsMarkProps {
  size?: number | string;
  /** Colour for the S and P glyphs. Defaults to white. */
  color?: string;
  /** Colour for the & glyph. Defaults to a soft blue that reads on any dark bg. */
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
}

export function SaltPepsMark({
  size = 32,
  color = "#FFFFFF",
  accentColor = "#8BB8FF",
  className,
  style,
  "aria-hidden": ariaHidden = true,
}: SaltPepsMarkProps) {
  const n = Number(size);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={n}
      height={n}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="34"
        fontWeight="700"
        fill={color}
        letterSpacing="-1.5"
      >
        S<tspan fill={accentColor} fontWeight="300">&amp;</tspan>P
      </text>
    </svg>
  );
}
