export function getBalancePaymentCardTheme(dark: boolean) {
  return dark
    ? {
        card: "#101f34",
        border: "#29415f",
        heading: "#edf5ff",
        muted: "#91a9c5",
        panel: "linear-gradient(120deg, #102a52 0%, #1b3a7a 48%, #2d6bcc 100%)",
        selected: "#173967",
        selectedBorder: "#4e8ed5",
        unselected: "#152337",
        iconMuted: "#22344d",
        iconText: "#9ab0ca",
        statusBg: "#19355b",
        statusText: "#a9d1ff",
        accent: "#347bd4",
        accentSoft: "rgba(52,123,212,0.14)",
        cta: "linear-gradient(135deg, #245aa8, #347bd4)",
        shadow: "0 22px 55px rgba(2,10,24,0.42)",
        note: "#7589a2",
        shellPadding: "p-3 sm:p-4",
        panelPadding: "p-3 sm:p-4",
        methodPadding: "p-2 sm:p-2.5",
      }
    : {
        card: "#ffffff",
        border: "#dbe5f0",
        heading: "#1b3164",
        muted: "#70839a",
        panel: "linear-gradient(120deg, #1b3164 0%, #1b3a7a 45%, #2d6bcc 100%)",
        selected: "#eef5ff",
        selectedBorder: "#a5c5ed",
        unselected: "#ffffff",
        iconMuted: "#edf2f7",
        iconText: "#71839a",
        statusBg: "#e6effa",
        statusText: "#1b3a7a",
        accent: "#2d6bcc",
        accentSoft: "rgba(45,107,204,0.10)",
        cta: "linear-gradient(135deg, #1b3a7a, #2d6bcc)",
        shadow: "0 22px 55px rgba(27,58,122,0.12)",
        note: "#91a1b4",
        shellPadding: "p-3 sm:p-4",
        panelPadding: "p-3 sm:p-4",
        methodPadding: "p-2 sm:p-2.5",
      };
}

export const BALANCE_PAYMENT_METHOD_COPY = {
  anonpay: {
    label: "AnonPay",
    detail: "Pay through Trocador AnonPay",
  },
} as const;