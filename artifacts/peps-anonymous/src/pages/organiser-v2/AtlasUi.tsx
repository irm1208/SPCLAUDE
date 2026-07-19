import { useEffect, useRef, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Inbox, Search, X, type LucideIcon } from "lucide-react";

export type AtlasStatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "navy";

export function AtlasPageHeader({
  eyebrow,
  title,
  description,
  status,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="atlas-page-header">
      <div className="atlas-page-heading">
        {eyebrow ? <span className="atlas-eyebrow">{eyebrow}</span> : null}
        <div className="atlas-page-title-row">
          <h1>{title}</h1>
          {status}
        </div>
        <p>{description}</p>
      </div>
      {actions ? <div className="atlas-page-actions">{actions}</div> : null}
    </header>
  );
}

export function AtlasStatusBadge({
  children,
  tone = "neutral",
  dot = true,
}: {
  children: ReactNode;
  tone?: AtlasStatusTone;
  dot?: boolean;
}) {
  return <span className="atlas-status-badge" data-tone={tone} data-dot={dot || undefined}>{children}</span>;
}

export function AtlasMetricSurface({
  label,
  value,
  detail,
  trend,
  icon: Icon,
  tone = "standard",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  trend?: { value: string; direction: "up" | "down" };
  icon?: LucideIcon;
  tone?: "standard" | "primary" | "dark";
}) {
  const TrendIcon = trend?.direction === "down" ? ArrowDown : ArrowUp;
  return (
    <section className="atlas-metric-surface" data-tone={tone}>
      <div className="atlas-metric-topline">
        <span>{label}</span>
        {Icon ? <span className="atlas-metric-icon"><Icon aria-hidden="true" /></span> : null}
      </div>
      <strong>{value}</strong>
      <div className="atlas-metric-footer">
        {trend ? <span className="atlas-metric-trend" data-direction={trend.direction}><TrendIcon aria-hidden="true" />{trend.value}</span> : null}
        {detail ? <span>{detail}</span> : null}
      </div>
    </section>
  );
}

export function AtlasFilterBar({
  search,
  onSearch,
  placeholder = "Search",
  children,
  trailing,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="atlas-filter-bar">
      <label className="atlas-search-field">
        <Search aria-hidden="true" />
        <span className="sr-only">Search</span>
        <input value={search} onChange={event => onSearch(event.target.value)} placeholder={placeholder} />
        {search ? <button type="button" onClick={() => onSearch("")} aria-label="Clear search"><X aria-hidden="true" /></button> : null}
      </label>
      {children ? <div className="atlas-filter-controls">{children}</div> : null}
      {trailing ? <div className="atlas-filter-trailing">{trailing}</div> : null}
    </div>
  );
}

export interface AtlasColumn<Row> {
  id: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  render: (row: Row) => ReactNode;
}

export function AtlasDataTable<Row>({
  label,
  rows,
  columns,
  rowKey,
  onRowClick,
  selected,
  onSelect,
  empty,
}: {
  label: string;
  rows: readonly Row[];
  columns: readonly AtlasColumn<Row>[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  selected?: readonly string[];
  onSelect?: (keys: string[]) => void;
  empty?: ReactNode;
}) {
  const selectedSet = new Set(selected ?? []);
  const allSelected = rows.length > 0 && rows.every(row => selectedSet.has(rowKey(row)));
  const toggleAll = () => onSelect?.(allSelected ? [] : rows.map(rowKey));
  const toggleOne = (key: string) => onSelect?.(
    selectedSet.has(key) ? [...selectedSet].filter(item => item !== key) : [...selectedSet, key],
  );

  if (!rows.length) return <>{empty ?? <AtlasEmptyState title="Nothing to show" description="Try changing your filters." />}</>;

  return (
    <div className="atlas-data-table-shell">
      <div className="atlas-data-table-scroll">
        <table className="atlas-data-table" aria-label={label}>
          <colgroup>
            {onSelect ? <col style={{ width: "48px" }} /> : null}
            {columns.map(column => <col key={column.id} style={{ width: column.width }} />)}
          </colgroup>
          <thead>
            <tr>
              {onSelect ? (
                <th className="atlas-select-cell">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all rows" />
                </th>
              ) : null}
              {columns.map(column => <th key={column.id} data-align={column.align ?? "left"}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const key = rowKey(row);
              return (
                <tr key={key} data-selected={selectedSet.has(key) || undefined} onClick={() => onRowClick?.(row)}>
                  {onSelect ? (
                    <td className="atlas-select-cell" onClick={event => event.stopPropagation()}>
                      <input type="checkbox" checked={selectedSet.has(key)} onChange={() => toggleOne(key)} aria-label={`Select row ${key}`} />
                    </td>
                  ) : null}
                  {columns.map(column => <td key={column.id} data-align={column.align ?? "left"}>{column.render(row)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AtlasQuickViewDrawer({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="atlas-quick-view-layer" role="presentation">
      <button className="atlas-quick-view-scrim" type="button" onClick={onClose} aria-label="Close quick view" />
      <aside className="atlas-quick-view" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panelRef}>
        <header className="atlas-quick-view-header">
          <div>
            {eyebrow ? <span className="atlas-eyebrow">{eyebrow}</span> : null}
            <h2>{title}</h2>
            {subtitle ? <div className="atlas-quick-view-subtitle">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close quick view"><X aria-hidden="true" /></button>
        </header>
        <div className="atlas-quick-view-body">{children}</div>
        {footer ? <footer className="atlas-quick-view-footer">{footer}</footer> : null}
      </aside>
    </div>
  );
}

export function AtlasDrawerSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="atlas-drawer-section">
      <div className="atlas-drawer-section-heading"><h3>{title}</h3>{action}</div>
      {children}
    </section>
  );
}

export function AtlasEmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="atlas-empty-state">
      <span><Icon aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function AtlasPerson({ name, username, compact = false }: { name: string; username?: string; compact?: boolean }) {
  const initials = name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="atlas-person" data-compact={compact || undefined}>
      <span className="atlas-person-avatar" aria-hidden="true">{initials}</span>
      <span><strong>{name}</strong>{username ? <small>@{username}</small> : null}</span>
    </span>
  );
}
