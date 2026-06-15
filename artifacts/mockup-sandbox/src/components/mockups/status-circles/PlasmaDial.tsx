import { useRef, useEffect } from "react";

export function PlasmaDial() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const SIZE = 280;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cx = SIZE / 2, cy = SIZE / 2;
    const R = 100;
    const START = Math.PI * 0.75;
    const SWEEP = Math.PI * 1.5;
    const TARGET_FRAC = 0.58;
    let t = 0;
    let currentFrac = 0;
    let animId: number;
    const TICKS = 30;

    function plasmaColor(pos: number, time: number) {
      const h = (pos * 120 + time * 40) % 360;
      return `hsl(${h},100%,65%)`;
    }

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      t += 0.016;
      currentFrac = Math.min(TARGET_FRAC, currentFrac + 0.005);

      // Background radial
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE / 2);
      bg.addColorStop(0, "#0a0618");
      bg.addColorStop(1, "#000208");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Outer bezel ring
      ctx.save();
      ctx.shadowColor = "rgba(80,0,160,0.5)";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "rgba(100,40,200,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Tick marks
      for (let i = 0; i <= TICKS; i++) {
        const frac = i / TICKS;
        const angle = START + frac * SWEEP;
        const isMajor = i % 5 === 0;
        const innerR = R + 8 + (isMajor ? 0 : 4);
        const outerR = R + 17;
        const sx = cx + Math.cos(angle) * innerR;
        const sy = cy + Math.sin(angle) * innerR;
        const ex = cx + Math.cos(angle) * outerR;
        const ey = cy + Math.sin(angle) * outerR;
        const active = frac <= currentFrac;
        ctx.save();
        if (active) {
          ctx.shadowColor = plasmaColor(frac, t);
          ctx.shadowBlur = isMajor ? 10 : 5;
        }
        ctx.strokeStyle = active ? plasmaColor(frac, t) : "rgba(255,255,255,0.08)";
        ctx.lineWidth = isMajor ? 2.5 : 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.restore();
      }

      // Arc track
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, R, START, START + SWEEP);
      ctx.stroke();
      ctx.restore();

      // Plasma arc (segmented)
      if (currentFrac > 0.002) {
        const segs = Math.max(2, Math.floor(currentFrac * 80));
        for (let i = 0; i < segs; i++) {
          const f0 = i / segs;
          const f1 = (i + 1) / segs;
          const a0 = START + f0 * currentFrac * SWEEP;
          const a1 = START + f1 * currentFrac * SWEEP;
          const col = plasmaColor(f0, t);
          // Wobble the radius slightly for plasma effect
          const wobble = 1 + 0.018 * Math.sin(f0 * 30 + t * 6);
          ctx.save();
          ctx.shadowColor = col;
          ctx.shadowBlur = 14;
          ctx.strokeStyle = col;
          ctx.lineWidth = 5 * wobble;
          ctx.lineCap = "round";
          ctx.globalAlpha = 0.7 + 0.3 * Math.sin(f0 * 20 + t * 4);
          ctx.beginPath();
          ctx.arc(cx, cy, R * wobble, a0, a1);
          ctx.stroke();
          ctx.restore();
        }

        // Tip spark
        const tipAngle = START + currentFrac * SWEEP;
        const tx = cx + Math.cos(tipAngle) * R;
        const ty = cy + Math.sin(tipAngle) * R;
        const p = 0.5 + 0.5 * Math.sin(t * 12);
        ctx.save();
        ctx.shadowColor = "rgba(255,255,255,1)";
        ctx.shadowBlur = 24 * p;
        ctx.beginPath();
        ctx.arc(tx, ty, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * p})`;
        ctx.fill();
        ctx.restore();
      }

      // Needle
      const needleAngle = START + currentFrac * SWEEP;
      const nLen = R - 20;
      ctx.save();
      ctx.shadowColor = "rgba(200,100,255,0.9)";
      ctx.shadowBlur = 16;
      ctx.strokeStyle = "rgba(220,160,255,0.85)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(needleAngle) * nLen, cy + Math.sin(needleAngle) * nLen);
      ctx.stroke();
      ctx.restore();

      // Centre pivot
      ctx.save();
      ctx.shadowColor = "rgba(180,80,255,1)";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(220,180,255,0.95)";
      ctx.fill();
      ctx.restore();

      // Value label
      ctx.fillStyle = "rgba(200,160,255,0.5)";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PLASMA", cx, cy + 36);
      ctx.fillStyle = "rgba(230,200,255,0.92)";
      ctx.font = "bold 22px 'Inter', sans-serif";
      ctx.fillText("58%", cx, cy + 58);

      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0618]">
      <canvas ref={canvasRef} />
      <p className="mt-4 text-[10px] tracking-[0.25em] text-purple-400 uppercase font-semibold opacity-70">Plasma Dial</p>
    </div>
  );
}
