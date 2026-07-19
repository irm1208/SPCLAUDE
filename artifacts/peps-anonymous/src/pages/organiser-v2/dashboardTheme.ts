// ─── New Design System (Dashboard Style) ─────────────────────────────────────
// Modern dashboard theme matching the Rifa Almadeana aesthetic with sidebar nav

export const DASHBOARD_THEME = {
  // Colors - Exact match to screenshot
  background: "#F9FAFB",
  cardBackground: "#FFFFFF",
  sidebarBackground: "#FAFAFA",
  borderColor: "#E5E7EB",

  // Text colors
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  // Brand colors
  primary: "#111827",
  primaryLight: "#F3F4F6",

  // Status colors
  success: "#10B981",
  successBg: "#D1FAE5",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  info: "#3B82F6",
  infoBg: "#DBEAFE",

  // Chart colors
  chartColors: {
    green: "#10B981",
    yellow: "#FBBF24",
    red: "#EF4444",
    blue: "#3B82F6",
    purple: "#8B5CF6",
    teal: "#14B8A6",
  },

  // Typography - System font stack
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

  // Spacing
  spacing: {
    xs: "0.25rem",  // 4px
    sm: "0.5rem",   // 8px
    md: "1rem",     // 16px
    lg: "1.5rem",   // 24px
    xl: "2rem",     // 32px
    "2xl": "3rem",  // 48px
  },

  // Border radius
  radius: {
    sm: "0.375rem",  // 6px
    md: "0.5rem",    // 8px
    lg: "0.75rem",   // 12px
    xl: "1rem",      // 16px
  },

  // Shadows
  shadow: {
    none: "none",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  },

  // Sidebar
  sidebarWidth: "230px",
  sidebarWidthCollapsed: "80px",
};

// CSS variables for inline styles
export const DASHBOARD_VARS = {
  "--dash-bg": DASHBOARD_THEME.background,
  "--dash-card": DASHBOARD_THEME.cardBackground,
  "--dash-border": DASHBOARD_THEME.borderColor,
  "--dash-text": DASHBOARD_THEME.textPrimary,
  "--dash-text-secondary": DASHBOARD_THEME.textSecondary,
  "--dash-text-muted": DASHBOARD_THEME.textMuted,
  "--dash-primary": DASHBOARD_THEME.primary,
  "--dash-primary-light": DASHBOARD_THEME.primaryLight,
  "--dash-success": DASHBOARD_THEME.success,
  "--dash-success-bg": DASHBOARD_THEME.successBg,
  "--dash-warning": DASHBOARD_THEME.warning,
  "--dash-warning-bg": DASHBOARD_THEME.warningBg,
  "--dash-danger": DASHBOARD_THEME.danger,
  "--dash-danger-bg": DASHBOARD_THEME.dangerBg,
  "--dash-info": DASHBOARD_THEME.info,
  "--dash-info-bg": DASHBOARD_THEME.infoBg,
  "--dash-font": DASHBOARD_THEME.fontFamily,
} as React.CSSProperties;
