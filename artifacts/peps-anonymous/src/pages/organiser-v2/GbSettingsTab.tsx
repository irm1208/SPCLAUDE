import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { organiserApi, type ApiGroupBuy } from "./api/organiser-api";
import {
  AlertTriangle, Archive, CalendarDays, Check, CheckCircle2, CircleDot,
  ClipboardList, Copy, Eye, FileText, Info, KeyRound, Loader2, Plus,
  Save, Settings, Trash2, Users, X, type LucideIcon,
} from "lucide-react";
import "./gb-settings-atlas.css";

// ─── Workspace: GB Settings Tab ──────────────────────────────────────────────
// Port of the v1 organiser GBFormTab (GbOrganiser.tsx) for editing a live
// group buy, redesigned for the v2 workspace and backed by organiser routes.

interface InfoCard {
  title: string;
  body: string;
}

interface GbSettingsState {
  name: string;
  description: string;
  currency: string;
  closeDate: string; // datetime-local value
  maxMembers: string;
  status: string;
  joinCode: string;
  entryFeeAmount: string;
  entryFeeLabel: string;
  inviteOnly: boolean;
  infoCards: InfoCard[];
}

type SettingsSectionId = "identity" | "lifecycle" | "access" | "cards" | "danger";

interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "identity",
    label: "Identity",
    title: "Identity & timing",
    description: "Name, timing and capacity",
    icon: FileText,
  },
  {
    id: "lifecycle",
    label: "Lifecycle",
    title: "Lifecycle status",
    description: "Draft, active, closed or archived",
    icon: ClipboardList,
  },
  {
    id: "access",
    label: "Access & fee",
    title: "Access & entry fee",
    description: "Join code, visibility and entry fee",
    icon: KeyRound,
  },
  {
    id: "cards",
    label: "Member cards",
    title: "Member cards",
    description: "Notices published to members",
    icon: Info,
  },
  {
    id: "danger",
    label: "Danger zone",
    title: "Danger zone",
    description: "Archive and deletion controls",
    icon: AlertTriangle,
  },
];

function settingsFromApi(groupBuy: ApiGroupBuy): GbSettingsState {
  const infoCards = Array.isArray(groupBuy.infoCards)
    ? groupBuy.infoCards.filter((card): card is InfoCard => Boolean(
      card && typeof card === "object" && "title" in card && "body" in card,
    ))
    : [];
  return {
    name: groupBuy.name,
    description: typeof groupBuy.description === "string" ? groupBuy.description : "",
    currency: typeof groupBuy.currency === "string" ? groupBuy.currency : "GBP",
    closeDate: typeof groupBuy.closeDate === "string" ? groupBuy.closeDate.slice(0, 16) : "",
    maxMembers: groupBuy.memberLimit == null ? "" : String(groupBuy.memberLimit),
    status: typeof groupBuy.status === "string" ? groupBuy.status : "draft",
    joinCode: typeof groupBuy.testOrderPin === "string" ? groupBuy.testOrderPin : "Protected",
    entryFeeAmount: groupBuy.entryFeeAmount == null ? "" : String(groupBuy.entryFeeAmount),
    entryFeeLabel: typeof groupBuy.entryFeeLabel === "string" ? groupBuy.entryFeeLabel : "",
    inviteOnly: Boolean(groupBuy.hiddenFromList),
    infoCards,
  };
}

function settingsPayload(settings: GbSettingsState): Record<string, unknown> {
  return {
    name: settings.name.trim(),
    description: settings.description.trim(),
    currency: settings.currency,
    closeDate: settings.closeDate || null,
    memberLimit: settings.maxMembers ? Number(settings.maxMembers) : null,
    entryFeeEnabled: Boolean(settings.entryFeeAmount),
    entryFeeAmount: settings.entryFeeAmount || null,
    entryFeeLabel: settings.entryFeeLabel.trim() || null,
    hiddenFromList: settings.inviteOnly,
    infoCards: settings.infoCards,
  };
}

const CURRENCIES = ["GBP", "EUR", "USD"] as const;

const STATUS_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: "draft", label: "Draft", color: "#64748B" },
  { key: "active", label: "Active", color: "#16A34A" },
  { key: "closed", label: "Closed", color: "#DC2626" },
  { key: "archived", label: "Archived", color: "#7C5CFC" },
];

function formatCloseDate(value: string): { value: string; detail?: string } {
  if (!value) return { value: "Not scheduled" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { value: "Not scheduled" };
  return {
    value: date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    detail: date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function AtlasEditorSection({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id="gb-settings-editor" className="gb-settings-atlas__editor" aria-labelledby="gb-settings-editor-title">
      <header className="gb-settings-atlas__editor-heading">
        <div>
          <span>{eyebrow}</span>
          <h2 id="gb-settings-editor-title">{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className="gb-settings-atlas__editor-content">{children}</div>
    </section>
  );
}

function AtlasMetric({ label, value, detail, icon: Icon }: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="gb-settings-atlas__metric">
      <span className="gb-settings-atlas__metric-icon"><Icon aria-hidden="true" /></span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        {detail ? <em>{detail}</em> : null}
      </span>
    </div>
  );
}

function AtlasState({ icon: Icon, title, message, tone = "neutral", busy = false, alert = false }: {
  icon: LucideIcon;
  title: string;
  message: string;
  tone?: "neutral" | "danger";
  busy?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="gb-settings-atlas-state" data-tone={tone} role={alert ? "alert" : undefined}>
      <span className="gb-settings-atlas-state__icon">
        <Icon className={busy ? "gb-settings-atlas__spin" : undefined} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function SaveButton({ saving, saved, onClick, label = "Save Changes" }: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <footer className="gb-settings-atlas__editor-footer">
      <span aria-live="polite">
        {saving ? "Saving changes..." : saved ? "Changes saved" : "Changes apply to this section only"}
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={saving}
        className="gb-settings-atlas__save-button"
        data-saved={saved || undefined}
      >
        {saving ? <Loader2 className="gb-settings-atlas__spin" aria-hidden="true" /> : saved ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
        {saved ? "Saved" : label}
      </button>
    </footer>
  );
}

export default function GbSettingsTab({ selectedGbId }: { selectedGbId?: string } = {}) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<GbSettingsState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("identity");
  const settingsRailRef = useRef<HTMLElement | null>(null);

  const [savingBasics, setSavingBasics] = useState(false);
  const [basicsSaved, setBasicsSaved] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessSaved, setAccessSaved] = useState(false);
  const [savingCards, setSavingCards] = useState(false);
  const [cardsSaved, setCardsSaved] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (!selectedGbId) return;
    let cancelled = false;
    setSettings(null);
    setLoadError(null);
    organiserApi.groupBuy(selectedGbId)
      .then(groupBuy => { if (!cancelled) setSettings(settingsFromApi(groupBuy)); })
      .catch(error => { if (!cancelled) setLoadError(error instanceof Error ? error.message : "Failed to load settings"); });
    return () => { cancelled = true; };
  }, [selectedGbId]);

  useEffect(() => {
    settingsRailRef.current
      ?.querySelector<HTMLElement>(`[data-section-id="${activeSection}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeSection]);

  const patch = (p: Partial<GbSettingsState>) =>
    setSettings(s => (s ? { ...s, ...p } : s));

  async function saveSettings(setSaving: (v: boolean) => void, setDone: (v: boolean) => void) {
    if (!settings || !selectedGbId) return;
    setSaving(true);
    setDone(false);
    try {
      const updated = await organiserApi.updateGroupBuy(selectedGbId, settingsPayload(settings));
      setSettings(settingsFromApi(updated));
      await queryClient.invalidateQueries({ queryKey: ["organiser", "group-buys"] });
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetStatus(status: string) {
    if (!settings || !selectedGbId || savingStatus) return;
    setSavingStatus(status);
    try {
      if (status === "archived") {
        await organiserApi.archiveGroupBuy(selectedGbId);
        setSettings({ ...settings, status: "archived" });
      } else {
        const updated = await organiserApi.updateGroupBuy(selectedGbId, { status });
        setSettings(settingsFromApi(updated));
      }
      await queryClient.invalidateQueries({ queryKey: ["organiser", "group-buys"] });
    } finally {
      setSavingStatus(null);
    }
  }

  const copyCode = () => {
    if (!settings) return;
    navigator.clipboard.writeText(settings.joinCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const addInfoCard = () => patch({ infoCards: [...(settings?.infoCards ?? []), { title: "", body: "" }] });
  const removeInfoCard = (i: number) =>
    patch({ infoCards: (settings?.infoCards ?? []).filter((_, j) => j !== i) });
  const updateInfoCard = (i: number, k: keyof InfoCard, v: string) =>
    patch({ infoCards: (settings?.infoCards ?? []).map((c, j) => (j === i ? { ...c, [k]: v } : c)) });

  async function handleArchive() {
    if (!settings || !selectedGbId) return;
    setArchiving(true);
    try {
      await organiserApi.archiveGroupBuy(selectedGbId);
      setSettings({ ...settings, status: "archived" });
      await queryClient.invalidateQueries({ queryKey: ["organiser", "group-buys"] });
    } finally {
      setArchiving(false);
    }
  }

  async function handleDelete() {
    if (!settings || !selectedGbId) return;
    if (!confirm(`Archive "${settings.name}"? It will be removed from active organiser workspaces.`)) return;
    setDeleting(true);
    try {
      await organiserApi.archiveGroupBuy(selectedGbId);
      await queryClient.invalidateQueries({ queryKey: ["organiser", "group-buys"] });
      setDeleted(true);
    } finally {
      setDeleting(false);
    }
  }

  if (!selectedGbId) {
    return (
      <AtlasState
        icon={Settings}
        title="No Group Buy Selected"
        message="Select a group buy to edit its settings"
      />
    );
  }

  if (deleted) {
    return (
      <AtlasState
        icon={Trash2}
        title="Group Buy Deleted"
        message="This group buy has been deleted (simulated). Select another group buy to continue."
        tone="danger"
      />
    );
  }

  if (loadError) {
    return (
      <AtlasState
        icon={AlertTriangle}
        title="Settings unavailable"
        message={loadError}
        tone="danger"
        alert
      />
    );
  }

  if (!settings) {
    return (
      <AtlasState
        icon={Loader2}
        title="Loading settings"
        message="Fetching the selected group buy configuration."
        busy
      />
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.key === settings.status);
  const currentSection = SETTINGS_SECTIONS.find(section => section.id === activeSection) ?? SETTINGS_SECTIONS[0];
  const closeDate = formatCloseDate(settings.closeDate);
  const memberLimit = settings.maxMembers.trim() ? `${settings.maxMembers} members` : "Unlimited";

  return (
    <div className="gb-settings-atlas">
      <header className="gb-settings-atlas__page-heading">
        <div>
          <span className="gb-settings-atlas__eyebrow">Group buy control</span>
          <h1>GB Settings</h1>
          <p>Configure what members see and how this run operates.</p>
        </div>
        {currentStatus ? (
          <span className="gb-settings-atlas__status" data-status={currentStatus.key}>
            <CircleDot aria-hidden="true" />
            {currentStatus.label}
          </span>
        ) : null}
      </header>

      <div className="gb-settings-atlas__metrics" aria-label="Current group buy settings summary">
        <AtlasMetric
          icon={Eye}
          label="Visibility"
          value={settings.inviteOnly ? "Invite only" : "Open join"}
        />
        <AtlasMetric
          icon={CalendarDays}
          label="Closes"
          value={closeDate.value}
          detail={closeDate.detail}
        />
        <AtlasMetric icon={Users} label="Member limit" value={memberLimit} />
      </div>

      <div className="gb-settings-atlas__workspace">
        <nav ref={settingsRailRef} className="gb-settings-atlas__rail" aria-label="GB settings sections">
          {SETTINGS_SECTIONS.map(section => {
            const Icon = section.icon;
            const isActive = section.id === activeSection;
            return (
              <button
                key={section.id}
                type="button"
                data-section-id={section.id}
                className={isActive ? "is-active" : ""}
                aria-current={isActive ? "page" : undefined}
                aria-controls="gb-settings-editor"
                onClick={() => setActiveSection(section.id)}
              >
                <span className="gb-settings-atlas__rail-icon"><Icon aria-hidden="true" /></span>
                <span>
                  <strong>{section.label}</strong>
                  <small>{section.description}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <AtlasEditorSection
          eyebrow={currentSection.label}
          title={currentSection.title}
          description={currentSection.description}
        >
          {activeSection === "identity" ? (
            <div className="gb-settings-atlas__form-stack">
        <div className="gb-settings-atlas__field">
          <label htmlFor="gb-settings-name">
            Name
          </label>
          <input
            id="gb-settings-name"
            value={settings.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="e.g. Winter Peptide Run 2025"
          />
        </div>
        <div className="gb-settings-atlas__field">
          <label htmlFor="gb-settings-description">
            Description
          </label>
          <textarea
            id="gb-settings-description"
            value={settings.description}
            onChange={e => patch({ description: e.target.value })}
            rows={3}
            placeholder="Brief description visible to members..."
          />
        </div>
        <div className="gb-settings-atlas__field-grid gb-settings-atlas__field-grid--three">
          <div className="gb-settings-atlas__field">
            <label htmlFor="gb-settings-currency">
              Currency
            </label>
            <select
              id="gb-settings-currency"
              value={settings.currency}
              onChange={e => patch({ currency: e.target.value })}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="gb-settings-atlas__field">
            <label htmlFor="gb-settings-close-date">
              Close Date
            </label>
            <input
              id="gb-settings-close-date"
              type="datetime-local"
              value={settings.closeDate}
              onChange={e => patch({ closeDate: e.target.value })}
            />
          </div>
          <div className="gb-settings-atlas__field">
            <label htmlFor="gb-settings-member-limit">
              Max Members
            </label>
            <input
              id="gb-settings-member-limit"
              type="number"
              min="1"
              value={settings.maxMembers}
              onChange={e => patch({ maxMembers: e.target.value })}
              placeholder="Unlimited"
            />
          </div>
        </div>
        <SaveButton
          saving={savingBasics}
          saved={basicsSaved}
          onClick={() => saveSettings(setSavingBasics, setBasicsSaved)}
        />
            </div>
          ) : null}

          {activeSection === "lifecycle" ? (
            <div className="gb-settings-atlas__form-stack">
        <div className="gb-settings-atlas__status-grid">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.key}
              type="button"
              data-status={s.key}
              aria-pressed={settings.status === s.key}
              onClick={() => handleSetStatus(s.key)}
              disabled={savingStatus !== null}
            >
              {savingStatus === s.key ? <Loader2 className="gb-settings-atlas__spin" aria-hidden="true" /> : <CircleDot aria-hidden="true" />}
              {s.label}
            </button>
          ))}
        </div>
        <p className="gb-settings-atlas__help">
          Draft = only you can see it. Active = members can join and order. Closed = orders locked while you collect payments and ship. Archived = hidden from members entirely.
        </p>
        <footer className="gb-settings-atlas__editor-footer gb-settings-atlas__editor-footer--passive">
          <span aria-live="polite">
            {savingStatus ? `Updating status to ${savingStatus}...` : `Current status: ${currentStatus?.label ?? settings.status}`}
          </span>
          <strong>Status changes apply immediately</strong>
        </footer>
            </div>
          ) : null}

          {activeSection === "access" ? (
            <div className="gb-settings-atlas__form-stack">
        <div className="gb-settings-atlas__field">
          <span className="gb-settings-atlas__field-label" id="gb-settings-join-code-label">Join Code</span>
          <p className="gb-settings-atlas__help">
            Share this code with members so they can join the group buy directly.
          </p>
          <div className="gb-settings-atlas__join-code">
            <output aria-labelledby="gb-settings-join-code-label">
              {settings.joinCode}
            </output>
            <button
              type="button"
              onClick={copyCode}
              className="gb-settings-atlas__copy-button"
              data-copied={codeCopied || undefined}
            >
              {codeCopied ? <CheckCircle2 aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {codeCopied ? "Copied" : "Copy"}
            </button>
            <span className="gb-settings-atlas__sr-only" aria-live="polite">
              {codeCopied ? "Join code copied" : ""}
            </span>
          </div>
        </div>

        <div className="gb-settings-atlas__field-grid gb-settings-atlas__field-grid--two">
          <div className="gb-settings-atlas__field">
            <label htmlFor="gb-settings-entry-fee">
              Entry Fee ({settings.currency})
            </label>
            <input
              id="gb-settings-entry-fee"
              type="number"
              min="0"
              step="0.01"
              value={settings.entryFeeAmount}
              onChange={e => patch({ entryFeeAmount: e.target.value })}
              placeholder="0.00"
            />
            <p className="gb-settings-atlas__help">Charged once per member on their first order. Blank means no fee.</p>
          </div>
          <div className="gb-settings-atlas__field">
            <label htmlFor="gb-settings-fee-label">
              Fee Label
            </label>
            <input
              id="gb-settings-fee-label"
              value={settings.entryFeeLabel}
              onChange={e => patch({ entryFeeLabel: e.target.value })}
              placeholder="e.g. Admin & materials fee"
            />
            <p className="gb-settings-atlas__help">How the fee appears on members&apos; order summaries.</p>
          </div>
        </div>

        <label className="gb-settings-atlas__switch-row">
          <span>
            <strong>Invite-only</strong>
            <small>Hide from public lists so members need the join code.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.inviteOnly}
            onChange={e => patch({ inviteOnly: e.target.checked })}
          />
        </label>

        <SaveButton
          saving={savingAccess}
          saved={accessSaved}
          onClick={() => saveSettings(setSavingAccess, setAccessSaved)}
        />
            </div>
          ) : null}

          {activeSection === "cards" ? (
            <div className="gb-settings-atlas__form-stack">
        <p className="gb-settings-atlas__help">
          Short notices pinned to the top of the member page: payment windows, shipping timelines, and house rules.
        </p>
        {settings.infoCards.length === 0 ? (
          <p className="gb-settings-atlas__empty">No member cards are published yet.</p>
        ) : null}
        {settings.infoCards.map((card, i) => (
          <section key={i} className="gb-settings-atlas__member-card">
            <header>
              <span>Member card {i + 1}</span>
              <button
                type="button"
                onClick={() => removeInfoCard(i)}
                className="gb-settings-atlas__icon-button"
                aria-label={`Remove ${card.title || `member card ${i + 1}`}`}
                title="Remove member card"
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="gb-settings-atlas__field">
              <label htmlFor={`gb-settings-card-title-${i}`}>Card title</label>
              <input
                id={`gb-settings-card-title-${i}`}
                value={card.title}
                onChange={e => updateInfoCard(i, "title", e.target.value)}
                placeholder="Card title"
              />
            </div>
            <div className="gb-settings-atlas__field">
              <label htmlFor={`gb-settings-card-body-${i}`}>Card message</label>
              <textarea
                id={`gb-settings-card-body-${i}`}
                value={card.body}
                onChange={e => updateInfoCard(i, "body", e.target.value)}
                rows={3}
                placeholder="Card message..."
              />
            </div>
          </section>
        ))}
        <button
          type="button"
          onClick={addInfoCard}
          className="gb-settings-atlas__add-button"
        >
          <Plus aria-hidden="true" /> Add member card
        </button>
        <SaveButton
          saving={savingCards}
          saved={cardsSaved}
          onClick={() => saveSettings(setSavingCards, setCardsSaved)}
          label="Save Member Cards"
        />
            </div>
          ) : null}

          {activeSection === "danger" ? (
            <div className="gb-settings-atlas__danger-list">
              <div className="gb-settings-atlas__danger-row">
                <span className="gb-settings-atlas__danger-icon"><Archive aria-hidden="true" /></span>
                <span>
                  <strong>Archive this group buy</strong>
                  <small>Hide it from members while keeping its operational record.</small>
                </span>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiving || settings.status === "archived"}
                  className="gb-settings-atlas__danger-button"
                >
                  {archiving ? <Loader2 className="gb-settings-atlas__spin" aria-hidden="true" /> : <Archive aria-hidden="true" />}
                  {settings.status === "archived" ? "Archived" : "Archive GB"}
                </button>
              </div>
              <div className="gb-settings-atlas__danger-row">
                <span className="gb-settings-atlas__danger-icon"><Trash2 aria-hidden="true" /></span>
                <span>
                  <strong>Delete this group buy</strong>
                  <small>Permanently remove the GB, its orders, and settings.</small>
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gb-settings-atlas__danger-button gb-settings-atlas__danger-button--solid"
                >
                  {deleting ? <Loader2 className="gb-settings-atlas__spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                  Delete GB
                </button>
              </div>
            </div>
          ) : null}
        </AtlasEditorSection>
      </div>
    </div>
  );
}
