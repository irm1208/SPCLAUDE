export function palette(dark: boolean) {
  return dark
    ? {
        page: "#0E0E12", panel: "#17171C", panel2: "#1D1D23",
        border: "rgba(255,255,255,0.08)", borderSoft: "rgba(255,255,255,0.05)",
        text: "#F5F5F7", muted: "#A0A0AB", subtle: "#6E6E78",
        track: "rgba(255,255,255,0.09)", chip: "rgba(255,255,255,0.06)",
        sidebar: "#121216",
      }
    : {
        page: "#F3F3F3", panel: "#FFFFFF", panel2: "#FAFAF9",
        border: "#DDDBDA", borderSoft: "#EDEBE9",
        text: "#181818", muted: "#5C5C5C", subtle: "#8C8C8C",
        track: "#ECEBEA", chip: "#F3F3F3",
        sidebar: "#FFFFFF",
      };
}

export const ACCENT = "#0176D3";
export const ACCENT_SOFT = "rgba(1,118,211,0.10)";
export const HERO_GRAD = "linear-gradient(120deg,#1B3164 0%,#1B3A7A 45%,#2D6BCC 100%)";
export const RAIL_NAVY = "#032D60";
export const FONT = "'Instrument Sans','Inter','Helvetica Neue',Arial,sans-serif";
export const FONT_DISPLAY = "'Bricolage Grotesque','Instrument Sans',sans-serif";

export function grain(dark: boolean) {
  const matrix = dark
    ? "0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.04 0"
    : "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0";
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='${matrix}'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E")`;
}
