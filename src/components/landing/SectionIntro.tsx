"use client";

import React from "react";
import { motion } from "framer-motion";
import BlurText from "@/components/ui/BlurText";
import { EASE } from "@/components/landing/motion";
import { cn } from "@/lib/utils";

interface SectionIntroProps {
  index: string;
  label: string;
  title: string;
  highlightWords?: string[];
  highlightClassName?: string;
  sub?: string;
  align?: "center" | "left";
  className?: string;
}

export default function SectionIntro({
  index,
  label,
  title,
  highlightWords = [],
  highlightClassName = "text-gradient",
  sub,
  align = "center",
  className,
}: SectionIntroProps) {
  const centered = align === "center";
  return (
    <div className={cn(centered ? "text-center mx-auto" : "text-left", "max-w-3xl", className)}>
      <motion.div
        initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: EASE }}
        className={cn(
          "flex items-center gap-3 mb-6",
          centered && "justify-center"
        )}
      >
        <span className="h-px w-8 bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden="true" />
        <span className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/80 font-medium">
          {index} · {label}
        </span>
        <span className="h-px w-8 bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden="true" />
      </motion.div>

      <BlurText
        text={title}
        className={cn(
          "font-bold tracking-tight mb-5",
          centered ? "justify-center" : "justify-start text-left"
        )}
        highlightWords={highlightWords}
        highlightClassName={highlightClassName}
      />

      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          className="text-base sm:text-lg text-muted-foreground leading-relaxed"
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}
