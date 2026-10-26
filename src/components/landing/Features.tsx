"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import BlurText from "@/components/ui/BlurText";
import Atmosphere from "@/components/landing/Atmosphere";
import PremiumBackground from "@/components/landing/PremiumBackground";
import OrbitHub, { type OrbitHubItem } from "@/components/landing/OrbitHub";
import {
  Brain,
  MessageSquare,
  BookOpen,
  ShoppingCart,
  Newspaper,
  Search,
  Shield,
  Sparkles,
  FolderGit2,
  Clapperboard,
  ChevronLeft,
  ChevronRight,
  Zap,
  Wifi,
  Activity,
  Star,
  KeyRound,
  Fingerprint,
  ShieldCheck,
  Lock,
  TimerReset,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

// =========================================
// 1. CONFIGURATION & DATA TYPES
// =========================================

export interface FeatureMetric {
  label: string;
  value: number;
  icon: LucideIcon;
}

export interface FeatureData {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  summary: string;
  colors: { gradient: string; glow: string; ring: string };
  metrics: FeatureMetric[];
}

const metricIcons: LucideIcon[] = [Zap, Wifi, Activity];

const FEATURES: FeatureData[] = [
  {
    id: "ai-router",
    label: "AI Router",
    icon: Brain,
    title: "Every AI model. One gateway.",
    description:
      "Route AI requests for chat, coding, image generation, translation, and deep search — NOVAX picks the right model automatically, so you never juggle a single tab.",
    summary: "Smart routing across chat, code, images, translation, and deep search.",
    colors: { gradient: "from-violet-500 to-purple-600", glow: "bg-violet-500", ring: "border-violet-500/50" },
    metrics: [
      { label: "Latency", value: 94, icon: metricIcons[0] },
      { label: "Model Coverage", value: 98, icon: metricIcons[1] },
      { label: "Routing Accuracy", value: 96, icon: metricIcons[2] },
    ],
  },
  {
    id: "ai-assistant",
    label: "AI Assistant",
    icon: Sparkles,
    title: "Your always-on assistant.",
    description:
      "Chat with the NOVAX AI assistant directly inside the platform. Ask questions, draft messages, summarize posts, and get smart suggestions on every page.",
    summary: "Inline chat, drafts, summaries, and suggestions across the platform.",
    colors: { gradient: "from-amber-500 to-orange-500", glow: "bg-amber-500", ring: "border-amber-500/50" },
    metrics: [
      { label: "Uptime", value: 99, icon: metricIcons[0] },
      { label: "Response Speed", value: 92, icon: metricIcons[1] },
      { label: "Context Recall", value: 95, icon: metricIcons[2] },
    ],
  },
  {
    id: "messaging",
    label: "Messaging",
    icon: MessageSquare,
    title: "Chat that feels instant.",
    description:
      "Real-time chats with voice notes, file sharing, and voice and video calls. Talk the way you want — text, audio, or face to face.",
    summary: "Real-time text, voice notes, files, and voice/video calls.",
    colors: { gradient: "from-pink-500 to-rose-500", glow: "bg-pink-500", ring: "border-pink-500/50" },
    metrics: [
      { label: "Real-time", value: 99, icon: metricIcons[0] },
      { label: "File Transfer", value: 94, icon: metricIcons[1] },
      { label: "Call Quality", value: 91, icon: metricIcons[2] },
    ],
  },
  {
    id: "learning",
    label: "Learning Platform",
    icon: BookOpen,
    title: "Your study hub, finally organized.",
    description:
      "Lectures, notes, subjects, tasks, bookmarks, and AI-powered search for your studies. Structure your learning so nothing slips through the cracks.",
    summary: "Lectures, notes, tasks, bookmarks, and AI-powered study search.",
    colors: { gradient: "from-teal-500 to-cyan-500", glow: "bg-teal-500", ring: "border-teal-500/50" },
    metrics: [
      { label: "Content Library", value: 90, icon: metricIcons[0] },
      { label: "AI Study Search", value: 93, icon: metricIcons[1] },
      { label: "Organization", value: 85, icon: metricIcons[2] },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: ShoppingCart,
    title: "Buy, sell, and trade digital value.",
    description:
      "Browse and sell courses, templates, code, AI models, digital products, and services — a marketplace built around the NOVAX community.",
    summary: "Courses, templates, code, AI models, digital products, and services.",
    colors: { gradient: "from-indigo-500 to-blue-500", glow: "bg-indigo-500", ring: "border-indigo-500/50" },
    metrics: [
      { label: "Catalog Depth", value: 87, icon: metricIcons[0] },
      { label: "Seller Tools", value: 89, icon: metricIcons[1] },
      { label: "Secure Payments", value: 96, icon: metricIcons[2] },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderGit2,
    title: "Show your work, don't just sell it.",
    description:
      "Build a portfolio of projects with rich descriptions, live links, and direct contact — get discovered for the things you actually build.",
    summary: "Portfolio showcase with descriptions, links, and direct contact.",
    colors: { gradient: "from-fuchsia-500 to-pink-500", glow: "bg-fuchsia-500", ring: "border-fuchsia-500/50" },
    metrics: [
      { label: "Portfolio Reach", value: 92, icon: metricIcons[0] },
      { label: "Discovery", value: 86, icon: metricIcons[1] },
      { label: "Engagement", value: 88, icon: metricIcons[2] },
    ],
  },
  {
    id: "global-search",
    label: "Global Search",
    icon: Search,
    title: "Everything, one search away.",
    description:
      "Search people, projects, communities, and content across NOVAX — a single field that finds everything across the whole platform.",
    summary: "One search across people, projects, communities, and content.",
    colors: { gradient: "from-cyan-500 to-blue-500", glow: "bg-cyan-500", ring: "border-cyan-500/50" },
    metrics: [
      { label: "Platform Scope", value: 98, icon: metricIcons[0] },
      { label: "Search Speed", value: 91, icon: metricIcons[1] },
      { label: "Relevance", value: 90, icon: metricIcons[2] },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    title: "Your account, locked down.",
    description:
      "JWT authentication, Google OAuth, two-factor authentication, and rate limiting keep your identity and data protected at every layer.",
    summary: "JWT auth, Google OAuth, 2FA, and smart rate limiting.",
    colors: { gradient: "from-red-500 to-orange-500", glow: "bg-red-500", ring: "border-red-500/50" },
    metrics: [
      { label: "Authentication", value: 100, icon: metricIcons[0] },
      { label: "2FA Coverage", value: 99, icon: metricIcons[1] },
      { label: "Rate Limiting", value: 97, icon: metricIcons[2] },
    ],
  },
  {
    id: "reels",
    label: "Reels & Stories",
    icon: Clapperboard,
    title: "Watch, create, and share.",
    description:
      "Short-form reels keep you entertained while temporary stories let you share your day — without the permanence.",
    summary: "Short-form reels and temporary stories for the community.",
    colors: { gradient: "from-emerald-500 to-green-500", glow: "bg-emerald-500", ring: "border-emerald-500/50" },
    metrics: [
      { label: "Playback", value: 95, icon: metricIcons[0] },
      { label: "Creators", value: 92, icon: metricIcons[1] },
      { label: "Discovery", value: 90, icon: metricIcons[2] },
    ],
  },
  {
    id: "feed",
    label: "Feed",
    icon: Newspaper,
    title: "Never miss a moment.",
    description:
      "A living timeline of posts, updates, and milestones from the people and communities you care about — stay in the loop on the NOVAX community.",
    summary: "A timeline of posts and updates from the NOVAX community.",
    colors: { gradient: "from-violet-500 to-indigo-500", glow: "bg-violet-500", ring: "border-violet-500/50" },
    metrics: [
      { label: "Post Stream", value: 93, icon: metricIcons[0] },
      { label: "Real-time Updates", value: 90, icon: metricIcons[1] },
      { label: "Reach", value: 88, icon: metricIcons[2] },
    ],
  },
];

// =========================================
// 2. ANIMATION VARIANTS
// =========================================

const ANIMATIONS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
  item: {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring" as const, stiffness: 100, damping: 20 },
    },
    exit: { opacity: 0, y: -10, filter: "blur(5px)" },
  },
  visual: (dir: 1 | -1): Variants => ({
    initial: {
      opacity: 0,
      scale: 1.2,
      filter: "blur(12px)",
      rotateY: dir === 1 ? -30 : 30,
      x: dir === 1 ? -60 : 60,
    },
    animate: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      rotateY: 0,
      x: 0,
      transition: { type: "spring" as const, stiffness: 260, damping: 22 },
    },
    exit: { opacity: 0, scale: 0.7, filter: "blur(16px)", transition: { duration: 0.25 } },
  }),
};

// =========================================
// 3. SUB-COMPONENTS
// =========================================

const BackgroundGlow = ({ data }: { data: FeatureData }) => (
  <div className="absolute inset-x-0 top-8 md:top-0 pointer-events-none" aria-hidden="true">
    <motion.div
      animate={{ opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className={`mx-auto h-72 w-72 md:h-96 md:w-96 rounded-full blur-[100px] opacity-50 bg-gradient-to-br ${data.colors.gradient}`}
    />
  </div>
);

const FeatureVisual = ({ data, dir }: { data: FeatureData; dir: 1 | -1 }) => {
  const Icon = data.icon;
  return (
    <motion.div
      key={`visual-${data.id}-${dir}`}
      variants={ANIMATIONS.visual(dir)}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative shrink-0"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className={`absolute inset-[-14%] rounded-full border border-dashed border-white/10 ${data.colors.ring}`}
      />
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-[-6%] rounded-full bg-gradient-to-br ${data.colors.gradient} blur-2xl opacity-40`}
      />

      <div className="relative h-56 w-56 md:h-80 md:w-80 rounded-full border border-white/10 bg-surface/40 backdrop-blur-md shadow-[0_24px_70px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
        <motion.div
          animate={{ y: [-8, 8, -8] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="relative z-10 flex items-center justify-center"
        >
          <div className={`w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br ${data.colors.gradient} flex items-center justify-center text-white shadow-2xl`}>
            <Icon className="w-12 h-12 md:w-16 md:h-16" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Star className="w-6 h-6 text-white/20 animate-pulse" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// =========================================
// SECURITY HUB — premium orbiting hub visual
// =========================================

const SECURITY_NODES: OrbitHubItem[] = [
  { label: "JWT Auth", icon: KeyRound },
  { label: "OAuth2", icon: Fingerprint },
  { label: "2FA", icon: ShieldCheck },
  { label: "Encryption", icon: Lock },
  { label: "Rate Limit", icon: TimerReset },
  { label: "Audit Trail", icon: ScrollText },
];

const FeatureDetails = ({ data, index, total }: { data: FeatureData; index: number; total: number }) => {
  const isEven = index % 2 === 0;
  const alignClass = isEven ? "items-start text-left" : "items-end text-right";
  const flexDirClass = isEven ? "flex-row" : "flex-row-reverse";
  const barColorClass = isEven ? "left-0" : "right-0";

  return (
    <motion.div
      variants={ANIMATIONS.container}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`flex flex-col ${alignClass}`}
    >
      <motion.h2 variants={ANIMATIONS.item} className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
        NOVAX Feature {index} / {total}
      </motion.h2>
      <motion.h1
        variants={ANIMATIONS.item}
        className={`text-3xl md:text-5xl font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-b from-foreground to-muted-foreground ${isEven ? "mr-auto" : "ml-auto"}`}
      >
        {data.title}
      </motion.h1>
      <motion.p
        variants={ANIMATIONS.item}
        className={`text-muted-foreground mb-8 max-w-md leading-relaxed ${isEven ? "mr-auto" : "ml-auto"}`}
      >
        {data.description}
      </motion.p>

      <motion.div
        variants={ANIMATIONS.item}
        className="w-full max-w-md space-y-6 bg-surface/50 p-6 rounded-2xl border border-border backdrop-blur-md"
      >
        {data.metrics.map((metric, idx) => (
          <div key={metric.label}>
            <div className={`flex items-center justify-between mb-3 text-sm ${flexDirClass}`}>
              <div className="flex items-center gap-2 text-foreground/90">
                <metric.icon size={16} /> <span>{metric.label}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{metric.value}%</span>
            </div>
            <div className="relative h-2 w-full rounded-full overflow-hidden">
              <div className="absolute inset-0 rounded-full bg-muted" />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 1, delay: 0.4 + idx * 0.15 }}
                className={`absolute top-0 bottom-0 ${barColorClass} ${data.colors.glow} rounded-full opacity-80`}
              />
            </div>
          </div>
        ))}

        <div className={`pt-4 flex ${isEven ? "justify-start" : "justify-end"}`}>
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Sparkles size={14} /> {data.label}
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>

      <motion.div variants={ANIMATIONS.item} className={`mt-6 flex items-center gap-3 text-muted-foreground ${flexDirClass}`}>
        <Star size={16} className="text-accent" />
        <span className="text-sm font-medium">{data.summary}</span>
      </motion.div>
    </motion.div>
  );
};

const FeatureSwitcher = ({
  activeId,
  onSelect,
  onPrev,
  onNext,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) => {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onPrev}
        aria-label="Previous feature"
        className="w-10 h-10 rounded-full glass-strong flex items-center justify-center text-foreground hover:bg-surface transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-1 p-1.5 rounded-full bg-surface/60 backdrop-blur-2xl border border-border shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        {FEATURES.map((f) => (
          <motion.button
            key={f.id}
            onClick={() => onSelect(f.id)}
            whileTap={{ scale: 0.96 }}
            aria-label={`Show ${f.label}`}
            className="relative px-3 sm:px-4 py-2.5 rounded-full text-xs font-medium focus:outline-none"
          >
            {activeId === f.id && (
              <motion.div
                layoutId="feature-switcher-island"
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${f.colors.gradient} shadow-inner`}
                transition={{ type: "spring" as const, stiffness: 220, damping: 22 }}
              />
            )}
            <span
              className={`relative z-10 transition-colors duration-300 ${activeId === f.id ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <f.icon className="w-3.5 h-3.5 inline-block -mt-0.5 mr-1.5" />
              <span className="hidden md:inline">{f.label}</span>
            </span>
          </motion.button>
        ))}
      </div>

      <button
        onClick={onNext}
        aria-label="Next feature"
        className="w-10 h-10 rounded-full glass-strong flex items-center justify-center text-foreground hover:bg-surface transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

// =========================================
// 4. MAIN COMPONENT
// =========================================

export default function Features() {
  const total = FEATURES.length;
  const [activeId, setActiveId] = useState(FEATURES[0].id);
  const [dir, setDir] = useState<1 | -1>(1);
  const active = FEATURES.find((f) => f.id === activeId)!;
  const activeIndex = FEATURES.findIndex((f) => f.id === activeId);

  const goTo = useCallback((id: string) => {
    setActiveId((prev) => {
      if (prev === id) return prev;
      const from = FEATURES.findIndex((f) => f.id === prev);
      const to = FEATURES.findIndex((f) => f.id === id);
      setDir(to > from ? 1 : -1);
      return id;
    });
  }, []);

  const goNext = useCallback(() => goTo(FEATURES[(activeIndex + 1) % total].id), [goTo, activeIndex, total]);
  const goPrev = useCallback(() => goTo(FEATURES[(activeIndex - 1 + total) % total].id), [goTo, activeIndex, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  return (
    <section id="features" className="py-24 relative overflow-hidden bg-[#030305]">
      <PremiumBackground variant="features" />
      <div className="absolute left-0 top-0 w-full h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      <div className="absolute left-0 bottom-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      <Atmosphere variant="features" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Core Features</span>
          </div>
          <BlurText
            as="h2"
            text="Everything You Need, Nothing You Don't"
            className="text-4xl sm:text-5xl font-bold mb-4"
            highlightWords={["Nothing", "You", "Don't"]}
            highlightClassName="text-gradient"
          />
          <motion.p
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg text-muted-foreground max-w-xl mx-auto"
          >
            A complete platform combining social networking, AI, communication, learning, marketplace, and community.
          </motion.p>
        </motion.div>

        <div className="relative flex flex-col items-center justify-center gap-12 md:gap-16">
          <BackgroundGlow data={active} />

          <div className="relative flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 lg:gap-32 w-full">
            <AnimatePresence mode="popLayout">
              {active.id === "security" ? (
                <motion.div
                  key={`security-${dir}`}
                  variants={ANIMATIONS.visual(dir)}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex items-center justify-center scale-[0.72] sm:scale-90 md:scale-100 origin-center"
                >
                  <OrbitHub
                    items={SECURITY_NODES}
                    centerIcon={Shield}
                    centerLabel="Secure Core"
                    centerTag="Protected by design"
                    gradient="from-red-500 to-orange-500"
                    glowColor="bg-red-500"
                    ringColor="border-red-400/40"
                    wireGradient="linear-gradient(90deg, rgba(239,68,68,0.85), rgba(249,115,22,0.35), rgba(255,255,255,0.06))"
                  />
                </motion.div>
              ) : (
                <FeatureVisual key={`${activeId}-${dir}`} data={active} dir={dir} />
              )}
            </AnimatePresence>

            <div className="relative w-full max-w-md">
              <AnimatePresence mode="wait">
                <FeatureDetails key={activeId} data={active} index={activeIndex + 1} total={total} />
              </AnimatePresence>
            </div>
          </div>

          <FeatureSwitcher activeId={activeId} onSelect={goTo} onPrev={goPrev} onNext={goNext} />
        </div>
      </div>
    </section>
  );
}