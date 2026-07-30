import { useState } from "react";
import { Lock, DollarSign, Users, Globe } from "lucide-react";
import { V2_CARD_BORDER } from "../theme";
import { useRegisterSetupSection } from "../setup-draft-context";

// ─── Setup: Access Step ──────────────────────────────────────────────────────
// Control who can join the group buy: PIN protection, entry fee, blocked accounts,
// and allowed/excluded countries.

export default function AccessStep() {
  const [entryFeeEnabled, setEntryFeeEnabled] = useState(false);
  const [entryFeeAmount, setEntryFeeAmount] = useState("");
  const [entryFeeLabel, setEntryFeeLabel] = useState("Entry Fee");

  const [countryMode, setCountryMode] = useState<"all" | "allow" | "block">("all");
  const [countries, setCountries] = useState<string[]>([]);
  const [countryInput, setCountryInput] = useState("");

  const [blockedAccounts, setBlockedAccounts] = useState<string[]>([]);
  const [blockInput, setBlockInput] = useState("");

  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState("");
  useRegisterSetupSection("access", {
    entryFeeEnabled, entryFeeAmount, entryFeeLabel, countryMode, countries, blockedAccounts, pinEnabled, pin,
  });

  const addBlockedAccount = () => {
    if (blockInput.trim()) {
      setBlockedAccounts(prev => [...prev, blockInput.trim()]);
      setBlockInput("");
    }
  };

  const removeBlockedAccount = (username: string) => {
    setBlockedAccounts(prev => prev.filter(u => u !== username));
  };

  const addCountry = () => {
    if (countryInput.trim()) {
      setCountries(prev => [...prev, countryInput.trim()]);
      setCountryInput("");
    }
  };

  const removeCountry = (country: string) => {
    setCountries(prev => prev.filter(c => c !== country));
  };

  return (
    <div className="space-y-4">
      {/* Entry Fee */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }} data-tour="access-entry-fee">
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
            <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Paid GB Entry Fee</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>
              {entryFeeEnabled ? "Enabled" : "Disabled"}
            </span>
            <input
              type="checkbox"
              checked={entryFeeEnabled}
              onChange={(e) => setEntryFeeEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--t-blue)" }}
            />
          </label>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
            Charge a one-time fee for people to join the group buy
          </div>

        {entryFeeEnabled && (
          <div className="pt-2 space-y-3 border-t" style={{ borderColor: V2_CARD_BORDER }}>
            <div className="rounded-md p-3 text-[12.5px] leading-relaxed" style={{ background: "var(--t-blue-05)", color: "var(--t-blue)" }}>
              <strong>How it works:</strong> Members pay this fee (via crypto) when they join. Use it to cover testing costs, deposits, or to filter serious buyers only.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                  Fee Amount (in GB currency)
                </label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={entryFeeAmount}
                  onChange={(e) => setEntryFeeAmount(e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-[14px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                  Label (optional)
                </label>
                <input
                  type="text"
                  placeholder="Entry Fee"
                  value={entryFeeLabel}
                  onChange={(e) => setEntryFeeLabel(e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-[14px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Country Restrictions */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }} data-tour="access-countries">
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <Globe className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
          <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Country Restrictions</span>
        </div>
        <div className="p-4 space-y-3">
        <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
          Control which countries can join. Useful for limiting shipping regions or complying with local regulations.
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              checked={countryMode === "all"}
              onChange={() => setCountryMode("all")}
              className="w-4 h-4"
              style={{ accentColor: "var(--t-blue)" }}
            />
            <span className="text-[14px]" style={{ color: "var(--t-text)" }}>Allow all countries</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              checked={countryMode === "allow"}
              onChange={() => setCountryMode("allow")}
              className="w-4 h-4"
              style={{ accentColor: "var(--t-blue)" }}
            />
            <span className="text-[14px]" style={{ color: "var(--t-text)" }}>Only allow specific countries</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              checked={countryMode === "block"}
              onChange={() => setCountryMode("block")}
              className="w-4 h-4"
              style={{ accentColor: "var(--t-blue)" }}
            />
            <span className="text-[14px]" style={{ color: "var(--t-text)" }}>Block specific countries</span>
          </label>
        </div>

        {countryMode !== "all" && (
          <div className="pt-2 space-y-2 border-t" style={{ borderColor: V2_CARD_BORDER }}>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Country name or code (e.g. UK, France)"
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCountry()}
                className="flex-1 h-9 px-3 rounded-md text-[14px]"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              />
              <button
                onClick={addCountry}
                className="h-9 px-4 rounded-md text-[14px] font-semibold text-white"
                style={{ background: "var(--t-blue)" }}
              >
                Add
              </button>
            </div>
            {countries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {countries.map((country) => (
                  <span
                    key={country}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium"
                    style={{ background: "var(--t-surface2)", color: "var(--t-text)" }}
                  >
                    {country}
                    <button
                      onClick={() => removeCountry(country)}
                      className="hover:opacity-70"
                      style={{ color: "var(--t-subtle)" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Blocked Accounts */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }} data-tour="access-blocked">
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <Users className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
          <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Blocked Accounts</span>
        </div>
        <div className="p-4 space-y-3">
        <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
          Block specific Telegram usernames from joining or placing orders. Use this to prevent problem users or scammers from accessing your group buy.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Telegram username"
            value={blockInput}
            onChange={(e) => setBlockInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addBlockedAccount()}
            className="flex-1 h-9 px-3 rounded-md text-[14px]"
            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
          />
          <button
            onClick={addBlockedAccount}
            className="h-9 px-4 rounded-md text-[14px] font-semibold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            Add
          </button>
        </div>
        {blockedAccounts.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {blockedAccounts.map((username) => (
              <span
                key={username}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium"
                style={{ background: "var(--t-surface2)", color: "var(--t-text)" }}
              >
                @{username}
                <button
                  onClick={() => removeBlockedAccount(username)}
                  className="hover:opacity-70"
                  style={{ color: "var(--t-subtle)" }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Invite PIN */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }} data-tour="access-pin">
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
            <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Invite PIN (Password)</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>
              {pinEnabled ? "Enabled" : "Disabled"}
            </span>
            <input
              type="checkbox"
              checked={pinEnabled}
              onChange={(e) => setPinEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--t-blue)" }}
            />
          </label>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
            Require a password to join this group buy
          </div>

        {pinEnabled && (
          <div className="pt-2 space-y-3 border-t" style={{ borderColor: V2_CARD_BORDER }}>
            <div className="rounded-md p-3 text-[12.5px] leading-relaxed" style={{ background: "var(--t-blue-05)", color: "var(--t-blue)" }}>
              <strong>How it works:</strong> Members will need to enter this 4-digit password to access and join your group buy. Share it privately with trusted members only.
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                4-Digit Password
              </label>
              <input
                type="text"
                placeholder="e.g. 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                className="w-full sm:w-32 h-9 px-3 rounded-md text-[14px] text-center font-mono tracking-wider"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              />
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Helper text */}
      <div className="rounded-lg p-3" style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-20)` }}>
        <p className="text-[13px]" style={{ color: "var(--t-blue)" }}>
          <strong>Tip:</strong> These settings help you control who can access your group buy. Most organisers use the Invite PIN for private group buys and country restrictions to match their shipping options.
        </p>
      </div>
    </div>
  );
}
