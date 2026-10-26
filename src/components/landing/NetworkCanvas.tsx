"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NetworkCanvasProps {
  variant?: "core" | "field";
  className?: string;
}

interface NetNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  drift: boolean;
  phase: number;
}

interface Pulse {
  a: number;
  b: number;
  t: number;
  speed: number;
}

export default function NetworkCanvas({ variant = "core", className }: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let running = false;
    let visible = true;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let progress = 1;

    let nodes: NetNode[] = [];
    const pulses: Pulse[] = [];
    const pointer = { x: -9999, y: -9999 };

    const isMobile = () => window.innerWidth < 768;

    const seed = () => {
      const area = Math.max(width * height, 1);
      const base = variant === "core" ? 52 : 36;
      let count = Math.max(14, Math.round((base * area) / (1440 * 700)));
      if (isMobile()) count = Math.round(count * 0.45);
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.09,
        vy: (Math.random() - 0.5) * 0.09,
        r: Math.random() * 1.2 + 0.6,
        drift: i % 3 !== 0,
        phase: Math.random() * Math.PI * 2,
      }));
      pulses.length = 0;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) draw(0);
    };

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);
      const linkDist = variant === "core" ? 155 : 175;
      const linkDist2 = linkDist * linkDist;
      const edgeGain = 0.3 + 0.7 * progress;

      // edges
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist2) {
            const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.42 * edgeGain;
            ctx!.strokeStyle = `rgba(190,200,222,${alpha.toFixed(3)})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      // central intelligence core
      if (variant === "core") {
        const cx = width / 2;
        const cy = height / 2;
        const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 130);
        glow.addColorStop(0, `rgba(167,139,250,${(0.16 * progress).toFixed(3)})`);
        glow.addColorStop(1, "rgba(167,139,250,0)");
        ctx!.fillStyle = glow;
        ctx!.fillRect(cx - 130, cy - 130, 260, 260);

        for (const n of nodes) {
          const dx = n.x - cx;
          const dy = n.y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 250 && d > 1) {
            const alpha = (1 - d / 250) * 0.3 * edgeGain;
            ctx!.strokeStyle = `rgba(167,139,250,${alpha.toFixed(3)})`;
            ctx!.beginPath();
            ctx!.moveTo(cx, cy);
            ctx!.lineTo(n.x, n.y);
            ctx!.stroke();
          }
        }

        const pulseR = 3 + Math.sin(time * 0.0012) * 1.1;
        ctx!.fillStyle = `rgba(196,181,253,${(0.75 * Math.min(progress + 0.2, 1)).toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx!.fill();
      }

      // travelling light pulses along connections
      if (!reduced) {
        if (pulses.length < 6 && progress > 0.25 && Math.random() < 0.02 * progress && nodes.length > 4) {
          const a = Math.floor(Math.random() * nodes.length);
          const b = Math.floor(Math.random() * nodes.length);
          if (a !== b) pulses.push({ a, b, t: 0, speed: 0.004 + Math.random() * 0.005 });
        }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i];
          p.t += p.speed;
          if (p.t >= 1 || p.a >= nodes.length || p.b >= nodes.length) {
            pulses.splice(i, 1);
            continue;
          }
          const na = nodes[p.a];
          const nb = nodes[p.b];
          const x = na.x + (nb.x - na.x) * p.t;
          const y = na.y + (nb.y - na.y) * p.t;
          const fade = Math.sin(Math.PI * p.t);
          ctx!.fillStyle = `rgba(226,232,240,${(0.8 * fade).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // nodes — subtle pointer response + twinkle
      for (const n of nodes) {
        let dx = n.x;
        let dy = n.y;
        const pdx = pointer.x - n.x;
        const pdy = pointer.y - n.y;
        const pd = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pd < 200 && pd > 1) {
          const pull = (1 - pd / 200) * 10;
          dx += (pdx / pd) * pull;
          dy += (pdy / pd) * pull;
        }
        const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 0.0009 + n.phase));
        ctx!.fillStyle = `rgba(214,222,236,${(twinkle * 0.8).toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(dx, dy, n.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const step = (time: number) => {
      if (!running) return;
      for (const n of nodes) {
        if (!n.drift) continue;
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      }
      draw(time);
      raf = requestAnimationFrame(step);
    };

    const start = () => {
      if (!running && visible && !document.hidden && !reduced) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onScroll = () => {
      const r = canvas.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      progress = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));
    };

    resize();
    onScroll();

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (!reduced) {
      window.addEventListener("pointermove", onMove, { passive: true });
      canvas.parentElement?.addEventListener("pointerleave", onLeave);
      start();
    }

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      canvas.parentElement?.removeEventListener("pointerleave", onLeave);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("block w-full h-full", className)}
    />
  );
}
