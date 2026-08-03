import { useId } from "react";
import "./price-watermark.css";

interface PriceWatermarkProps {
  /** Logged-in member handle. "@" is prepended automatically if missing. */
  username: string;
  /**
   * "dark"  — force white-on-dark palette; use when the container is always
   *           dark regardless of the global theme (e.g. OrderForm line-items).
   * "light" — force dark-on-light palette; use when the container is always
   *           light regardless of the global theme (e.g. a bg-white modal that
   *           never changes colour even when dark mode is active site-wide).
   * Omit to let CSS auto-detect via [data-theme="dark"].
   */
  variant?: "dark" | "light";
}

/**
 * Absolutely-positioned, pointer-events-none watermark that tiles the
 * member's handle diagonally across its host container.
 *
 * Host element must have `position: relative` and `overflow: hidden`.
 * The host automatically gets `user-select: none` via the CSS
 * `:has(> .price-watermark)` selector — no extra class needed.
 *
 * Uses an inline <svg> so `fill="currentColor"` inherits the theme-aware
 * `color` property set in price-watermark.css. A data-URL background-image
 * cannot inherit CSS custom properties.
 */
export function PriceWatermark({ username, variant }: PriceWatermarkProps) {
  // useId produces a stable unique string per instance (React 18+)
  const uid = useId();
  // Strip non-alphanumeric chars so the id is a valid SVG fragment identifier
  const patternId = `pw${uid.replace(/[^a-zA-Z0-9]/g, "")}`;

  if (!username) return null;

  const handle = username.startsWith("@") ? username : `@${username}`;

  return (
    <div
      aria-hidden="true"
      className="price-watermark"
      {...(variant === "dark" ? { "data-pw-dark": "" } : variant === "light" ? { "data-pw-light": "" } : {})}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width="260"
            height="110"
            patternUnits="userSpaceOnUse"
          >
            <text
              x="18"
              y="72"
              transform="rotate(-25 130 55)"
              fontFamily="system-ui,-apple-system,sans-serif"
              fontSize="13"
              fontWeight="700"
              letterSpacing="0.5"
              fill="currentColor"
            >
              {handle}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
