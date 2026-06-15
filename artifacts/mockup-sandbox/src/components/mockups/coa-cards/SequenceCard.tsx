import { useEffect, useState, useRef } from "react";

const SEQ = "FGTSDYSYLLEGQAAKEFIAWLVKGR·FGTSDYSYLLEGQAAKEFIAWLVKGR";

export function SequenceCard() {
  const [pct, setPct] = useState(0);
  const [seqPos, setSeqPos] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const iv = setInterval(() => setPct(v => v >= 99.892 ? 99.892 : Math.min(99.892, v + 1.6)), 18);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setSeqPos(v => (v + 1) % SEQ.length), 120);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    let t = 0;
    let id: number;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let x = 0; x < W; x += 4) {
        const y = H / 2 + Math.sin(x / 12 + t) * (H / 2 - 2) * 0.6 + Math.sin(x / 7 - t * 1.5) * 4;
        const alpha = 0.15 + 0.1 * Math.sin(x / 20 + t);
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(20,210,190,${alpha})`;
        ctx.fill();
      }
      t += 0.035;
      id = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(id);
  }, []);

  const displayed = SEQ.slice(seqPos, seqPos + 22).padEnd(22, " ");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020c0b] p-4">
      <div
        className="w-full max-w-[280px] rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "linear-gradient(160deg, #061414 0%, #030d0d 100%)",
          border: "1px solid rgba(20,210,190,0.2)",
          boxShadow: "0 0 40px rgba(20,210,190,0.06)",
        }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(20,210,190,0.1)" }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[7px] tracking-[0.35em] font-bold uppercase" style={{ color: "rgba(20,210,190,0.5)" }}>
                Peptide Compound COA
              </p>
              <p className="text-[17px] font-black text-white mt-0.5 leading-tight">Tirzepatide</p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(20,210,190,0.6)" }}>
                MW: 4113.58 Da · C₁₈₀H₂₇₃N₄₀O₅₀
              </p>
            </div>
            <div
              className="mt-1 px-2 py-1 rounded-md text-[8px] font-black tracking-widest"
              style={{
                background: "rgba(20,210,190,0.12)",
                border: "1px solid rgba(20,210,190,0.3)",
                color: "#14d2be",
                textShadow: "0 0 8px rgba(20,210,190,0.8)",
              }}
            >
              PASS
            </div>
          </div>
        </div>

        {/* Waveform */}
        <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(20,210,190,0.08)" }}>
          <p className="text-[7px] tracking-[0.2em] mb-1 font-bold uppercase" style={{ color: "rgba(20,210,190,0.4)" }}>MS Signal</p>
          <canvas ref={canvasRef} width={238} height={32} className="w-full rounded" style={{ opacity: 0.9 }} />
        </div>

        {/* Sequence ticker */}
        <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(20,210,190,0.08)" }}>
          <p className="text-[7px] tracking-[0.2em] mb-1 font-bold uppercase" style={{ color: "rgba(20,210,190,0.4)" }}>Sequence (AA)</p>
          <p className="text-[10px] font-mono tracking-wider" style={{ color: "rgba(20,210,190,0.75)" }}>
            {displayed}
            <span className="animate-pulse" style={{ color: "#14d2be" }}>|</span>
          </p>
        </div>

        {/* Purity bar */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(20,210,190,0.08)" }}>
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(20,210,190,0.5)" }}>Purity (HPLC)</span>
            <span className="text-[20px] font-black" style={{ color: "#14d2be", textShadow: "0 0 16px rgba(20,210,190,0.6)" }}>
              {pct.toFixed(pct >= 99 ? 3 : 1)}<span className="text-sm font-bold" style={{ color: "rgba(20,210,190,0.6)" }}>%</span>
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(20,210,190,0.08)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #065f56, #14d2be)",
                boxShadow: "0 0 10px rgba(20,210,190,0.5)",
              }}
            />
          </div>
        </div>

        {/* Data rows */}
        <div className="px-4 py-3 flex flex-col gap-1.5">
          {[
            ["Batch", "ZE30-0319"],
            ["Supplier", "UTHER"],
            ["Analysis", "Mass & Purity"],
            ["Lab", "Janoshik · EU"],
            ["Date", "10 Apr 2026"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "rgba(20,210,190,0.35)" }}>{k}</span>
              <span className="text-[10px] font-mono font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-4 pb-4">
          <button
            className="w-full py-2 rounded-lg text-[9px] font-bold tracking-[0.15em] uppercase"
            style={{
              background: "rgba(20,210,190,0.1)",
              border: "1px solid rgba(20,210,190,0.25)",
              color: "#14d2be",
            }}
          >
            View Full Report →
          </button>
        </div>
      </div>
    </div>
  );
}
