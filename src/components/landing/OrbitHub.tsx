"use client";

import { motion, useMotionValue, useAnimationFrame, useTransform } from "framer-motion";
import { type ComponentType, type ReactNode } from "react";

export type HubIcon = ComponentType<{ className?: string }>;

export interface OrbitHubItem {
  label: string;
  icon: HubIcon;
}

interface OrbitHubProps {
  items: OrbitHubItem[];
  centerIcon: HubIcon;
  centerNode?: ReactNode;
  centerLabel?: string;
  centerTag?: string;
  gradient: string;
  glowColor: string;
  ringColor: string;
  wireGradient: string;
  size?: number;
  radius?: number;
  spinSpeed?: number;
}

export default function OrbitHub({
  items,
  centerIcon: CenterIcon,
  centerNode,
  centerLabel,
  centerTag,
  gradient,
  glowColor,
  ringColor,
  wireGradient,
  size = 400,
  radius = 150,
  spinSpeed = 0.14,
}: OrbitHubProps) {
  const spin = useMotionValue(0);

  useAnimationFrame((t) => {
    spin.set((t / 1000) * spinSpeed);
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-[-14%] rounded-full ${gradient} blur-3xl opacity-30 bg-gradient-to-br`}
      />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-8%] rounded-full border border-dashed border-white/15"
      />

      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-[-4%] rounded-full border ${ringColor}`}
      />

      {items.map((_, i) => (
        <OrbitWire key={i} index={i} count={items.length} spin={spin} radius={radius} wireGradient={wireGradient} />
      ))}

      {items.map((n, i) => (
        <OrbitNode key={n.label} index={i} count={items.length} spin={spin} radius={radius} label={n.label} icon={n.icon} glowColor={glowColor} />
      ))}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full glass-strong border ${ringColor} shadow-[0_0_60px_rgba(0,0,0,0.4)] flex items-center justify-center backdrop-blur-xl`}>
          <div className={`absolute inset-2 rounded-full ${gradient} bg-gradient-to-br opacity-90 blur-[2px]`} />
          {centerNode ? (
            <div className="relative flex items-center justify-center">
              {centerNode}
            </div>
          ) : (
            <CenterIcon className="relative w-12 h-12 md:w-14 md:h-14 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" />
          )}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-2 rounded-full border border-dashed border-white/20"
          />
        </div>
        {centerLabel && (
          <span className="mt-4 text-sm font-bold text-white tracking-wide">{centerLabel}</span>
        )}
        {centerTag && (
          <span className="mt-1 text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">{centerTag}</span>
        )}
      </div>
    </div>
  );
}

function OrbitNode({
  index,
  count,
  spin,
  radius,
  label,
  icon: Icon,
  glowColor,
}: {
  index: number;
  count: number;
  spin: ReturnType<typeof useMotionValue<number>>;
  radius: number;
  label: string;
  icon: HubIcon;
  glowColor: string;
}) {
  const theta = (index / count) * Math.PI * 2;
  const x = useTransform(spin, (a) => Math.cos(a + theta) * radius);
  const y = useTransform(spin, (a) => Math.sin(a + theta) * radius);

  return (
    <motion.div style={{ x, y }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      <div className="relative flex items-center gap-2 px-4 py-2 rounded-full glass-strong border border-white/25 text-white/90 text-xs font-medium whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md">
        <Icon className="w-3.5 h-3.5 text-white/80" />
        {label}
        <span className={`absolute -right-1 -top-1 w-2 h-2 rounded-full ${glowColor} animate-pulse`} />
      </div>
    </motion.div>
  );
}

function OrbitWire({
  index,
  count,
  spin,
  radius,
  wireGradient,
}: {
  index: number;
  count: number;
  spin: ReturnType<typeof useMotionValue<number>>;
  radius: number;
  wireGradient: string;
}) {
  const theta = (index / count) * Math.PI * 2;
  const rotate = useTransform(spin, (a) => `${((a + theta) * 180) / Math.PI}deg`);

  return (
    <motion.div style={{ rotate }} className="absolute left-1/2 top-1/2 h-[2px] -mt-px origin-left">
      <div className="w-full h-full rounded-full" style={{ width: radius, background: wireGradient }} />
    </motion.div>
  );
}