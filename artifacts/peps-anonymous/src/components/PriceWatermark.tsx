import "./price-watermark.css";

interface PriceWatermarkProps {
  /** The logged-in member's handle. Rendered as-is if it starts with "@", else "@" is prepended. */
  username: string;
  /** "light" for pages with a light/white background (default). "dark" for dark-background surfaces. */
  variant?: "light" | "dark";
  className?: string;
}

/**
 * Absolutely-positioned, pointer-events-none overlay that tiles the member's
 * username diagonally across its host container.
 *
 * Usage — the host element must have `position: relative` and ideally
 * `overflow: hidden` so the watermark is clipped to the content area:
 *
 *   <div className="relative overflow-hidden rounded-xl ...">
 *     <PriceWatermark username={handle} />
 *     {children}
 *   </div>
 *
 * The watermark is rendered via a CSS background-image SVG data URL so it
 * works reliably cross-browser without polluting the DOM with many text nodes.
 */
export function PriceWatermark({ username, variant = "light", className }: PriceWatermarkProps) {
  if (!username) return null;

  const handle = username.startsWith("@") ? username : `@${username}`;
  const fill = variant === "dark" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)";

  // Encode an SVG tile (260 × 110 px) with a single diagonal text instance.
  // CSS background-repeat does the tiling — no canvas, no DOM spam.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='110'>` +
    `<text transform='rotate(-25 130 55)' x='18' y='72'` +
    ` font-family='system-ui,-apple-system,sans-serif'` +
    ` font-size='13' font-weight='700' letter-spacing='0.5'` +
    ` fill='${fill}'>${handle}</text>` +
    `</svg>`;

  return (
    <div
      aria-hidden="true"
      className={`price-watermark${className ? ` ${className}` : ""}`}
      style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` }}
    />
  );
}
