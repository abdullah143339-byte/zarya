"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";

const RINGS = [
  { r: 64, start: 0.12, stroke: "url(#growthStroke)", width: 1.3, rot: -32 },
  { r: 118, start: 0.2, stroke: "url(#growthStrokeDim)", width: 1, rot: 148 },
  { r: 172, start: 0.28, stroke: "url(#growthStroke)", width: 1.3, rot: -32 },
  { r: 226, start: 0.36, stroke: "url(#growthStrokeDim)", width: 1, rot: 148 },
];

function GrowthRing({
  ring,
  index,
  progress,
  reduced,
}: {
  ring: (typeof RINGS)[number];
  index: number;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const end = ring.start + 0.42;
  const scale = useTransform(progress, [ring.start, end], [0.82 + index * 0.02, 1]);
  const opacity = useTransform(progress, [ring.start, end], [0, 1]);

  return (
    <motion.g
      style={reduced ? undefined : { scale, opacity, transformOrigin: "260px 260px" }}
    >
      <circle
        cx="260"
        cy="260"
        r={ring.r}
        fill="none"
        stroke={ring.stroke}
        strokeWidth={ring.width}
        strokeDasharray={`${Math.round(ring.r * 4.6)} ${Math.round(ring.r * 6.3)}`}
        strokeLinecap="round"
        transform={`rotate(${ring.rot} 260 260)`}
        opacity={reduced ? 1 : undefined}
      />
    </motion.g>
  );
}

export default function GrowthVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const beamScale = useTransform(scrollYProgress, [0.15, 0.75], [0, 1]);
  const fieldOpacity = useTransform(scrollYProgress, [0, 0.35, 0.8], [0, 1, 0.9]);
  const driftY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <div ref={ref} className="relative h-[420px] sm:h-[500px] mt-4" aria-hidden="true">
      {/* wide light field behind rings */}
      <motion.div
        style={reduced ? undefined : { opacity: fieldOpacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-[560px] h-[360px] rounded-full blur-[100px] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(148,163,184,0.10),transparent_70%)]" />
      </motion.div>

      <motion.div
        style={reduced ? undefined : { y: driftY }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <svg viewBox="0 0 520 520" className="w-full max-w-[520px] h-full">
          <defs>
            <linearGradient id="growthStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="growthStrokeDim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.18" />
            </linearGradient>
          </defs>

          {RINGS.map((ring, i) => (
            <GrowthRing
              key={ring.r}
              ring={ring}
              index={i}
              progress={scrollYProgress}
              reduced={!!reduced}
            />
          ))}

          {/* upward growth trail */}
          {!reduced && (
            <motion.line
              x1="260"
              y1="258"
              x2="260"
              y2="66"
              stroke="url(#growthStroke)"
              strokeWidth="1.4"
              strokeLinecap="round"
              style={{ pathLength: beamScale }}
            />
          )}

          {/* core */}
          <circle cx="260" cy="260" r="26" fill="rgba(167,139,250,0.10)" />
          <circle cx="260" cy="260" r="3" fill="#e2e8f0" opacity="0.85" />

          {/* nodes */}
          {[
            [460.6, 140.9],
            [260 - 172 * 0.6662, 260 + 172 * 0.7457],
            [260 - 118 * 0.9041, 260 - 118 * 0.4274],
          ].map(([x, y], i) => (
            <motion.circle
              key={i}
              cx={x.toFixed(1)}
              cy={y.toFixed(1)}
              r="2.2"
              fill="#cbd5e1"
              initial={reduced ? undefined : { opacity: 0 }}
              whileInView={{ opacity: 0.8 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 + i * 0.15, ease: "easeOut" as const }}
            />
          ))}
        </svg>
      </motion.div>
    </div>
  );
}
