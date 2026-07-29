import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Loader2,
  Package,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";
import { ClinicalPoolGauge } from "@/components/testing-pool/ClinicalPoolGauge";
import {
  ClinicalPanel,
  RoundMetricStrip,
  RoundStatusRail,
  ThresholdStepGrid,
  VoteLeaderboard,
  type RoundMetric,
} from "@/components/testing-pool/ClinicalTestingPoolUi";
import "@/components/testing-pool/clinical-testing-pool.css";
import { organiserApi } from "./api/organiser-api";

interface TestingGroupsTabProps {
  selectedGbId?: string;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Voting & funding open" },
  { value: "closed", label: "Funding closed" },
  { value: "sent_to_lab", label: "Sent to lab" },
  { value: "results_received", label: "Results received" },
];

function safeAmount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function safeCount(value: unknown): number {
  return Math.trunc(safeAmount(value));
}

function normalizedContributionAmount(value: string): string {
  const normalized = value.trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? normalized : "15";
}

function money(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function plural(value: number, singular: string): string {
  return `${value.toLocaleString("en-US")} ${singular}${value === 1 ? "" : "s"}`;
}

export default function TestingGroupsTab({ selectedGbId }: TestingGroupsTabProps = {}) {
  const query = useQuery({
    queryKey: ["organiser", "testing", selectedGbId],
    queryFn: () => organiserApi.testingPool(selectedGbId!),
    enabled: Boolean(selectedGbId),
    staleTime: 15_000,
  });
  const snapshotQuery = useQuery({
    queryKey: ["organiser", "testing-snapshot", selectedGbId],
    queryFn: () => organiserApi.testingPoolSnapshot(selectedGbId!),
    enabled: Boolean(selectedGbId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const [contributionAmount, setContributionAmount] = useState("15");
  const [anyContribution, setAnyContribution] = useState(false);
  const [status, setStatus] = useState("active");
  const [fundingNote, setFundingNote] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pool = query.data;
  const snapshot = snapshotQuery.isError ? undefined : snapshotQuery.data;
  const milestones = snapshot?.milestones ?? [];
  const goal = milestones.reduce(
    (highest, milestone) => Math.max(highest, safeAmount(milestone.amount)),
    0,
  );
  const poolTotal = safeAmount(snapshot?.poolTotal);
  const contributorCount = safeCount(snapshot?.contributorCount);
  const totalVotes = safeCount(snapshot?.totalVotes);
  const votes = snapshot?.votes ?? [];
  const roundStatus = snapshot?.round?.status ?? pool?.round?.status ?? "";
  const statusLabel = roundStatus
    ? STATUS_OPTIONS.find(option => option.value === roundStatus)?.label ?? roundStatus
    : "Not configured";
  const pendingContributions = safeCount(pool?.contributions.pending);
  const confirmedContributions = safeCount(pool?.contributions.confirmed);
  const rejectedContributions = safeCount(pool?.contributions.rejected);
  const totalContributions = safeCount(pool?.contributions.total);
  const liveMetricValue = (value: string): string => {
    if (snapshot) return value;
    if (snapshotQuery.isLoading) return "Syncing";
    return "Unavailable";
  };
  const metrics: RoundMetric[] = [
    {
      label: "Pool funding",
      value: liveMetricValue(goal > 0 ? `${money(poolTotal)} / ${money(goal)}` : money(poolTotal)),
      detail: snapshot
        ? goal > 0 ? `${money(goal)} target` : "Funding target not configured"
        : "Waiting for live funding data",
      tone: goal > 0 && poolTotal >= goal ? "success" : "info",
    },
    {
      label: "Contributors",
      value: liveMetricValue(contributorCount.toLocaleString("en-US")),
      detail: `${pendingContributions} pending / ${confirmedContributions} confirmed`,
      tone: pendingContributions > 0 ? "warning" : "default",
    },
    {
      label: "Votes cast",
      value: liveMetricValue(totalVotes.toLocaleString("en-US")),
      detail: snapshot ? plural(votes.length, "ballot option") : "Waiting for live ballot data",
      tone: totalVotes > 0 ? "info" : "default",
    },
    {
      label: "Round status",
      value: statusLabel,
      detail: pool?.round ? "Live testing workflow" : "Create the round to begin",
      tone: roundStatus === "results_received"
        ? "success"
        : roundStatus === "closed" || roundStatus === "sent_to_lab"
          ? "warning"
          : roundStatus === "active"
            ? "info"
            : "default",
    },
  ];

  useEffect(() => {
    if (!pool?.round) {
      setContributionAmount("15");
      setAnyContribution(false);
      setStatus("active");
      setFundingNote("");
      setSelectedProducts([]);
      return;
    }
    setContributionAmount(String(pool.round.contributionAmount));
    setAnyContribution(Boolean(pool.round.anyContribution));
    setStatus(pool.round.status);
    setFundingNote(pool.round.fundingNote ?? "");
    setSelectedProducts(pool.round.voteOptions ?? []);
  }, [selectedGbId, pool?.round]);

  const toggleProduct = (name: string) => {
    setSelectedProducts(current => current.includes(name)
      ? current.filter(value => value !== name)
      : [...current, name]);
  };

  const refresh = async () => {
    await Promise.all([query.refetch(), snapshotQuery.refetch()]);
  };

  const save = async () => {
    if (!selectedGbId) return;
    setSaving(true);
    setSaveError(null);
    const contributionPayload = anyContribution
      ? { anyContribution }
      : {
          contributionAmount: normalizedContributionAmount(contributionAmount),
          anyContribution,
        };
    try {
      if (pool?.round) {
        await organiserApi.updateTestingPool(selectedGbId, {
          ...contributionPayload,
          status,
          fundingNote,
          voteOptions: selectedProducts,
        });
      } else {
        await organiserApi.createTestingPool(selectedGbId, {
          ...contributionPayload,
          voteOptions: selectedProducts,
        });
      }
      await Promise.all([query.refetch(), snapshotQuery.refetch()]);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The testing pool could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedGbId) {
    return <div className="ov2-data-notice" role="status">Select a group buy to manage its testing pool.</div>;
  }

  if (query.isLoading) {
    return <div className="ov2-data-notice" role="status"><Loader2 className="animate-spin" aria-hidden="true" /> Syncing the live testing pool…</div>;
  }

  if (query.isError) {
    return (
      <div className="ov2-data-notice" data-tone="error" role="alert">
        <span>{query.error instanceof Error ? query.error.message : "The testing pool could not be loaded."}</span>
        <button type="button" onClick={() => query.refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="clinical-testing clinical-testing--organizer">
      <header className="clinical-testing__organizer-intro">
        <div className="clinical-testing__organizer-title">
          <span className="clinical-testing__organizer-mark" aria-hidden="true">
            <FlaskConical />
          </span>
          <div>
            <h2>Lab testing pool</h2>
            <p>Configure member contributions, product voting, and the testing workflow from live group-buy data.</p>
          </div>
        </div>
        <button type="button" className="ov2-secondary-button" onClick={() => void refresh()}>
          <RefreshCw aria-hidden="true" />
          Refresh
        </button>
      </header>

      {saveError ? <div className="ov2-data-notice" data-tone="error" role="alert">{saveError}</div> : null}

      <RoundMetricStrip metrics={metrics} />

      {roundStatus ? <RoundStatusRail status={roundStatus} /> : null}

      <div className="clinical-testing__organizer-grid">
        <div className="clinical-testing__organizer-primary">
          <ClinicalPanel title="Round health" meta={goal > 0 ? `${money(goal)} target` : "Target pending"}>
            {snapshot ? (
              <div className="clinical-testing__health-stack">
                <ClinicalPoolGauge
                  raised={poolTotal}
                  milestones={milestones}
                  contributorCount={contributorCount}
                  statusLabel={statusLabel}
                  active={roundStatus === "active"}
                  compact
                />
                {milestones.length > 0 ? (
                  <ThresholdStepGrid milestones={milestones} raised={poolTotal} />
                ) : (
                  <p className="clinical-testing__empty-copy">Funding thresholds will appear once the testing pool is configured.</p>
                )}
              </div>
            ) : (
              <p className="clinical-testing__empty-copy" role={snapshotQuery.isError ? "alert" : "status"}>
                {snapshotQuery.isError
                  ? "Live round health could not be loaded. Refresh to try again."
                  : "Syncing live round health…"}
              </p>
            )}
          </ClinicalPanel>

          <ClinicalPanel title="Products in the ballot" meta={`${selectedProducts.length} selected`}>
            <div className="clinical-testing__product-grid">
              {(pool?.products ?? []).map(product => {
                const selected = selectedProducts.includes(product.name);

                return (
                  <label
                    key={product.id}
                    className="clinical-testing__product-option"
                    data-selected={selected || undefined}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProduct(product.name)}
                    />
                    <Package aria-hidden="true" />
                    <span>
                      <strong>{product.name}</strong>
                      <small>{product.vendor || product.category || "Group-buy product"}</small>
                    </span>
                  </label>
                );
              })}
              {pool?.products.length === 0 ? (
                <p className="clinical-testing__empty-copy">Add products in the Products tab before configuring a vote.</p>
              ) : null}
            </div>
          </ClinicalPanel>

          <ClinicalPanel title="Linked lab reports" meta={`${pool?.labTests.length ?? 0} reports`}>
            <div className="clinical-testing__evidence-list">
              {(pool?.labTests ?? []).map(test => (
                <article key={test.id}>
                  <span className="clinical-testing__evidence-mark" aria-hidden="true">
                    <CheckCircle2 />
                  </span>
                  <div>
                    <strong>{test.peptideName}</strong>
                    <small>
                      {[test.labName, test.batchCode, test.purityPct ? `${test.purityPct}%` : null]
                        .filter(Boolean)
                        .join(" · ") || "Lab report"}
                    </small>
                  </div>
                  {test.url ? (
                    <a
                      href={test.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ov2-icon-button"
                      aria-label={`Open ${test.peptideName} report`}
                    >
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ) : null}
                </article>
              ))}
              {pool?.labTests.length === 0 ? (
                <div className="clinical-testing__empty-copy">
                  <Users aria-hidden="true" />
                  <p>Approved or pending reports linked to this group buy will appear here.</p>
                </div>
              ) : null}
            </div>
          </ClinicalPanel>
        </div>

        <aside className="clinical-testing__organizer-aside">
          <form
            onSubmit={event => {
              event.preventDefault();
              void save();
            }}
          >
            <ClinicalPanel title="Round controls" meta={pool?.round ? "Configured" : "Setup required"}>
              <div className="clinical-testing__control-grid">
                <label className="clinical-testing__control-field">
                  <span>Contribution amount</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={contributionAmount}
                    onChange={event => setContributionAmount(event.target.value)}
                    disabled={anyContribution}
                  />
                </label>
                <label className="clinical-testing__control-field">
                  <span>Workflow status</span>
                  <select
                    value={status}
                    onChange={event => setStatus(event.target.value)}
                    disabled={!pool?.round}
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="clinical-testing__switch">
                  <input
                    type="checkbox"
                    checked={anyContribution}
                    onChange={event => setAnyContribution(event.target.checked)}
                  />
                  <span>Allow any contribution amount</span>
                </label>
                <label className="clinical-testing__control-field clinical-testing__control-field--wide">
                  <span>Funding note</span>
                  <textarea
                    value={fundingNote}
                    onChange={event => setFundingNote(event.target.value)}
                    rows={3}
                    placeholder="Explain what the pool is funding and any deadlines."
                  />
                </label>
              </div>
              <div className="clinical-testing__form-actions">
                <button type="submit" className="ov2-primary-button" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                  {saving ? "Saving…" : pool?.round ? "Save pool" : "Create pool"}
                </button>
              </div>
            </ClinicalPanel>
          </form>

          <ClinicalPanel title="Ballot standing" meta={plural(totalVotes, "vote")}>
            {votes.length > 0 ? (
              <VoteLeaderboard
                votes={votes}
                totalVotes={totalVotes}
                batches={snapshot?.peptideBatches}
              />
            ) : (
              <p className="clinical-testing__empty-copy">Vote totals will appear after members cast their ballots.</p>
            )}
          </ClinicalPanel>

          <ClinicalPanel title="Contribution status" meta={plural(totalContributions, "submission")}>
            <dl className="clinical-testing__contribution-counts">
              <div data-tone="warning">
                <dt>Pending contributions</dt>
                <dd>{pendingContributions.toLocaleString("en-US")}</dd>
              </div>
              <div data-tone="success">
                <dt>Confirmed</dt>
                <dd>{confirmedContributions.toLocaleString("en-US")}</dd>
              </div>
              <div data-tone="danger">
                <dt>Rejected</dt>
                <dd>{rejectedContributions.toLocaleString("en-US")}</dd>
              </div>
            </dl>
          </ClinicalPanel>
        </aside>
      </div>
    </div>
  );
}
