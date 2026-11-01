import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Check, ChevronLeft, ChevronRight, Rocket, Save } from "lucide-react";
import { get, post, patch } from "@/lib/api";
import { useAuth, type PaymentMethods } from "@/lib/auth";
import type { PoolView, VendorSummary, Batch } from "@/lib/types";
import { TEST_TYPES, usd } from "@/lib/format";
import { Page } from "@/components/Layout";
import { Button, Card, Field, Input, Textarea, Select, Modal, Alert, Spinner, Badge, cn, useToast } from "@/components/ui";
import { PaymentMethodsEditor } from "@/components/PaymentMethodsEditor";
import { FundingDonut } from "@/components/Donut";
import { VendorForm } from "./Vendors";
import { BatchForm } from "./VendorPage";

/**
 * Hosting a pool is a short wizard: what to test → how to split the cost → who can see it and
 * how they pay → review. Each step validates only what it owns, defaults are sensible, and the
 * final step can open the pool straight away instead of leaving a draft behind.
 */
type ItemDraft = { key: string; vendorId: string; batchId: string; testType: string; lab: string; priceUsd: string; quantity: number; labOrderUrl: string };
const blankItem = (vendorId = "", batchId = ""): ItemDraft => ({ key: Math.random().toString(36).slice(2), vendorId, batchId, testType: TEST_TYPES[0], lab: "", priceUsd: "", quantity: 1, labOrderUrl: "" });
const r2 = (n: number) => Math.round(n * 100) / 100;
const STEPS = [
  { key: "tests", title: "What to test", blurb: "The batch, the tests and the lab." },
  { key: "cost", title: "Split the cost", blurb: "Shipping, tip and how the bill is shared." },
  { key: "share", title: "Sharing and payment", blurb: "Who can see the pool, the results, and how members pay you." },
  { key: "review", title: "Review", blurb: "Check the numbers, then open the pool." },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

export default function PoolEditor({ id }: { id?: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const toast = useToast();
  const params = new URLSearchParams(window.location.search);
  const existing = useQuery({ queryKey: ["manage", id], queryFn: () => get<PoolView>(`/api/tmd/pools/manage/${id}`), enabled: !!id });
  const vendors = useQuery({ queryKey: ["vendors", ""], queryFn: () => get<{ vendors: VendorSummary[] }>("/api/tmd/vendors") });
  const [step, setStep] = useState<StepKey>("tests");
  const [form, setForm] = useState({
    title: "", description: "", labName: "Janoshik", visibility: "public", accessCode: "", resultsVisibility: "public", resultsPassword: "",
    splitMode: "even", fixedShareUsd: "", shippingUsd: "0", organiserTipUsd: "0", minMembers: 10, maxMembers: "", deadlineAt: "",
  });
  const [methods, setMethods] = useState<PaymentMethods>(user?.payoutMethods ?? {});
  const [items, setItems] = useState<ItemDraft[]>([blankItem(params.get("vendor") ?? "", params.get("batch") ?? "")]);
  const [batchesByVendor, setBatchesByVendor] = useState<Record<string, Batch[]>>({});
  const [modal, setModal] = useState<{ kind: "vendor" | "batch"; itemKey: string } | null>(null);
  const [busy, setBusy] = useState<"draft" | "open" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locked = !!existing.data && !["draft", "open"].includes(existing.data.pool.status);
  const hasPayments = !!existing.data && existing.data.members.some(m => ["submitted", "verified"].includes(m.paymentStatus));
  const isDraft = !existing.data || existing.data.pool.status === "draft";

  useEffect(() => {
    const v = existing.data; if (!v) return;
    const p = v.pool;
    setForm({ title: p.title, description: p.description ?? "", labName: p.labName ?? "", visibility: p.visibility, accessCode: "", resultsVisibility: p.resultsVisibility, resultsPassword: "",
      splitMode: p.splitMode, fixedShareUsd: p.fixedShareUsd ?? "", shippingUsd: p.shippingUsd, organiserTipUsd: p.organiserTipUsd, minMembers: p.minMembers, maxMembers: p.maxMembers?.toString() ?? "", deadlineAt: p.deadlineAt ? p.deadlineAt.slice(0, 16) : "" });
    setMethods(p.paymentMethods ?? {});
    setItems(p.items.length ? p.items.map(i => ({ key: i.id, vendorId: i.vendor?.id ?? "", batchId: i.batchId ?? "", testType: i.testType, lab: i.lab ?? "", priceUsd: i.priceUsd, quantity: i.quantity, labOrderUrl: i.labOrderUrl ?? "" })) : [blankItem()]);
  }, [existing.data]);
  useEffect(() => {
    for (const vid of new Set(items.map(i => i.vendorId).filter(Boolean))) {
      if (batchesByVendor[vid]) continue;
      get(`/api/tmd/vendors/${vid}`).then(v => setBatchesByVendor(b => ({ ...b, [vid]: v.batches }))).catch(() => setBatchesByVendor(b => ({ ...b, [vid]: [] })));
    }
  }, [items, batchesByVendor]);

  const breakdown = useMemo(() => {
    const tests = r2(items.reduce((s, i) => s + (Number(i.priceUsd) || 0) * Math.max(1, i.quantity), 0));
    const shipping = Number(form.shippingUsd) || 0, tip = Number(form.organiserTipUsd) || 0;
    const target = r2(tests + shipping + tip);
    const share = form.splitMode === "fixed" ? Number(form.fixedShareUsd) || 0 : Math.max(1, r2(target / Math.max(1, Number(form.minMembers) || 1)));
    return { tests, shipping, tip, target, share };
  }, [items, form]);
  const hasMethod = !!(methods.crypto?.length || methods.anonpay || methods.revolut || methods.paypal);

  /** Problems that block moving on from a step. Soft problems (warnings) are shown but do not block. */
  const problems: Record<StepKey, string[]> = {
    tests: [
      ...(form.title.trim().length < 4 ? ["Give the pool a title of at least 4 characters."] : []),
      ...(items.filter(i => i.testType).length === 0 ? ["Add at least one test."] : []),
      ...(items.some(i => !(Number(i.priceUsd) > 0)) ? ["Every test needs a price above $0."] : []),
    ],
    cost: [
      ...(form.splitMode === "fixed" && !(Number(form.fixedShareUsd) > 0) ? ["Set the share each member pays."] : []),
      ...(form.splitMode === "even" && !(Number(form.minMembers) >= 1) ? ["Expected members must be at least 1."] : []),
      ...(form.maxMembers && Number(form.maxMembers) < Number(form.minMembers) ? ["Maximum members cannot be below the expected number."] : []),
    ],
    share: [
      ...(form.visibility === "invite" && !form.accessCode && !id ? ["Invite-only pools need an access code."] : []),
      ...(form.resultsVisibility === "password" && !form.resultsPassword && !id ? ["Password-protected results need a password."] : []),
    ],
    review: [],
  };
  const warnings: string[] = [
    ...(!hasMethod ? ["No payment method yet. You can save a draft, but the pool cannot open until members have a way to pay you."] : []),
    ...(items.some(i => !i.batchId) ? ["Some tests have no batch picked. Adding the vendor and batch number puts the result on the vendor's page."] : []),
  ];
  const stepIndex = STEPS.findIndex(s => s.key === step);
  const canLeave = (k: StepKey) => problems[k].length === 0;
  const goTo = (k: StepKey) => { setError(null); setStep(k); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const next = () => { if (!canLeave(step)) { setError(problems[step][0]); return; } goTo(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)].key); };

  const payload = () => {
    const p: any = { ...form, minMembers: Number(form.minMembers) || 1, maxMembers: form.maxMembers ? Number(form.maxMembers) : null, deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : null, paymentMethods: methods };
    if (!p.accessCode) delete p.accessCode;
    if (!p.resultsPassword) delete p.resultsPassword;
    if (!hasPayments) p.items = items.filter(i => i.testType).map(i => ({ batchId: i.batchId || null, testType: i.testType, lab: i.lab || null, priceUsd: Number(i.priceUsd) || 0, quantity: i.quantity, labOrderUrl: i.labOrderUrl || null }));
    return p;
  };
  const submit = async (mode: "draft" | "open") => {
    const blocking = STEPS.flatMap(s => problems[s.key]);
    if (blocking.length) { setError(blocking[0]); const firstBad = STEPS.find(s => problems[s.key].length); if (firstBad) goTo(firstBad.key); return; }
    if (mode === "open" && !hasMethod) { setError("Add at least one payment method before opening the pool."); goTo("share"); return; }
    setBusy(mode); setError(null);
    try {
      const view: PoolView = id ? await patch(`/api/tmd/pools/${id}`, payload()) : await post("/api/tmd/pools", payload());
      if (mode === "open" && view.pool.status === "draft") {
        try { await post(`/api/tmd/pools/${view.pool.id}/status`, { status: "open" }); toast("Your pool is open. Share the link.", "ok"); }
        catch (err: any) { toast(`Saved as a draft: ${err.message}`, "danger"); }
      } else toast(id ? "Pool saved" : "Draft saved", "ok");
      navigate(`/host/${view.pool.id}`);
    } catch (err: any) { setError(err.message); window.scrollTo({ top: 0, behavior: "smooth" }); } finally { setBusy(null); }
  };
  const updateItem = (key: string, changes: Partial<ItemDraft>) => setItems(list => list.map(i => i.key === key ? { ...i, ...changes } : i));

  if (id && existing.isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (id && existing.isError) return <Alert tone="danger">Could not load this pool.</Alert>;

  return (
    <Page title={id ? "Edit pool" : "Host a pool"} subtitle={id ? undefined : "Four short steps. Nothing is visible until you open the pool."}>
      {/* Stepper */}
      <ol className="grid gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => {
          const state = s.key === step ? "current" : i < stepIndex || (id && canLeave(s.key)) ? "done" : "todo";
          return (
            <li key={s.key}>
              <button type="button" onClick={() => (i <= stepIndex || id) && goTo(s.key)} className={cn("flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition", state === "current" ? "border-brand bg-brand-soft/60" : state === "done" ? "border-line bg-surface hover:border-brand/40" : "border-line bg-surface opacity-70")} aria-current={state === "current" ? "step" : undefined}>
                <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", state === "current" ? "bg-brand text-brand-fg" : state === "done" ? "bg-ok/10 text-ok" : "bg-surface-2 text-muted")}>{state === "done" ? <Check className="size-3.5" /> : i + 1}</span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{s.title}</span><span className="hidden text-xs text-muted sm:block">{s.blurb}</span></span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {error && <Alert tone="danger">{error}</Alert>}
          {locked && <Alert tone="info">This pool has moved past the open stage. You can still edit the description, visibility and results settings.</Alert>}

          {step === "tests" && (
            <>
              <Card>
                <h2 className="mb-4 text-lg font-semibold">The basics</h2>
                <div className="space-y-4">
                  <Field label="Title" hint="Compound, batch and what you are testing. This is what people see first."><Input placeholder="BPC-157 batch 2403 · purity + quantity" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} minLength={4} maxLength={120} autoFocus /></Field>
                  <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                    <Field label="Description" hint="Optional. Why this batch, timelines, anything members should know."><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={4000} className="min-h-24" /></Field>
                    <Field label="Lab" hint="Where the samples go."><Input placeholder="Janoshik" value={form.labName} onChange={e => setForm({ ...form, labName: e.target.value })} /></Field>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Tests</h2><p className="text-sm text-muted">One row per test. Pick the vendor and batch so the result lands on the vendor's page.</p></div>{!hasPayments && <Button type="button" tone="subtle" size="sm" onClick={() => setItems([...items, blankItem(items.at(-1)?.vendorId)])}><Plus className="size-3.5" /> Add test</Button>}</div>
                {hasPayments && <Alert tone="warn" className="mb-4">Members have already paid, so tests are locked. Cancel and recreate the pool if the plan changed.</Alert>}
                <div className="space-y-3">
                  {items.map(item => {
                    const batches = batchesByVendor[item.vendorId] ?? [];
                    return (
                      <div key={item.key} className="rounded-xl border border-line bg-surface-2/60 p-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_110px_80px_auto]">
                          <Field label="Vendor">
                            <Select value={item.vendorId} disabled={hasPayments} onChange={e => e.target.value === "__new" ? setModal({ kind: "vendor", itemKey: item.key }) : updateItem(item.key, { vendorId: e.target.value, batchId: "" })}>
                              <option value="">Choose vendor</option>{vendors.data?.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}<option value="__new">+ Add a vendor…</option>
                            </Select>
                          </Field>
                          <Field label="Batch">
                            <Select value={item.batchId} disabled={!item.vendorId || hasPayments} onChange={e => e.target.value === "__new" ? setModal({ kind: "batch", itemKey: item.key }) : updateItem(item.key, { batchId: e.target.value })}>
                              <option value="">{item.vendorId ? "Choose batch" : "Pick a vendor first"}</option>{batches.map(b => <option key={b.id} value={b.id}>{b.compound} · {b.batchNumber}</option>)}{item.vendorId && <option value="__new">+ Add a batch…</option>}
                            </Select>
                          </Field>
                          <Field label="Test"><Select value={item.testType} disabled={hasPayments} onChange={e => updateItem(item.key, { testType: e.target.value })}>{TEST_TYPES.map(t => <option key={t}>{t}</option>)}</Select></Field>
                          <Field label="Price $"><Input type="number" min={0} step="0.01" value={item.priceUsd} disabled={hasPayments} onChange={e => updateItem(item.key, { priceUsd: e.target.value })} placeholder="0.00" /></Field>
                          <Field label="Qty"><Input type="number" min={1} max={100} value={item.quantity} disabled={hasPayments} onChange={e => updateItem(item.key, { quantity: Number(e.target.value) || 1 })} /></Field>
                          <div className="flex items-end">{!hasPayments && items.length > 1 && <Button type="button" tone="ghost" size="sm" onClick={() => setItems(items.filter(i => i.key !== item.key))} aria-label="Remove"><Trash2 className="size-4" /></Button>}</div>
                        </div>
                        {item.lab || form.labName ? null : <p className="mt-2 text-xs text-dim">Lab override: {item.lab || "same as pool"}</p>}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}

          {step === "cost" && (
            <Card>
              <h2 className="mb-1 text-lg font-semibold">Split the cost</h2>
              <p className="mb-5 text-sm text-muted">Tests come to <b className="mono text-fg">{usd(breakdown.tests)}</b>. Add what it costs to get the vials to the lab, then choose how the total is shared.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Shipping to the lab $"><Input type="number" min={0} step="0.01" value={form.shippingUsd} onChange={e => setForm({ ...form, shippingUsd: e.target.value })} /></Field>
                <Field label="Organiser tip $" hint="Optional, for your time. Shown transparently to members."><Input type="number" min={0} step="0.01" value={form.organiserTipUsd} onChange={e => setForm({ ...form, organiserTipUsd: e.target.value })} /></Field>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[{ v: "even", t: "Even split", d: "Target ÷ expected members. Simple and fair." }, { v: "fixed", t: "Fixed share", d: "Everyone pays the same set amount." }].map(o => (
                  <button key={o.v} type="button" onClick={() => setForm({ ...form, splitMode: o.v })} className={cn("rounded-xl border p-4 text-left transition", form.splitMode === o.v ? "border-brand bg-brand-soft/60" : "border-line hover:border-brand/40")}>
                    <span className="flex items-center justify-between"><span className="font-semibold">{o.t}</span>{form.splitMode === o.v && <Check className="size-4 text-brand" />}</span>
                    <span className="mt-1 block text-sm text-muted">{o.d}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {form.splitMode === "even"
                  ? <Field label="Expected members" hint="Each share stays fixed once people start paying."><Input type="number" min={1} max={10000} value={form.minMembers} onChange={e => setForm({ ...form, minMembers: Number(e.target.value) || 1 })} /></Field>
                  : <Field label="Share per member $"><Input type="number" min={1} step="0.01" value={form.fixedShareUsd} onChange={e => setForm({ ...form, fixedShareUsd: e.target.value })} /></Field>}
                <Field label="Maximum members" hint="Leave empty for no limit."><Input type="number" min={1} value={form.maxMembers} onChange={e => setForm({ ...form, maxMembers: e.target.value })} /></Field>
                <Field label="Deadline to join" hint="Optional."><Input type="datetime-local" value={form.deadlineAt} onChange={e => setForm({ ...form, deadlineAt: e.target.value })} /></Field>
              </div>
            </Card>
          )}

          {step === "share" && (
            <>
              <Card>
                <h2 className="mb-4 text-lg font-semibold">Who can see what</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pool visibility">
                    <Select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}><option value="public">Public: listed on Explore and the vendor page</option><option value="unlisted">Unlisted: anyone with the link</option><option value="invite">Invite-only: link + access code</option></Select>
                  </Field>
                  {form.visibility === "invite" && <Field label="Access code" hint={id ? "Leave empty to keep the current code." : "Share it alongside the link."}><Input value={form.accessCode} onChange={e => setForm({ ...form, accessCode: e.target.value })} /></Field>}
                  <Field label="Results visibility">
                    <Select value={form.resultsVisibility} onChange={e => setForm({ ...form, resultsVisibility: e.target.value })}><option value="public">Public: everyone, including the vendor page</option><option value="members">Verified members only</option><option value="password">Password protected</option></Select>
                  </Field>
                  {form.resultsVisibility === "password" && <Field label="Results password" hint={id ? "Leave empty to keep the current password." : "Members and anyone you give it to can unlock the results."}><Input value={form.resultsPassword} onChange={e => setForm({ ...form, resultsPassword: e.target.value })} /></Field>}
                </div>
              </Card>
              <Card>
                <h2 className="mb-1 text-lg font-semibold">How members pay you</h2>
                <p className="mb-4 text-sm text-muted">Pre-filled from your settings. Money goes straight to these; crypto and AnonPay are confirmed automatically.</p>
                <PaymentMethodsEditor value={methods} onChange={setMethods} />
              </Card>
            </>
          )}

          {step === "review" && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Review</h2>
              <dl className="divide-y divide-line text-sm">
                <Row k="Title" v={form.title || "—"} onEdit={() => goTo("tests")} />
                <Row k="Tests" v={items.filter(i => i.testType).map(i => { const b = (batchesByVendor[i.vendorId] ?? []).find(x => x.id === i.batchId); return `${i.testType}${b ? ` · ${b.compound} ${b.batchNumber}` : ""} · ${usd(Number(i.priceUsd) || 0)}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`; }).join("\n") || "—"} onEdit={() => goTo("tests")} />
                <Row k="Lab" v={form.labName || "—"} onEdit={() => goTo("tests")} />
                <Row k="Split" v={form.splitMode === "even" ? `Even across ${form.minMembers} members · ${usd(breakdown.share)} each` : `Fixed ${usd(breakdown.share)} per member`} onEdit={() => goTo("cost")} />
                <Row k="Visibility" v={`${form.visibility === "public" ? "Public" : form.visibility === "unlisted" ? "Unlisted" : "Invite-only"} · results ${form.resultsVisibility}`} onEdit={() => goTo("share")} />
                <Row k="Payment" v={[methods.crypto?.length ? `${methods.crypto.length} crypto wallet${methods.crypto.length > 1 ? "s" : ""}` : "", methods.anonpay ? "AnonPay" : "", methods.revolut ? "Revolut" : "", methods.paypal ? "PayPal" : ""].filter(Boolean).join(", ") || "None yet"} onEdit={() => goTo("share")} />
              </dl>
              {warnings.length > 0 && <div className="mt-4 space-y-2">{warnings.map(w => <Alert key={w} tone="warn">{w}</Alert>)}</div>}
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>{stepIndex > 0 && <Button type="button" tone="ghost" onClick={() => goTo(STEPS[stepIndex - 1].key)}><ChevronLeft className="size-4" /> Back</Button>}</div>
            <div className="flex flex-wrap gap-2">
              {step !== "review" ? (
                <>
                  <Button type="button" tone="subtle" loading={busy === "draft"} onClick={() => submit("draft")}><Save className="size-4" /> {id ? "Save" : "Save draft"}</Button>
                  <Button type="button" onClick={next}>Continue <ChevronRight className="size-4" /></Button>
                </>
              ) : (
                <>
                  <Button type="button" tone="subtle" loading={busy === "draft"} onClick={() => submit("draft")}><Save className="size-4" /> {id && !isDraft ? "Save changes" : "Save as draft"}</Button>
                  {isDraft && <Button type="button" loading={busy === "open"} onClick={() => submit("open")}><Rocket className="size-4" /> Open the pool</Button>}
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Your pool at a glance</p><Badge tone="muted">Live</Badge></div>
            <FundingDonut verified={0} submitted={0} target={breakdown.target} size={120} showLegend={false} label="to raise" />
            <dl className="mono mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Tests</dt><dd>{usd(breakdown.tests)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{usd(breakdown.shipping)}</dd></div>
              {breakdown.tip > 0 && <div className="flex justify-between"><dt className="text-muted">Tip</dt><dd>{usd(breakdown.tip)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Target</dt><dd>{usd(breakdown.target)}</dd></div>
              <div className="flex justify-between text-brand"><dt>Each member pays</dt><dd className="font-semibold">{usd(breakdown.share)}</dd></div>
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted">Platform fee: <span className="font-medium text-fg">0%</span>. Free while we are getting started.</p>
          </Card>
          <p className="text-xs text-dim">Need a hand? <Link href="/how-it-works" className="text-brand hover:underline">How pools work</Link>.</p>
        </aside>
      </div>

      <Modal open={modal?.kind === "vendor"} onClose={() => setModal(null)} title="Add a vendor">
        {modal && <VendorForm onClose={() => setModal(null)} onCreated={v => { vendors.refetch(); updateItem(modal.itemKey, { vendorId: v.id, batchId: "" }); }} />}
      </Modal>
      <Modal open={modal?.kind === "batch"} onClose={() => setModal(null)} title="Add a batch">
        {modal && <BatchForm vendorId={items.find(i => i.key === modal.itemKey)?.vendorId ?? ""} onClose={() => setModal(null)} onCreated={b => { setBatchesByVendor(m => ({ ...m, [b.vendorId]: [b, ...(m[b.vendorId] ?? []).filter(x => x.id !== b.id)] })); updateItem(modal.itemKey, { batchId: b.id }); }} />}
      </Modal>
    </Page>
  );
}

function Row({ k, v, onEdit }: { k: string; v: string; onEdit: () => void }) {
  return (
    <div className="grid grid-cols-[110px_1fr_auto] items-start gap-3 py-2.5">
      <dt className="text-muted">{k}</dt>
      <dd className="whitespace-pre-line font-medium">{v}</dd>
      <button type="button" onClick={onEdit} className="text-xs text-brand hover:underline">Edit</button>
    </div>
  );
}
