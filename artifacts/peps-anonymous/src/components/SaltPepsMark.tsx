import type { ImgHTMLAttributes } from "react";

export interface SaltPepsMarkProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  size?: number | string;
}

export function SaltPepsMark({
  size = 32,
  alt,
  title,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-hidden": ariaHidden,
  role,
  ...imageProps
}: SaltPepsMarkProps) {
  const normalizedAriaLabel = ariaLabel?.trim();
  const normalizedAriaLabelledBy = ariaLabelledBy?.trim();
  const normalizedTitle = title?.trim();
  const hasAccessibleName = Boolean(
    normalizedAriaLabel || normalizedAriaLabelledBy || normalizedTitle || alt?.trim(),
  );
  const resolvedAlt = alt ?? normalizedAriaLabel ?? normalizedTitle ?? "";
  const resolvedAriaHidden =
    ariaHidden ?? (hasAccessibleName ? undefined : true);
  const resolvedRole = role ?? (hasAccessibleName ? "img" : undefined);

  return (
    <img
      {...imageProps}
      src="/favicon.svg"
      width={size}
      height={size}
      alt={resolvedAlt}
      title={title}
      style={{ display: "block", width: size, height: size, ...style }}
      role={resolvedRole}
      aria-label={ariaLabel}
      aria-labelledby={normalizedAriaLabelledBy}
      aria-hidden={resolvedAriaHidden}
    />
  );
}
