import { useRef, useEffect } from "react";

export function OrbitalPulse() {
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
    let t = 0;
    let animId: number;

    type Ripple = { r: number; alpha: number; color: string };
    const ripples: Ripple[] = [];
    let rippleTimer = 0;

    const orbitals = [
      { r: 108, speed: 0.6, dotSize: 5, color: "#ff6b6b", trailLen: 28 },
      { r: 86, speed: -0.9, dotSize: 4, color: "#4ecdc4", trailLen: 20 },
      { r: 64, speed: 1.4, dotSize: 3.5, color: "#ffe66d", trailLen: 16 },
    ];

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      t += 0.016;
      rippleTimer += 0.016;

      // Background
      ctx.fillStyle = "#030412";
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Orbit tracks
      for (const orb of orbitals) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.arc(cx, cy, orb.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Ripples
      if (rippleTimer > 1.2) {
        const col = orbitals[Math.floor(Math.random() * orbitals.length)].color;
        ripples.push({ r: 10, alpha: 0.7, color: col });
        rippleTimer = 0;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += 1.5;
        rp.alpha -= 0.012;
        if (rp.alpha <= 0) { ripples.splice(i, 1); continue; }
        ctx.save();
        ctx.strokeStyle = rp.color;
        ctx.globalAlpha = rp.alpha;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rp.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw orbitals with trails
      for (const orb of orbitals) {
        const angle = t * orb.speed;
        for (let j = orb.trailLen; j >= 0; j--) {
          const a = angle - j * 0.08 * Math.sign(orb.speed);
          const x = cx + Math.cos(a) * orb.r;
          const y = cy + Math.sin(a) * orb.r;
          const frac = 1 - j / orb.trailLen;
          const sz = orb.dotSize * frac * (j === 0 ? 1.5 : 1);
          ctx.save();
          ctx.shadowColor = orb.color;
          ctx.shadowBlur = j === 0 ? 18 : 6 * frac;
          ctx.globalAlpha = frac * (j === 0 ? 1 : 0.6);
          ctx.beginPath();
          ctx.arc(x, y, sz, 0, Math.PI * 2);
          ctx.fillStyle = j === 0 ? "#ffffff" : orb.color;
          ctx.fill();
          ctx.restore();
        }
      }

      // Core pulsing sphere
      const pulse = 0.85 + 0.15 * Math.sin(t * 3);
      const coreGrad = ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 26 * pulse);
      coreGrad.addColorStop(0, "rgba(255,255,255,0.95)");
      coreGrad.addColorStop(0.3, "rgba(120,160,255,0.7)");
      coreGrad.addColorStop(1, "rgba(40,60,200,0)");
      ctx.save();
      ctx.shadowColor = "rgba(100,140,255,0.9)";
      ctx.shadowBlur = 30 * pulse;
      ctx.beginPath();
      ctx.arc(cx, cy, 22 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.restore();

      // Centre text
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ACTIVE", cx, cy - 8);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 15px 'Inter', sans-serif";
      ctx.fillText("LIVE", cx, cy + 8);

      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030412]">
      <canvas ref={canvasRef} />
      <p className="mt-4 text-[10px] tracking-[0.25em] text-indigo-300 uppercase font-semibold opacity-70">Orbital Pulse</p>
    </div>
  );
}
