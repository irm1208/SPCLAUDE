import { useId, type SVGProps } from "react";

const AMPERSAND_PATH =
  "M 49 44 L 43 51 L 36 56 L 28 57 L 21 53 L 19 47 L 23 41 L 31 35 L 40 29 L 45 23 L 46 16 L 41 10 L 32 7 L 23 9 L 18 15 L 18 22 L 23 28 L 43 50 L 49 56";

const FULL_DETAIL_PATH =
  "M 43.8 21.4 55.5 13.5 M 45.7 24 57.2 16.2 M 23.2 40.6 8.4 44.8 M 24.1 43.4 9.2 47.6";
const FULL_ACCENT_PATHS = [
  "M57 10.75 60.75 14.5 57 18.25 53.25 14.5Z",
  "M7 43.25 10.75 47 7 50.75 3.25 47Z",
] as const;

const SMALL_DETAIL_PATH = "M 44.5 22.6 56.5 14.5 M 23.5 42 7.5 46.5";
const SMALL_ACCENT_PATHS = [
  "M57 9.75 61.75 14.5 57 19.25 52.25 14.5Z",
  "M6.5 41.5 11.5 46.5 6.5 51.5 1.5 46.5Z",
] as const;

const COLORS = {
  primary: { line: "#1B3A7A", accent: "#2D6BCC" },
  reverse: { line: "#FFFFFF", accent: "#FFFFFF" },
  mono: { line: "#0F1F38", accent: "#0F1F38" },
} as const;

export interface SaltPepsMarkProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: "primary" | "reverse" | "mono";
  detail?: "auto" | "full" | "small";
  title?: string;
}

export function SaltPepsMark({
  size = 32,
  variant = "primary",
  detail = "auto",
  title,
  style,
  ...svgProps
}: SaltPepsMarkProps) {
  const titleId = useId();
  const small =
    detail === "small" ||
    (detail === "auto" && typeof size === "number" && size < 24);
  const colors = COLORS[variant];
  const detailPath = small ? SMALL_DETAIL_PATH : FULL_DETAIL_PATH;
  const accentPaths = small ? SMALL_ACCENT_PATHS : FULL_ACCENT_PATHS;

  return (
    <svg
      {...svgProps}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ display: "block", ...style }}
      role={title ? "img" : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <path
        d={AMPERSAND_PATH}
        stroke={colors.line}
        strokeWidth={small ? 8 : 7.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={detailPath}
        stroke={colors.line}
        strokeWidth={small ? 3.25 : 2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {accentPaths.map((path) => (
        <path key={path} d={path} fill={colors.accent} />
      ))}
    </svg>
  );
}
