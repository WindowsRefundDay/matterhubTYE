"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceEdgeAnimationProps {
  active: boolean;
  onDismiss?: () => void;
}

// Organic noise for fluid motion
function noise(x: number, y: number, t: number): number {
  const s = Math.sin(x * 1.7 + t * 0.7) * Math.cos(y * 2.3 + t * 0.5);
  const c = Math.cos(x * 0.9 + t * 1.1) * Math.sin(y * 1.3 + t * 0.9);
  const d = Math.sin((x + y) * 1.1 + t * 0.6);
  return (s + c + d) / 3;
}

// Apple Intelligence-inspired iridescent color palette
function edgeColor(t: number, intensity: number, time: number): string {
  const shift = time * 0.15;
  const hue1 = (270 + Math.sin(shift) * 40 + t * 120) % 360;
  const hue2 = (210 + Math.cos(shift * 0.7) * 30 + t * 80) % 360;
  const hue = hue1 * 0.6 + hue2 * 0.4;
  const sat = 80 + Math.sin(t * Math.PI * 2 + shift) * 15;
  const light = 55 + intensity * 25;
  const alpha = intensity * 0.85;
  return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
}

export function VoiceEdgeAnimation({ active, onDismiss }: VoiceEdgeAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const t0Ref = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  const draw = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (t0Ref.current === 0) t0Ref.current = ts;
    const elapsed = (ts - t0Ref.current) / 1000;

    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    if (w === 0 || h === 0) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, w, h);

    // Rise: cubic ease-out over 1.2s
    const rise = Math.min(1, 1 - Math.pow(1 - Math.min(elapsed / 1.2, 1), 3));
    const time = elapsed;
    const perimeter = 2 * (w + h);
    const halfW = w / 2;
    const seg1 = halfW / perimeter;
    const seg2 = (halfW + h) / perimeter;
    const seg3 = (halfW + h + w) / perimeter;
    const seg4 = (halfW + h + w + h) / perimeter;

    // Perimeter position to screen coordinates (starts bottom-center, goes clockwise)
    function toXY(d: number): [number, number, number, number] {
      d = ((d % 1) + 1) % 1;
      if (d < seg1) {
        const l = d / seg1;
        return [halfW + l * halfW, h, 0, 1];
      } else if (d < seg2) {
        const l = (d - seg1) / (seg2 - seg1);
        return [w, h - l * h, 1, 0];
      } else if (d < seg3) {
        const l = (d - seg2) / (seg3 - seg2);
        return [w - l * w, 0, 0, -1];
      } else if (d < seg4) {
        const l = (d - seg3) / (seg4 - seg3);
        return [0, l * h, -1, 0];
      } else {
        const l = (d - seg4) / (1 - seg4);
        return [l * halfW, h, 0, 1];
      }
    }

    const layers = 5;
    const baseThickness = 5;
    const glowSpread = 35;
    const segments = 280;
    const activeSegs = Math.floor(segments * rise);

    for (let layer = layers - 1; layer >= 0; layer--) {
      const lr = layer / layers;
      const thick = baseThickness + glowSpread * lr;
      const layerOpacity = (1 - lr) * 0.75;

      ctx.lineWidth = thick;
      ctx.lineCap = "round";

      for (let i = 0; i < activeSegs; i++) {
        const t = i / segments;
        const tNext = (i + 1) / segments;
        const [x0, y0, nx0, ny0] = toXY(t);
        const [x1, y1] = toXY(tNext);

        // Organic intensity variation
        const n = noise(t * 10, layer * 0.5, time * 1.5);
        const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 8 + time * 3);
        const pulse = 0.7 + 0.3 * Math.sin(time * 2 + t * Math.PI * 4);
        let intensity = (0.4 + n * 0.3 + wave * 0.2 + pulse * 0.1) * layerOpacity;

        // Leading edge fade
        if (i > activeSegs - 25) intensity *= (activeSegs - i) / 25;
        // Trailing fade
        if (i < 15) intensity *= i / 15;

        // Perpendicular organic displacement
        const disp = noise(t * 5, time, layer) * 2.5 * (1 - lr);

        ctx.beginPath();
        ctx.strokeStyle = edgeColor(t, intensity, time);
        ctx.moveTo(x0 - nx0 * disp, y0 - ny0 * disp);
        ctx.lineTo(x1 - nx0 * disp, y1 - ny0 * disp);
        ctx.stroke();
      }
    }

    // Soft ambient glow cast inward from each edge
    const glows: [number, number, boolean][] = [
      [w / 2, h, rise > 0],
      [w, h / 2, rise > 0.2],
      [w / 2, 0, rise > 0.45],
      [0, h / 2, rise > 0.7],
    ];
    for (const [gx, gy, show] of glows) {
      if (!show) continue;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 100);
      const hue = (270 + time * 20) % 360;
      grad.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.1)`);
      grad.addColorStop(1, `hsla(${hue}, 80%, 60%, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    if (!active) {
      t0Ref.current = 0;
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = 0;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (parent) {
      const dpr = window.devicePixelRatio || 1;
      const lw = parent.clientWidth;
      const lh = parent.clientHeight;
      canvas.width = lw * dpr;
      canvas.height = lh * dpr;
      canvas.style.width = `${lw}px`;
      canvas.style.height = `${lh}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      sizeRef.current = { w: lw, h: lh };
    }

    t0Ref.current = 0;
    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, draw]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 z-50 pointer-events-none"
          style={{ mixBlendMode: "screen" }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
          {/* Listening indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.8, duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-auto"
            onPointerDown={onDismiss}
          >
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px 4px hsla(270,80%,60%,0.3)",
                    "0 0 35px 8px hsla(270,80%,60%,0.5)",
                    "0 0 20px 4px hsla(270,80%,60%,0.3)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center"
              >
                <MicIcon />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ delay: 1, duration: 0.3 }}
                className="text-xs text-foreground/50 font-medium"
              >
                Listening...
              </motion.span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MicIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
