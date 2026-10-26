"use client";

import { motion } from "framer-motion";
import { Brain, Search, Sparkles } from "lucide-react";
import Atmosphere from "@/components/landing/Atmosphere";
import SectionIntro from "@/components/landing/SectionIntro";
import NetworkCanvas from "@/components/landing/NetworkCanvas";
import { EASE } from "@/components/landing/motion";

const capabilities = [
  {
    icon: Brain,
    title: "AI Router",
    desc: "Directs every request — chat, code, images, translation, deep search — to the right provider.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Always present inside the app. Ask, draft, explore — it answers in context.",
  },
  {
    icon: Search,
    title: "Deep Search",
    desc: "Search that goes beyond keywords and understands what you are looking for.",
  },
];

export default function Intelligence() {
  return (
    <section id="intelligence" className="relative py-28 sm:py-36 overflow-hidden">
      <Atmosphere variant="intelligence" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-10 items-center">
          <div>
            <SectionIntro
              index="03"
              label="Intelligence"
              title="Intelligence beneath the surface."
              highlightWords={["beneath"]}
              sub="NOVAX does not feel like a tool with AI bolted on. Reasoning is woven through every interaction — quiet, fast, and always on."
              align="left"
            />

            <div className="mt-10 space-y-3">
              {capabilities.map((cap, i) => (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.8, delay: 0.15 + i * 0.12, ease: EASE }}
                  className="glass rounded-2xl p-5 flex items-start gap-4 hover-glow cursor-default"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/25 to-slate-500/15 border border-glass-border flex items-center justify-center text-primary">
                    <cap.icon className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-0.5">{cap.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* living intelligence field */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.4, ease: EASE }}
            className="relative h-[380px] sm:h-[460px] lg:h-[540px]"
          >
            <div className="absolute inset-[-12%] rounded-full blur-[90px] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(167,139,250,0.07),transparent_70%)]" aria-hidden="true" />
            <div className="absolute inset-0">
              <NetworkCanvas variant="core" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
