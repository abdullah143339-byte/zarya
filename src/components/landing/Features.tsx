"use client";

import { motion, type Variants } from "framer-motion";
import BlurText from "@/components/ui/BlurText";
import Atmosphere from "@/components/landing/Atmosphere";
import CinematicCard from "@/components/landing/CinematicCard";
import { childReveal, staggerChildren } from "@/components/landing/motion";
import {
  Users,
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
  Trophy,
} from "lucide-react";

const features = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "AI Router",
    description: "Route AI requests for chat, coding, image generation, translation, and deep search.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI Assistant",
    description: "Chat with the ZARYA AI assistant directly inside the platform, anytime.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Communities",
    description: "Join communities around AI, programming, security, design, gaming, and business.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: <Trophy className="w-6 h-6" />,
    title: "Reputation System",
    description: "Reputation scores for skills, helpfulness, projects, community, and trust — not just likes and followers.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Messaging",
    description: "Real-time chats with voice notes, file sharing, and voice and video calls.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "Learning Platform",
    description: "Lectures, notes, subjects, tasks, bookmarks, and AI-powered search for your studies.",
    color: "from-teal-500 to-cyan-500",
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: "Marketplace",
    description: "Browse and sell courses, templates, code, AI models, digital products, and services.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: <FolderGit2 className="w-6 h-6" />,
    title: "Projects",
    description: "Showcase your projects with descriptions, links, and ways for people to reach you.",
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: "Global Search",
    description: "Search people, projects, communities, and content across ZARYA.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Security",
    description: "JWT authentication, Google OAuth, two-factor authentication, and rate limiting.",
    color: "from-red-500 to-orange-500",
  },
  {
    icon: <Clapperboard className="w-6 h-6" />,
    title: "Reels & Stories",
    description: "Watch short-form reels and share temporary stories with the community.",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: <Newspaper className="w-6 h-6" />,
    title: "Feed",
    description: "A timeline of posts and updates from the ZARYA community.",
    color: "from-violet-500 to-indigo-500",
  },
];

const containerVariants: Variants = staggerChildren(0.07);

export default function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <Atmosphere variant="features" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Core Features</span>
          </div>
          <BlurText
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
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            A complete platform combining social networking, AI, communication, learning, marketplace, and community.
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={childReveal} className="group">
              <CinematicCard className="relative h-full rounded-2xl border border-border bg-surface/40 backdrop-blur-md p-6 transition-all duration-500 ease-out group-hover:border-primary/20 group-hover:shadow-[0_8px_40px_rgba(0,0,0,0.35)] group-hover:-translate-y-0.5">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-4 transition-transform duration-500 ease-out group-hover:scale-[1.06]`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CinematicCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
