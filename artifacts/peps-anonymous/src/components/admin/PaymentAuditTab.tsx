import { useState, useEffect, useCallback, type FormEvent } from "react";
import { 
  Search, RefreshCw, History, Plus, Trash2, ShieldCheck, Filter, X
} from "lucide-react";
import { format } from "date-fns";

function apiUrl(path: string) { return `/api${path}`; }

export interface AuditItem {
  id: string; // Order ID
  code: string;
  username: string;
  scope: string; // group_buy, wholesale, shared_order
  paymentStatus: string;
  txHash: string;
  txKind: 'crypto'|'fiat'|'anonpay';
  reference: 'payment'|'test'|'balance';
  network: string | null;
  currency: string | null;
  expectedAmount: number | null;
  expectedWallet: string | null;
  createdAt: string;
  latestAudit?: {
    status: 'verified'|'underpaid'|'wrong_wallet'|'review'|'not_chain';
    recipientAddress: string | null;
    receivedAmount: number | null;
    confirmations: number | null;
    reason: string | null;
    checkedAt: string;
  } | null;
}

export interface WalletEntry {
  id: string;
  network: string;
  address: string;
  scope: 'all'|'group_buy'|'wholesale'|'shared_order';
  effectiveFrom: string;
  effectiveUntil?: string | null;
  note?: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  verified: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  underpaid: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  wrong_wallet: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  review: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  not_chain: "text-slate-400 bg-slate-500/10 border-slate-500/20"
};

const STATUS_LABELS: Record<string, string> = {
  verified: "Verified",
  underpaid: "Underpaid",
  wrong_wallet: "Wrong Wallet",
  review: "Manual Review",
  not_chain: "Not on Chain"
};

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase text-slate-400 bg-slate-500/10 border border-slate-500/20">Unchecked</span>;
  const cls = STATUS_COLORS[status] || "text-slate-400 bg-slate-500/10 border-slate-500/20";
  const label = STATUS_LABELS[status] || status;
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border ${cls}`}>{label}</span>;
}

export function PaymentAuditTab({ secret }: { secret: string }) {
  const [scope, setScope] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);

  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [batchChecking, setBatchChecking] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [showWalletForm, setShowWalletForm] = useState(false);
  const [newWallet, setNewWallet] = useState({
    network: "ERC-20",
    address: "",
    scope: "all",
    effectiveFrom: new Date().toISOString().slice(0, 16),
    effectiveUntil: "",
    note: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        scope,
        status,
        search: debouncedSearch,
        limit: "100"
      });
      const res = await fetch(apiUrl(`/admin/payment-audit?${q.toString()}`), { headers: { "x-admin-secret": secret } });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || []);
        setTotal(d.total || 0);
        setRequestError(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setRequestError(d.error || "Unable to load payment audit records.");
      }
    } catch (e) {
      console.error(e);
      setRequestError("Unable to load payment audit records. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [secret, scope, status, debouncedSearch]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const loadWallets = useCallback(async () => {
    setWalletsLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/payment-audit/wallet-history"), { headers: { "x-admin-secret": secret } });
      if (res.ok) {
        const d = await res.json();
        setWallets(d.entries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWalletsLoading(false);
    }
  }, [secret]);

  useEffect(() => { loadWallets(); }, [loadWallets]);

  const checkSingle = async (orderId: string, txHash: string, source: AuditItem["reference"]) => {
    const checkKey = `${orderId}:${txHash}:${source}`;
    setCheckingIds(prev => new Set(prev).add(checkKey));
    try {
      const res = await fetch(apiUrl("/admin/payment-audit/check"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ orderId, txHash, source })
      });
      if (res.ok) {
        const d = await res.json();
        setItems(prev => prev.map(item => item.id === orderId && item.txHash === txHash && item.reference === source ? d.item : item));
        setRequestError(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setRequestError(d.error || "Audit check failed. Please retry.");
      }
    } catch (e) {
      console.error(e);
      setRequestError("Audit check failed. Please retry.");
    } finally {
      setCheckingIds(prev => { const n = new Set(prev); n.delete(checkKey); return n; });
    }
  };

  const checkBatch = async () => {
    if (!confirm("Run batch audit on up to 25 items matching current filters?")) return;
    setBatchChecking(true);
    try {
      const res = await fetch(apiUrl("/admin/payment-audit/check-batch"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ scope, status, search: debouncedSearch, limit: 25 })
      });
      if (res.ok) {
        await loadItems();
        setRequestError(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setRequestError(d.error || "Batch audit failed. Please retry.");
      }
    } catch (e) {
      console.error(e);
      setRequestError("Batch audit failed. Please retry.");
    } finally {
      setBatchChecking(false);
    }
  };

  const addWallet = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl("/admin/payment-audit/wallet-history"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(newWallet)
      });
      if (res.ok) {
        setShowWalletForm(false);
        setNewWallet({
          network: "ERC-20",
          address: "",
          scope: "all",
          effectiveFrom: new Date().toISOString().slice(0, 16),
          effectiveUntil: "",
          note: "",
        });
        loadWallets();
        setRequestError(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setRequestError(d.error || "Could not save the wallet-history entry.");
      }
    } catch (e) {
      console.error(e);
      setRequestError("Could not save the wallet-history entry.");
    }
  };

  const deleteWallet = async (id: string) => {
    if (!confirm("Remove this wallet entry?")) return;
    try {
      const res = await fetch(apiUrl(`/admin/payment-audit/wallet-history/${id}`), {
        method: "DELETE",
        headers: { "x-admin-secret": secret }
      });
      if (res.ok) loadWallets();
      else setRequestError("Could not remove the wallet-history entry.");
    } catch (e) {
      console.error(e);
      setRequestError("Could not remove the wallet-history entry.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            Payment Audit
          </h2>
          <p className="text-sm text-slate-500 mt-1">Read-only operational reconciliation of crypto receipts against expected amounts and wallets.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Wallet History Ledger</h3>
          </div>
          <button 
            data-testid="button-add-wallet"
            onClick={() => setShowWalletForm(!showWalletForm)}
            className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded transition-colors font-medium"
          >
            {showWalletForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showWalletForm ? "Close" : "Add Entry"}
          </button>
        </div>
        
        {showWalletForm && (
          <form onSubmit={addWallet} className="p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            <div className="lg:col-span-1">
              <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Network</label>
              <input data-testid="input-wallet-network" required value={newWallet.network} onChange={e => setNewWallet({...newWallet, network: e.target.value})} className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="XMR" />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Address</label>
              <input data-testid="input-wallet-address" required value={newWallet.address} onChange={e => setNewWallet({...newWallet, address: e.target.value})} className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-xs text-slate-900 font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="4A..." />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Scope</label>
              <select data-testid="select-wallet-scope" value={newWallet.scope} onChange={e => setNewWallet({...newWallet, scope: e.target.value})} className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
                <option value="all">All</option>
                <option value="group_buy">Group Buy</option>
                <option value="wholesale">Wholesale</option>
                <option value="shared_order">Shared Order</option>
              </select>
            </div>
            <div className="lg:col-span-1">
              <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Effective From</label>
              <input data-testid="input-wallet-effective" required type="datetime-local" value={newWallet.effectiveFrom} onChange={e => setNewWallet({...newWallet, effectiveFrom: e.target.value})} className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Effective Until</label>
              <input data-testid="input-wallet-effective-until" type="datetime-local" value={newWallet.effectiveUntil} onChange={e => setNewWallet({...newWallet, effectiveUntil: e.target.value})} className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <button data-testid="button-save-wallet" type="submit" className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded transition-colors">
                Save
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-medium">Network / Address</th>
                <th className="px-4 py-2 font-medium">Scope</th>
                <th className="px-4 py-2 font-medium">Effective Period</th>
                <th className="px-4 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wallets.length === 0 && !walletsLoading && (
                <tr><td colSpan={4} className="px-4 py-4 text-center text-xs text-slate-500">No wallet history recorded.</td></tr>
              )}
              {wallets.map(w => (
                <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">{w.network}</span>
                      <span className="font-mono text-xs text-slate-700 truncate max-w-[200px] md:max-w-[300px]" title={w.address}>{w.address}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs text-slate-600 capitalize">{w.scope.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {format(new Date(w.effectiveFrom), "dd MMM yyyy, HH:mm")}
                    {w.effectiveUntil && <span> → {format(new Date(w.effectiveUntil), "dd MMM yyyy, HH:mm")}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button data-testid={`button-delete-wallet-${w.id}`} onClick={() => deleteWallet(w.id)} className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {requestError && (
          <div data-testid="status-payment-audit-error" className="mx-4 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {requestError}
          </div>
        )}
        
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                data-testid="input-audit-search"
                type="text" 
                placeholder="Search orders or tx..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 h-8 w-48 lg:w-64 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            
            <select data-testid="select-audit-scope" value={scope} onChange={e => setScope(e.target.value)} className="h-8 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
              <option value="all">All Scopes</option>
              <option value="group_buy">Group Buys</option>
              <option value="wholesale">Wholesale</option>
              <option value="shared_order">Shared Orders</option>
            </select>
            
            <select data-testid="select-audit-status" value={status} onChange={e => setStatus(e.target.value)} className="h-8 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="underpaid">Underpaid</option>
              <option value="wrong_wallet">Wrong Wallet</option>
              <option value="review">Manual Review</option>
              <option value="not_chain">Not on Chain</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              data-testid="button-audit-refresh"
              onClick={loadItems}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              data-testid="button-audit-batch"
              onClick={checkBatch}
              disabled={batchChecking}
              className="flex items-center gap-2 px-3 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {batchChecking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
              Batch Check 25
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Tx Details</th>
                <th className="px-4 py-3 font-medium text-right">Expected</th>
                <th className="px-4 py-3 font-medium text-right">Received</th>
                <th className="px-4 py-3 font-medium">Audit Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Search className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm font-medium">No payment records found.</p>
                      <p className="text-xs mt-1">Try adjusting your filters or search.</p>
                    </div>
                  </td>
                </tr>
              )}
              {items.map(item => {
                const isChecking = checkingIds.has(`${item.id}:${item.txHash}:${item.reference}`);
                const hasAudit = !!item.latestAudit;
                const ad = item.latestAudit;
                
                return (
                  <tr key={`${item.id}:${item.txHash}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-xs text-slate-900 font-semibold mb-0.5">{item.code}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{item.username}</div>
                      <div className="text-[9px] uppercase font-bold tracking-wider text-indigo-600 mt-1 inline-block bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{item.scope.replace('_', ' ')}</div>
                    </td>
                    <td className="px-4 py-3 align-top max-w-[200px]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">{item.network || item.txKind}</span>
                        {item.currency && <span className="text-xs font-bold text-slate-600">{item.currency}</span>}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 truncate bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100" title={item.txHash}>{item.txHash}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="text-xs font-bold text-slate-700">{item.expectedAmount ?? "—"}</div>
                      {item.expectedWallet && (
                        <div className="font-mono text-[9px] text-slate-400 mt-1 truncate max-w-[120px] ml-auto font-medium" title={item.expectedWallet}>
                          Exp: {item.expectedWallet.substring(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {ad ? (
                        <>
                          <div className={`text-xs font-bold ${ad.receivedAmount != null && item.expectedAmount != null && ad.receivedAmount >= item.expectedAmount ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {ad.receivedAmount ?? '—'}
                          </div>
                          {ad.recipientAddress && (
                            <div className={`font-mono text-[9px] mt-1 truncate max-w-[120px] ml-auto font-medium ${item.expectedWallet && ad.recipientAddress !== item.expectedWallet ? 'text-rose-600 font-bold bg-rose-50 px-1 rounded' : 'text-slate-500'}`} title={ad.recipientAddress}>
                              Rec: {ad.recipientAddress.substring(0, 8)}...
                            </div>
                          )}
                          {ad.confirmations !== null && (
                            <div className="text-[9px] font-medium text-slate-500 mt-0.5">{ad.confirmations} confs</div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="mb-1.5"><StatusBadge status={ad?.status} /></div>
                      {ad?.reason && (
                        <div className="text-[10px] font-medium text-slate-500 whitespace-normal line-clamp-2 leading-snug max-w-[200px]" title={ad.reason}>
                          {ad.reason}
                        </div>
                      )}
                      {ad?.checkedAt && (
                        <div className="text-[9px] font-medium text-slate-400 mt-1">
                          {format(new Date(ad.checkedAt), "MMM d, HH:mm")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        data-testid={`button-audit-check-${item.id}-${item.txHash}-${item.reference}`}
                        onClick={() => checkSingle(item.id, item.txHash, item.reference)}
                        disabled={isChecking || item.txKind !== 'crypto'}
                        className={`
                          inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-bold transition-all shadow-sm border
                          ${item.txKind !== 'crypto' ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed shadow-none' : 
                            isChecking ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                            'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'}
                        `}
                        title={item.txKind !== 'crypto' ? 'Not a crypto transaction' : 'Run on-chain audit'}
                      >
                        {isChecking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        {isChecking ? 'Checking' : 'Audit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500 font-medium">
          <div>Showing {items.length} of {total} records</div>
          {total > 100 && <div>Limiting to 100 results. Use search/filters.</div>}
        </div>
        
      </div>
      
    </div>
  );
}
