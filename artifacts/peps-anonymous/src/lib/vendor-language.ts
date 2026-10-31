import { useSyncExternalStore, type ReactNode } from "react";
import { vendorPortalTranslations } from "./vendor-portal-translations";
import { vendorComponentTranslations } from "./vendor-component-translations";

export type VendorLanguage = "en" | "zh";
const STORAGE_KEY = "peps-vendor-language";
let language: VendorLanguage = "en";
const listeners = new Set<() => void>();
let initialized = false;
export function getVendorLanguage(): VendorLanguage {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    try { language = window.localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "en"; } catch { /* Storage can be unavailable in private browsing. */ }
  }
  return language;
}
export function setVendorLanguage(value: VendorLanguage): void {
  initialized = true;
  language = value === "zh" ? "zh" : "en";
  try { window.localStorage.setItem(STORAGE_KEY, language); } catch { /* The selection still works in memory. */ }
  for (const listener of listeners) listener();
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useVendorLanguage(): [VendorLanguage, typeof setVendorLanguage] {
  return [useSyncExternalStore(subscribe, getVendorLanguage, () => "en"), setVendorLanguage];
}
export function vendorTranslate(text: string, locale = getVendorLanguage()): string {
  if (locale !== "zh") return text;
  const direct = vendorComponentTranslations[text] ?? vendorPortalTranslations[text];
  if (direct) return direct;
  const patterns: [RegExp, (...values: string[]) => string][] = [
    [/^(.+) \((\d{3})\)$/, (message, status) => `${vendorTranslate(message, locale)} (${status})`],
    [/^Row (\d+): (.+)$/, (row, message) => `第 ${row} 行：${vendorTranslate(message, locale)}`],
    [/^Missing CSV columns: (.+)\. Use the exported orders file\.$/, columns => `CSV 缺少列：${columns.split(", ").map(value => vendorTranslate(value, locale)).join("、")}。请使用导出的订单文件。`],
    [/^duplicate order reference (.+)\.$/, reference => `订单编号重复：${reference}。`],
    [/^order (.+) was not found in your vendor orders\.$/, reference => `您的供应商订单中未找到订单 ${reference}。`],
    [/^order (.+) is ambiguous\.$/, reference => `订单 ${reference} 对应多个记录，无法确定。`],
    [/^order (.+) is on hold or completed\. Ask Admin to review it\.$/, reference => `订单 ${reference} 已暂停或完成，请联系管理员审核。`],
    [/^enter a carrier for order (.+)\.$/, reference => `请填写订单 ${reference} 的承运商。`],
    [/^enter a valid tracking number for order (.+)\.$/, reference => `请填写订单 ${reference} 的有效运单号。`],
    [/^Export (\d+) selected$/, count => `导出已选的 ${count} 个订单`],
    [/^Showing (\d+) of (\d+) orders?$/, (shown, total) => `显示 ${shown} 个，共 ${total} 个订单`],
    [/^Showing the (\d+) oldest of (\d+) open orders$/, (shown, total) => `显示最早的 ${shown} 个，共 ${total} 个待完成订单`],
    [/^Updated (.+) · refreshes every 30s$/, time => `更新于 ${time} · 每 30 秒刷新`],
    [/^(\d+) the week before$/, count => `前一周 ${count} 个`],
    [/^(\d+) units to pack$/, count => `${count} 件产品待打包`],
    [/^overdue · waiting more than (\d+)h without tracking$/, hours => `已超时 · 超过 ${hours} 小时未填写物流信息`],
    [/^(\d+) orders? marked processing\.$/, count => `已将 ${count} 个订单标记为处理中。`],
    [/^(\d+) marked processing\. Could not update (.+)\.$/, (count, refs) => `已将 ${count} 个订单标记为处理中，无法更新：${refs}。`],
    [/^(\d+) lines? · (\d+) units$/, (lines, units) => `${lines} 行 · ${units} 件产品`],
    [/^View (.+)$/, name => `查看 ${name}`],
    [/^Today at (.+)$/, time => `今天 ${time}`], [/^Yesterday at (.+)$/, time => `昨天 ${time}`],
    [/^(\d+)h ago$/, count => `${count} 小时前`], [/^(\d+)d ago$/, count => `${count} 天前`],
    [/^Detected (.+)\. You can change this if needed\.$/, carrier => `已识别为 ${carrier}，您可以手动更改。`],
    [/^Uploading (\d+) of (\d+)…$/, (index, total) => `正在上传 ${index}/${total}…`],
    [/^(\d+) photos? uploaded\.$/, count => `已上传 ${count} 张照片。`],
    [/^Skipped \(over 5 MB\): (.+)\.$/, names => `已跳过超过 5 MB 的文件：${names}。`],
    [/^(\d+) orders? marked as processing\.$/, count => `已将 ${count} 个订单标记为处理中。`],
  ];
  for (const [pattern, format] of patterns) { const match = text.match(pattern); if (match) return format(...match.slice(1)); }
  return text;
}
export function useVendorTranslation() { const [locale] = useVendorLanguage(); return (text: string) => vendorTranslate(text, locale); }
/** Translate only presentation text. Callers exclude product/customer data. */
export function translateVendorNode(value: ReactNode): ReactNode {
  if (typeof value === "string") return vendorTranslate(value);
  if (Array.isArray(value)) return value.map(translateVendorNode);
  return value;
}
