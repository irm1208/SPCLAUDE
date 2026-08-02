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
      {/* S — semibold */}
      <text
        x="3"
        y="46"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="30"
        fontWeight="600"
        fill={color}
        letterSpacing="-1"
      >S</text>
      {/* & — light weight, accent colour */}
      <text
        x="22"
        y="46"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="30"
        fontWeight="300"
        fill={accentColor}
        letterSpacing="-1"
      >&amp;</text>
      {/* P — semibold */}
      <text
        x="40"
        y="46"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="30"
        fontWeight="600"
        fill={color}
        letterSpacing="-1"
      >P</text>
    </svg>
  );
}
