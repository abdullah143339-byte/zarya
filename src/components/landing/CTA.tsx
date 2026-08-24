"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import Button from "@/components/ui/Button";
import BlurText from "@/components/ui/BlurText";
import Atmosphere from "@/components/landing/Atmosphere";
import { EASE } from "@/components/landing/motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const dawnOpacity = useTransform(scrollYProgress, [0, 1], [0.3, 1]);
  const dawnY = useTransform(scrollYProgress, [0, 1], [90, 0]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [0.85, 1.05]);

  return (
    <section ref={ref} className="py-28 relative overflow-hidden">
      <Atmosphere variant="cta" />

      {!reduced && (
        <motion.div
          style={{ opacity: dawnOpacity, y: dawnY }}
          className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          aria-hidden="true"
        >
          <motion.div
            style={{ scale: glowScale }}
            className="w-full h-full rounded-full blur-[120px]"
            initial={false}
          >
            <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#e8d6b2]/40 to-transparent" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(50% 42% at 50% 62%, rgba(232,214,178,0.14), transparent 70%)",
              }}
            />
          </motion.div>
        </motion.div>
      )}

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Join the Future</span>
          </div>

          <BlurText
            text="Ready to Experience The Future?"
            className="text-4xl sm:text-6xl font-bold mb-6"
            highlightWords={["The", "Future?"]}
            highlightClassName="text-gradient"
          />

          <motion.p
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-10"
          >
            Create your account and explore social networking, AI, communication,
            learning, marketplace, and community in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileTap={reduced ? undefined : { scale: 0.97 }}>
              <Link href="/signup">
                <Button size="lg" className="btn-premium">
                  Create Free Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
            <motion.div whileTap={reduced ? undefined : { scale: 0.97 }}>
              <Link href="/dashboard">
                <Button variant="secondary" size="lg">
                  Explore Platform
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
