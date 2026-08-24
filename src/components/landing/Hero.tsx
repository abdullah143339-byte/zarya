"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import Button from "@/components/ui/Button";
import BlurText from "@/components/ui/BlurText";
import Atmosphere from "@/components/landing/Atmosphere";
import { EASE } from "@/components/landing/motion";
import {
  ArrowRight,
  Brain,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [parallaxOn, setParallaxOn] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 40, damping: 20, mass: 0.6 });

  const glow1X = useTransform(sx, (v) => v * 26);
  const glow1Y = useTransform(sy, (v) => v * 18);
  const glow2X = useTransform(sx, (v) => v * -20);
  const glow2Y = useTransform(sy, (v) => v * -14);
  const contentX = useTransform(sx, (v) => v * -6);
  const contentY = useTransform(sy, (v) => v * -4);

  useEffect(() => {
    if (reduced) return;
    setParallaxOn(window.matchMedia("(pointer: fine)").matches);
  }, [reduced]);

  const handlePointerMove = (e: React.MouseEvent) => {
    if (!parallaxOn || !sectionRef.current) return;
    const r = sectionRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section
      ref={sectionRef}
      onPointerMove={handlePointerMove}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
    >
      <Atmosphere variant="hero" />

      <motion.div
        style={parallaxOn ? { x: glow1X, y: glow1Y } : undefined}
        className="absolute top-20 left-10 w-72 h-72 bg-primary/15 rounded-full blur-[130px]"
      />
      <motion.div
        style={parallaxOn ? { x: glow2X, y: glow2Y } : undefined}
        className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-[140px]"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div style={parallaxOn ? { x: contentX, y: contentY } : undefined} className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">
                ZARYA · Think Beyond Social
              </span>
            </div>
          </motion.div>

          <BlurText
            text="Think Beyond Social"
            className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6"
            highlightWords={["Beyond", "Social"]}
            highlightClassName="text-gradient"
          />

          <motion.p
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            ZARYA brings social networking, AI, communication, learning,
            marketplace, and community together in one platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileTap={reduced ? undefined : { scale: 0.97 }}>
              <Link href="/signup">
                <Button size="lg" className="btn-premium">
                  Start Your Journey
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

        <motion.div
          initial={{ opacity: 0, y: 36, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.7, ease: EASE }}
          className="mt-20 relative"
        >
          <div className="glass rounded-3xl p-1 max-w-5xl mx-auto shadow-elevated">
            <div className="bg-gradient-to-br from-surface to-background rounded-[22px] p-6 sm:p-10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Brain className="w-5 h-5" />,
                    title: "AI Router",
                    desc: "AI for chat, coding, images, translation, and deep search",
                    color: "from-purple-500 to-blue-500",
                  },
                  {
                    icon: <Sparkles className="w-5 h-5" />,
                    title: "AI Assistant",
                    desc: "Chat with ZARYA AI directly inside the app",
                    color: "from-amber-500 to-orange-500",
                  },
                  {
                    icon: <Shield className="w-5 h-5" />,
                    title: "Secure by Default",
                    desc: "JWT auth, Google OAuth, and two-factor authentication",
                    color: "from-green-500 to-emerald-500",
                  },
                ].map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.7, delay: 0.9 + i * 0.12, ease: EASE }}
                    className="glass rounded-2xl p-5 hover-glow cursor-default"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-3`}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-muted-foreground/60" aria-hidden="true">
        <span className="text-[10px] uppercase tracking-[0.25em]">Scroll</span>
        <span className="relative block w-px h-10 overflow-hidden bg-border">
          <span className="scroll-cue-dot absolute top-0 left-0 w-px h-3 bg-foreground/70" />
        </span>
      </div>
    </section>
  );
}
