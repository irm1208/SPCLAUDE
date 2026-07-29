interface DispatchSummaryProps {
  parcelCount: number;
  availableUnits: number;
  readyCount: number;
  reminderCount: number;
}

export default function DispatchSummary({ parcelCount, availableUnits, readyCount, reminderCount }: DispatchSummaryProps) {
  const items = [
    { label: "Parcels in batch", value: parcelCount, suffix: "received" },
    { label: "Stock available", value: availableUnits, suffix: "units" },
    { label: "Orders ready", value: readyCount, suffix: "packable" },
    { label: "QR reminders", value: reminderCount, suffix: "needed" },
  ];

  return (
    <section aria-label="Dispatch batch summary" className="grid grid-cols-2 overflow-hidden rounded-xl border bg-white lg:grid-cols-4" style={{ borderColor: "var(--dispatch-rule)" }}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className="border-b px-4 py-4 even:border-l sm:px-5 lg:border-b-0 lg:border-l lg:first:border-l-0"
          style={{ borderColor: "var(--dispatch-rule)" }}
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--dispatch-muted)" }}>{item.label}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: "var(--dispatch-ink)" }}>{item.value}</span>
            <span className="text-[12px] font-semibold" style={{ color: "var(--dispatch-muted)" }}>{item.suffix}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
