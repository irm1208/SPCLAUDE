import { useState, useEffect, useRef } from "react";
import {
  Plus, Sun, Star, CalendarDays, Check, X,
  ChevronDown, ChevronRight, ChevronLeft, Trash2, NotebookPen, Link2,
} from "lucide-react";
import { V2_CARD_BORDER } from "./theme";
import { organiserApi, type ApiTodo as Todo, type ApiTodoSubtask as Subtask } from "./api/organiser-api";
import { useOrders } from "./domain/repository-context";

// ─── Workspace: Todo List Tab ────────────────────────────────────────────────
// Single timeline view: tasks grouped by Overdue / Today / Tomorrow / This Week /
// Later / No date, with round check circles and star-to-prioritise rows.
// Clicking a row opens a detail panel (steps, due date, category, order, notes).

const MS_BLUE = "#2D6BCC";
const MS_RED = "#DC2626";
const MS_TEXT = "#0F1F38";
const MS_GRAY = "#6B7280";
const MS_LIGHT = "#F8FAFC";
const MS_HOVER = "#F4F7FB";
const MS_LINE = "#D0DAE4";
const CAT_COLORS = ["#2D6BCC", "#E9A020", "#7C6ED6", "#0F8B8D", "#D96C98", "#22C55E"];

// Local YYYY-MM-DD for a date offset from today
function dstr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA");
}

function todayStr() { return new Date().toLocaleDateString("en-CA"); }

function fmtDue(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function isOverdue(t: Todo): boolean {
  return !!t.dueDate && t.dueDate < todayStr() && t.status !== "done";
}

export default function TodoTab({ selectedGbId, highlightId }: { selectedGbId?: string; highlightId?: string } = {}) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [quickAdd, setQuickAdd] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "timeline" | "calendar">("list");
  const [groupBy, setGroupBy] = useState<"date" | "category">("date");
  const [calMonth, setCalMonth] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calAddDate, setCalAddDate] = useState<string | null>(null);
  const [calAddTitle, setCalAddTitle] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekAddSlot, setWeekAddSlot] = useState<{ date: string; time: string | null } | null>(null);
  const [weekAddTitle, setWeekAddTitle] = useState("");
  const weekScrollRef = useRef<HTMLDivElement | null>(null);
  const weekScrolled = useRef(false);

  // Responsive day count for the week view: 3 on phones, 7 on tablet/desktop
  const [daysShown, setDaysShown] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? 3 : 7);
  useEffect(() => {
    const onResize = () => setDaysShown(window.innerWidth < 640 ? 3 : 7);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Drag state for the week view (move / resize)
  const dragInfo = useRef<{
    id: string; mode: "move" | "resize";
    startX: number; startY: number;
    origDayIdx: number; origStartMin: number; origDur: number;
    colWidth: number; moved: boolean;
  } | null>(null);
  const [drag, setDrag] = useState<{ id: string; dayIdx: number; startMin: number; dur: number } | null>(null);
  // Set when a drag just ended, so the column's click handler doesn't fire and open the add popover
  const justDragged = useRef(false);

  // Context menu for week-view task blocks (copy / delete)
  const [blockMenu, setBlockMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // Scroll the week view to ~7:30am the first time it opens
  useEffect(() => {
    if (view === "timeline" && weekScrollRef.current && !weekScrolled.current) {
      weekScrollRef.current.scrollTop = 7.5 * 44;
      weekScrolled.current = true;
    }
    if (view !== "timeline") weekScrolled.current = false;
  }, [view]);

  // Load todos from the authenticated organiser API.
  useEffect(() => {
    if (!selectedGbId) return;
    let cancelled = false;
    setSyncError(null);
    organiserApi.todos(selectedGbId)
      .then(next => { if (!cancelled) setTodos(next); })
      .catch(error => { if (!cancelled) setSyncError(error instanceof Error ? error.message : "Failed to load todos"); });
    return () => { cancelled = true; };
  }, [selectedGbId]);

  // Highlight a specific todo if passed via highlightId
  useEffect(() => {
    if (highlightId) {
      setSelectedId(highlightId);
      setTimeout(() => {
        const el = document.querySelector(`[data-todo-id="${highlightId}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [highlightId]);

  const persist = (next: Todo[]) => {
    const previous = todos;
    setTodos(next);
    if (!selectedGbId) return;
    const previousById = new Map(previous.map(todo => [todo.id, todo]));
    const nextById = new Map(next.map(todo => [todo.id, todo]));
    const operations: Promise<unknown>[] = [];
    next.forEach(todo => {
      const existing = previousById.get(todo.id);
      if (!existing) operations.push(organiserApi.createTodo(selectedGbId, todo));
      else if (JSON.stringify(existing) !== JSON.stringify(todo)) operations.push(organiserApi.updateTodo(selectedGbId, todo.id, todo));
    });
    previous.forEach(todo => {
      if (!nextById.has(todo.id)) operations.push(organiserApi.deleteTodo(selectedGbId, todo.id));
    });
    Promise.all(operations)
      .then(() => organiserApi.todos(selectedGbId))
      .then(authoritative => { setTodos(authoritative); setSyncError(null); })
      .catch(error => {
        setTodos(previous);
        setSyncError(error instanceof Error ? error.message : "Failed to save todos");
      });
  };

  const orders = useOrders();
  const getOrderInfo = (orderId: string) => {
    const order = orders.find((o: any) => o.id === orderId);
    return order ? { id: order.id, username: order.memberUsername } : null;
  };

  const active = todos.filter(t => !t.archived);
  const taskCategories = Array.from(new Set(active.map(t => t.category).filter(Boolean))) as string[];
  const categories = Array.from(new Set([...customCategories, ...taskCategories]));
  const catColor = (name: string) => CAT_COLORS[Math.max(0, categories.indexOf(name)) % CAT_COLORS.length];

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name || categories.includes(name)) { setAddingCategory(false); setNewCategoryName(""); return; }
    const next = [...customCategories, name];
    setCustomCategories(next);
    setCategoryFilter(name);
    setAddingCategory(false);
    setNewCategoryName("");
  };

  const visible = categoryFilter ? active.filter(t => t.category === categoryFilter) : active;
  const pending = visible.filter(t => t.status !== "done");
  const completed = visible.filter(t => t.status === "done");

  // Sort by due date (undated last), then time
  const byDue = (a: Todo, b: Todo) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return (a.dueDate + (a.dueTime || "")) < (b.dueDate + (b.dueTime || "")) ? -1 : 1;
  };
  pending.sort(byDue);

  // ── Timeline groups ─────────────────────────────────────────────────────
  const timelineGroups = (() => {
    const today = todayStr();
    const tomorrow = dstr(1);
    const weekEnd = dstr(7);
    const groups: { key: string; label: string; color: string; items: Todo[] }[] = [
      { key: "overdue", label: "Overdue", color: MS_RED, items: [] },
      { key: "today", label: "Today", color: MS_BLUE, items: [] },
      { key: "tomorrow", label: "Tomorrow", color: MS_TEXT, items: [] },
      { key: "week", label: "This Week", color: MS_TEXT, items: [] },
      { key: "later", label: "Later", color: MS_GRAY, items: [] },
      { key: "nodate", label: "No date", color: MS_GRAY, items: [] },
    ];
    for (const t of pending) {
      if (!t.dueDate) groups[5].items.push(t);
      else if (t.dueDate < today) groups[0].items.push(t);
      else if (t.dueDate === today) groups[1].items.push(t);
      else if (t.dueDate === tomorrow) groups[2].items.push(t);
      else if (t.dueDate <= weekEnd) groups[3].items.push(t);
      else groups[4].items.push(t);
    }
    return groups.filter(g => g.items.length > 0);
  })();

  // ── Category groups (list view "Group by: Category") ───────────────────
  // Groups follow the chip order; tasks inside each stay due-date sorted.
  const categoryGroups = (() => {
    const groups: { key: string; label: string; color: string; items: Todo[] }[] = categories.map(cat => ({
      key: cat, label: cat, color: catColor(cat), items: [],
    }));
    const uncategorised: Todo[] = [];
    for (const t of pending) {
      const g = t.category ? groups.find(x => x.key === t.category) : undefined;
      if (g) g.items.push(t); else uncategorised.push(t);
    }
    if (uncategorised.length > 0) groups.push({ key: "__none", label: "No category", color: MS_GRAY, items: uncategorised });
    return groups.filter(g => g.items.length > 0);
  })();

  const listGroups = groupBy === "category" ? categoryGroups : timelineGroups;

  // ── Mutations ───────────────────────────────────────────────────────────
  const addTask = () => {
    const title = quickAdd.trim();
    if (!title) return;
    const t: Todo = {
      id: String(Date.now()),
      title,
      status: "todo",
      dueDate: todayStr(),
      category: categoryFilter || undefined,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    persist([t, ...todos]);
    setQuickAdd("");
  };

  const addTaskOnDate = () => {
    const title = calAddTitle.trim();
    if (!title || !calAddDate) return;
    const t: Todo = {
      id: String(Date.now()),
      title,
      status: "todo",
      dueDate: calAddDate,
      category: categoryFilter || undefined,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    persist([t, ...todos]);
    setCalAddTitle("");
    setCalAddDate(null);
  };

  const addTaskOnSlot = () => {
    const title = weekAddTitle.trim();
    if (!title || !weekAddSlot) return;
    const t: Todo = {
      id: String(Date.now()),
      title,
      status: "todo",
      dueDate: weekAddSlot.date,
      dueTime: weekAddSlot.time || undefined,
      category: categoryFilter || undefined,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    persist([t, ...todos]);
    setWeekAddTitle("");
    setWeekAddSlot(null);
  };

  const update = (id: string, patch: Partial<Todo>) =>
    persist(todos.map(t => (t.id === id ? { ...t, ...patch } : t)));

  const toggleDone = (t: Todo) =>
    update(t.id, { status: t.status === "done" ? "todo" : "done" });

  const toggleStar = (t: Todo) =>
    update(t.id, { priority: t.priority === "high" ? undefined : "high" });

  const removeTodo = (id: string) => {
    persist(todos.filter(t => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selected = active.find(t => t.id === selectedId) || null;

  const addStep = () => {
    if (!selected || !newStep.trim()) return;
    update(selected.id, {
      subtasks: [...(selected.subtasks || []), { id: String(Date.now()), text: newStep.trim(), completed: false }],
    });
    setNewStep("");
  };

  const toggleStep = (stepId: string) => {
    if (!selected) return;
    update(selected.id, {
      subtasks: (selected.subtasks || []).map(s => (s.id === stepId ? { ...s, completed: !s.completed } : s)),
    });
  };

  // Toggle a subtask from the list rows (works on any task, not just the open one)
  const toggleStepOf = (t: Todo, stepId: string) => {
    update(t.id, {
      subtasks: (t.subtasks || []).map(s => (s.id === stepId ? { ...s, completed: !s.completed } : s)),
    });
  };

  const removeStep = (stepId: string) => {
    if (!selected) return;
    update(selected.id, { subtasks: (selected.subtasks || []).filter(s => s.id !== stepId) });
  };

  // ── Row + shared bits ───────────────────────────────────────────────────
  const CheckCircle = ({ done, onClick }: { done: boolean; onClick: () => void }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="ov2-todo-check group/check w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 transition-colors"
      style={{ border: `1.5px solid ${done ? MS_BLUE : "#8A8886"}`, background: done ? MS_BLUE : "transparent" }}
      title={done ? "Mark incomplete" : "Mark complete"}
    >
      <Check className={`w-3 h-3 ${done ? "opacity-100" : "opacity-0 group-hover/check:opacity-60"}`} style={{ color: done ? "#fff" : "#8A8886" }} strokeWidth={3} />
    </button>
  );

  const TaskRow = ({ t }: { t: Todo }) => {
    const done = t.status === "done";
    const overdue = isOverdue(t);
    const steps = t.subtasks || [];
    const orderIds = t.linkedOrderIds || (t.linkedOrderId ? [t.linkedOrderId] : []);
    const meta: React.ReactNode[] = [];
    if (t.dueDate) meta.push(
      <span key="due" className="flex items-center gap-1" style={{ color: overdue ? MS_RED : MS_GRAY }}>
        <CalendarDays className="w-3 h-3" /> {fmtDue(t.dueDate)}{t.dueTime ? `, ${t.dueTime}` : ""}
      </span>
    );
    if (steps.length > 0) meta.push(<span key="steps">{steps.filter(s => s.completed).length} of {steps.length}</span>);
    if (t.category && groupBy !== "category") meta.push(
      <span key="cat" className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full" style={{ background: catColor(t.category) }} /> {t.category}
      </span>
    );
    if (orderIds.length > 0) {
      const info = getOrderInfo(orderIds[0]);
      meta.push(
        <span key="ord" className="flex items-center gap-1" style={{ color: MS_BLUE }}>
          <Link2 className="w-3 h-3" /> {info ? `${info.id} (@${info.username})` : orderIds[0]}{orderIds.length > 1 ? ` +${orderIds.length - 1}` : ""}
        </span>
      );
    }
    if (t.description) meta.push(<NotebookPen key="note" className="w-3 h-3" />);

    return (
      <div className="ov2-todo-item" style={{ borderBottom: `1px solid ${MS_LINE}` }} data-todo-id={t.id}>
        <div
          onClick={() => setSelectedId(t.id)}
          className="ov2-todo-task-row flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 bg-white cursor-pointer transition-colors"
          style={{ background: selectedId === t.id ? "#EFF6FC" : undefined }}
          onMouseEnter={(e) => { if (selectedId !== t.id) e.currentTarget.style.background = MS_HOVER; }}
          onMouseLeave={(e) => { if (selectedId !== t.id) e.currentTarget.style.background = ""; }}
        >
          <CheckCircle done={done} onClick={() => toggleDone(t)} />
          <div className="flex-1 min-w-0">
            <div className={`ov2-todo-task-title text-[14px] sm:text-[14px] truncate ${done ? "line-through" : ""}`} style={{ color: done ? MS_GRAY : MS_TEXT }}>
              {t.title}
            </div>
            {meta.length > 0 && (
              <div className="ov2-todo-task-meta flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] sm:text-[12px] mt-0.5" style={{ color: MS_GRAY }}>
                {meta.map((m, i) => (
                  <span key={i} className="flex items-center gap-2.5">
                    {i > 0 && <span className="w-0.5 h-0.5 rounded-full" style={{ background: "#C8C6C4" }} />}
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleStar(t); }}
            className="shrink-0 p-1 rounded transition-colors hover:bg-black/5"
            title={t.priority === "high" ? "Remove importance" : "Mark as important"}
          >
            <Star className="w-[18px] h-[18px]" style={{ color: t.priority === "high" ? MS_BLUE : "#8A8886", fill: t.priority === "high" ? MS_BLUE : "transparent" }} strokeWidth={1.5} />
          </button>
        </div>
        {/* Subtasks under the main task */}
        {!done && steps.length > 0 && (
          <div className="bg-white pb-2">
            {steps.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedId(t.id)}
                className="flex items-center gap-2.5 pl-10 sm:pl-12 pr-4 py-1 cursor-pointer transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = MS_HOVER; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStepOf(t, s.id); }}
                  className="ov2-todo-check is-subtask group/substep w-[14px] h-[14px] rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{ border: `1.5px solid ${s.completed ? MS_BLUE : "#8A8886"}`, background: s.completed ? MS_BLUE : "transparent" }}
                  title={s.completed ? "Mark incomplete" : "Mark complete"}
                >
                  <Check className={`w-2.5 h-2.5 ${s.completed ? "opacity-100" : "opacity-0 group-hover/substep:opacity-60"}`} style={{ color: s.completed ? "#fff" : "#8A8886" }} strokeWidth={3} />
                </button>
                <span className={`text-[13px] sm:text-[13.5px] truncate ${s.completed ? "line-through" : ""}`} style={{ color: s.completed ? "#A19F9D" : MS_GRAY }}>
                  {s.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const todayHeading = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="ov2-todo-workspace rounded-xl overflow-hidden flex relative" style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "#fff", minHeight: 560 }}>
      {syncError ? <div className="ov2-data-notice" data-tone="error" role="alert">{syncError}</div> : null}
      {/* Main list area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="ov2-todo-header px-4 sm:px-6 pt-4 sm:pt-5 pb-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] sm:text-[22px] font-semibold" style={{ color: categoryFilter ? catColor(categoryFilter) : MS_TEXT }}>
              {categoryFilter || (view === "timeline" ? "Timeline" : view === "calendar" ? "Calendar" : "Tasks")}
            </h2>
            <p className="text-[13.5px] mt-0.5" style={{ color: MS_GRAY }}>{todayHeading}</p>
          </div>
          {/* View switcher */}
          <div className="ov2-todo-view-switcher flex rounded-full p-0.5 shrink-0" style={{ background: MS_LIGHT, border: `1px solid ${MS_LINE}` }}>
            {([
              { id: "list", label: "List" },
              { id: "timeline", label: "Timeline" },
              { id: "calendar", label: "Calendar" },
            ] as const).map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className="px-2.5 sm:px-3 h-7 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap"
                style={{
                  background: view === v.id ? "#fff" : "transparent",
                  color: view === v.id ? MS_BLUE : MS_GRAY,
                  boxShadow: view === v.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="ov2-todo-categories px-4 sm:px-6 pb-3 overflow-x-auto">
          <style>{`.v2-todo-cats::-webkit-scrollbar{display:none}.v2-todo-cats{-ms-overflow-style:none;scrollbar-width:none}`}</style>
          <div className="v2-todo-cats flex items-center gap-1.5 w-max">
            <button
              onClick={() => setCategoryFilter(null)}
              className="px-3 h-7 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors"
              style={{
                background: !categoryFilter ? MS_TEXT : "#fff",
                color: !categoryFilter ? "#fff" : MS_GRAY,
                border: `1px solid ${!categoryFilter ? MS_TEXT : MS_LINE}`,
              }}
            >
              All
            </button>
            {categories.map(cat => {
              const isActive = categoryFilter === cat;
              const color = catColor(cat);
              const count = active.filter(t => t.category === cat && t.status !== "done").length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(isActive ? null : cat)}
                  className="flex items-center gap-1.5 px-3 h-7 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors"
                  style={{
                    background: isActive ? color : "#fff",
                    color: isActive ? "#fff" : MS_TEXT,
                    border: `1px solid ${isActive ? color : MS_LINE}`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isActive ? "#fff" : color }} />
                  {cat}
                  {count > 0 && <span style={{ color: isActive ? "rgba(255,255,255,0.8)" : MS_GRAY }}>{count}</span>}
                </button>
              );
            })}
            {addingCategory ? (
              <input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") { setAddingCategory(false); setNewCategoryName(""); } }}
                onBlur={addCategory}
                placeholder="Category name"
                className="px-3 h-7 rounded-full text-[13px] outline-none w-32"
                style={{ border: `1px solid ${MS_BLUE}`, color: MS_TEXT }}
              />
            ) : (
              <button
                onClick={() => setAddingCategory(true)}
                className="flex items-center gap-1 px-3 h-7 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors hover:bg-black/5"
                style={{ color: MS_BLUE, border: `1px dashed ${MS_LINE}` }}
              >
                <Plus className="w-3 h-3" /> New category
              </button>
            )}
          </div>
        </div>

        {/* Quick add */}
        <div className="px-4 sm:px-6 pb-3">
          <div className="ov2-todo-quick-add flex items-center gap-3 px-3 h-11 rounded-md bg-white transition-colors focus-within:shadow-sm" style={{ border: `1px solid ${MS_LINE}` }}>
            <Plus className="w-[18px] h-[18px] shrink-0" style={{ color: MS_BLUE }} />
            <input
              type="text"
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Add a task"
              className="flex-1 text-[14px] outline-none bg-transparent"
              style={{ color: MS_TEXT }}
            />
            {quickAdd.trim() && (
              <button onClick={addTask} className="text-[13px] font-semibold px-2 py-1 rounded hover:bg-black/5" style={{ color: MS_BLUE }}>
                Add
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="ov2-todo-content flex-1 overflow-y-auto px-4 sm:px-6 pb-5">
          {view === "list" && (
            <>
              {/* Group-by toggle */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[12.5px] font-semibold" style={{ color: MS_GRAY }}>Group by</span>
                <div className="flex rounded-full p-0.5" style={{ background: MS_LIGHT, border: `1px solid ${MS_LINE}` }}>
                  {([
                    { id: "date", label: "Due date" },
                    { id: "category", label: "Category" },
                  ] as const).map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGroupBy(g.id)}
                      className="px-2.5 h-6 rounded-full text-[12.5px] font-semibold transition-colors whitespace-nowrap"
                      style={{
                        background: groupBy === g.id ? "#fff" : "transparent",
                        color: groupBy === g.id ? MS_BLUE : MS_GRAY,
                        boxShadow: groupBy === g.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {listGroups.length === 0 && completed.length === 0 && (
                <p className="text-[14px] py-8 text-center" style={{ color: MS_GRAY }}>You're all caught up.</p>
              )}
              {listGroups.length > 0 && (
                <div className="relative ml-1.5">
                  {/* rail */}
                  <div className="absolute left-[5px] top-2 bottom-2 w-px" style={{ background: "#D2D0CE" }} />
                  {listGroups.map(group => (
                    <div key={group.key} className="relative pl-6 pb-4">
                      <span className="absolute left-0 top-[7px] w-[11px] h-[11px] rounded-full bg-white" style={{ border: `2.5px solid ${group.color}` }} />
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="ov2-todo-group-label text-[14px] font-semibold" style={{ color: group.color }}>{group.label}</span>
                        <span className="text-[12.5px]" style={{ color: MS_GRAY }}>{group.items.length}</span>
                      </div>
                      <div className="ov2-todo-group-card rounded-md overflow-hidden" style={{ border: `1px solid ${MS_LINE}` }}>
                        {group.items.map(t => <TaskRow key={t.id} t={t} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed (collapsible) */}
              {completed.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowCompleted(v => !v)}
                    className="flex items-center gap-1.5 px-2 h-8 rounded-md text-[14px] font-semibold transition-colors hover:bg-black/5"
                    style={{ color: MS_TEXT }}
                  >
                    {showCompleted ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    Completed <span style={{ color: MS_GRAY }}>{completed.length}</span>
                  </button>
                  {showCompleted && (
                    <div className="rounded-md overflow-hidden mt-1.5" style={{ border: `1px solid ${MS_LINE}` }}>
                      {completed.map(t => <TaskRow key={t.id} t={t} />)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {view === "timeline" && (() => {
            // ── Apple Calendar-style week view (interactive) ──
            const HOUR_H = 44;
            const SNAP = 15; // minutes
            const DAY_MS = 86400000;
            const now = new Date();
            // First visible day: Monday of week (desktop/tablet) or today-anchored window (mobile 3-day)
            const monday = new Date(now);
            monday.setHours(0, 0, 0, 0);
            if (daysShown === 7) {
              monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
            } else {
              monday.setDate(monday.getDate() + weekOffset * daysShown);
            }
            const days = Array.from({ length: daysShown }, (_, i) =>
              new Date(monday.getTime() + i * DAY_MS).toLocaleDateString("en-CA"));
            const weekLabel = `${new Date(`${days[0]}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(`${days[days.length - 1]}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
            const inWeek = visible.filter(t => t.dueDate && days.includes(t.dueDate) && t.status !== "done");
            const timed = (d: string) => inWeek
              .filter(t => t.dueDate === d && t.dueTime)
              .sort((a, b) => (a.dueTime! < b.dueTime! ? -1 : 1));
            const allDay = (d: string) => inWeek.filter(t => t.dueDate === d && !t.dueTime);
            const toMin = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
            const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
            const minToY = (min: number) => (min / 60) * HOUR_H;
            const nowY = minToY(now.getHours() * 60 + now.getMinutes());
            const showNow = days.includes(todayStr());
            const nowCol = days.indexOf(todayStr());
            const hourLabel = (h: number) =>
              h === 0 ? "" : h < 12 ? `${h} AM` : h === 12 ? "Noon" : `${h - 12} PM`;
            const taskColor = (t: Todo) =>
              isOverdue(t) ? "#D13438" : t.priority === "high" ? "#7C5CFC" : catColor(t.category || "");

            // ── Drag handlers (pointer events work for mouse + touch) ──
            const beginDrag = (e: React.PointerEvent, t: Todo, dayIdx: number, mode: "move" | "resize") => {
              e.preventDefault();
              e.stopPropagation();
              const col = (e.currentTarget as HTMLElement).closest("[data-daycol]") as HTMLElement;
              const colWidth = col ? col.getBoundingClientRect().width : 100;
              const dur = t.durationMin || 60;
              dragInfo.current = {
                id: t.id, mode,
                startX: e.clientX, startY: e.clientY,
                origDayIdx: dayIdx, origStartMin: toMin(t.dueTime!), origDur: dur,
                colWidth, moved: false,
              };
              setDrag({ id: t.id, dayIdx, startMin: toMin(t.dueTime!), dur });
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            };

            const onDragMove = (e: React.PointerEvent) => {
              const info = dragInfo.current;
              if (!info) return;
              const dy = e.clientY - info.startY;
              const dx = e.clientX - info.startX;
              if (Math.abs(dy) > 4 || Math.abs(dx) > 4) info.moved = true;
              const dMin = Math.round((dy / HOUR_H) * 60 / SNAP) * SNAP;
              if (info.mode === "move") {
                const dayDelta = Math.round(dx / info.colWidth);
                const dayIdx = Math.max(0, Math.min(days.length - 1, info.origDayIdx + dayDelta));
                const startMin = Math.max(0, Math.min(24 * 60 - info.origDur, info.origStartMin + dMin));
                setDrag({ id: info.id, dayIdx, startMin, dur: info.origDur });
              } else {
                const dur = Math.max(SNAP, Math.min(24 * 60 - info.origStartMin, info.origDur + dMin));
                setDrag({ id: info.id, dayIdx: info.origDayIdx, startMin: info.origStartMin, dur });
              }
            };

            const endDrag = () => {
              const info = dragInfo.current;
              if (!info) return;
              if (info.moved && drag) {
                update(info.id, {
                  dueDate: days[drag.dayIdx],
                  dueTime: toTime(drag.startMin),
                  durationMin: drag.dur,
                });
              } else if (!info.moved) {
                setSelectedId(info.id);
              }
              // Block the column click that fires right after pointer-up
              justDragged.current = true;
              setTimeout(() => { justDragged.current = false; }, 0);
              dragInfo.current = null;
              setDrag(null);
            };

            const copyTask = (t: Todo) => {
              const copy: Todo = {
                ...t,
                id: String(Date.now()),
                title: `${t.title} (copy)`,
                createdAt: new Date().toISOString(),
                subtasks: (t.subtasks || []).map(s => ({ ...s, id: `${Date.now()}-${s.id}` })),
              };
              persist([copy, ...todos]);
              setBlockMenu(null);
            };

            const SlotPopover = ({ date, time }: { date: string; time: string | null }) => (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute z-40 rounded-lg bg-white shadow-lg p-2"
                style={{ border: `1px solid ${MS_LINE}`, width: 200, top: "100%", left: 0 }}
              >
                <div className="text-[12px] font-semibold mb-1.5" style={{ color: MS_GRAY }}>
                  {new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}{time ? ` · ${time}` : " · All-day"}
                </div>
                <input
                  autoFocus
                  value={weekAddTitle}
                  onChange={(e) => setWeekAddTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTaskOnSlot();
                    if (e.key === "Escape") setWeekAddSlot(null);
                  }}
                  placeholder="Add a task"
                  className="w-full h-8 px-2 rounded-md text-[13px] outline-none mb-1.5"
                  style={{ border: `1px solid ${MS_BLUE}`, color: MS_TEXT }}
                />
                <div className="flex gap-1.5">
                  <button onClick={() => setWeekAddSlot(null)} className="flex-1 h-7 rounded-md text-[12px] font-semibold hover:bg-black/5" style={{ color: MS_GRAY }}>Cancel</button>
                  <button onClick={addTaskOnSlot} disabled={!weekAddTitle.trim()} className="flex-1 h-7 rounded-md text-[12px] font-bold text-white disabled:opacity-40" style={{ background: MS_BLUE }}>Add</button>
                </div>
              </div>
            );

            return (
              <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: `1px solid ${MS_LINE}`, height: "min(560px, 72vh)" }}>
                {/* Week nav */}
                <div className="flex items-center justify-between px-2 sm:px-3 h-11 shrink-0 bg-white" style={{ borderBottom: `1px solid ${MS_LINE}` }}>
                  <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-black/5">
                    <ChevronLeft className="w-4 h-4" style={{ color: MS_GRAY }} />
                  </button>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] sm:text-[14px] font-semibold truncate" style={{ color: MS_TEXT }}>{weekLabel}</span>
                    {weekOffset !== 0 && (
                      <button onClick={() => setWeekOffset(0)} className="text-[12px] font-semibold px-2 py-0.5 rounded hover:bg-black/5 shrink-0" style={{ color: MS_BLUE }}>
                        Today
                      </button>
                    )}
                  </div>
                  <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-black/5">
                    <ChevronRight className="w-4 h-4" style={{ color: MS_GRAY }} />
                  </button>
                </div>

                {/* Day headers */}
                <div className="flex shrink-0 bg-white" style={{ borderBottom: `1px solid ${MS_LINE}` }}>
                  <div className="w-10 sm:w-12 shrink-0" />
                  {days.map(d => {
                    const dt = new Date(`${d}T00:00:00`);
                    const isToday = d === todayStr();
                    return (
                      <div key={d} className="flex-1 min-w-0 py-1.5 text-center">
                        <div className="text-[12px] font-semibold uppercase" style={{ color: isToday ? "#D13438" : MS_GRAY }}>
                          {dt.toLocaleDateString("en-GB", { weekday: "short" })}
                        </div>
                        <span
                          className={`inline-flex items-center justify-center text-[14px] sm:text-[15px] ${isToday ? "w-7 h-7 rounded-full font-bold text-white" : "font-semibold"}`}
                          style={{ background: isToday ? "#D13438" : undefined, color: isToday ? "#fff" : MS_TEXT }}
                        >
                          {dt.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* All-day row */}
                <div className="flex shrink-0 bg-white" style={{ borderBottom: `1px solid ${MS_LINE}` }}>
                  <div className="w-10 sm:w-12 shrink-0 flex items-center justify-end pr-1.5">
                    <span className="text-[10px] sm:text-[11px] uppercase" style={{ color: MS_GRAY }}>all-day</span>
                  </div>
                  {days.map(d => {
                    const items = allDay(d);
                    const isAdding = weekAddSlot?.date === d && weekAddSlot.time === null;
                    return (
                      <div
                        key={d}
                        onClick={() => { setWeekAddSlot({ date: d, time: null }); setWeekAddTitle(""); }}
                        className="relative flex-1 min-w-0 min-h-[26px] px-0.5 py-0.5 space-y-0.5 cursor-pointer hover:bg-black/[0.02]"
                        style={{ borderLeft: `1px solid ${MS_LINE}` }}
                      >
                        {items.slice(0, 2).map(t => (
                          <button
                            key={t.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedId(t.id); }}
                            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setBlockMenu({ id: t.id, x: e.clientX, y: e.clientY }); }}
                            className="w-full text-left px-1.5 py-0.5 rounded text-[12px] font-semibold truncate block text-white"
                            style={{ background: taskColor(t) }}
                            title={t.title}
                          >
                            {t.title}
                          </button>
                        ))}
                        {items.length > 2 && <span className="block px-1 text-[11px]" style={{ color: MS_GRAY }}>+{items.length - 2}</span>}
                        {isAdding && <SlotPopover date={d} time={null} />}
                      </div>
                    );
                  })}
                </div>

                {/* Hour grid */}
                <div ref={weekScrollRef} className="flex-1 overflow-y-auto bg-white">
                  <div className="flex relative" style={{ height: 24 * HOUR_H }}>
                    {/* Hour labels */}
                    <div className="w-10 sm:w-12 shrink-0 relative">
                      {Array.from({ length: 24 }, (_, h) => (
                        <span key={h} className="absolute right-1.5 text-[10px] sm:text-[11px] -translate-y-1/2" style={{ top: h * HOUR_H, color: MS_GRAY }}>
                          {hourLabel(h)}
                        </span>
                      ))}
                    </div>
                    {/* Day columns */}
                    {days.map((d, di) => {
                      const items = timed(d);
                      return (
                        <div
                          key={d}
                          data-daycol
                          className="flex-1 min-w-0 relative"
                          style={{ borderLeft: `1px solid ${MS_LINE}`, background: d === todayStr() ? "rgba(37,100,207,0.025)" : undefined }}
                          onClick={(e) => {
                            if (dragInfo.current || justDragged.current) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const y = e.clientY - rect.top;
                            const hour = Math.max(0, Math.min(23, Math.floor(y / HOUR_H)));
                            setWeekAddSlot({ date: d, time: `${String(hour).padStart(2, "0")}:00` });
                            setWeekAddTitle("");
                          }}
                        >
                          {/* hour lines */}
                          {Array.from({ length: 24 }, (_, h) => (
                            <div key={h} className="absolute left-0 right-0 h-px pointer-events-none" style={{ top: h * HOUR_H, background: MS_LINE }} />
                          ))}
                          {/* task blocks */}
                          {items.map((t) => {
                            const isDragging = drag?.id === t.id;
                            // Keep the element mounted in its home column during drag (unmounting
                            // would drop pointer capture); slide it across columns with transform.
                            const startMin = isDragging ? drag!.startMin : toMin(t.dueTime!);
                            const dur = isDragging ? drag!.dur : (t.durationMin || 60);
                            const dayShift = isDragging ? (drag!.dayIdx - di) * (dragInfo.current?.colWidth || 0) : 0;
                            const y = minToY(startMin);
                            const h = Math.max(minToY(dur), 22);
                            const color = taskColor(t);
                            return (
                              <div
                                key={t.id}
                                onPointerDown={(e) => beginDrag(e, t, di, "move")}
                                onPointerMove={onDragMove}
                                onPointerUp={endDrag}
                                onPointerCancel={endDrag}
                                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setBlockMenu({ id: t.id, x: e.clientX, y: e.clientY }); }}
                                className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-left overflow-hidden select-none touch-none"
                                style={{
                                  top: y + 1,
                                  height: h - 2,
                                  background: isDragging ? `${color}33` : `${color}22`,
                                  borderLeft: `3px solid ${color}`,
                                  cursor: isDragging ? "grabbing" : "grab",
                                  zIndex: isDragging ? 30 : 10,
                                  boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.18)" : undefined,
                                  opacity: isDragging ? 0.95 : 1,
                                  transform: dayShift ? `translateX(${dayShift}px)` : undefined,
                                }}
                                title={t.title}
                              >
                                <div className="text-[12px] sm:text-[12px] font-bold truncate" style={{ color }}>{t.title}</div>
                                {h >= 34 && (
                                  <div className="text-[10px] sm:text-[11px]" style={{ color: MS_GRAY }}>
                                    {toTime(startMin)} – {toTime(Math.min(24 * 60, startMin + dur))}
                                  </div>
                                )}
                                {/* resize handle */}
                                <div
                                  onPointerDown={(e) => beginDrag(e, t, di, "resize")}
                                  onPointerMove={onDragMove}
                                  onPointerUp={endDrag}
                                  className="absolute left-0 right-0 bottom-0 h-2.5 cursor-ns-resize flex items-center justify-center"
                                >
                                  <span className="w-5 h-[3px] rounded-full" style={{ background: `${color}66` }} />
                                </div>
                              </div>
                            );
                          })}
                          {/* slot add popover (timed) */}
                          {weekAddSlot?.date === d && weekAddSlot.time !== null && (
                            <div className="absolute left-0.5 right-0.5 z-40" style={{ top: minToY(toMin(weekAddSlot.time)) }} onClick={(e) => e.stopPropagation()}>
                              <div className="rounded-md px-1.5 py-1" style={{ background: "rgba(37,100,207,0.12)", borderLeft: `3px solid ${MS_BLUE}`, height: HOUR_H - 3 }}>
                                <div className="text-[12px] font-bold" style={{ color: MS_BLUE }}>New task</div>
                              </div>
                              <SlotPopover date={d} time={weekAddSlot.time} />
                            </div>
                          )}
                          {/* now line */}
                          {showNow && di === nowCol && (
                            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowY }}>
                              <div className="h-[2px]" style={{ background: "#D13438" }} />
                              <span className="absolute -left-1 -top-[4px] w-[9px] h-[9px] rounded-full" style={{ background: "#D13438" }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Block context menu (right-click / long-press) */}
                {blockMenu && (() => {
                  const t = active.find(x => x.id === blockMenu.id);
                  if (!t) return null;
                  return (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setBlockMenu(null)} onContextMenu={(e) => { e.preventDefault(); setBlockMenu(null); }} />
                      <div
                        className="fixed z-50 rounded-lg bg-white shadow-xl py-1 w-40"
                        style={{ border: `1px solid ${MS_LINE}`, left: Math.min(blockMenu.x, window.innerWidth - 170), top: Math.min(blockMenu.y, window.innerHeight - 140) }}
                      >
                        <button onClick={() => { setSelectedId(t.id); setBlockMenu(null); }} className="w-full flex items-center gap-2.5 px-3 h-8 text-[13.5px] text-left hover:bg-black/5" style={{ color: MS_TEXT }}>
                          <NotebookPen className="w-3.5 h-3.5" style={{ color: MS_GRAY }} /> Open
                        </button>
                        <button onClick={() => copyTask(t)} className="w-full flex items-center gap-2.5 px-3 h-8 text-[13.5px] text-left hover:bg-black/5" style={{ color: MS_TEXT }}>
                          <Plus className="w-3.5 h-3.5" style={{ color: MS_GRAY }} /> Duplicate
                        </button>
                        <button
                          onClick={() => { update(t.id, { status: "done" }); setBlockMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3 h-8 text-[13.5px] text-left hover:bg-black/5" style={{ color: MS_TEXT }}
                        >
                          <Check className="w-3.5 h-3.5" style={{ color: MS_GRAY }} /> Complete
                        </button>
                        <div className="my-1 h-px" style={{ background: MS_LINE }} />
                        <button onClick={() => { removeTodo(t.id); setBlockMenu(null); }} className="w-full flex items-center gap-2.5 px-3 h-8 text-[13.5px] text-left hover:bg-red-50" style={{ color: MS_RED }}>
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            );
          })()}



          {view === "calendar" && (() => {
            // ── Month calendar grid ──
            const year = calMonth.getFullYear();
            const month = calMonth.getMonth();
            const first = new Date(year, month, 1);
            const startOffset = (first.getDay() + 6) % 7; // Monday-first
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const cells: (string | null)[] = [
              ...Array.from({ length: startOffset }, () => null),
              ...Array.from({ length: daysInMonth }, (_, i) =>
                new Date(year, month, i + 1).toLocaleDateString("en-CA")),
            ];
            while (cells.length % 7 !== 0) cells.push(null);
            const byDate = (d: string) => visible.filter(t => t.dueDate === d && t.status !== "done");
            const monthLabel = calMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

            return (
              <div>
                {/* Month nav */}
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-black/5">
                    <ChevronLeft className="w-4 h-4" style={{ color: MS_GRAY }} />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold" style={{ color: MS_TEXT }}>{monthLabel}</span>
                    <button onClick={() => setCalMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="text-[12px] font-semibold px-2 py-0.5 rounded hover:bg-black/5" style={{ color: MS_BLUE }}>
                      Today
                    </button>
                  </div>
                  <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-black/5">
                    <ChevronRight className="w-4 h-4" style={{ color: MS_GRAY }} />
                  </button>
                </div>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                    <div key={d} className="text-[12px] font-semibold text-center py-1" style={{ color: MS_GRAY }}>{d}</div>
                  ))}
                </div>
                {/* Grid */}
                <div className="grid grid-cols-7 rounded-lg overflow-hidden" style={{ border: `1px solid ${MS_LINE}` }}>
                  {cells.map((d, i) => {
                    const isToday = d === todayStr();
                    const dayTasks = d ? byDate(d) : [];
                    const isAdding = d !== null && calAddDate === d;
                    return (
                      <div
                        key={i}
                        onClick={() => { if (d) { setCalAddDate(d); setCalAddTitle(""); } }}
                        className={`relative min-h-[72px] sm:min-h-[92px] p-1 sm:p-1.5 bg-white ${d ? "cursor-pointer" : ""}`}
                        style={{
                          borderRight: (i + 1) % 7 !== 0 ? `1px solid ${MS_LINE}` : undefined,
                          borderBottom: i < cells.length - 7 ? `1px solid ${MS_LINE}` : undefined,
                          background: d ? (isAdding ? "#EFF6FC" : isToday ? "#EFF6FC" : "#fff") : MS_LIGHT,
                          outline: isAdding ? `2px solid ${MS_BLUE}` : undefined,
                          outlineOffset: -2,
                          zIndex: isAdding ? 20 : undefined,
                        }}
                        onMouseEnter={(e) => { if (d && !isAdding && !isToday) e.currentTarget.style.background = MS_HOVER; }}
                        onMouseLeave={(e) => { if (d && !isAdding && !isToday) e.currentTarget.style.background = "#fff"; }}
                      >
                        {d && (
                          <>
                            <span
                              className={`inline-flex items-center justify-center text-[12px] mb-1 ${isToday ? "w-5 h-5 rounded-full font-bold text-white" : ""}`}
                              style={{ background: isToday ? MS_BLUE : undefined, color: isToday ? "#fff" : MS_GRAY }}
                            >
                              {parseInt(d.slice(8), 10)}
                            </span>
                            <div className="space-y-0.5">
                              {dayTasks.slice(0, 3).map(t => (
                                <button
                                  key={t.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedId(t.id); }}
                                  className="w-full text-left px-1 sm:px-1.5 py-0.5 rounded text-[11px] sm:text-[12px] font-semibold truncate block transition-opacity hover:opacity-75"
                                  style={{
                                    background: isOverdue(t) ? "#FDE7E9" : `${catColor(t.category || "")}1A`,
                                    color: isOverdue(t) ? MS_RED : catColor(t.category || ""),
                                  }}
                                  title={t.title}
                                >
                                  {t.title}
                                </button>
                              ))}
                              {dayTasks.length > 3 && (
                                <span className="block px-1 text-[11px]" style={{ color: MS_GRAY }}>+{dayTasks.length - 3} more</span>
                              )}
                            </div>
                            {/* Quick-add popover for this day */}
                            {isAdding && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-1 right-1 top-full -mt-1 z-30 rounded-lg bg-white shadow-lg p-2"
                                style={{ border: `1px solid ${MS_LINE}`, minWidth: 180 }}
                              >
                                <div className="text-[12px] font-semibold mb-1.5" style={{ color: MS_GRAY }}>
                                  {new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                                </div>
                                <input
                                  autoFocus
                                  value={calAddTitle}
                                  onChange={(e) => setCalAddTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addTaskOnDate();
                                    if (e.key === "Escape") setCalAddDate(null);
                                  }}
                                  placeholder="Add a task"
                                  className="w-full h-8 px-2 rounded-md text-[13px] outline-none mb-1.5"
                                  style={{ border: `1px solid ${MS_BLUE}`, color: MS_TEXT }}
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => setCalAddDate(null)}
                                    className="flex-1 h-7 rounded-md text-[12px] font-semibold hover:bg-black/5"
                                    style={{ color: MS_GRAY }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={addTaskOnDate}
                                    disabled={!calAddTitle.trim()}
                                    className="flex-1 h-7 rounded-md text-[12px] font-bold text-white disabled:opacity-40"
                                    style={{ background: MS_BLUE }}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSelectedId(null)} />
          <div
            className="ov2-todo-detail fixed lg:static inset-y-0 right-0 z-50 lg:z-auto w-[88%] max-w-[340px] sm:w-[340px] lg:w-[300px] xl:w-[340px] shrink-0 flex flex-col"
            style={{ background: MS_LIGHT, borderLeft: `1px solid ${MS_LINE}` }}
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Title row */}
              <div className="flex items-start gap-3 p-3 rounded-md bg-white" style={{ border: `1px solid ${MS_LINE}` }}>
                <div className="mt-0.5">
                  <CheckCircle done={selected.status === "done"} onClick={() => toggleDone(selected)} />
                </div>
                <input
                  value={selected.title}
                  onChange={(e) => update(selected.id, { title: e.target.value })}
                  className={`flex-1 min-w-0 text-[15px] font-semibold outline-none bg-transparent ${selected.status === "done" ? "line-through" : ""}`}
                  style={{ color: selected.status === "done" ? MS_GRAY : MS_TEXT }}
                />
                <button onClick={() => toggleStar(selected)} className="p-0.5">
                  <Star className="w-[18px] h-[18px]" style={{ color: selected.priority === "high" ? MS_BLUE : "#8A8886", fill: selected.priority === "high" ? MS_BLUE : "transparent" }} strokeWidth={1.5} />
                </button>
              </div>

              {/* Steps */}
              <div className="rounded-md bg-white p-3 space-y-2" style={{ border: `1px solid ${MS_LINE}` }}>
                {(selected.subtasks || []).map(s => (
                  <div key={s.id} className="flex items-center gap-2.5 group/step">
                    <CheckCircle done={s.completed} onClick={() => toggleStep(s.id)} />
                    <span className={`flex-1 text-[14px] ${s.completed ? "line-through" : ""}`} style={{ color: s.completed ? MS_GRAY : MS_TEXT }}>{s.text}</span>
                    <button onClick={() => removeStep(s.id)} className="opacity-0 group-hover/step:opacity-100 p-0.5">
                      <X className="w-3.5 h-3.5" style={{ color: MS_GRAY }} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2.5">
                  <Plus className="w-[18px] h-[18px] shrink-0" style={{ color: MS_BLUE }} />
                  <input
                    value={newStep}
                    onChange={(e) => setNewStep(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addStep()}
                    placeholder={(selected.subtasks || []).length ? "Next step" : "Add step"}
                    className="flex-1 text-[14px] outline-none bg-transparent"
                    style={{ color: MS_TEXT }}
                  />
                </div>
              </div>

              {/* Today shortcut */}
              <button
                onClick={() => update(selected.id, { dueDate: selected.dueDate === todayStr() ? undefined : todayStr() })}
                className="w-full flex items-center gap-3 p-3 rounded-md bg-white text-left transition-colors hover:bg-gray-50"
                style={{ border: `1px solid ${MS_LINE}` }}
              >
                <Sun className="w-[18px] h-[18px]" style={{ color: selected.dueDate === todayStr() ? MS_BLUE : MS_GRAY }} strokeWidth={1.75} />
                <span className="text-[14px]" style={{ color: selected.dueDate === todayStr() ? MS_BLUE : MS_TEXT }}>
                  {selected.dueDate === todayStr() ? "Due today" : "Set due today"}
                </span>
              </button>

              {/* Due date + time */}
              <div className="rounded-md bg-white p-3 space-y-2" style={{ border: `1px solid ${MS_LINE}` }}>
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-[18px] h-[18px] shrink-0" style={{ color: MS_GRAY }} strokeWidth={1.75} />
                  <input
                    type="date"
                    value={selected.dueDate || ""}
                    onChange={(e) => update(selected.id, { dueDate: e.target.value || undefined })}
                    className="flex-1 text-[14px] outline-none bg-transparent"
                    style={{ color: MS_TEXT }}
                  />
                  <input
                    type="time"
                    value={selected.dueTime || ""}
                    onChange={(e) => update(selected.id, { dueTime: e.target.value || undefined })}
                    className="text-[14px] outline-none bg-transparent"
                    style={{ color: MS_TEXT }}
                  />
                </div>
                {selected.dueTime && (
                  <div className="flex items-center gap-3">
                    <span className="w-[18px]" />
                    <span className="text-[13px]" style={{ color: MS_GRAY }}>Duration</span>
                    <select
                      value={selected.durationMin || 60}
                      onChange={(e) => update(selected.id, { durationMin: parseInt(e.target.value, 10) })}
                      className="flex-1 text-[14px] outline-none bg-transparent"
                      style={{ color: MS_TEXT }}
                    >
                      {[15, 30, 45, 60, 90, 120, 180, 240].map(m => (
                        <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? "s" : ""}`}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Category + linked order */}
              <div className="rounded-md bg-white p-3 space-y-2.5" style={{ border: `1px solid ${MS_LINE}` }}>
                <div className="flex items-center gap-3">
                  <span className="w-[18px] flex justify-center shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: selected.category ? catColor(selected.category) : "#C8C6C4" }} />
                  </span>
                  <input
                    list="todo-categories"
                    value={selected.category || ""}
                    onChange={(e) => update(selected.id, { category: e.target.value || undefined })}
                    placeholder="Pick a category"
                    className="flex-1 text-[14px] outline-none bg-transparent"
                    style={{ color: MS_TEXT }}
                  />
                  <datalist id="todo-categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="flex items-center gap-3">
                  <Link2 className="w-[18px] h-[18px] shrink-0" style={{ color: MS_GRAY }} strokeWidth={1.75} />
                  <select
                    value={selected.linkedOrderId || ""}
                    onChange={(e) => update(selected.id, { linkedOrderId: e.target.value || undefined })}
                    className="flex-1 text-[14px] outline-none bg-transparent"
                    style={{ color: MS_TEXT }}
                  >
                    <option value="">Link an order</option>
                    {orders.map((o: any) => (
                      <option key={o.id} value={o.id}>{o.id} — {o.memberName} (@{o.memberUsername})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note */}
              <textarea
                value={selected.description || ""}
                onChange={(e) => update(selected.id, { description: e.target.value || undefined })}
                placeholder="Add note"
                rows={4}
                className="w-full rounded-md bg-white p-3 text-[14px] outline-none resize-none"
                style={{ border: `1px solid ${MS_LINE}`, color: MS_TEXT }}
              />
            </div>

            {/* Panel footer */}
            <div className="flex items-center justify-between px-3 h-12 shrink-0" style={{ borderTop: `1px solid ${MS_LINE}` }}>
              <button onClick={() => setSelectedId(null)} className="p-1.5 rounded hover:bg-black/5" title="Close">
                <X className="w-4 h-4" style={{ color: MS_GRAY }} />
              </button>
              <span className="text-[12.5px]" style={{ color: MS_GRAY }}>
                Created {new Date(selected.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
              <button onClick={() => removeTodo(selected.id)} className="p-1.5 rounded hover:bg-red-50" title="Delete task">
                <Trash2 className="w-4 h-4" style={{ color: MS_RED }} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
