"use client";

import { motion } from "framer-motion";
import Atmosphere from "@/components/landing/Atmosphere";
import PremiumBackground from "@/components/landing/PremiumBackground";
import OrbitHub from "@/components/landing/OrbitHub";
import Logo from "@/components/ui/Logo";
import { EASE } from "@/components/landing/motion";
import {
  Brain,
  Layers,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

const hubItems = [
  { label: "5 AI Tasks", icon: Brain },
  { label: "12 Core Modules", icon: Layers },
  { label: "2FA Security", icon: ShieldCheck },
  { label: "Google Auth", icon: GoogleGlyph },
  { label: "24/7 Assistant", icon: Clock },
];

export default function Stats() {
  return (
    <section className="py-24 relative overflow-hidden">
      <Atmosphere variant="stats" />
      <PremiumBackground variant="stats" />

      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: EASE }}
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent origin-left"
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-4 border border-violet-500/20 bg-violet-500/5 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-violet-300/80">Platform Overview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
            One Core, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400">Every Module</span>
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-base">
            Six core modules radiating from a single platform core — AI, learning, marketplace, projects, reels, and bulletproof security.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: EASE }}
          className="relative flex items-center justify-center py-4"
        >
          <div className="scale-[0.72] sm:scale-90 md:scale-100 origin-center">
            <OrbitHub
              items={hubItems}
              centerIcon={Sparkles}
              centerNode={<Logo size={74} rounded="rounded-full" className="bg-white shadow-[0_0_30px_rgba(255,255,255,0.35)]" />}
              centerLabel="NOVAX"
              centerTag="Platform Core"
              gradient="from-violet-500 to-cyan-500"
              glowColor="bg-violet-400"
              ringColor="border-violet-400/40"
              wireGradient="linear-gradient(90deg, rgba(167,139,250,0.85), rgba(34,211,238,0.35), rgba(255,255,255,0.06))"
              size={420}
              radius={142}
            />
          </div>
        </motion.div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {[
            { value: "5", label: "AI Tasks" },
            { value: "12", label: "Core Modules" },
            { value: "2FA", label: "Security" },
            { value: "1-Click", label: "Google Auth" },
            { value: "24/7", label: "AI Assistant" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-6 overflow-hidden transition-all duration-500 hover:border-violet-500/30 hover:bg-white/[0.06]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-violet-500/5 to-cyan-500/5" />
              <div className="relative text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-1">{stat.value}</div>
              <div className="relative text-sm text-white/50">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: EASE }}
        className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent origin-right"
      />
    </section>
  );
}