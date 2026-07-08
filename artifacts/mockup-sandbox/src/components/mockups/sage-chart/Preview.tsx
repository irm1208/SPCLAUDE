import "./_group.css";
import { SageTrendChart, type DiscussChart } from "./SageTrendChart";

const testosteroneChart: DiscussChart = {
  marker: "Testosterone",
  unit: "nmol/L",
  refRangeLow: 12,
  refRangeHigh: 30,
  points: [
    { date: "2026-03-04", value: 18.2 },
    { date: "2026-04-03", value: 24.1 },
    { date: "2026-04-26", value: 28.1 },
    { date: "2026-06-03", value: 32.6 },
  ],
};

const oestradiolChart: DiscussChart = {
  marker: "Oestradiol",
  unit: "pmol/L",
  refRangeLow: 41,
  refRangeHigh: 159,
  points: [
    { date: "2026-03-04", value: 62.0 },
    { date: "2026-04-03", value: 55.5 },
    { date: "2026-04-26", value: 48.2 },
    { date: "2026-06-03", value: 34.9 },
  ],
};

const noRangeChart: DiscussChart = {
  marker: "Custom Marker",
  unit: "au",
  refRangeLow: null,
  refRangeHigh: null,
  points: [
    { date: "2026-01-10", value: 10 },
    { date: "2026-03-10", value: 14 },
    { date: "2026-05-10", value: 9 },
  ],
};

function ChatBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[340px] rounded-2xl p-3" style={{ background: "var(--t-bg)" }}>
      <p className="text-[13px] mb-2" style={{ color: "var(--t-text)" }}>
        Your <b>Testosterone</b> rose from <b>18.2 nmol/L</b> on <b>4 Mar 26</b> to{" "}
        <b>32.6 nmol/L</b> on <b>3 Jun 26</b> — now above the reference range (12–30 nmol/L).
      </p>
      {children}
    </div>
  );
}

export default function Preview() {
  return (
    <div className="min-h-screen p-8 flex flex-col gap-6 items-start" style={{ background: "var(--t-surface)" }}>
      <h1 className="text-sm font-semibold" style={{ color: "var(--t-muted)" }}>
        SageTrendChart — isolated render check
      </h1>

      <div className="flex flex-col gap-3">
        <span className="text-xs" style={{ color: "var(--t-subtle)" }}>In chat bubble context (last point above range → red dot)</span>
        <ChatBubble>
          <SageTrendChart chart={testosteroneChart} />
        </ChatBubble>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs" style={{ color: "var(--t-subtle)" }}>Declining trend, last point below range → red dot</span>
        <div style={{ width: 320 }}>
          <SageTrendChart chart={oestradiolChart} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs" style={{ color: "var(--t-subtle)" }}>No reference range (refLow/refHigh null)</span>
        <div style={{ width: 320 }}>
          <SageTrendChart chart={noRangeChart} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs" style={{ color: "var(--t-subtle)" }}>Single point (should render nothing — needs 2+ points)</span>
        <div style={{ width: 320 }}>
          <SageTrendChart chart={{ ...noRangeChart, points: [noRangeChart.points[0]] }} />
          <span className="text-[10px] italic" style={{ color: "var(--t-subtle)" }}>(expect blank space above)</span>
        </div>
      </div>
    </div>
  );
}
