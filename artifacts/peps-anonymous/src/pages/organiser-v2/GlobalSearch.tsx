import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ShoppingBag, MessageSquare, ListTodo, ArrowRight, UserRound, type LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { V2_CARD_BORDER } from "./theme";
import { WORKSPACE_GROUPS } from "./nav";
import { organiserApi } from "./api/organiser-api";
import { useOrders } from "./domain/repository-context";

// ─── Workspace: Global Search (⌘K palette) ───────────────────────────────────
// Searches orders, tickets and todos for the selected GB plus the workspace
// tabs themselves. The Workspace shell owns the cmd-K listener; this component
// only renders the palette while `open` is true.

interface Result {
  key: string;
  icon: LucideIcon;
  primary: string;
  secondary: string;
  tab: string;
  entityId?: string;
}

interface Group {
  label: string;
  results: Result[];
}

const MAX_PER_GROUP = 5;

export default function GlobalSearch({ selectedGbId, onNavigate, open, onClose }: {
  selectedGbId?: string;
  onNavigate: (tab: string, entityId?: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const orders = useOrders();
  const ticketsQuery = useQuery({
    queryKey: ["organiser", "tickets", selectedGbId],
    queryFn: () => organiserApi.tickets(selectedGbId!),
    enabled: open && Boolean(selectedGbId),
    staleTime: 15_000,
  });
  const todosQuery = useQuery({
    queryKey: ["organiser", "todos", selectedGbId],
    queryFn: () => organiserApi.todos(selectedGbId!),
    enabled: open && Boolean(selectedGbId),
    staleTime: 15_000,
  });
  const membersQuery = useQuery({
    queryKey: ["organiser", "members", selectedGbId],
    queryFn: () => organiserApi.members(selectedGbId!),
    enabled: open && Boolean(selectedGbId),
    staleTime: 30_000,
  });
  const tickets = ticketsQuery.data ?? [];
  const todos = todosQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
  }, [open]);

  const groups = useMemo<Group[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (...fields: (string | undefined)[]) =>
      fields.some((f) => f && f.toLowerCase().includes(q));

    const tabResults: Result[] = WORKSPACE_GROUPS
      .flatMap((g) => g.tabs)
      .filter((t) => !q || match(t.label))
      .slice(0, q ? MAX_PER_GROUP : undefined)
      .map((t) => ({
        key: `tab:${t.id}`,
        icon: ArrowRight,
        primary: t.label,
        secondary: "Jump to tab",
        tab: t.id,
      }));

    // Empty query → just the tab list, so the palette is useful as a switcher.
    if (!q) return [{ label: "Go to", results: tabResults }];

    const orderResults: Result[] = orders
      .filter((o) => match(o.id, o.memberName, o.memberUsername, ...o.products.map((p) => p.name)))
      .slice(0, MAX_PER_GROUP)
      .map((o) => ({
        key: `order:${o.id}`,
        icon: ShoppingBag,
        primary: `${o.id} · ${o.memberName}`,
        secondary: `@${o.memberUsername} · £${o.total.toFixed(2)}`,
        tab: "orders",
        entityId: o.id,
      }));

    const ticketResults: Result[] = tickets
      .filter((t) => match(t.subject, t.accountUsername))
      .slice(0, MAX_PER_GROUP)
      .map((t) => ({
        key: `ticket:${t.id}`,
        icon: MessageSquare,
        primary: t.subject,
        secondary: `@${t.accountUsername} · ${t.status}`,
        tab: "tickets",
        entityId: t.id,
      }));

    const todoResults: Result[] = todos
      .filter((t) => match(t.title, t.category))
      .slice(0, MAX_PER_GROUP)
      .map((t) => ({
        key: `todo:${t.id}`,
        icon: ListTodo,
        primary: t.title,
        secondary: [t.category, t.dueDate, t.status].filter(Boolean).join(" · "),
        tab: "todos",
        entityId: t.id,
      }));

    const memberResults: Result[] = members
      .filter(member => match(member.telegramUsername))
      .slice(0, MAX_PER_GROUP)
      .map(member => ({
        key: `member:${member.telegramUsername}`,
        icon: UserRound,
        primary: `@${member.telegramUsername.replace(/^@/, "")}`,
        secondary: member.hasTelegram ? "Telegram connected" : "Joined member",
        tab: "members",
        entityId: member.telegramUsername.replace(/^@/, "").toLowerCase(),
      }));

    return [
      { label: "Orders", results: orderResults },
      { label: "Tickets", results: ticketResults },
      { label: "Tasks", results: todoResults },
      { label: "Members", results: memberResults },
      { label: "Go to", results: tabResults },
    ].filter((g) => g.results.length > 0);
  }, [query, orders, tickets, todos, members]);

  const flat = useMemo(() => groups.flatMap((g) => g.results), [groups]);

  // Keep the selection in range as the result set changes.
  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  if (!open) return null;

  const pick = (r: Result) => {
    onNavigate(r.tab, r.entityId);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (flat[selected]) pick(flat[selected]); }
  };

  let rowIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center px-3 sm:px-0"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] mt-[6vh] sm:mt-[10vh] self-start bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ border: `1px solid ${V2_CARD_BORDER}`, maxHeight: "min(60vh, calc(100dvh - 120px))" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search orders, members, tickets, tasks…"
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {ticketsQuery.isLoading || todosQuery.isLoading || membersQuery.isLoading ? (
            <div className="px-4 py-6 text-sm text-gray-400 text-center">Syncing live workspace data…</div>
          ) : flat.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-400 text-center">
              No results for “{query.trim()}”
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="mb-1">
                <div className="px-4 pt-2 pb-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                  {g.label}
                </div>
                {g.results.map((r) => {
                  rowIndex += 1;
                  const i = rowIndex;
                  const isSelected = i === selected;
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.key}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left"
                      style={isSelected ? { background: "var(--t-blue)", color: "#fff" } : undefined}
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => pick(r)}
                    >
                      <Icon size={15} className={isSelected ? "shrink-0" : "shrink-0 text-gray-400"} />
                      <span className="text-sm truncate">{r.primary}</span>
                      <span
                        className="ml-auto text-xs truncate max-w-[45%]"
                        style={{ color: isSelected ? "rgba(255,255,255,0.75)" : "#9CA3AF" }}
                      >
                        {r.secondary}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          className="px-4 py-2 text-[12px] text-gray-400"
          style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}
        >
          ↑↓ navigate · ↵ open · esc close
        </div>
      </div>
    </div>
  );
}
