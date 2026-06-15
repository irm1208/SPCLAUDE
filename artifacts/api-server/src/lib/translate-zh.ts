/**
 * Translate common Chinese tracking event descriptions from 17track into English.
 * Called server-side when parsing raw API responses before storing in cachedEvents.
 */

const ZH_PHRASES: [RegExp, string][] = [
  // ── Info received ──────────────────────────────────────────────────────────
  [/快件信息已.?收到|信息已.?收到|电子信息已.?收到|货物.*信息已.?收到|货物电子信息已经收到/, "Shipment info received"],
  [/快件揽收信息已录入|物流信息已录入/, "Shipment info received"],

  // ── Collection ────────────────────────────────────────────────────────────
  [/已揽收|揽收成功|快件揽收|已揽件|揽件成功/, "Parcel collected"],
  [/揽收失败|揽件失败/, "Collection failed"],

  // ── Dispatch / handover ───────────────────────────────────────────────────
  [/已发出|发出|交寄/, "Dispatched"],
  [/已交航空公司|交航空|航空运输中/, "Handed to airline"],
  [/已装机|装机完成/, "Loaded onto aircraft"],

  // ── Transit ───────────────────────────────────────────────────────────────
  [/运输中|在途中|运输途中|快件在途/, "In transit"],
  [/转运中|中转中|快件中转/, "In transit (transfer)"],
  [/到达中转中心|到达转运中心|到达分拣中心|到达集散中心/, "Arrived at sorting hub"],
  [/离开中转中心|离开转运中心|离开分拣中心|离开集散中心/, "Left sorting hub"],

  // ── Airport / flight ──────────────────────────────────────────────────────
  [/离港|起飞/, "Departed"],
  [/到港|落地/, "Arrived at airport"],

  // ── Delivery facility ─────────────────────────────────────────────────────
  [/到达派件网点|到达配送中心|到达配送站|到达营业点|到达末端网点/, "Arrived at delivery facility"],
  [/正在派送中|派送中|派件中|正在配送|包裹正在派送|快件正在派送/, "Out for delivery"],

  // ── Delivery outcome ──────────────────────────────────────────────────────
  [/已签收|签收成功|投递成功|成功签收/, "Delivered"],
  [/客户拒签|拒签/, "Refused by recipient"],
  [/派件失败|投递失败|派送失败|无人签收|投递未果/, "Delivery attempt failed"],
  [/快件已由.*代为签收/, "Signed by proxy"],

  // ── Customs ───────────────────────────────────────────────────────────────
  [/出口处理完成|出口放行|出口清关|完成出口报关|海关放行出口/, "Export customs cleared"],
  [/进口清关中|进口海关查验|进口处理|海关处理中|正在清关/, "Import customs processing"],
  [/进口清关完成|进口放行|清关完成/, "Import customs cleared"],
  [/海关查验|海关扣押|被海关扣留|海关扣押查验/, "Held by customs"],
  [/安全检查/, "Security check"],

  // ── International ─────────────────────────────────────────────────────────
  [/到达目的地国家|到达目的国/, "Arrived in destination country"],
  [/国际出口/, "International export"],
  [/国际进口/, "International import"],

  // ── Returns / issues ──────────────────────────────────────────────────────
  [/退回|退件|退货|已退回/, "Return to sender"],
  [/丢失|破损/, "Lost / damaged"],

  // ── Waiting / notifications ───────────────────────────────────────────────
  [/超时未取|滞留/, "Awaiting collection"],
  [/等待取件|待取|等待领取/, "Awaiting collection"],
  [/已通知|通知收件人|已短信通知/, "Recipient notified"],
  [/快件已由.*代为签收/, "Signed by proxy"],
  [/揽件失败/, "Collection failed"],

  // ── Locations ─────────────────────────────────────────────────────────────
  [/中国/, "China"],
  [/香港/, "Hong Kong"],
  [/英国/, "United Kingdom"],
  [/美国/, "United States"],
  [/德国/, "Germany"],
  [/法国/, "France"],
  [/荷兰/, "Netherlands"],
  [/澳大利亚/, "Australia"],
  [/加拿大/, "Canada"],
  [/日本/, "Japan"],
];

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

export function translateZh(text: string): string {
  if (!text || !CJK_RE.test(text)) return text;
  for (const [pattern, english] of ZH_PHRASES) {
    if (pattern.test(text)) return english;
  }
  // Strip any remaining CJK so raw Chinese never leaks through
  const stripped = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, "").trim();
  return stripped || text;
}
