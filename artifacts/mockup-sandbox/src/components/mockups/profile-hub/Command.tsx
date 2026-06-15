import { useState } from "react";
import {
  Search,
  Command as Cmd,
  CornerDownLeft,
  Package,
  Syringe,
  Beaker,
  Boxes,
  Scale,
  ArrowUpRight,
} from "lucide-react";

// OPPOSITE OF: permanent sidebar + 2x2 card grid + UPPERCASE admin chrome.
// A keyboard-first command surface: one input, a ranked list of things
// you can do or open right now, and a tiny status line of numbers at
// the bottom. No sidebar, no card grid, no section labels. The page
// asks "what do you need?" instead of showing everything at once.

type Item = {
  kind: "action" | "entity" | "nav";
  icon: React.ReactNode;
  label: string;
  meta?: string;
  shortcut?: string[];
  accent?: string;
};

export function Command() {
  const [q, setQ] = useState("");

  const items: Item[] = [
    {
      kind: "action",
      icon: <Scale className="w-3.5 h-3.5" />,
      label: "Log today's GLP-1 dose",
      meta: "2.5 mg semaglutide · Tue/Sat schedule",
      shortcut: ["L"],
      accent: "#22D3EE",
    },
    {
      kind: "entity",
      icon: <Boxes className="w-3.5 h-3.5" />,
      label: "Tirzepatide 10 mg · Uther",
      meta: "group buy · closes in 4d · 47 members",
      shortcut: ["⏎"],
      accent: "#60A5FA",
    },
    {
      kind: "entity",
      icon: <Package className="w-3.5 h-3.5" />,
      label: "Order #1182",
      meta: "delivered 14 Apr · Uther · tirzepatide 10 mg",
      shortcut: ["⏎"],
      accent: "#60A5FA",
    },
    {
      kind: "action",
      icon: <Beaker className="w-3.5 h-3.5" />,
      label: "Order a blood panel",
      meta: "last test 47 days ago — re-test recommended",
      shortcut: ["B"],
      accent: "#FBBF24",
    },
    {
      kind: "nav",
      icon: <Syringe className="w-3.5 h-3.5" />,
      label: "My compounds",
      meta: "0 active · import protocol",
      shortcut: ["G", "C"],
    },
    {
      kind: "nav",
      icon: <Package className="w-3.5 h-3.5" />,
      label: "All orders (12)",
      shortcut: ["G", "O"],
    },
  ];

  const filtered = q
    ? items.filter(i =>
        i.label.toLowerCase().includes(q.toLowerCase()) ||
        (i.meta ?? "").toLowerCase().includes(q.toLowerCase()),
      )
    : items;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "#0A0A0B",
        color: "#E4E4E7",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Minimal top strip — just an identity chip, no sidebar */}
      <div className="flex items-center justify-between px-6 py-4 text-[11px] text-zinc-500">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold"
            style={{ background: "#2E5BFF", color: "#fff" }}
          >
            S
          </div>
          <span>@iam0121</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]"
            style={{
              background: "#18181B",
              border: "1px solid #27272A",
              color: "#A1A1AA",
            }}
          >
            <Cmd className="w-2.5 h-2.5" />K
          </kbd>
          <span>to open anywhere</span>
        </div>
      </div>

      {/* Centered command surface */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div
          className="w-full"
          style={{ maxWidth: 560 }}
        >
          {/* Prompt */}
          <div
            className="text-[13px] text-zinc-500 mb-3 px-1"
            style={{ letterSpacing: "-0.005em" }}
          >
            <span className="text-zinc-300">What would you like to do,</span>{" "}
            <span className="text-[#60A5FA]">@iam0121</span>?
          </div>

          {/* Input */}
          <div
            className="relative flex items-center px-3 py-3 rounded-xl"
            style={{
              background: "#101012",
              border: "1px solid #27272A",
              boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
            }}
          >
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Log a dose, open an order, start a blood panel…"
              className="ml-3 bg-transparent outline-none flex-1 text-[14px] text-zinc-100 placeholder:text-zinc-600"
            />
            <div
              className="flex items-center gap-1 text-zinc-500 text-[10px]"
            >
              <kbd
                className="px-1.5 py-0.5 rounded"
                style={{ background: "#18181B", border: "1px solid #27272A" }}
              >
                esc
              </kbd>
            </div>
          </div>

          {/* Results list */}
          <ul className="mt-2 overflow-hidden rounded-xl" style={{
            background: "#101012",
            border: "1px solid #27272A",
          }}>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-[12px] text-zinc-500">
                Nothing matches "{q}". Try <i>log</i>, <i>order</i>, <i>blood</i>.
              </li>
            ) : (
              filtered.map((it, i) => (
                <li
                  key={it.label}
                  className="flex items-center gap-3 px-3 py-2.5 text-[13px] cursor-pointer"
                  style={{
                    background: i === 0 ? "#18181B" : "transparent",
                    borderTop: i === 0 ? undefined : "1px solid #18181B",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: `${it.accent ?? "#3F3F46"}22`,
                      color: it.accent ?? "#A1A1AA",
                      border: `1px solid ${it.accent ?? "#3F3F46"}33`,
                    }}
                  >
                    {it.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-100 font-medium truncate">
                        {it.label}
                      </span>
                      <Tag kind={it.kind} />
                    </div>
                    {it.meta && (
                      <div className="text-[11px] text-zinc-500 truncate">
                        {it.meta}
                      </div>
                    )}
                  </div>
                  {it.shortcut && (
                    <div className="flex items-center gap-1 text-zinc-500">
                      {it.shortcut.map(s => (
                        <kbd
                          key={s}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                          style={{
                            background: "#18181B",
                            border: "1px solid #27272A",
                            color: "#A1A1AA",
                          }}
                        >
                          {s === "⏎" ? (
                            <CornerDownLeft className="w-2.5 h-2.5" />
                          ) : (
                            s
                          )}
                        </kbd>
                      ))}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>

          {/* Tiny recent */}
          <div className="mt-5 flex items-center gap-2 text-[11px] text-zinc-500 px-1">
            <span className="tracking-[0.2em] uppercase text-zinc-600 text-[9px]">
              Recent
            </span>
            <Recent label="Tirz 10mg · Uther" />
            <Recent label="Order #1182" />
            <Recent label="Semaglutide log" />
            <button className="ml-auto flex items-center gap-1 text-zinc-400 hover:text-zinc-200">
              Everything <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Status line — the numbers live here, tiny, monospaced */}
      <footer
        className="flex items-center justify-between px-6 py-2.5 text-[10px] font-mono"
        style={{
          borderTop: "1px solid #18181B",
          color: "#52525B",
          background: "#0A0A0B",
        }}
      >
        <div className="flex items-center gap-5">
          <Stat k="orders" v="12" />
          <Stat k="compounds" v="0" />
          <Stat k="bloods" v="0" />
          <Stat k="glp-1" v="0" />
          <Stat k="gb.active" v="3" hi />
          <Stat k="gb.draft" v="0" />
          <Stat k="gb.total" v="3" />
        </div>
        <div className="flex items-center gap-3">
          <span>
            <span className="text-zinc-400">⏎</span> select
          </span>
          <span>
            <span className="text-zinc-400">↑↓</span> navigate
          </span>
          <span>
            <span className="text-zinc-400">⌘K</span> anywhere
          </span>
        </div>
      </footer>
    </div>
  );
}

function Tag({ kind }: { kind: "action" | "entity" | "nav" }) {
  const map = {
    action: { label: "Action", color: "#22D3EE" },
    entity: { label: "Open", color: "#60A5FA" },
    nav: { label: "Page", color: "#A1A1AA" },
  };
  const s = map[kind];
  return (
    <span
      className="px-1 rounded text-[9px] font-semibold tracking-wide uppercase shrink-0"
      style={{
        background: `${s.color}14`,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function Recent({ label }: { label: string }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded"
      style={{
        background: "#101012",
        border: "1px solid #27272A",
        color: "#A1A1AA",
      }}
    >
      {label}
    </span>
  );
}

function Stat({ k, v, hi }: { k: string; v: string; hi?: boolean }) {
  return (
    <span>
      <span className="text-zinc-600">{k}</span>{" "}
      <span style={{ color: hi ? "#60A5FA" : "#D4D4D8" }}>{v}</span>
    </span>
  );
}
