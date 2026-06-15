import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BloodTestSession, DiscussMessage } from "@/hooks/use-blood-tests";

// ─── Shared numeric helpers ───────────────────────────────────────────────────

function parseNum(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function isInRange(val: number, low?: number | null, high?: number | null): boolean | null {
  if (low == null && high == null) return null;
  if (low != null && val < low) return false;
  if (high != null && val > high) return false;
  return true;
}

function fmtNum(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 0.01) return n.toFixed(4);
  if (Math.abs(n) < 0.1) return n.toFixed(3);
  if (Math.abs(n) < 10) return n.toFixed(2);
  if (Math.abs(n) < 100) return n.toFixed(1);
  return n.toFixed(0);
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function fmtLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#+\s+/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

// ─── Page chrome ──────────────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, title: string, rightText: string, pageW: number): void {
  doc.setFillColor(14, 14, 14);
  doc.rect(0, 0, pageW, 21, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 13, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(170, 170, 170);
  doc.text("Peps Anonymous", pageW - 13, 9, { align: "right" });
  doc.text(rightText, pageW - 13, 16, { align: "right" });
}

function drawFooter(doc: jsPDF, pageW: number, pageH: number): void {
  doc.setDrawColor(210, 210, 210);
  doc.line(13, pageH - 14, pageW - 13, pageH - 14);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(155, 155, 155);
  doc.text(
    "For informational purposes only. This document does not constitute medical advice — consult a qualified healthcare professional for clinical guidance.",
    pageW / 2,
    pageH - 7.5,
    { align: "center", maxWidth: pageW - 26 },
  );
}

// ─── Canvas chart renderer ────────────────────────────────────────────────────

type ChartPoint = { date: string; value: number; inRange: boolean | null };

function buildChartDataURL(
  points: ChartPoint[],
  refLow: number | null,
  refHigh: number | null,
  unit: string,
): string {
  const W = 1000, H = 400;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const pad = { top: 40, right: 90, bottom: 55, left: 70 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  // Value axis range
  const vals = points.map(p => p.value);
  const refNums = ([refLow, refHigh]).filter((v): v is number => v != null);
  const allNums = [...vals, ...refNums];
  const rawMin = Math.min(...allNums);
  const rawMax = Math.max(...allNums);
  const spread = rawMax - rawMin || rawMax * 0.3 || 1;
  const minV = rawMin - spread * 0.25;
  const maxV = rawMax + spread * 0.25;
  const vRange = maxV - minV;

  function xOf(i: number): number {
    if (points.length <= 1) return pad.left + cW / 2;
    return pad.left + (i / (points.length - 1)) * cW;
  }
  function yOf(v: number): number {
    return pad.top + cH - ((v - minV) / vRange) * cH;
  }

  // Reference range band
  if (refLow != null || refHigh != null) {
    const bandTop  = refHigh != null ? yOf(Math.min(refHigh, maxV)) : pad.top;
    const bandBot  = refLow  != null ? yOf(Math.max(refLow, minV))  : pad.top + cH;
    ctx.fillStyle = "rgba(34,197,94,0.07)";
    ctx.fillRect(pad.left, bandTop, cW, Math.max(0, bandBot - bandTop));

    ctx.strokeStyle = "rgba(34,197,94,0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 5]);
    if (refHigh != null && refHigh >= minV && refHigh <= maxV) {
      ctx.beginPath();
      ctx.moveTo(pad.left, yOf(refHigh));
      ctx.lineTo(pad.left + cW, yOf(refHigh));
      ctx.stroke();
    }
    if (refLow != null && refLow >= minV && refLow <= maxV) {
      ctx.beginPath();
      ctx.moveTo(pad.left, yOf(refLow));
      ctx.lineTo(pad.left + cW, yOf(refLow));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Labels on right axis
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#16a34a";
    ctx.textAlign = "left";
    if (refHigh != null && refHigh >= minV && refHigh <= maxV) {
      ctx.fillText(`${fmtNum(refHigh)} ${unit}`, pad.left + cW + 6, yOf(refHigh) + 4);
    }
    if (refLow != null && refLow >= minV && refLow <= maxV) {
      ctx.fillText(`${fmtNum(refLow)} ${unit}`, pad.left + cW + 6, yOf(refLow) + 4);
    }
  }

  // Grid lines + y-axis labels
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const y = pad.top + (cH / gridCount) * i;
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cW, y);
    ctx.stroke();
    const val = maxV - (vRange / gridCount) * i;
    ctx.fillStyle = "#9ca3af";
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.fillText(fmtNum(val), pad.left - 7, y + 4);
  }

  // Connecting line
  if (points.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    points.forEach((p, i) => {
      const x = xOf(i), y = yOf(p.value);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // Data points + labels
  points.forEach((p, i) => {
    const x = xOf(i), y = yOf(p.value);
    const color = p.inRange === false ? "#ef4444" : p.inRange === true ? "#22c55e" : "#6b7280";

    // Outer glow for OOR
    if (p.inRange === false) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239,68,68,0.15)";
      ctx.fill();
    }

    // Dot
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Value label
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.fillText(fmtNum(p.value), x, y - 16);

    // Date label below axis
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.date, x, pad.top + cH + 22);
  });

  // Axes
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + cH);
  ctx.lineTo(pad.left + cW, pad.top + cH);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

// ─── Biomarker page ───────────────────────────────────────────────────────────

function addBiomarkerPage(
  doc: jsPDF,
  markerName: string,
  category: string,
  unit: string,
  refLow: number | null,
  refHigh: number | null,
  points: ChartPoint[],
  about: string | undefined,
  username: string,
): void {
  doc.addPage();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 13, mR = pageW - 13, cW = mR - mL;

  drawHeader(doc, markerName, `${category} · @${username}`, pageW);
  drawFooter(doc, pageW, pageH);

  let y = 26;

  // Reference range strip
  const refStr =
    refLow != null && refHigh != null
      ? `Reference range: ${fmtNum(refLow)} – ${fmtNum(refHigh)} ${unit}`
      : refHigh != null ? `Upper limit: ${fmtNum(refHigh)} ${unit}`
        : refLow != null ? `Lower limit: ${fmtNum(refLow)} ${unit}`
          : `Unit: ${unit}`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(refStr, mL, y);
  y += 8;

  // Chart (canvas → PNG → PDF)
  try {
    const dataUrl = buildChartDataURL(points, refLow, refHigh, unit);
    const chartH = 78;
    doc.addImage(dataUrl, "PNG", mL, y, cW, chartH);
    y += chartH + 8;
  } catch {
    y += 4;
  }

  // "What it measures" section
  if (about) {
    doc.setFillColor(237, 238, 242);
    doc.rect(mL, y, cW, 7.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(35, 35, 35);
    doc.text("WHAT THIS MARKER MEASURES", mL + 3.5, y + 5);
    y += 11;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(45, 47, 55);
    const allLines = doc.splitTextToSize(about, cW);
    // Limit to ~22 lines so values table stays on same page
    const maxLines = 22;
    const lines: string[] = allLines.slice(0, maxLines);
    if (allLines.length > maxLines) lines[lines.length - 1] = lines[lines.length - 1].trimEnd() + "…";
    doc.text(lines, mL, y);
    y += lines.length * 4.3 + 8;
  }

  // Values table
  const tableHead = [["Date", "Value", "Unit", "Status"]];
  const tableBody = points.map(p => [
    p.date,
    fmtNum(p.value),
    unit,
    p.inRange === false ? "⚠ Out of range"
      : p.inRange === true ? "✓ In range"
        : "—",
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: Math.min(y, pageH - 65),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontSize: 7.5 },
    columnStyles: { 0: { cellWidth: 28 }, 1: { halign: "center" as const }, 2: { halign: "center" as const, textColor: [120, 120, 120] as [number, number, number] } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const raw = String(data.cell.raw);
        if (raw.includes("Out")) {
          data.cell.styles.textColor = [220, 38, 38] as [number, number, number];
          data.cell.styles.fontStyle = "bold";
        } else if (raw.includes("In")) {
          data.cell.styles.textColor = [22, 163, 74] as [number, number, number];
        }
      }
    },
    margin: { left: mL, right: 13, bottom: 20 },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HISTORICAL LAB RESULTS PDF
// ─────────────────────────────────────────────────────────────────────────────

export type CatalogEntry = { name: string; about?: string };

export function generateLabHistoryPDF(
  sessions: BloodTestSession[],
  username: string,
  catalog?: CatalogEntry[],
): void {
  if (sessions.length === 0) return;

  const sorted = [...sessions].sort((a, b) => a.testDate.localeCompare(b.testDate));
  const isLandscape = sorted.length > 3;

  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  drawHeader(doc, "Blood Test History", `@${username} · ${today}`, pageW);

  // ── Collect all biomarker definitions ──────────────────────────────────────
  type MarkerDef = { category: string; unit: string; refLow: number | null; refHigh: number | null };
  const markerMap = new Map<string, MarkerDef>();

  for (const session of sorted) {
    for (const v of session.values) {
      if (!markerMap.has(v.biomarkerName)) {
        markerMap.set(v.biomarkerName, {
          category: v.biomarkerCategory || "Other",
          unit: v.unit,
          refLow: parseNum(v.refRangeLow),
          refHigh: parseNum(v.refRangeHigh),
        });
      }
    }
  }

  // ── Group by category ──────────────────────────────────────────────────────
  const catGroups: Record<string, string[]> = {};
  for (const [name, def] of markerMap.entries()) {
    if (!catGroups[def.category]) catGroups[def.category] = [];
    catGroups[def.category].push(name);
  }

  const CAT_ORDER = ["Hormones", "Hematology", "Lipids", "Liver", "Kidney", "Metabolic", "Vitamins", "Other"];
  const sortedCats = Object.keys(catGroups).sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a);
    const bi = CAT_ORDER.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  // ── Build head row ─────────────────────────────────────────────────────────
  const totalCols = 2 + sorted.length;
  const head = [
    "Biomarker",
    "Ref Range",
    ...sorted.map(s => {
      const d = fmtShortDate(s.testDate);
      return s.measurementType ? `${d}\n${s.measurementType}` : d;
    }),
  ];

  type CellObj = {
    content: string;
    colSpan?: number;
    styles?: {
      fillColor?: [number, number, number];
      textColor?: [number, number, number];
      fontStyle?: "bold" | "normal" | "italic" | "bolditalic";
      halign?: "left" | "center" | "right";
      fontSize?: number;
    };
  };

  const body: (string | CellObj)[][] = [];

  for (const cat of sortedCats) {
    body.push([{
      content: cat.toUpperCase(),
      colSpan: totalCols,
      styles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    }]);

    for (const markerName of catGroups[cat].sort()) {
      const def = markerMap.get(markerName)!;
      const refStr =
        def.refLow != null && def.refHigh != null
          ? `${fmtNum(def.refLow)}–${fmtNum(def.refHigh)}`
          : def.refHigh != null ? `< ${fmtNum(def.refHigh)}`
            : def.refLow != null ? `> ${fmtNum(def.refLow)}`
              : "—";

      const row: (string | CellObj)[] = [
        markerName,
        { content: `${refStr}\n${def.unit}`, styles: { textColor: [110, 110, 110], halign: "center", fontSize: 7 } },
      ];

      for (const session of sorted) {
        const v = session.values.find(x => x.biomarkerName === markerName);
        if (!v) {
          row.push({ content: "—", styles: { textColor: [195, 195, 195], halign: "center" } });
        } else {
          const n = parseNum(v.value);
          const ir = n != null ? isInRange(n, def.refLow, def.refHigh) : null;
          const display = n != null ? fmtNum(n) : (v.value || "—");
          row.push({
            content: display,
            styles: {
              textColor: ir === false ? [220, 38, 38] : ir === true ? [22, 163, 74] : [100, 100, 100],
              fontStyle: ir === false ? "bold" : "normal",
              halign: "center",
            },
          });
        }
      }
      body.push(row);
    }
  }

  // ── Draw comparison table ──────────────────────────────────────────────────
  autoTable(doc, {
    head: [head],
    body: body as Parameters<typeof autoTable>[1]["body"],
    startY: 26,
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak" },
    headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 7.5 },
    columnStyles: { 0: { cellWidth: isLandscape ? 42 : 50, fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    tableLineColor: [220, 222, 225],
    tableLineWidth: 0.15,
    margin: { top: 26, bottom: 20, left: 12, right: 12 },
    didDrawPage: () => { drawFooter(doc, pageW, pageH); },
  });

  drawFooter(doc, pageW, pageH);

  // ── Per-biomarker detail pages (always portrait) ───────────────────────────
  // Switch to portrait for detail pages if we used landscape for the table
  const detailDoc = isLandscape
    ? (() => {
        // We continue adding pages to the same doc — jsPDF lets you mix orientations via addPage
        return doc;
      })()
    : doc;

  const aboutMap: Record<string, string> = {};
  if (catalog) {
    for (const entry of catalog) {
      if (entry.about) aboutMap[entry.name] = entry.about;
    }
  }

  for (const cat of sortedCats) {
    for (const markerName of catGroups[cat].sort()) {
      const def = markerMap.get(markerName)!;

      const points: ChartPoint[] = sorted
        .map(session => {
          const v = session.values.find(x => x.biomarkerName === markerName);
          if (!v) return null;
          const n = parseNum(v.value);
          if (n == null) return null;
          return { date: fmtShortDate(session.testDate), value: n, inRange: isInRange(n, def.refLow, def.refHigh) };
        })
        .filter((p): p is ChartPoint => p !== null);

      if (points.length === 0) continue;

      addBiomarkerPage(
        detailDoc,
        markerName,
        def.category,
        def.unit,
        def.refLow,
        def.refHigh,
        points,
        aboutMap[markerName],
        username,
      );
    }
  }

  doc.save(`blood-test-history-${username}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HEALTH PLAN PDF
// ─────────────────────────────────────────────────────────────────────────────

export function generateHealthPlanPDF(
  convTitle: string,
  messages: DiscussMessage[],
  sessions: BloodTestSession[],
  username: string,
): void {
  if (messages.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 13, mR = pageW - 13, cW = mR - mL;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  drawHeader(doc, "Personal Health Plan", `@${username} · ${today}`, pageW);
  drawFooter(doc, pageW, pageH);

  let y = 27;

  function checkPage(needed = 12) {
    if (y + needed > pageH - 19) {
      doc.addPage();
      drawHeader(doc, "Personal Health Plan (cont.)", `@${username}`, pageW);
      drawFooter(doc, pageW, pageH);
      y = 27;
    }
  }

  function sectionHeader(label: string) {
    checkPage(14);
    doc.setFillColor(237, 238, 242);
    doc.rect(mL, y, cW, 7.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(35, 35, 35);
    doc.text(label, mL + 3.5, y + 5);
    y += 11;
  }

  // Conversation title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 105, 115);
  const titleWrapped = doc.splitTextToSize(`Conversation: "${convTitle}"`, cW);
  doc.text(titleWrapped, mL, y);
  y += titleWrapped.length * 4.8 + 5;

  // Recent test summary
  const latest = sessions.length > 0 ? sessions[0] : null;
  if (latest) {
    sectionHeader("RECENT TEST SUMMARY");

    const testLabel = latest.testName ?? latest.labName ?? "Blood Test";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(25, 25, 25);
    doc.text(testLabel, mL, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 115, 125);
    doc.text(fmtLongDate(latest.testDate), mR, y, { align: "right" });
    y += 6;

    const oor: { name: string; val: string; unit: string; refStr: string }[] = [];
    const inRangeNames: string[] = [];

    for (const v of latest.values) {
      const n = parseNum(v.value);
      if (n == null) continue;
      const refLow = parseNum(v.refRangeLow);
      const refHigh = parseNum(v.refRangeHigh);
      const ir = isInRange(n, refLow, refHigh);
      const refStr =
        refLow != null && refHigh != null ? `ref: ${fmtNum(refLow)}–${fmtNum(refHigh)}`
          : refHigh != null ? `ref: < ${fmtNum(refHigh)}`
            : refLow != null ? `ref: > ${fmtNum(refLow)}`
              : "";
      if (ir === false) oor.push({ name: v.biomarkerName, val: fmtNum(n), unit: v.unit, refStr });
      else if (ir === true) inRangeNames.push(v.biomarkerName);
    }

    if (oor.length > 0) {
      checkPage(8 + oor.length * 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.text(`⚠  Out of range  (${oor.length} marker${oor.length !== 1 ? "s" : ""})`, mL, y);
      y += 5.5;
      for (const item of oor) {
        checkPage(5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(70, 70, 75);
        const refNote = item.refStr ? `  [${item.refStr} ${item.unit}]` : ` ${item.unit}`;
        doc.text(`    •  ${item.name}: ${item.val} ${item.unit}${refNote}`, mL, y);
        y += 4.8;
      }
      y += 3;
    }

    if (inRangeNames.length > 0) {
      const preview = inRangeNames.slice(0, 14).join(", ") + (inRangeNames.length > 14 ? ` + ${inRangeNames.length - 14} more` : "");
      const okWrapped = doc.splitTextToSize(`✓  In range (${inRangeNames.length}): ${preview}`, cW);
      checkPage(okWrapped.length * 4.5 + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(22, 163, 74);
      doc.text(okWrapped, mL, y);
      y += okWrapped.length * 4.5 + 7;
    }
  }

  // Conversation
  sectionHeader("CONVERSATION & ADVICE");

  for (const msg of messages) {
    const cleaned = stripMarkdown(msg.content);

    if (msg.role === "user") {
      const wrapped = doc.splitTextToSize(cleaned, cW - 6);
      checkPage(wrapped.length * 4.8 + 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(75, 95, 165);
      doc.text("You:", mL, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(40, 42, 50);
      doc.text(wrapped, mL + 4, y);
      y += wrapped.length * 4.8 + 8;
    } else {
      const wrapped = doc.splitTextToSize(cleaned, cW - 10);
      const boxH = wrapped.length * 4.5 + 13;
      checkPage(boxH + 8);
      doc.setFillColor(244, 246, 254);
      doc.setDrawColor(185, 200, 235);
      doc.roundedRect(mL, y, cW, boxH, 2.5, 2.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(65, 95, 195);
      doc.text("Health Assistant:", mL + 4.5, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(28, 30, 38);
      doc.text(wrapped, mL + 5, y + 10.5);
      y += boxH + 8;
    }
  }

  const cleanTitle = convTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 30);
  doc.save(`health-plan-${username}-${cleanTitle}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
