import type { CSSProperties } from "react";

// ─── Peps Native workspace theme ────────────────────────────────────────────
// Shared by the setup flow and all workspace page treatments. This is kept as
// a typed contract so visual tokens cannot silently drift away from the Peps
// Anonymous brand system.

export const PEPS_NATIVE = {
  deepNavy: "#1B3164",
  navy: "#1B3A7A",
  blue: "#2D6BCC",
  amber: "#E9A020",
  canvas: "#F4F6F9",
  surface: "#FFFFFF",
  surfaceSoft: "#F8FAFC",
  border: "#D0DAE4",
  borderSoft: "#DBE3EC",
  text: "#0F1F38",
  body: "#374151",
  muted: "#6B7280",
  subtle: "#8A9AAA",
  success: "#22C55E",
  danger: "#EF4444",
} as const;

const RGB = "45, 107, 204";

export const V2_VARS: CSSProperties = {
  ["--ov2-canvas" as string]: PEPS_NATIVE.canvas,
  ["--ov2-sidebar" as string]: PEPS_NATIVE.deepNavy,
  ["--ov2-card" as string]: PEPS_NATIVE.surface,
  ["--ov2-border" as string]: PEPS_NATIVE.border,
  ["--ov2-border-strong" as string]: "#BECADA",
  ["--ov2-text" as string]: PEPS_NATIVE.text,
  ["--ov2-muted" as string]: PEPS_NATIVE.muted,
  ["--ov2-subtle" as string]: PEPS_NATIVE.subtle,
  ["--ov2-primary" as string]: PEPS_NATIVE.navy,
  ["--ov2-primary-hover" as string]: PEPS_NATIVE.deepNavy,
  ["--ov2-purple" as string]: "#7C6ED6",
  ["--ov2-orange" as string]: PEPS_NATIVE.amber,
  ["--ov2-green" as string]: PEPS_NATIVE.success,
  ["--ov2-pink" as string]: "#D96C98",
  ["--ov2-danger" as string]: PEPS_NATIVE.danger,
  ["--ov2-sidebar-width" as string]: "236px",
  ["--ov2-topbar-height" as string]: "var(--ov2-responsive-topbar-height, 108px)",
  ["--ov2-shadow" as string]: "0 4px 14px rgba(27, 49, 100, 0.045)",
  ["--t-bg" as string]: PEPS_NATIVE.canvas,
  ["--t-surface" as string]: PEPS_NATIVE.surface,
  ["--t-surface2" as string]: PEPS_NATIVE.surfaceSoft,
  ["--t-border" as string]: PEPS_NATIVE.border,
  ["--t-nav" as string]: PEPS_NATIVE.navy,
  ["--t-blue" as string]: PEPS_NATIVE.blue,
  ["--t-blue-deep" as string]: PEPS_NATIVE.navy,
  ["--t-blue-rgb" as string]: RGB,
  ["--t-blue-03" as string]: `rgba(${RGB},0.03)`,
  ["--t-blue-04" as string]: `rgba(${RGB},0.04)`,
  ["--t-blue-05" as string]: `rgba(${RGB},0.05)`,
  ["--t-blue-06" as string]: `rgba(${RGB},0.06)`,
  ["--t-blue-07" as string]: `rgba(${RGB},0.07)`,
  ["--t-blue-08" as string]: `rgba(${RGB},0.08)`,
  ["--t-blue-10" as string]: `rgba(${RGB},0.10)`,
  ["--t-blue-12" as string]: `rgba(${RGB},0.12)`,
  ["--t-blue-15" as string]: `rgba(${RGB},0.15)`,
  ["--t-blue-18" as string]: `rgba(${RGB},0.18)`,
  ["--t-blue-20" as string]: `rgba(${RGB},0.20)`,
  ["--t-blue-25" as string]: `rgba(${RGB},0.25)`,
  ["--t-blue-30" as string]: `rgba(${RGB},0.30)`,
  ["--t-tag-bg" as string]: `rgba(${RGB},0.08)`,
  ["--t-tag-text" as string]: PEPS_NATIVE.blue,
  ["--t-tag-border" as string]: `rgba(${RGB},0.2)`,
  ["--t-text" as string]: PEPS_NATIVE.text,
  ["--t-muted" as string]: PEPS_NATIVE.muted,
  ["--t-subtle" as string]: PEPS_NATIVE.subtle,
};

export const V2_CANVAS = PEPS_NATIVE.canvas;
export const V2_SIDEBAR = PEPS_NATIVE.deepNavy;
export const V2_CARD_BORDER = PEPS_NATIVE.border;

// Accent colours for stat-tile icons (rounded coloured squares).
export const TILE = {
  green:  { fg: "#17743D", bg: "#E1F7E8" },
  blue:   { fg: PEPS_NATIVE.navy, bg: "#E6EEFB" },
  orange: { fg: "#96610B", bg: "#FFF0D9" },
  violet: { fg: "#6658CD", bg: "#EFEDFA" },
} as const;
