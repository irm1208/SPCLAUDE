import { useRef, useEffect } from "react";

export function MorphicWave() {
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
    const R = 90;
    let t = 0;
    let animId: number;
    let fill = 0;
    const TARGET = 0.83;

    function morphR(angle: number, time: number, amplitude: number) {
      return R
        + amplitude * Math.sin(angle * 4 + time * 2.1)
        + amplitude * 0.5 * Math.sin(angle * 7 - time * 1.4)
        + amplitude * 0.25 * Math.cos(angle * 11 + time * 3.3);
    }

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      t += 0.016;
      fill = Math.min(TARGET, fill + 0.005);

      ctx.fillStyle = "#010c0a";
      ctx.fillRect(0, 0, SIZE, SIZE);

      const pts = 180;

      // Draw multiple morphic rings at different amplitudes / phases for depth
      const layers = [
        { amp: 8, alpha: 0.08, lw: 28, color: "#00ffaa", timeOffset: 0 },
        { amp: 5.5, alpha: 0.2, lw: 14, color: "#00ffcc", timeOffset: 0.5 },
        { amp: 3, alpha: 0.9, lw: 5, color: "#80ffdd", timeOffset: 1.1 },
      ];

      for (const layer of layers) {
        // Only draw up to `fill` portion of the ring
        const filledPts = Math.floor(pts * fill);
        if (filledPts < 2) continue;

        ctx.save();
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = 20 * layer.alpha;
        ctx.globalAlpha = layer.alpha;
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.lw;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i <= filledPts; i++) {
          const angle = (i / pts) * Math.PI * 2 - Math.PI / 2;
          const r = morphR(angle, t + layer.timeOffset, layer.amp);
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Inactive track (thin ghost ring)
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "#00ffaa";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const angle = (i / pts) * Math.PI * 2 - Math.PI / 2;
        const r = morphR(angle, t, 3);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Tip bright point
      const tipAngle = (fill - 1 / pts) * Math.PI * 2 - Math.PI / 2;
      const tipR = morphR(tipAngle, t, 3);
      const tx = cx + Math.cos(tipAngle) * tipR;
      const ty = cy + Math.sin(tipAngle) * tipR;
      const pulse = 0.6 + 0.4 * Math.sin(t * 10);
      ctx.save();
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 30 * pulse;
      ctx.beginPath();
      ctx.arc(tx, ty, 6 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.8 * pulse})`;
      ctx.fill();
      ctx.restore();

      // Inner glow disk
      const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
      inner.addColorStop(0, "rgba(0,255,160,0.12)");
      inner.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.fillStyle = inner;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.restore();

      // Centre text
      ctx.fillStyle = "rgba(0,255,160,0.3)";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WAVE", cx, cy - 14);
      ctx.fillStyle = "#afffdd";
      ctx.font = "bold 30px 'Inter', sans-serif";
      ctx.fillText("83%", cx, cy + 14);
      ctx.fillStyle = "rgba(0,220,140,0.45)";
      ctx.font = "10px 'Inter', sans-serif";
      ctx.fillText("target reached", cx, cy + 30);

      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#010c0a]">
      <canvas ref={canvasRef} />
      <p className="mt-4 text-[10px] tracking-[0.25em] text-emerald-400 uppercase font-semibold opacity-70">Morphic Wave</p>
    </div>
  );
}
