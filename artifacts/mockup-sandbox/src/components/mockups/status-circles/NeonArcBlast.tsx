import { useRef, useEffect } from "react";

export function NeonArcBlast() {
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
    const R = 100, STROKE = 18;
    const START = Math.PI * 0.75;
    const SWEEP = Math.PI * 1.5;
    const FILL = 0.72;

    type Spark = { angle: number; len: number; life: number; maxLife: number; speed: number };
    const sparks: Spark[] = [];
    function spawnSpark(angle: number) {
      sparks.push({ angle, len: 4 + Math.random() * 20, life: 0, maxLife: 0.4 + Math.random() * 0.4, speed: 0.5 + Math.random() * 2 });
    }

    let t = 0;
    let currentFill = 0;
    let animId: number;

    function lerp(a: number, b: number, x: number) { return a + (b - a) * x; }
    function hsl(h: number, s: number, l: number) { return `hsl(${h},${s}%,${l}%)` }

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      t += 0.016;
      currentFill = Math.min(FILL, currentFill + 0.006);
      const tipAngle = START + currentFill * SWEEP;

      // Background glow disk
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, R + 30);
      bgGrad.addColorStop(0, "rgba(10,0,30,0.9)");
      bgGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Track
      ctx.save();
      ctx.shadowColor = "rgba(60,0,120,0.4)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = STROKE;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, R, START, START + SWEEP);
      ctx.stroke();
      ctx.restore();

      if (currentFill > 0.002) {
        const N = Math.max(2, Math.floor(currentFill * 120));
        for (let i = 0; i <= N; i++) {
          const seg = i / N;
          const angle = START + seg * currentFill * SWEEP;
          const hue = lerp(260, 40, seg);
          const nextAngle = START + Math.min(seg + 1 / N, currentFill) * SWEEP;

          // Outer bloom
          ctx.save();
          ctx.shadowColor = `hsla(${hue},100%,70%,0.5)`;
          ctx.shadowBlur = 20;
          ctx.strokeStyle = `hsla(${hue},100%,65%,0.15)`;
          ctx.lineWidth = STROKE + 14;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(cx, cy, R, angle, nextAngle);
          ctx.stroke();
          ctx.restore();

          // Core
          ctx.save();
          ctx.shadowColor = `hsla(${hue},100%,80%,0.9)`;
          ctx.shadowBlur = 10;
          ctx.strokeStyle = `hsla(${hue},100%,75%,0.95)`;
          ctx.lineWidth = STROKE - 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(cx, cy, R, angle, nextAngle);
          ctx.stroke();
          ctx.restore();
        }

        // Spawn sparks at tip
        if (Math.random() < 0.35) spawnSpark(tipAngle);

        // Pulsing tip dot
        const pulse = 0.6 + 0.4 * Math.sin(t * 8);
        const tx = cx + Math.cos(tipAngle) * R;
        const ty = cy + Math.sin(tipAngle) * R;
        ctx.save();
        ctx.shadowColor = "rgba(255,220,80,1)";
        ctx.shadowBlur = 30 * pulse;
        ctx.beginPath();
        ctx.arc(tx, ty, 6 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,200,${0.85 * pulse})`;
        ctx.fill();
        ctx.restore();
      }

      // Draw & update sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += 0.016;
        if (s.life > s.maxLife) { sparks.splice(i, 1); continue; }
        const alpha = 1 - s.life / s.maxLife;
        const dist = R + s.len * (s.life / s.maxLife);
        const ex = cx + Math.cos(s.angle) * dist;
        const ey = cy + Math.sin(s.angle) * dist;
        const sx = cx + Math.cos(s.angle) * R;
        const sy = cy + Math.sin(s.angle) * R;
        ctx.save();
        ctx.shadowColor = `rgba(255,200,80,${alpha})`;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = `rgba(255,240,120,${alpha * 0.9})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.restore();
      }

      // Centre text
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "bold 11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("POOL", cx, cy - 12);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.fillText("72%", cx, cy + 12);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "10px 'Inter', sans-serif";
      ctx.fillText("of tier 1", cx, cy + 28);

      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#07001a]">
      <canvas ref={canvasRef} />
      <p className="mt-4 text-[10px] tracking-[0.25em] text-purple-400 uppercase font-semibold opacity-70">Neon Arc Blast</p>
    </div>
  );
}
