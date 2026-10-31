import { useVendorLanguage, type VendorLanguage } from "@/lib/vendor-language";

export default function VendorLanguageSelect({ dark = false }: { dark?: boolean }) {
  const [language, setLanguage] = useVendorLanguage();
  return <label className="inline-flex items-center gap-1 text-xs">
    <span className="sr-only">Language / 语言</span>
    <select aria-label="Language / 语言" value={language} onChange={event => setLanguage(event.target.value as VendorLanguage)}
      className="h-8 rounded-lg px-2" style={dark ? { color: "#fff", background: "#303030", border: "1px solid #4A4A4A" } : { color: "var(--t-text, #202223)", background: "var(--t-surface, #fff)", border: "1px solid var(--t-border, #ddd)" }}
      data-testid="select-vendor-language">
      <option value="en">English</option><option value="zh">中文</option>
    </select>
  </label>;
}
