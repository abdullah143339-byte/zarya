"use client";

import { cn } from "@/lib/utils";

export type AtmosphereVariant = "hero" | "stats" | "features" | "cta" | "intelligence" | "expansion";

const BASE: Record<AtmosphereVariant, string> = {
  hero: "bg-[#050507]/55",
  stats: "bg-[#060609]/40",
  features: "bg-[#050507]/55",
  cta: "bg-[#040406]/68",
  intelligence: "bg-[#05060a]/60",
  expansion: "bg-[#040407]/58",
};

const BLOBS: Record<AtmosphereVariant, [string, string, string]> = {
  hero: [
    "radial-gradient(42% 40% at 28% 32%, rgba(148,163,184,0.11), transparent 70%)",
    "radial-gradient(46% 42% at 74% 64%, rgba(167,139,250,0.09), transparent 70%)",
    "radial-gradient(34% 30% at 56% 18%, rgba(203,213,235,0.07), transparent 72%)",
  ],
  stats: [
    "radial-gradient(40% 44% at 20% 60%, rgba(148,163,184,0.08), transparent 70%)",
    "radial-gradient(44% 40% at 80% 36%, rgba(167,139,250,0.07), transparent 70%)",
    "radial-gradient(32% 32% at 50% 80%, rgba(203,213,235,0.05), transparent 72%)",
  ],
  features: [
    "radial-gradient(44% 40% at 24% 24%, rgba(148,163,184,0.08), transparent 70%)",
    "radial-gradient(46% 42% at 78% 58%, rgba(167,139,250,0.07), transparent 70%)",
    "radial-gradient(34% 34% at 52% 84%, rgba(203,213,235,0.05), transparent 72%)",
  ],
  cta: [
    "radial-gradient(48% 46% at 50% 96%, rgba(232,214,178,0.10), transparent 72%)",
    "radial-gradient(40% 38% at 26% 40%, rgba(148,163,184,0.08), transparent 70%)",
    "radial-gradient(42% 40% at 76% 34%, rgba(167,139,250,0.08), transparent 72%)",
  ],
  intelligence: [
    "radial-gradient(44% 44% at 72% 46%, rgba(167,139,250,0.10), transparent 70%)",
    "radial-gradient(38% 36% at 22% 30%, rgba(148,163,184,0.08), transparent 70%)",
    "radial-gradient(34% 34% at 48% 82%, rgba(203,213,235,0.05), transparent 72%)",
  ],
  expansion: [
    "radial-gradient(52% 46% at 50% 30%, rgba(148,163,184,0.09), transparent 72%)",
    "radial-gradient(42% 38% at 18% 66%, rgba(167,139,250,0.07), transparent 70%)",
    "radial-gradient(40% 38% at 84% 62%, rgba(203,213,235,0.06), transparent 72%)",
  ],
};

export default function Atmosphere({ variant }: { variant: AtmosphereVariant }) {
  const [a, b, c] = BLOBS[variant];
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", BASE[variant])} aria-hidden="true">
      <div className="atmo-layer atmo-blob-a" style={{ background: a }} />
      <div className="atmo-layer atmo-blob-b" style={{ background: b }} />
      <div className="atmo-layer atmo-blob-c hidden md:block" style={{ background: c }} />
      <div className="absolute inset-0 atmo-grain opacity-60" />
      <div className="absolute inset-0 atmo-vignette" />
    </div>
  );
}
