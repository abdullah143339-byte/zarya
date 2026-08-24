"use client";

import { motion, useReducedMotion } from "framer-motion";
import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { EASE } from "@/components/landing/motion";

interface BlurTextProps {
  text: string;
  className?: string;
  highlightWords?: string[];
  highlightClassName?: string;
}

export default function BlurText({ text, className, highlightWords = [], highlightClassName = "" }: BlurTextProps) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  return (
    <h1 className={twMerge("flex flex-wrap justify-center gap-y-[0.1em]", className)}>
      {words.map((word, i) => {
        const isHighlight = highlightWords.includes(word);
        return (
          <span key={i} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] mr-[0.28em] last:mr-0">
            <motion.span
              initial={reduced ? undefined : { y: "112%", opacity: 0, filter: "blur(10px)" }}
              whileInView={reduced ? undefined : { y: "0%", opacity: 1, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, delay: i * 0.09, ease: EASE }}
              className={clsx("inline-block", isHighlight ? highlightClassName : "")}
            >
              {word}
            </motion.span>
          </span>
        );
      })}
    </h1>
  );
}
