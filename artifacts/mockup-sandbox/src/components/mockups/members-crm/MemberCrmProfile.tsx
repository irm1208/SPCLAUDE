import {
  AlertTriangle,
  AtSign,
  BadgeCheck,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Globe2,
  MessageCircle,
  PackageCheck,
  PackageOpen,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { MemberActivityTimeline } from "./MemberActivityTimeline";
import type {
  ActivityEvent,
  FulfilmentStatus,
  MemberRecord,
  OrderRecord,
  PaymentStatus,
} from "./data";

export type MemberCrmProfileProps = {
  member: MemberRecord | null;
  orders: OrderRecord[];
  activities: ActivityEvent[];
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onMessage: () => void;
  onViewOrders: () => void;
};

type ProfileBodyProps = Pick<
  MemberCrmProfileProps,
  "member" | "orders" | "activities" | "onMessage" | "onViewOrders"
>;

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  confirmed: "Payment confirmed",
  pending: "Payment pending",
  overdue: "Payment overdue",
};

const FULFILMENT_LABELS: Record<FulfilmentStatus, string> = {
  ready: "Ready to fulfil",
  packing: "Packing",
  dispatched: "Dispatched",
  "on-hold": "On hold",
  blocked: "Blocked",
};

const formatMoney = (value: number): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

const formatMemberSince = (memberSince: string): string => {
  const date = new Date(`${memberSince}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const formatOrderDate = (value: string | null): string => {
  if (value === null) {
    return "No orders yet";
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

type ProfileStat = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "attention";
};

function ProfileBody({
  member,
  orders,
  activities,
  onMessage,
  onViewOrders,
}: ProfileBodyProps) {
  if (member === null) {
    return (
      <div className="members-crm__profile-empty">
        <span className="members-crm__profile-empty-icon" aria-hidden="true">
          <ShoppingBag size={22} strokeWidth={1.9} />
        </span>
        <h3>Choose a member</h3>
        <p>
          Select someone from the directory to review their orders, payment,
          fulfilment, and recent activity.
        </p>
      </div>
    );
  }

  const openItems = orders.filter(
    (order) =>
      order.paymentStatus !== "confirmed" ||
      order.fulfilmentStatus === "on-hold" ||
      order.fulfilmentStatus === "blocked",
  ).length;
  const dispatchedCount = orders.filter(
    (order) => order.fulfilmentStatus === "dispatched",
  ).length;
  const orderedOrders = [...orders].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  const standingLabel = member.attention
    ? "Needs attention"
    : "In good standing";
  const StandingIcon = member.attention ? AlertTriangle : BadgeCheck;
  const stats: ProfileStat[] = [
    {
      label: "Total spent",
      value: formatMoney(member.totalSpent),
      icon: CircleDollarSign,
    },
    { label: "Orders", value: member.orderCount, icon: ShoppingBag },
    { label: "Products", value: member.productCount, icon: Boxes },
    {
      label: "Open items",
      value: openItems,
      icon: Clock3,
      tone: openItems > 0 ? "attention" : undefined,
    },
  ];

  return (
    <div className="members-crm__profile-body">
      <div className="members-crm__profile-main">
        <header className="members-crm__profile-identity">
          <span className="members-crm__profile-avatar" aria-hidden="true">
            {member.initials}
          </span>
          <div className="members-crm__profile-identity-copy">
            <div className="members-crm__profile-name-line">
              <h3>{member.name}</h3>
              <span
                className={`members-crm__standing members-crm__standing--${member.attention ? "attention" : "good"}`}
              >
                <StandingIcon size={14} strokeWidth={2} aria-hidden="true" />
                {standingLabel}
              </span>
            </div>
            <p className="members-crm__profile-handle">
              <AtSign size={13} strokeWidth={2} aria-hidden="true" />
              {member.username.replace(/^@/, "")}
              <span aria-hidden="true">·</span>
              <Globe2 size={13} strokeWidth={2} aria-hidden="true" />
              {member.country}
            </p>
            <p className="members-crm__member-since">
              <CalendarDays size={13} strokeWidth={2} aria-hidden="true" />
              Member since {formatMemberSince(member.memberSince)}
            </p>
          </div>
        </header>

        <div
          className="members-crm__profile-actions"
          aria-label="Member actions"
        >
          <button
            className="members-crm__profile-action members-crm__profile-action--primary"
            type="button"
            onClick={onMessage}
          >
            <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
            Message member
          </button>
          <button
            className="members-crm__profile-action members-crm__profile-action--secondary"
            type="button"
            onClick={onViewOrders}
          >
            <ShoppingBag size={16} strokeWidth={2} aria-hidden="true" />
            View orders
          </button>
        </div>

        <section
          className="members-crm__profile-stats"
          aria-label="Member totals"
        >
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <article
              className={`members-crm__profile-stat${tone ? ` members-crm__profile-stat--${tone}` : ""}`}
              key={label}
              aria-label={`${label}: ${value}`}
            >
              <span>
                {label}
                <Icon size={15} strokeWidth={2} aria-hidden="true" />
              </span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        <section
          className="members-crm__orders"
          aria-label="Current and recent orders"
        >
          <header className="members-crm__section-heading">
            <div>
              <p>Orders</p>
              <h3>Current &amp; recent orders</h3>
            </div>
            <span>{orderedOrders.length}</span>
          </header>

          {orderedOrders.length === 0 ? (
            <div className="members-crm__orders-empty" role="status">
              <PackageOpen size={21} strokeWidth={1.9} aria-hidden="true" />
              <div>
                <strong>No orders yet</strong>
                <p>Orders from this member will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="members-crm__order-list">
              {orderedOrders.map((order) => (
                <article className="members-crm__order" key={order.id}>
                  <header className="members-crm__order-heading">
                    <div>
                      <strong>{order.id}</strong>
                      <time dateTime={order.createdAt}>
                        {formatOrderDate(order.createdAt)}
                      </time>
                    </div>
                    <strong>{formatMoney(order.total)}</strong>
                  </header>

                  <ul className="members-crm__order-products">
                    {order.products.map((product) => (
                      <li key={`${order.id}-${product.name}`}>
                        <span>{product.name}</span>
                        <strong>× {product.quantity}</strong>
                      </li>
                    ))}
                  </ul>

                  <footer className="members-crm__order-statuses">
                    <span
                      className={`members-crm__order-status members-crm__order-status--${order.paymentStatus}`}
                    >
                      {order.paymentStatus === "confirmed" ? (
                        <CheckCircle2
                          size={13}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      ) : (
                        <Clock3 size={13} strokeWidth={2} aria-hidden="true" />
                      )}
                      {PAYMENT_LABELS[order.paymentStatus]}
                    </span>
                    <span
                      className={`members-crm__order-status members-crm__order-status--${order.fulfilmentStatus}`}
                    >
                      <PackageCheck
                        size={13}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      {FULFILMENT_LABELS[order.fulfilmentStatus]}
                    </span>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          className="members-crm__member-details"
          aria-label="Member details"
        >
          <header className="members-crm__section-heading">
            <div>
              <p>Profile</p>
              <h3>Member details</h3>
            </div>
          </header>
          <dl>
            <div>
              <dt>Country</dt>
              <dd>{member.country}</dd>
            </div>
            <div>
              <dt>Telegram</dt>
              <dd>{member.username}</dd>
            </div>
            <div>
              <dt>Last order</dt>
              <dd>{formatOrderDate(member.lastOrderAt)}</dd>
            </div>
            <div>
              <dt>Fulfilled</dt>
              <dd>
                {dispatchedCount} / {orders.length}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <MemberActivityTimeline events={activities} />
    </div>
  );
}

export function MemberCrmProfile({
  member,
  orders,
  activities,
  mobileOpen,
  onMobileOpenChange,
  onMessage,
  onViewOrders,
}: MemberCrmProfileProps) {
  const bodyProps: ProfileBodyProps = {
    member,
    orders,
    activities,
    onMessage,
    onViewOrders,
  };

  return (
    <>
      <aside
        className="members-crm__profile members-crm__profile--desktop"
        aria-labelledby="members-crm-profile-heading-desktop"
      >
        <h2
          className="members-crm__visually-hidden"
          id="members-crm-profile-heading-desktop"
        >
          {member ? `${member.name} member profile` : "Choose a member"}
        </h2>
        <ProfileBody {...bodyProps} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="right" className="members-crm-mobile-sheet">
          <SheetHeader className="members-crm-mobile-sheet__header">
            <SheetTitle>{member?.name ?? "Member details"}</SheetTitle>
            <SheetDescription>
              Orders, payment, fulfilment, and recent activity
            </SheetDescription>
          </SheetHeader>
          <ProfileBody {...bodyProps} />
        </SheetContent>
      </Sheet>
    </>
  );
}
