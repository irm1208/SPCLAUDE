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
export const FONT = "'Inter','Salesforce Sans','Helvetica Neue',Arial,sans-serif";
