export interface SceneTiming {
  id: string;
  durationMs: number;
  spokenLines: { startMs: number; endMs: number; text: string }[];
}

export const SCENE_DURATIONS = {
  title: 4000,
  orders: 8000,
  refundForm: 14000,
  status: 26000,
  closing: 6000,
};

export const SCRIPT: SceneTiming[] = [
  {
    id: "title",
    durationMs: SCENE_DURATIONS.title,
    spokenLines: [
      { startMs: 500, endMs: 3500, text: "How to request a Group Buy refund." },
    ],
  },
  {
    id: "orders",
    durationMs: SCENE_DURATIONS.orders,
    spokenLines: [
      { startMs: 500, endMs: 4000, text: "Open the customer portal and navigate to My Orders." },
      { startMs: 4500, endMs: 7500, text: "Select the relevant confirmed Group Buy order." },
    ],
  },
  {
    id: "refundForm",
    durationMs: SCENE_DURATIONS.refundForm,
    spokenLines: [
      { startMs: 500, endMs: 3200, text: "Locate and select 'I want a refund'." },
      { startMs: 3400, endMs: 6950, text: "You can choose account credit, or crypto when enabled." },
      { startMs: 7100, endMs: 11480, text: "For crypto, confirm the asset and enter your destination wallet." },
      { startMs: 11700, endMs: 13830, text: "Review the amount and submit." },
    ],
  },
  {
    id: "status",
    durationMs: SCENE_DURATIONS.status,
    spokenLines: [
      { startMs: 500, endMs: 4300, text: "Your request will show as 'Requested' while waiting for review." },
      { startMs: 4500, endMs: 9520, text: "Once an admin starts processing it, the status updates to 'Being verified'." },
      { startMs: 9700, endMs: 15220, text: "If there's an issue with your wallet or the network, it will show as 'Verification failed'." },
      { startMs: 15400, endMs: 19250, text: "When the refund is successfully sent, it shows as 'Completed'." },
      { startMs: 19500, endMs: 25020, text: "Please note that crypto completion may take time while blockchain confirmations arrive." },
    ],
  },
  {
    id: "closing",
    durationMs: SCENE_DURATIONS.closing,
    spokenLines: [
      { startMs: 500, endMs: 4500, text: "You can return to the order at any time to check the status." },
    ],
  },
];
