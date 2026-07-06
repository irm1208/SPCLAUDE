import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, Users, Share2, Clock, Globe, ShieldAlert, Package, MapPin } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { WholesaleShell } from "@/components/WholesaleShell";
import { useAccount } from "@/hooks/use-account";
import { useWholesaleShares, useWholesalePublicGroups, createWholesaleShare, joinWholesaleShare } from "@/hooks/use-wholesale-shares";

export default function WholesaleShareEntry() {
  const [, setLocation] = useLocation();
  const { account, isLoading: accountLoading } = useAccount();
  const { data: shares } = useWholesaleShares();
  const { data: publicGroups } = useWholesalePublicGroups();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [comingSoon, setComingSoon] = useState(false);
  const [comingSoonMsg, setComingSoonMsg] = useState("Coming soon");
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    if (!accountLoading && (!account || !account.isWholesale)) setLocation("/account");
  }, [accountLoading, account, setLocation]);

  useEffect(() => {
    fetch("/api/config")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return;
        setComingSoon(d.wholesaleSharedComingSoon === true);
        if (typeof d.wholesaleSharedComingSoonMessage === "string" && d.wholesaleSharedComingSoonMessage.trim()) {
          setComingSoonMsg(d.wholesaleSharedComingSoonMessage);
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true));
  }, []);

  const activeShares = (shares ?? []).filter(s => s.status !== "cancelled");

  const startShare = async () => {
    setError(""); setBusy(true);
    try {
      const share = await createWholesaleShare("even");
      setLocation(`/wholesale/shared/${share.id}`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  const joinShare = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLocation(`/wholesale/shared/${code}`);
  };

  const joinPublicGroup = async (id: string, isMember: boolean) => {
    if (isMember) { setLocation(`/wholesale/shared/${id}`); return; }
    setError(""); setJoiningId(id);
    try {
      await joinWholesaleShare(id);
      setLocation(`/wholesale/shared/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setJoiningId(null);
    }
  };

  const openGroups = (publicGroups ?? []);

  if (accountLoading) {
    return (
      <PageLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--t-subtle)" }} />
        </div>
      </PageLayout>
    );
  }
  if (!account || !account.isWholesale) return null;

  return (
    <WholesaleShell active="shared" title="Shared Orders">
      <div style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <main className="px-4 py-5 pb-36 max-w-3xl mx-auto w-full space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: "#8A9AAA" }} />
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>Shared Order</h1>
              </div>
              <p className="text-sm" style={{ color: "var(--t-muted)" }}>
                Pool one parcel with other members — everyone adds their own items and pays their own share, with vendor shipping split between you.
              </p>
            </div>

            {!configLoaded ? (
              <div className="rounded-xl p-8 flex items-center justify-center" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-subtle)" }} />
              </div>
            ) : comingSoon ? (
              <div className="rounded-xl p-8 flex flex-col items-center text-center gap-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--t-blue-08)" }}>
                  <Clock className="w-6 h-6" style={{ color: "var(--t-blue)" }} />
                </div>
                <p className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{comingSoonMsg}</p>
                <p className="text-sm" style={{ color: "var(--t-muted)" }}>Shared orders aren’t available just yet — check back soon.</p>
              </div>
            ) : (
            <div className="space-y-3">
              {error && <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}

              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Start a shared order</h2>
                  <p className="text-xs" style={{ color: "var(--t-muted)" }}>Create a new parcel and invite others to join using your share code.</p>
                </div>
                <button
                  onClick={startShare}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: "var(--t-blue)" }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  Start a shared order
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "var(--t-border)" }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "var(--t-border)" }} />
              </div>

              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Join an existing order</h2>
                  <p className="text-xs" style={{ color: "var(--t-muted)" }}>Got a code from an organiser? Enter it to join their parcel.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") joinShare(); }}
                    placeholder="Enter code"
                    className="flex-1 h-11 px-3 rounded-xl border text-sm font-mono tracking-widest uppercase bg-transparent outline-none"
                    style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  />
                  <button
                    onClick={joinShare}
                    disabled={!joinCode.trim()}
                    className="px-5 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "var(--t-blue)" }}
                  >
                    Join
                  </button>
                </div>
              </div>

              {activeShares.length > 0 && (
                <div className="rounded-xl p-4 space-y-1.5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Your shared orders</p>
                    <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Pick up where you left off — your saved items and delivery details are kept.</p>
                  </div>
                  {activeShares.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setLocation(`/wholesale/shared/${s.id}`)}
                      className="w-full flex items-center justify-between gap-2 px-3 h-10 rounded-lg text-sm"
                      style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="font-mono font-bold tracking-widest" style={{ color: "var(--t-blue)" }}>{s.id}</span>
                        <span style={{ color: "var(--t-muted)" }}>{s.memberCount}{s.maxMembers != null ? `/${s.maxMembers}` : ""} · {s.isCreator ? "organiser" : "member"}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs capitalize" style={{ color: "var(--t-muted)" }}>{s.status}</span>
                        <ArrowRight className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {openGroups.length > 0 && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--t-blue-05)", border: "1px solid var(--t-blue-15)" }}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                      <h2 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Public groups</h2>
                    </div>
                    <p className="text-xs" style={{ color: "var(--t-muted)" }}>Open shared orders you can join right now.</p>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "var(--t-amber-08, rgba(245,158,11,0.08))", border: "1px solid var(--t-border)" }}>
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                    <p className="text-[11px] leading-snug" style={{ color: "var(--t-muted)" }}>
                      Only join shared orders with people you trust. You’ll be sending payment to the organiser directly.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {openGroups.map(g => {
                      const disabled = g.isFull && !g.isMember;
                      return (
                        <div key={g.id} className="rounded-lg p-3 space-y-2" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold truncate" style={{ color: "var(--t-text)" }}>@{g.organiserUsername}</span>
                            {g.country && (
                              <span className="inline-flex items-center gap-1 text-[11px] shrink-0" style={{ color: "var(--t-muted)" }}>
                                <MapPin className="w-3 h-3" />{g.country}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--t-muted)" }}>
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" />{g.memberCount}{g.maxMembers != null ? `/${g.maxMembers}` : ""} people
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Package className="w-3 h-3" />{g.totalKits}{g.maxTotalKits != null ? `/${g.maxTotalKits}` : ""} kits
                            </span>
                            {g.maxPackages != null && (
                              <span className="inline-flex items-center gap-1">
                                <Share2 className="w-3 h-3" />{g.maxPackages} package{g.maxPackages === 1 ? "" : "s"}
                              </span>
                            )}
                            <span>
                              Fee: {g.organiserFlatFee != null && g.organiserFlatFee > 0 ? `$${g.organiserFlatFee.toFixed(2)}/person` : "none"}
                            </span>
                          </div>
                          <button
                            onClick={() => joinPublicGroup(g.id, g.isMember)}
                            disabled={disabled || joiningId === g.id}
                            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                            style={{ background: "var(--t-blue)" }}
                          >
                            {joiningId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            {g.isMember ? "Open" : g.isCreator ? "Manage" : disabled ? "Full" : "Join"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            )}

          </motion.div>
        </main>
      </div>
    </WholesaleShell>
  );
}
