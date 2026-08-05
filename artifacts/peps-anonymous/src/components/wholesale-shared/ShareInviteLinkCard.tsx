import { useState, useEffect, useCallback } from "react";
import { Link2, Copy, Check, Loader2, RefreshCw, Trash2, Users, Calendar } from "lucide-react";
import { ExpandableCard } from "./ExpandableCard";

interface InviteLinkData {
  code: string;
  shareId: string;
  maxUses: number | null;
  usageCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  uses: { username: string; wasNewAccount: boolean; usedAt: string }[];
}

interface ShareInviteLinkCardProps {
  shareId: string;
}

export function ShareInviteLinkCard({ shareId }: ShareInviteLinkCardProps) {
  const [link, setLink] = useState<InviteLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form for create/update
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [formDirty, setFormDirty] = useState(false);

  const fetchLink = useCallback(() => {
    setLoading(true);
    fetch(`/api/wholesale-shares/${shareId}/invite-link`)
      .then(async r => {
        if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Failed to load"); }
        return r.json() as Promise<InviteLinkData | null>;
      })
      .then(d => {
        setLink(d);
        if (d) {
          setMaxUses(d.maxUses != null ? String(d.maxUses) : "");
          setExpiresAt(d.expiresAt ? toDatetimeLocal(d.expiresAt) : "");
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [shareId]);

  useEffect(() => { fetchLink(); }, [fetchLink]);

  const inviteUrl = link
    ? `${window.location.origin}/join-wholesale/${link.code}`
    : null;

  const copyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const createLink = async () => {
    setBusy(true); setError("");
    try {
      const body: Record<string, unknown> = {};
      if (maxUses.trim()) body.maxUses = Number(maxUses);
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

      const r = await fetch(`/api/wholesale-shares/${shareId}/invite-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to create link");
      setLink(d); setFormDirty(false);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const updateLink = async () => {
    if (!link) return;
    setBusy(true); setError("");
    try {
      const body: Record<string, unknown> = {
        maxUses: maxUses.trim() ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      const r = await fetch(`/api/wholesale-shares/${shareId}/invite-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to update link");
      setLink(d); setFormDirty(false);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const deactivateLink = async () => {
    if (!link) return;
    if (!window.confirm("Deactivate this invite link? Anyone with the link won't be able to join using it. You can generate a new one anytime.")) return;
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/wholesale-shares/${shareId}/invite-link`, { method: "DELETE" });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Failed to deactivate"); }
      setLink(null); setMaxUses(""); setExpiresAt(""); setFormDirty(false);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const field: React.CSSProperties = {
    background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)",
  };

  const usageDisplay = link ? (
    link.maxUses != null ? `${link.usageCount}/${link.maxUses} used` : `${link.usageCount} used`
  ) : null;

  return (
    <ExpandableCard
      title="Invite Link"
      icon={<Link2 className="w-4 h-4" style={{ color: "var(--t-blue)" }} />}
      summary={link ? `Active · ${usageDisplay}` : "No active link"}
      defaultOpen={false}
    >
      <div className="space-y-4">
        <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
          Generate a private link that grants wholesale access and auto-joins people to this shared order. Set a usage cap or expiry to control who can join.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-subtle)" }} />
          </div>
        ) : (
          <>
            {/* Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>
                  Max uses
                </label>
                <input
                  type="number" min="1" step="1" value={maxUses}
                  onChange={e => { setMaxUses(e.target.value); setFormDirty(true); }}
                  placeholder="Unlimited"
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>
                  Expiry date
                </label>
                <input
                  type="datetime-local" value={expiresAt}
                  onChange={e => { setExpiresAt(e.target.value); setFormDirty(true); }}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field}
                />
              </div>
            </div>

            {/* Active link */}
            {link ? (
              <div className="space-y-3">
                <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Invite link</span>
                    <div className="flex items-center gap-1.5">
                      {link.usageCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--t-blue-08, rgba(59,130,246,0.08))", color: "var(--t-blue)" }}>
                          {usageDisplay}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-xs font-mono truncate" style={{ color: "var(--t-text)" }}>
                      {inviteUrl}
                    </span>
                    <button
                      onClick={copyLink}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--t-surface)", color: copied ? "#22c55e" : "var(--t-text)", border: "1px solid var(--t-border)" }}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {link.expiresAt && (
                    <p className="text-[10px]" style={{ color: "var(--t-muted)" }}>
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Expires {new Date(link.expiresAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Who used it */}
                {link.uses.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold" style={{ color: "var(--t-muted)" }}>
                      <Users className="w-3 h-3 inline mr-1" />
                      Used by {link.uses.length} person{link.uses.length !== 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {link.uses.map((u, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>
                          <span>
                            <span style={{ color: "var(--t-text)" }}>@{u.username.replace(/^@/, "")}</span>
                            {u.wasNewAccount && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>new</span>}
                          </span>
                          <span>{new Date(u.usedAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}

                <div className="flex gap-2">
                  {formDirty && (
                    <button onClick={updateLink} disabled={busy}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: "var(--t-blue)" }}>
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save settings
                    </button>
                  )}
                  <button onClick={createLink} disabled={busy}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold disabled:opacity-50"
                    style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    New link
                  </button>
                  <button onClick={deactivateLink} disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold disabled:opacity-50"
                    style={{ background: "var(--t-surface2)", color: "#ef4444", border: "1px solid var(--t-border)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
                <button onClick={createLink} disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "var(--t-blue)" }}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Generate invite link
                </button>
                <p className="text-[11px] text-center" style={{ color: "var(--t-muted)" }}>
                  No active link. Generate one to start inviting people.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </ExpandableCard>
  );
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
