import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  PackageCheck,
  RefreshCw,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { DirectoryFilters, DirectorySortKey } from "./members-crm-model";
import type { FulfilmentStatus, MemberRecord, PaymentStatus } from "./data";

export type MemberCrmDirectoryProps = {
  members: MemberRecord[];
  countries: string[];
  selectedId: string | null;
  filters: DirectoryFilters;
  state: "ready" | "loading" | "error" | "empty";
  errorMessage?: string;
  onFiltersChange: (next: DirectoryFilters) => void;
  onSelect: (memberId: string) => void;
  onRetry: () => void;
  onReset: () => void;
};

export const DEFAULT_DIRECTORY_FILTERS: DirectoryFilters = {
  query: "",
  country: "all",
  payment: "all",
  fulfilment: "all",
  sortKey: "name",
  direction: "asc",
};

const PAYMENT_OPTIONS: ReadonlyArray<{
  value: DirectoryFilters["payment"];
  label: string;
}> = [
  { value: "all", label: "All payment statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
];

const FULFILMENT_OPTIONS: ReadonlyArray<{
  value: DirectoryFilters["fulfilment"];
  label: string;
}> = [
  { value: "all", label: "All fulfilment statuses" },
  { value: "ready", label: "Ready" },
  { value: "packing", label: "Packing" },
  { value: "dispatched", label: "Dispatched" },
  { value: "on-hold", label: "On hold" },
  { value: "blocked", label: "Blocked" },
];

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  overdue: "Overdue",
};

const FULFILMENT_LABELS: Record<FulfilmentStatus, string> = {
  ready: "Ready",
  packing: "Packing",
  dispatched: "Dispatched",
  "on-hold": "On hold",
  blocked: "Blocked",
};

const formatMoney = (value: number): string =>
  `£${value.toLocaleString("en-GB")}`;

const formatDate = (value: string | null): string => {
  if (!value) {
    return "No orders yet";
  }

  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const hasActiveFilters = (filters: DirectoryFilters): boolean =>
  filters.query !== DEFAULT_DIRECTORY_FILTERS.query ||
  filters.country !== DEFAULT_DIRECTORY_FILTERS.country ||
  filters.payment !== DEFAULT_DIRECTORY_FILTERS.payment ||
  filters.fulfilment !== DEFAULT_DIRECTORY_FILTERS.fulfilment ||
  filters.sortKey !== DEFAULT_DIRECTORY_FILTERS.sortKey ||
  filters.direction !== DEFAULT_DIRECTORY_FILTERS.direction;

const nextSortDirection = (
  filters: DirectoryFilters,
  key: DirectorySortKey,
): DirectoryFilters["direction"] =>
  filters.sortKey === key && filters.direction === "asc" ? "desc" : "asc";

function StatusBadge({
  kind,
  status,
}: {
  kind: "payment" | "fulfilment";
  status: PaymentStatus | FulfilmentStatus;
}) {
  const label =
    kind === "payment"
      ? PAYMENT_LABELS[status as PaymentStatus]
      : FULFILMENT_LABELS[status as FulfilmentStatus];
  const Icon =
    kind === "payment"
      ? status === "confirmed"
        ? CheckCircle2
        : status === "overdue"
          ? XCircle
          : Clock3
      : status === "blocked" || status === "on-hold"
        ? AlertCircle
        : PackageCheck;

  return (
    <span
      className={`members-crm__badge members-crm__badge--${String(status)}`}
      data-status={status}
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

function DirectorySkeleton() {
  return (
    <div
      className="members-crm__directory-state members-crm__directory-state--loading"
      role="status"
      aria-live="polite"
      aria-label="Loading member directory"
    >
      <div className="members-crm__skeleton-list" role="list">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="members-crm__skeleton-row"
            key={index}
            role="listitem"
            aria-label={`Loading member ${index + 1}`}
          >
            <span className="members-crm__skeleton members-crm__skeleton--person" />
            <span className="members-crm__skeleton" />
            <span className="members-crm__skeleton members-crm__skeleton--short" />
            <span className="members-crm__skeleton members-crm__skeleton--money" />
            <span className="members-crm__skeleton members-crm__skeleton--badge" />
            <span className="members-crm__skeleton members-crm__skeleton--badge" />
            <span className="members-crm__skeleton members-crm__skeleton--date" />
          </div>
        ))}
      </div>
      <span className="members-crm__visually-hidden">Loading members</span>
    </div>
  );
}

export function MemberCrmDirectory({
  members,
  countries,
  selectedId,
  filters,
  state,
  errorMessage,
  onFiltersChange,
  onSelect,
  onRetry,
  onReset,
}: MemberCrmDirectoryProps) {
  const countryOptions = Array.from(new Set(countries));
  const resultLabel = `${members.length} ${members.length === 1 ? "member" : "members"}`;

  const updateFilters = (patch: Partial<DirectoryFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const handleSort = (key: DirectorySortKey) => {
    onFiltersChange({
      ...filters,
      sortKey: key,
      direction: nextSortDirection(filters, key),
    });
  };

  const handleRowKeyDown = (
    event: ReactKeyboardEvent<HTMLTableRowElement>,
    memberId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onSelect(memberId);
  };

  const renderSortableHeader = (label: string, key: DirectorySortKey) => {
    const active = filters.sortKey === key;
    const direction = active
      ? filters.direction === "asc"
        ? "ascending"
        : "descending"
      : "none";
    const nextDirection =
      active && filters.direction === "asc" ? "descending" : "ascending";
    const SortIcon =
      direction === "ascending"
        ? ArrowUp
        : direction === "descending"
          ? ArrowDown
          : ArrowUpDown;

    return (
      <th scope="col" aria-sort={direction}>
        <button
          className="members-crm__sort-button"
          type="button"
          onClick={() => handleSort(key)}
          aria-label={`Sort by ${label}; activate for ${nextDirection} order`}
        >
          <span>{label}</span>
          <SortIcon size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </th>
    );
  };

  const renderStaticHeader = (label: string) => (
    <th scope="col" aria-sort="none">
      {label}
    </th>
  );

  const renderDirectoryTable = () => (
    <div className="members-crm__table-wrap">
      <table className="members-crm__table">
        <caption className="members-crm__visually-hidden">
          Member directory
        </caption>
        <thead>
          <tr>
            {renderSortableHeader("Member", "name")}
            {renderStaticHeader("Country")}
            {renderSortableHeader("Orders", "orders")}
            {renderSortableHeader("Total spent", "totalSpent")}
            {renderStaticHeader("Payment")}
            {renderStaticHeader("Fulfilment")}
            {renderSortableHeader("Last order", "lastOrderAt")}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const selected = selectedId === member.id;

            return (
              <tr
                className={
                  selected
                    ? "members-crm__directory-row members-crm__directory-row--selected"
                    : "members-crm__directory-row"
                }
                key={member.id}
                tabIndex={0}
                aria-selected={selected}
                onClick={() => onSelect(member.id)}
                onKeyDown={(event) => handleRowKeyDown(event, member.id)}
              >
                <td data-label="Member">
                  <div className="members-crm__person">
                    <span
                      className="members-crm__directory-avatar"
                      aria-hidden="true"
                    >
                      {member.initials}
                    </span>
                    <span className="members-crm__person-copy">
                      <strong>{member.name}</strong>
                      <span>{member.username}</span>
                    </span>
                  </div>
                </td>
                <td data-label="Country">
                  <span className="members-crm__country">
                    <span aria-hidden="true">{member.countryCode}</span>
                    {member.country}
                  </span>
                </td>
                <td data-label="Orders">{member.orderCount}</td>
                <td data-label="Total spent">
                  {formatMoney(member.totalSpent)}
                </td>
                <td data-label="Payment">
                  <StatusBadge kind="payment" status={member.paymentStatus} />
                </td>
                <td data-label="Fulfilment">
                  <StatusBadge
                    kind="fulfilment"
                    status={member.fulfilmentStatus}
                  />
                </td>
                <td data-label="Last order">
                  {member.lastOrderAt ? (
                    <time dateTime={member.lastOrderAt}>
                      {formatDate(member.lastOrderAt)}
                    </time>
                  ) : (
                    formatDate(member.lastOrderAt)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderState = () => {
    if (state === "loading") {
      return <DirectorySkeleton />;
    }

    if (state === "error") {
      return (
        <div
          className="members-crm__directory-state members-crm__directory-state--error"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={21} aria-hidden="true" />
          <div>
            <h3>Members could not load</h3>
            <p>{errorMessage ?? "We could not load members right now."}</p>
          </div>
          <button
            className="members-crm__directory-action members-crm__directory-action--secondary"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Retry
          </button>
        </div>
      );
    }

    if (state === "empty") {
      return (
        <div className="members-crm__directory-state members-crm__directory-state--empty">
          <Users size={24} aria-hidden="true" />
          <h3>No members yet</h3>
          <p>Members will appear here when people join this group buy.</p>
        </div>
      );
    }

    if (members.length === 0) {
      return (
        <div className="members-crm__directory-state members-crm__directory-state--no-results">
          <Search size={24} aria-hidden="true" />
          <h3>No members found</h3>
          <p>Try a different search or remove one of the filters.</p>
          <button
            className="members-crm__directory-action members-crm__directory-action--secondary"
            type="button"
            onClick={onReset}
          >
            <X size={16} aria-hidden="true" />
            Clear filters
          </button>
        </div>
      );
    }

    return renderDirectoryTable();
  };

  return (
    <section
      className="members-crm__directory"
      aria-labelledby="members-crm-directory-heading"
    >
      <div className="members-crm__directory-heading">
        <div>
          <p className="members-crm__directory-eyebrow">People and orders</p>
          <h2 id="members-crm-directory-heading">Member directory</h2>
        </div>
        <span className="members-crm__result-count" aria-live="polite">
          {resultLabel}
        </span>
      </div>

      <div className="members-crm__directory-toolbar">
        <div className="members-crm__directory-search">
          <Search size={17} aria-hidden="true" />
          <label htmlFor="members-crm-directory-search">Search members</label>
          <input
            id="members-crm-directory-search"
            type="search"
            value={filters.query}
            onChange={(event) =>
              updateFilters({ query: event.currentTarget.value })
            }
            placeholder="Search name, username, or country"
            aria-label="Search members"
          />
        </div>

        <div className="members-crm__directory-filters">
          <div className="members-crm__filter-control">
            <label htmlFor="members-crm-country-filter">Country</label>
            <select
              id="members-crm-country-filter"
              value={filters.country}
              onChange={(event) =>
                updateFilters({ country: event.currentTarget.value })
              }
              aria-label="Filter by country"
            >
              <option value="all">All countries</option>
              {countryOptions.map((country) => (
                <option value={country} key={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div className="members-crm__filter-control">
            <label htmlFor="members-crm-payment-filter">Payment</label>
            <select
              id="members-crm-payment-filter"
              value={filters.payment}
              onChange={(event) =>
                updateFilters({
                  payment: event.currentTarget
                    .value as DirectoryFilters["payment"],
                })
              }
              aria-label="Filter by payment status"
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="members-crm__filter-control">
            <label htmlFor="members-crm-fulfilment-filter">Fulfilment</label>
            <select
              id="members-crm-fulfilment-filter"
              value={filters.fulfilment}
              onChange={(event) =>
                updateFilters({
                  fulfilment: event.currentTarget
                    .value as DirectoryFilters["fulfilment"],
                })
              }
              aria-label="Filter by fulfilment status"
            >
              {FULFILMENT_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters(filters) ? (
            <button
              className="members-crm__directory-action members-crm__directory-action--reset"
              type="button"
              onClick={onReset}
            >
              <X size={16} aria-hidden="true" />
              Reset filters
            </button>
          ) : null}
        </div>
      </div>

      {renderState()}
    </section>
  );
}
