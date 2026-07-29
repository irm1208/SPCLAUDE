import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Check, Plus } from "lucide-react";

export function PageHeader({
  title,
  description,
  status,
  children,
}: {
  title: string;
  description: string;
  status?: string;
  children?: ReactNode;
}) {
  return (
    <header className="ov2-page-header">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1>{title}</h1>
          {status ? <span className="ov2-status-pill">{status}</span> : null}
        </div>
        <p>{description}</p>
      </div>
      {children ? <div className="ov2-page-header-actions">{children}</div> : null}
    </header>
  );
}

export function MetricCard({
  title,
  value,
  delta,
  direction = "up",
  children,
}: {
  title: string;
  value: string;
  delta?: string;
  direction?: "up" | "down";
  children?: ReactNode;
}) {
  const DeltaIcon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <section className="ov2-card ov2-metric-card" aria-label={`${title}: ${value}`}>
      <h2 className="ov2-card-title">{title}</h2>
      <strong className="ov2-metric-value">{value}</strong>
      {delta ? (
        <p className="ov2-metric-delta" data-direction={direction}>
          <DeltaIcon aria-hidden="true" /> {delta}
        </p>
      ) : null}
      {children}
    </section>
  );
}

export function AvatarStack({ count = 4 }: { count?: number }) {
  const avatars = ["AM", "JT", "SM", "DK"].slice(0, count);
  return (
    <div className="ov2-avatar-stack" aria-label={`${avatars.length} collaborators`}>
      {avatars.map((initials, index) => (
        <span className="ov2-avatar" data-tone={index % 4} key={initials} aria-hidden="true">
          {initials}
        </span>
      ))}
      <button type="button" className="ov2-avatar ov2-avatar-add" aria-label="Invite collaborator">
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}

export function ViewSwitcher({
  options,
  active,
  onChange,
}: {
  options: readonly string[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="ov2-view-switcher" role="group" aria-label="Choose view">
      {options.map(option => (
        <button
          type="button"
          key={option}
          className={option === active ? "is-active" : ""}
          aria-pressed={option === active}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function SetupProgressCard({
  label,
  value,
  detail,
  complete = false,
}: {
  label: string;
  value: string;
  detail: string;
  complete?: boolean;
}) {
  return (
    <section className="ov2-card ov2-setup-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{complete ? <Check aria-hidden="true" /> : null}{detail}</p>
    </section>
  );
}
