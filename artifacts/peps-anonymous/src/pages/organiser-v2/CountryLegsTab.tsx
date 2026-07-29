import { useState, useEffect, useCallback } from "react";
import { V2_CARD_BORDER } from "./theme";
import {
  Globe, Plus, Loader2, Trash2, Save, Copy, Check, X,
  Users, Package, Settings, Lightbulb, HelpCircle, ToggleLeft,
  ToggleRight, AlertCircle, RefreshCw, ChevronDown, ChevronRight
} from "lucide-react";

// ─── Workspace: Country Legs Tab ─────────────────────────────────────────────
// Split your group buy into separate "legs" for different countries

interface OrgCountryLegReshipper {
  reshipperUsername: string;
  telegramUsername: string;
  paymentTarget: string | null;
  enabledPaymentMethods: string[] | null;
}

interface OrgCountryLeg {
  id: string;
  countryCode: string;
  countryName: string;
  inviteEnabled: boolean;
  inviteCode: string | null;
  status: string;
  sortOrder: number;
  message: string | null;
  countryNote: string | null;
  reshipper: OrgCountryLegReshipper | null;
  reshippers: OrgCountryLegReshipper[];
  orderCount: number;
}

interface CountryLegsTabProps {
  selectedGbId?: string;
}

// Sample data
const SAMPLE_LEGS: OrgCountryLeg[] = [
  {
    id: "1",
    countryCode: "GB",
    countryName: "United Kingdom",
    inviteEnabled: true,
    inviteCode: "GB_LEG_ABC123",
    status: "open",
    sortOrder: 1,
    message: "UK orders ship from our London warehouse",
    countryNote: "Royal Mail delivery only",
    reshipper: {
      reshipperUsername: "uk_reshipper",
      telegramUsername: "@uk_reshipper",
      paymentTarget: "reshipper",
      enabledPaymentMethods: ["usdt", "revolut"],
    },
    reshippers: [],
    orderCount: 15,
  },
  {
    id: "2",
    countryCode: "US",
    countryName: "United States",
    inviteEnabled: true,
    inviteCode: "US_LEG_DEF456",
    status: "open",
    sortOrder: 2,
    message: null,
    countryNote: null,
    reshipper: {
      reshipperUsername: "us_reshipper",
      telegramUsername: "@us_reshipper",
      paymentTarget: "admin",
      enabledPaymentMethods: ["usdt", "paypal"],
    },
    reshippers: [],
    orderCount: 8,
  },
  {
    id: "3",
    countryCode: "AU",
    countryName: "Australia",
    inviteEnabled: false,
    inviteCode: "AU_LEG_GHI789",
    status: "closed",
    sortOrder: 3,
    message: "Australia leg is currently closed",
    countryNote: null,
    reshipper: null,
    reshippers: [],
    orderCount: 0,
  },
];

export default function CountryLegsTab({ selectedGbId }: CountryLegsTabProps = {}) {
  const [legs, setLegs] = useState<OrgCountryLeg[]>([]);
  const [loading, setLoading] = useState(false);
  const [legsEnabled, setLegsEnabled] = useState(true);
  const [showExplainer, setShowExplainer] = useState(true);
  const [expandedLeg, setExpandedLeg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGbId) return;
    setLegs(SAMPLE_LEGS);
  }, [selectedGbId]);

  const handleCopyInviteCode = (code: string, legId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(legId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = (legId: string) => {
    setLegs(prev =>
      prev.map(leg =>
        leg.id === legId
          ? { ...leg, status: leg.status === "open" ? "closed" : "open" }
          : leg
      )
    );
  };

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <Globe className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
          No Group Buy Selected
        </h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
          Select a group buy to manage country legs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Country Legs</h2>
            <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>
              Split your group buy into separate regions with unique settings for each country
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>Country Legs</span>
            <button
              onClick={() => setLegsEnabled(!legsEnabled)}
              className="w-11 h-6 rounded-full transition-all relative"
              style={{ background: legsEnabled ? "var(--t-blue)" : "var(--t-border)" }}
            >
              <div
                className="absolute w-4 h-4 bg-white rounded-full top-1 transition-all"
                style={{ left: legsEnabled ? "calc(100% - 20px)" : "4px" }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Explainer Card */}
      {showExplainer && (
        <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-teal-50" style={{ border: "1px solid #A7F3D0" }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#10B981", color: "#fff" }}>
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>What are Country Legs?</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  Country Legs let you run your group buy as separate mini-GBs for different countries. Each leg can have its own invite code, reshipper, custom messages, and open/close status.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExplainer(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 shrink-0"
              style={{ color: "var(--t-subtle)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-white/80" style={{ border: "1px solid #D1FAE5" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: "#10B981", color: "#fff" }}>✓</div>
                <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>When to use Country Legs</p>
              </div>
              <ul className="text-[12px] leading-relaxed space-y-1" style={{ color: "var(--t-muted)" }}>
                <li>• You have different reshippers for each country</li>
                <li>• Different countries have different pricing or shipping rules</li>
                <li>• You want to open/close signups per country independently</li>
                <li>• You need country-specific messages or notes</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-white/80" style={{ border: "1px solid #D1FAE5" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: "#F59E0B", color: "#fff" }}>!</div>
                <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>How it works</p>
              </div>
              <ul className="text-[12px] leading-relaxed space-y-1" style={{ color: "var(--t-muted)" }}>
                <li>• Each country gets its own invite code</li>
                <li>• Members join a specific country leg</li>
                <li>• Orders are automatically grouped by country</li>
                <li>• You can enable/disable invites per country</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Country Legs List */}
      {!legsEnabled ? (
        <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>Country Legs Disabled</h3>
          <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
            Toggle the switch above to enable country legs for this group buy
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-xl p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "var(--t-blue)" }} />
          <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Loading country legs...</p>
        </div>
      ) : legs.length > 0 ? (
        <div className="rounded-xl p-4 bg-white space-y-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          {legs.map(leg => {
            const isExpanded = expandedLeg === leg.id;
            const isOpen = leg.status === "open";

            return (
              <div key={leg.id} className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                {/* Leg Header - Clickable */}
                <button
                  onClick={() => setExpandedLeg(isExpanded ? null : leg.id)}
                  className="w-full text-left hover:bg-black/[0.02] transition-colors"
                >
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-[24px]">{leg.countryCode === "GB" ? "🇬🇧" : leg.countryCode === "US" ? "🇺🇸" : leg.countryCode === "AU" ? "🇦🇺" : "🌐"}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>{leg.countryName}</h3>
                          <span
                            className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: isOpen ? "#D1FADF" : "#F2F4F7",
                              color: isOpen ? "#12B76A" : "#667085",
                            }}
                          >
                            {isOpen ? "Open" : "Closed"}
                          </span>
                        </div>
                        <p className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                          {leg.orderCount} order{leg.orderCount !== 1 ? "s" : ""} • {leg.reshipper ? `@${leg.reshipper.reshipperUsername}` : "No reshipper"}
                        </p>
                      </div>
                    </div>
                    <div className="ml-3 shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
                      ) : (
                        <ChevronRight className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
                      )}
                    </div>
                  </div>
                </button>

                {/* Invite Code - Always visible */}
                {leg.inviteCode && (
                  <div className="flex items-center gap-2 p-4">
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-subtle)" }}>Invite Code</div>
                      <code className="text-[14px] font-mono font-bold" style={{ color: "var(--t-text)" }}>{leg.inviteCode}</code>
                    </div>
                    <button
                      onClick={() => handleCopyInviteCode(leg.inviteCode!, leg.id)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: copiedCode === leg.id ? "#12B76A" : "var(--t-text)" }}
                      aria-label={`Copy invite code for ${leg.countryName}`}
                    >
                      {copiedCode === leg.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 space-y-3 bg-white" style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}>
                    {/* Reshipper Info */}
                    {leg.reshipper ? (
                      <div className="rounded-lg bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                        <div className="px-3 py-2 text-[12px] font-semibold uppercase tracking-wide" style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                          Assigned Reshipper
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>{leg.reshipper.telegramUsername}</div>
                              <div className="text-[12px] mt-1" style={{ color: "var(--t-muted)" }}>
                                {leg.reshipper.paymentTarget === "reshipper" ? "Direct Payment" : "Via Admin"}
                              </div>
                            </div>
                            <button
                              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-black/5"
                              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-blue)" }}
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                        <div className="px-3 py-2 text-[12px] font-semibold uppercase tracking-wide" style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                          Assigned Reshipper
                        </div>
                        <div className="p-3 text-center">
                          <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>No reshipper assigned</p>
                          <button
                            className="mt-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-black/5"
                            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-blue)" }}
                          >
                            Assign Reshipper
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    <div className="rounded-lg bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                      <div className="px-3 py-2 text-[12px] font-semibold uppercase tracking-wide" style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                        Message
                      </div>
                      <div className="p-3">
                        {leg.message ? (
                          <p className="text-[13px]" style={{ color: "var(--t-text)" }}>{leg.message}</p>
                        ) : (
                          <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>No message set</p>
                        )}
                      </div>
                    </div>

                    {/* Country Note */}
                    <div className="rounded-lg bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                      <div className="px-3 py-2 text-[12px] font-semibold uppercase tracking-wide" style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                        Country Note
                      </div>
                      <div className="p-3">
                        {leg.countryNote ? (
                          <p className="text-[13px]" style={{ color: "var(--t-text)" }}>{leg.countryNote}</p>
                        ) : (
                          <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>No note set</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleToggleStatus(leg.id)}
                        className="flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-black/5"
                        style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                      >
                        {isOpen ? "Close Leg" : "Open Leg"}
                      </button>
                      <button
                        className="flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold text-white"
                        style={{ background: "var(--t-blue)" }}
                      >
                        Edit Settings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add New Leg Button */}
          <button
            className="w-full rounded-lg p-4 flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
            style={{ border: `2px dashed ${V2_CARD_BORDER}` }}
          >
            <Plus className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
            <span className="text-[14px] font-semibold" style={{ color: "var(--t-blue)" }}>Add Country Leg</span>
          </button>
        </div>
      ) : (
        <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <Globe className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>No Country Legs</h3>
          <p className="text-[14px] mb-4" style={{ color: "var(--t-subtle)" }}>
            Add your first country leg to start organizing orders by region
          </p>
          <button
            className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            <Plus className="w-4 h-4 inline mr-1.5" /> Add Country Leg
          </button>
        </div>
      )}
    </div>
  );
}
