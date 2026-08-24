"use client";

import { motion } from "framer-motion";
import Atmosphere from "@/components/landing/Atmosphere";
import { EASE } from "@/components/landing/motion";

const stats = [
  { value: "5", label: "AI Tasks — Chat, Code, Images, Translate & Deep Search" },
  { value: "12", label: "Core Modules" },
  { value: "2FA", label: "JWT · Google OAuth · Rate Limiting" },
  { value: "24/7", label: "AI Assistant" },
];

export default function Stats() {
  return (
    <section className="py-16 relative overflow-hidden">
      <Atmosphere variant="stats" />
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: EASE }}
        className="absolute top-0 inset-x-0 h-px bg-border origin-left"
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-bold text-gradient mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: EASE }}
        className="absolute bottom-0 inset-x-0 h-px bg-border origin-right"
      />
    </section>
  );
}
