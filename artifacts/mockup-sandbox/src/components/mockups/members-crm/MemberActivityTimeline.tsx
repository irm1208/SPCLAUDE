import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
} from "lucide-react";

import type { ActivityEvent, ActivityTone } from "./data";

const ACTIVITY_TONES: Record<
  ActivityTone,
  { label: string; icon: LucideIcon }
> = {
  info: { label: "Update", icon: Info },
  success: { label: "Completed", icon: CheckCircle2 },
  warning: { label: "Attention", icon: AlertTriangle },
  danger: { label: "Issue", icon: AlertCircle },
};

const formatActivityTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
};

export function MemberActivityTimeline({
  events,
}: {
  events: ActivityEvent[];
}) {
  const orderedEvents = [...events].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );

  return (
    <section className="members-crm__activity" aria-label="Member activity">
      <header className="members-crm__activity-heading">
        <div>
          <p>Member history</p>
          <h3>Activity</h3>
        </div>
        <span>Recent order and account updates</span>
      </header>

      {orderedEvents.length === 0 ? (
        <div className="members-crm__activity-empty" role="status">
          <Info size={18} strokeWidth={2} aria-hidden="true" />
          <strong>No activity yet</strong>
          <p>Member and order updates will appear here.</p>
        </div>
      ) : (
        <ol className="members-crm__activity-list">
          {orderedEvents.map((event) => {
            const tone = ACTIVITY_TONES[event.tone];
            const Icon = tone.icon;

            return (
              <li
                className={`members-crm__activity-event members-crm__activity-event--${event.tone}`}
                key={event.id}
              >
                <span
                  className="members-crm__activity-connector"
                  aria-hidden="true"
                />
                <span
                  className="members-crm__activity-marker"
                  aria-hidden="true"
                >
                  <Icon size={13} strokeWidth={2.25} />
                </span>

                <div className="members-crm__activity-copy">
                  <div className="members-crm__activity-meta">
                    <span
                      className={`members-crm__activity-tone members-crm__activity-tone--${event.tone}`}
                    >
                      {tone.label}
                    </span>
                    <time dateTime={event.occurredAt}>
                      {formatActivityTime(event.occurredAt)}
                    </time>
                  </div>
                  <h4>{event.title}</h4>
                  <p>{event.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
