import { useState } from "react";
import { Wallet, DollarSign, CreditCard, Shield } from "lucide-react";
import { V2_CARD_BORDER } from "../theme";
import { useRegisterSetupSection } from "../setup-draft-context";

// ─── Setup: Accepting Payments Step ──────────────────────────────────────────
// Configure how the organiser gets paid. Shows toggles for each payment method
// (crypto, Revolut, PayPal, AnonPay) with relevant fields like wallet addresses.

interface CryptoWallet {
  id: string;
  currency: string;
  network: string;
  address: string;
}

export default function PaymentsStep() {
  const [cryptoEnabled, setCryptoEnabled] = useState(false);
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([
    { id: "1", currency: "USDT", network: "ERC20", address: "" },
  ]);

  const [anonpayEnabled, setAnonpayEnabled] = useState(false);
  const [anonpayWallet, setAnonpayWallet] = useState("");
  const [anonpayCurrency, setAnonpayCurrency] = useState("USDT");
  const [anonpayNetwork, setAnonpayNetwork] = useState("TRC20");

  const [revolutEnabled, setRevolutEnabled] = useState(false);
  const [revolutHandle, setRevolutHandle] = useState("");

  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalHandle, setPaypalHandle] = useState("");
  useRegisterSetupSection("payments", {
    cryptoEnabled, cryptoWallets, anonpayEnabled, anonpayWallet, anonpayCurrency, anonpayNetwork,
    revolutEnabled, revolutHandle, paypalEnabled, paypalHandle,
  });

  const addCryptoWallet = () => {
    setCryptoWallets(prev => [...prev, { id: String(Date.now()), currency: "USDT", network: "ERC20", address: "" }]);
  };

  const removeCryptoWallet = (id: string) => {
    setCryptoWallets(prev => prev.filter(w => w.id !== id));
  };

  const updateCryptoWallet = (id: string, field: keyof CryptoWallet, value: string) => {
    setCryptoWallets(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  return (
    <div className="space-y-4">
      {/* Crypto Payment */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
            <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Cryptocurrency (Direct)</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>
              {cryptoEnabled ? "Enabled" : "Disabled"}
            </span>
            <input
              type="checkbox"
              checked={cryptoEnabled}
              onChange={(e) => setCryptoEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--t-blue)" }}
            />
          </label>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
            Members send directly to your wallet addresses
          </div>

        {cryptoEnabled && (
          <div className="pt-2 space-y-3 border-t" style={{ borderColor: V2_CARD_BORDER }}>
            {cryptoWallets.map((wallet) => (
              <div key={wallet.id} className="rounded-md p-3 space-y-3" style={{ background: "var(--t-surface2)" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                      Currency
                    </label>
                    <select
                      value={wallet.currency}
                      onChange={(e) => updateCryptoWallet(wallet.id, "currency", e.target.value)}
                      className="w-full h-9 px-3 rounded-md text-[14px]"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                    >
                      <option value="USDT">USDT</option>
                      <option value="USDC">USDC</option>
                      <option value="DAI">DAI</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                      Network
                    </label>
                    <select
                      value={wallet.network}
                      onChange={(e) => updateCryptoWallet(wallet.id, "network", e.target.value)}
                      className="w-full h-9 px-3 rounded-md text-[14px]"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                    >
                      <option value="ERC20">ERC20 (Ethereum)</option>
                      <option value="TRC20">TRC20 (Tron)</option>
                      <option value="BEP20">BEP20 (BSC)</option>
                      <option value="Polygon">Polygon</option>
                      <option value="Arbitrum">Arbitrum</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                    Wallet Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0x... or T..."
                      value={wallet.address}
                      onChange={(e) => updateCryptoWallet(wallet.id, "address", e.target.value)}
                      className="flex-1 h-9 px-3 rounded-md text-[14px] font-mono"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                    />
                    {cryptoWallets.length > 1 && (
                      <button
                        onClick={() => removeCryptoWallet(wallet.id)}
                        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors hover:bg-red-50"
                        style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "#fff", color: "#EF4444" }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addCryptoWallet}
              className="w-full h-9 rounded-md text-[13px] font-semibold transition-colors"
              style={{ border: `1px dashed ${V2_CARD_BORDER}`, color: "var(--t-blue)" }}
            >
              + Add Another Currency
            </button>
          </div>
        )}
        </div>
      </div>

      {/* AnonPay */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
            <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>AnonPay</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>
              {anonpayEnabled ? "Enabled" : "Disabled"}
            </span>
            <input
              type="checkbox"
              checked={anonpayEnabled}
              onChange={(e) => setAnonpayEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--t-blue)" }}
            />
          </label>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
            No-KYC crypto exchange — members pay with any coin
          </div>

        {anonpayEnabled && (
          <div className="pt-2 space-y-3 border-t" style={{ borderColor: V2_CARD_BORDER }}>
            <div className="rounded-md p-3 text-[12.5px] leading-relaxed" style={{ background: "var(--t-blue-05)", color: "var(--t-blue)" }}>
              <strong>How AnonPay works:</strong> Members can pay with any cryptocurrency (BTC, ETH, LTC, etc.). AnonPay instantly converts it to your chosen currency and sends it to your wallet. No KYC required for either party.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                  You Receive (currency AnonPay converts to)
                </label>
                <select
                  value={anonpayCurrency}
                  onChange={(e) => setAnonpayCurrency(e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-[14px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                  Network
                </label>
                <select
                  value={anonpayNetwork}
                  onChange={(e) => setAnonpayNetwork(e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-[14px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                >
                  <option value="TRC20">TRC20 (Tron)</option>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="BEP20">BEP20 (BSC)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                Your Wallet Address (where AnonPay sends funds)
              </label>
              <input
                type="text"
                placeholder="0x... or T..."
                value={anonpayWallet}
                onChange={(e) => setAnonpayWallet(e.target.value)}
                className="w-full h-9 px-3 rounded-md text-[14px] font-mono"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              />
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Revolut */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
            <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Revolut</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>
              {revolutEnabled ? "Enabled" : "Disabled"}
            </span>
            <input
              type="checkbox"
              checked={revolutEnabled}
              onChange={(e) => setRevolutEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--t-blue)" }}
            />
          </label>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
            Bank transfer via Revolut handle
          </div>

        {revolutEnabled && (
          <div className="pt-2 border-t" style={{ borderColor: V2_CARD_BORDER }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
              Revolut Handle
            </label>
            <input
              type="text"
              placeholder="@username"
              value={revolutHandle}
              onChange={(e) => setRevolutHandle(e.target.value)}
              className="w-full h-9 px-3 rounded-md text-[14px]"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
          </div>
        )}
        </div>
      </div>

      {/* PayPal */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
            <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>PayPal</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>
              {paypalEnabled ? "Enabled" : "Disabled"}
            </span>
            <input
              type="checkbox"
              checked={paypalEnabled}
              onChange={(e) => setPaypalEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--t-blue)" }}
            />
          </label>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
            PayPal.Me link or email
          </div>

        {paypalEnabled && (
          <div className="pt-2 border-t" style={{ borderColor: V2_CARD_BORDER }}>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
              PayPal Handle or Email
            </label>
            <input
              type="text"
              placeholder="paypal.me/username or email@example.com"
              value={paypalHandle}
              onChange={(e) => setPaypalHandle(e.target.value)}
              className="w-full h-9 px-3 rounded-md text-[14px]"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
          </div>
        )}
        </div>
      </div>

      {/* Helper text */}
      <div className="rounded-lg p-3" style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-20)` }}>
        <p className="text-[13px]" style={{ color: "var(--t-blue)" }}>
          <strong>Tip:</strong> Enable at least one payment method so members can pay you. You can enable multiple methods and let members choose.
        </p>
      </div>
    </div>
  );
}
