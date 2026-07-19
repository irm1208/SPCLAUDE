import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, Globe, Lock, Rocket, Save, X } from "lucide-react";
import { WIZARD_STEPS } from "./nav";
import BasicsStep from "./steps/BasicsStep";
import ProductsStep from "./steps/ProductsStep";
import ShippingStep from "./steps/ShippingStep";
import PaymentsStep from "./steps/PaymentsStep";
import AccessStep from "./steps/AccessStep";
import RulesStep from "./steps/RulesStep";
import ReviewStep from "./steps/ReviewStep";
import OrganiserShell from "./OrganiserShell";
import OrganiserTopbar from "./OrganiserTopbar";
import DashboardSidebar from "./DashboardSidebar";
import { PageHeader, SetupProgressCard } from "./OrganiserUi";
import { organiserApi, type ApiGroupBuy, type ApiProduct } from "./api/organiser-api";
import { buildSetupPayload, buildSetupProducts, buildSetupRules, type SetupDraftSnapshot } from "./setup-draft";
import { SetupDraftProvider } from "./setup-draft-context";

export default function SetupWizard({
  onModeChange,
  onCompleted,
}: {
  onModeChange?: () => void;
  onCompleted?: (groupBuy: ApiGroupBuy) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [banner, setBanner] = useState<string | null>(null);
  const [createdGroupBuy, setCreatedGroupBuy] = useState<ApiGroupBuy | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const snapshotRef = useRef<SetupDraftSnapshot>({});
  const step = WIZARD_STEPS[current];
  const isLast = current === WIZARD_STEPS.length - 1;

  useEffect(() => {
    if (!showLaunchModal) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowLaunchModal(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showLaunchModal]);

  const handleContinue = () => {
    if (isLast) setShowLaunchModal(true);
    else setCurrent(value => Math.min(WIZARD_STEPS.length - 1, value + 1));
  };

  const syncProducts = async (groupBuyId: string) => {
    const products = buildSetupProducts(snapshotRef.current);
    if (products.length === 0) return;
    const existing = await organiserApi.products(groupBuyId);
    const byName = new Map(existing.map(product => [product.name.trim().toLowerCase(), product]));
    await Promise.all(products.map(async product => {
      const currentProduct = byName.get(String(product.name).trim().toLowerCase()) as ApiProduct | undefined;
      if (currentProduct) await organiserApi.updateProduct(groupBuyId, currentProduct.id, product);
      else await organiserApi.createProduct(groupBuyId, product);
    }));
  };

  const persistDraft = async () => {
    const payload = buildSetupPayload(snapshotRef.current);
    if (!String(payload.name ?? "").trim()) throw new Error("Enter a group buy name before saving.");
    const groupBuy = createdGroupBuy
      ? await organiserApi.updateGroupBuy(createdGroupBuy.id, payload)
      : await organiserApi.createGroupBuy(payload);
    setCreatedGroupBuy(groupBuy);
    await Promise.all([
      syncProducts(groupBuy.id),
      organiserApi.updateRules(groupBuy.id, buildSetupRules(snapshotRef.current)),
    ]);
    return groupBuy;
  };

  const saveDraft = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await persistDraft();
      setBanner("Draft saved to your organiser workspace.");
      window.setTimeout(() => setBanner(null), 2600);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The draft could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmLaunch = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await persistDraft();
      const completed = visibility === "public" ? await organiserApi.requestPublic(saved.id) : saved;
      setShowLaunchModal(false);
      onCompleted?.(completed);
      onModeChange?.();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The group buy could not be submitted.");
      setShowLaunchModal(false);
    } finally {
      setSaving(false);
    }
  };

  const stepContent = step.id === "basics" ? (
    <BasicsStep />
  ) : step.id === "products" ? (
    <ProductsStep />
  ) : step.id === "shipping" ? (
    <ShippingStep />
  ) : step.id === "payments" ? (
    <PaymentsStep />
  ) : step.id === "access" ? (
    <AccessStep />
  ) : step.id === "rules" ? (
    <RulesStep />
  ) : (
    <ReviewStep onEdit={setCurrent} />
  );

  return (
    <SetupDraftProvider snapshotRef={snapshotRef}>
    <OrganiserShell
      sidebar={(onNavigate, onCollapse, collapsed) => (
        <DashboardSidebar
          mode="setup"
          currentStep={current}
          onStepChange={setCurrent}
          gbName="New group buy"
          userName="Organiser"
          onNavigate={onNavigate}
          onSwitchMode={onModeChange}
          onExitDashboard={() => window.location.assign("/account")}
          onCollapse={onCollapse}
          collapsed={collapsed}
        />
      )}
      topbar={({ onOpenDrawer, onToggleSidebar, sidebarCollapsed }) => (
        <OrganiserTopbar
          groupName="New group buy"
          groupStatus="draft"
          memberCount={0}
          orderCount={0}
          pageLabel={step.label}
          onOpenMenu={onOpenDrawer}
          onToggleSidebar={onToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          onSearch={() => setBanner("Setup search becomes available after the group buy is launched.")}
          onBack={current > 0 ? () => setCurrent(value => value - 1) : undefined}
          secondaryActions={(
            <>
              <button type="button" className="ov2-secondary-button" onClick={saveDraft} disabled={saving}><Save aria-hidden="true" /> <span className="ov2-action-label">Save draft</span></button>
              <button type="button" className="ov2-topbar-link" onClick={() => setBanner("Preview uses the current draft values.")}><Eye aria-hidden="true" /> <span className="ov2-action-label">Preview</span></button>
            </>
          )}
          primaryAction={{ label: isLast ? "Launch group buy" : "Continue", onClick: handleContinue }}
        />
      )}
    >
      <div className="ov2-page ov2-setup-page" data-atlas-setup="true">
        {banner ? <div className="ov2-copy-toast" role="status">{banner}</div> : null}
        {saveError ? <div className="ov2-data-notice" data-tone="error" role="alert">{saveError}</div> : null}
        <PageHeader
          title={step.label}
          description={step.blurb}
          status="Draft"
        />

        <div className="ov2-setup-stats">
          <SetupProgressCard label="Current step" value={`${current + 1} / ${WIZARD_STEPS.length}`} detail={step.label} />
          <SetupProgressCard label="Completed" value={String(current)} detail={`${WIZARD_STEPS.length - current} sections remaining`} complete={current > 0} />
          <SetupProgressCard label="Visibility" value={visibility === "public" ? "Public" : "Private"} detail="Can be changed before launch" />
        </div>

        <section className="ov2-card ov2-form-panel" aria-labelledby="ov2-step-title">
          <div className="ov2-form-panel-heading">
            <div>
              <span>Step {current + 1} of {WIZARD_STEPS.length}</span>
              <h2 id="ov2-step-title">{step.label}</h2>
              <p>{step.blurb}</p>
            </div>
            <div className="ov2-step-progress" aria-label={`${Math.round(((current + 1) / WIZARD_STEPS.length) * 100)} percent complete`}>
              <span style={{ width: `${((current + 1) / WIZARD_STEPS.length) * 100}%` }} />
            </div>
          </div>

          <div className="ov2-form-content">{stepContent}</div>

          <footer className="ov2-form-footer">
            <button
              type="button"
              className="ov2-secondary-button"
              disabled={current === 0}
              onClick={() => setCurrent(value => Math.max(0, value - 1))}
            >
              <ArrowLeft aria-hidden="true" /> Back
            </button>
            <button type="button" className="ov2-primary-button" onClick={handleContinue} disabled={saving}>
              {isLast ? <><Rocket aria-hidden="true" /> Launch group buy</> : <>Continue <ArrowRight aria-hidden="true" /></>}
            </button>
          </footer>
        </section>
      </div>

      {showLaunchModal ? (
        <div className="ov2-modal-layer" role="presentation">
          <div className="ov2-modal-scrim" onClick={() => setShowLaunchModal(false)} />
          <section className="ov2-card ov2-launch-dialog" role="dialog" aria-modal="true" aria-labelledby="ov2-launch-title">
            <header>
              <div><span>Ready to publish</span><h2 id="ov2-launch-title">Launch group buy</h2></div>
              <button ref={closeButtonRef} type="button" className="ov2-icon-button" onClick={() => setShowLaunchModal(false)} aria-label="Close launch dialog"><X aria-hidden="true" /></button>
            </header>
            <p>Choose how members will discover this group buy. You can change visibility later in GB Settings.</p>
            <fieldset className="ov2-visibility-options">
              <legend>Group buy visibility</legend>
              <label data-selected={visibility === "public" || undefined}>
                <input type="radio" name="visibility" checked={visibility === "public"} onChange={() => setVisibility("public")} />
                <Globe aria-hidden="true" />
                <span><strong>Public</strong><small>Listed publicly so members can find and join it.</small></span>
              </label>
              <label data-selected={visibility === "private" || undefined}>
                <input type="radio" name="visibility" checked={visibility === "private"} onChange={() => setVisibility("private")} />
                <Lock aria-hidden="true" />
                <span><strong>Private / hidden</strong><small>Only accessible to members with a direct link.</small></span>
              </label>
            </fieldset>
            <footer><button type="button" className="ov2-secondary-button" onClick={() => setShowLaunchModal(false)} disabled={saving}>Cancel</button><button type="button" className="ov2-primary-button" onClick={handleConfirmLaunch} disabled={saving}><Rocket aria-hidden="true" /> {saving ? "Submitting…" : "Confirm launch"}</button></footer>
          </section>
        </div>
      ) : null}
    </OrganiserShell>
    </SetupDraftProvider>
  );
}
