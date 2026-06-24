import type { WholesaleShareDetail, WholesaleShareMember } from "@/hooks/use-wholesale-shares";
import { shareStage, type ShareStage } from "./stage";

// DOM ids used to scroll the page to the section a guide step points at.
export const GUIDE_ANCHORS = {
  items: "ws-my-items",
  address: "ws-delivery-address",
  manage: "ws-manage",
  owe: "ws-what-you-owe",
} as const;

export type GuideTarget =
  | { kind: "scroll"; anchor: string }
  | { kind: "copyInvite" }
  | { kind: "payOrder" };

export type GuideRole = "organiser" | "recipient" | "member";

export interface GuideStep {
  id: string;
  role: GuideRole;
  title: string;
  description: string;
  done: boolean;
  optional: boolean;
  blocked: boolean;
  note?: string;
  cta?: { label: string; target: GuideTarget };
}

export interface GuidePlan {
  stage: ShareStage;
  steps: GuideStep[];
  // The first not-done, required, non-optional step — surfaced in the banner.
  currentId: string | null;
  // No required steps left for me right now.
  allDone: boolean;
  // Building-stage moment the wizard should auto-open for (once per moment).
  autoOpenMomentId: string | null;
}

// Mirror of the page's delivery-completeness check.
function deliveryComplete(share: WholesaleShareDetail): boolean {
  const d = share.delivery;
  return !!d.username && !!d.address && !!d.country && !!d.name && !!d.phone;
}

// Build the role + stage aware step list from existing share data only.
// Pure: derives everything from `share`/`me`, never calls the server.
export function buildGuide(share: WholesaleShareDetail, me: WholesaleShareMember): GuidePlan {
  const stage = shareStage(share.status);
  const steps: GuideStep[] = [];

  const isCreator = share.isCreator;
  const canEditAddress = share.delivery.canEditAddress; // true when I'm the chosen recipient
  const everyoneHasItems = share.members.length > 0 && share.members.every(m => m.kits > 0);
  const deliverySet = deliveryComplete(share);
  const shippingCalculable = deliverySet && share.estimateCalculable;
  const enoughMembers = share.members.length >= 2;
  const hasDeliveryMember = !!share.delivery.username;
  const canLock = stage === "building" && enoughMembers && everyoneHasItems && deliverySet && shippingCalculable;

  if (stage === "building") {
    // Everyone who's a member adds their own items first.
    steps.push({
      id: "items",
      role: "member",
      title: "Add your items",
      description: "Pick the products you want and an optional tip, then tap Save my items.",
      done: me.kits > 0,
      optional: false,
      blocked: false,
      cta: { label: "Add my items", target: { kind: "scroll", anchor: GUIDE_ANCHORS.items } },
    });

    if (isCreator) {
      steps.push({
        id: "invite",
        role: "organiser",
        title: "Invite members",
        description: "Share your code or invite link so others can join. You need at least 2 people.",
        done: enoughMembers,
        optional: false,
        blocked: false,
        cta: { label: "Copy invite link", target: { kind: "copyInvite" } },
      });
      steps.push({
        id: "delivery",
        role: "organiser",
        title: "Pick who receives the parcel",
        description: "Choose one member to receive the combined parcel. They confirm the address next.",
        done: hasDeliveryMember,
        optional: false,
        blocked: false,
        cta: { label: "Choose recipient", target: { kind: "scroll", anchor: GUIDE_ANCHORS.manage } },
      });
    }

    if (canEditAddress) {
      steps.push({
        id: "address",
        role: "recipient",
        title: "Confirm the delivery address",
        description: "You're receiving this parcel — confirm or edit where it should be sent.",
        done: deliverySet,
        optional: false,
        blocked: false,
        cta: { label: "Confirm address", target: { kind: "scroll", anchor: GUIDE_ANCHORS.address } },
      });
      steps.push({
        id: "onward",
        role: "recipient",
        title: "Set up onward forwarding",
        description: "Optional — only if you'll post each member's items onward. You can skip this.",
        done: share.onward.enabled,
        optional: true,
        blocked: false,
        cta: { label: "Set up forwarding", target: { kind: "scroll", anchor: GUIDE_ANCHORS.manage } },
      });
    }

    if (isCreator) {
      const blockers: string[] = [];
      if (!enoughMembers) blockers.push("at least 2 members");
      if (!everyoneHasItems) blockers.push("everyone to add items");
      if (!deliverySet) blockers.push("a delivery member & address");
      if (deliverySet && !shippingCalculable) blockers.push("a shippable destination");
      steps.push({
        id: "lock",
        role: "organiser",
        title: "Lock & create orders",
        description: "When everyone's ready, lock the order. Items freeze and each member gets their own order to pay.",
        done: false,
        optional: false,
        blocked: !canLock,
        note: !canLock && blockers.length ? `Waiting on: ${blockers.join(", ")}.` : undefined,
        cta: { label: "Go to lock", target: { kind: "scroll", anchor: GUIDE_ANCHORS.manage } },
      });
    }
  }

  if (stage === "paying") {
    steps.push({
      id: "pay",
      role: "member",
      title: "Pay your share",
      description: "Pay your own order. Once everyone has paid, the parcel is sent to the vendor automatically.",
      done: me.paymentStatus === "confirmed",
      optional: false,
      blocked: false,
      cta: me.orderId ? { label: "Pay now", target: { kind: "payOrder" } } : undefined,
    });
  }

  // Peer-to-peer fees are paid directly (to the organiser / parcel recipient),
  // separate from the order. They only appear when actually owed, so when present
  // they're real outstanding actions — NOT skippable — in both paying and done.
  // This keeps the guidance in lockstep with the "What you owe" card.
  if (stage === "paying" || stage === "done") {
    if (me.organiserFee > 0) {
      steps.push({
        id: "fee-organiser",
        role: "member",
        title: "Settle the organiser fee",
        description: "Paid directly to the organiser, separate from your order. See What you owe for how to pay.",
        done: me.organiserFeePaid,
        optional: false,
        blocked: false,
        cta: { label: "View details", target: { kind: "scroll", anchor: GUIDE_ANCHORS.owe } },
      });
    }
    if (me.reshipperFee > 0) {
      steps.push({
        id: "fee-onward",
        role: "member",
        title: "Settle onward shipping",
        description: "Paid directly to the parcel recipient, separate from your order. See What you owe for how to pay.",
        done: me.reshipperFeePaid,
        optional: false,
        blocked: false,
        cta: { label: "View details", target: { kind: "scroll", anchor: GUIDE_ANCHORS.owe } },
      });
    }
  }

  const currentStep = steps.find(s => !s.done && !s.optional) ?? null;
  const allDone = !steps.some(s => !s.done && !s.optional);

  let autoOpenMomentId: string | null = null;
  if (stage === "building") {
    if (canEditAddress && !deliverySet) autoOpenMomentId = "recipient-setup";
    else if (isCreator) autoOpenMomentId = "organiser-setup";
    else if (share.isMember && me.kits === 0) autoOpenMomentId = "member-setup";
  }

  return { stage, steps, currentId: currentStep?.id ?? null, allDone, autoOpenMomentId };
}
