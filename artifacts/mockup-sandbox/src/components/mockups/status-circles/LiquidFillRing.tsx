import { useRef, useEffect } from "react";

export function LiquidFillRing() {
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
    const R = 95, STROKE = 20;
    const TARGET = 0.65;
    let currentFill = 0;
    let t = 0;
    let animId: number;

    type Bubble = { angle: number; r: number; speed: number; size: number; alpha: number };
    const bubbles: Bubble[] = Array.from({ length: 18 }, () => ({
      angle: Math.random() * Math.PI * 2,
      r: R - STROKE / 2 + (Math.random() - 0.5) * (STROKE - 4),
      speed: 0.004 + Math.random() * 0.012,
      size: 1.2 + Math.random() * 2.8,
      alpha: 0.3 + Math.random() * 0.5,
    }));

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      t += 0.016;
      currentFill = Math.min(TARGET, currentFill + 0.004);

      // Dark background
      ctx.fillStyle = "#020d1a";
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Track
      ctx.save();
      ctx.strokeStyle = "rgba(0,120,200,0.08)";
      ctx.lineWidth = STROKE;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Clip ring area for liquid fill
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R + STROKE / 2, 0, Math.PI * 2);
      ctx.arc(cx, cy, R - STROKE / 2, 0, Math.PI * 2, true);
      ctx.clip();

      // Liquid level: fill = fraction of ring height filled
      const ringBottom = cy + R;
      const ringTop = cy - R;
      const liquidY = ringBottom - currentFill * (ringBottom - ringTop);
      const waveAmp = 4;
      const waveFreq = 3;

      // Fill below liquid with gradient
      const fillGrad = ctx.createLinearGradient(cx, ringBottom, cx, ringTop);
      fillGrad.addColorStop(0, "rgba(0,80,200,0.85)");
      fillGrad.addColorStop(0.5, "rgba(0,160,220,0.75)");
      fillGrad.addColorStop(1, "rgba(0,220,255,0.6)");

      ctx.beginPath();
      // Wave top surface
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const px = cx - R + (i / steps) * R * 2;
        const py = liquidY + Math.sin(i / steps * Math.PI * waveFreq + t * 2.5) * waveAmp
          + Math.sin(i / steps * Math.PI * (waveFreq + 1.5) + t * 1.8) * (waveAmp * 0.5);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(cx + R, ringBottom + 10);
      ctx.lineTo(cx - R, ringBottom + 10);
      ctx.closePath();
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Secondary wave sheen
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const px = cx - R + (i / steps) * R * 2;
        const py = liquidY + Math.sin(i / steps * Math.PI * (waveFreq + 1) - t * 2) * (waveAmp * 0.6) + 6;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(cx + R, ringBottom + 10);
      ctx.lineTo(cx - R, ringBottom + 10);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,220,255,0.4)";
      ctx.fill();
      ctx.restore();

      // Bubbles
      for (const b of bubbles) {
        b.angle -= b.speed;
        const bx = cx + Math.cos(b.angle) * b.r;
        const by = cy + Math.sin(b.angle) * b.r;
        if (by >= liquidY - 4) {
          ctx.save();
          ctx.shadowColor = "rgba(0,230,255,0.8)";
          ctx.shadowBlur = 6;
          ctx.globalAlpha = b.alpha;
          ctx.beginPath();
          ctx.arc(bx, by, b.size, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(180,240,255,0.9)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();

      // Ring border glow
      ctx.save();
      ctx.shadowColor = "rgba(0,180,255,0.6)";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "rgba(0,180,255,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R + STROKE / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, R - STROKE / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Percent label
      const pct = Math.round(currentFill * 100);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.font = "bold 11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FUNDED", cx, cy - 14);
      ctx.fillStyle = "#e0f7ff";
      ctx.font = "bold 30px 'Inter', sans-serif";
      ctx.fillText(`${pct}%`, cx, cy + 14);
      ctx.fillStyle = "rgba(0,200,255,0.5)";
      ctx.font = "10px 'Inter', sans-serif";
      ctx.fillText("$1,950 / $3,000", cx, cy + 30);

      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020d1a]">
      <canvas ref={canvasRef} />
      <p className="mt-4 text-[10px] tracking-[0.25em] text-cyan-400 uppercase font-semibold opacity-70">Liquid Fill Ring</p>
    </div>
  );
}
