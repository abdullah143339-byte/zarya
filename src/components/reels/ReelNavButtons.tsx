"use client";

import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";

interface ReelNavButtonsProps {
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
  busy: boolean;
}

const NAV_BUTTON_CLASS =
  "w-11 h-11 rounded-full glass-strong border border-white/15 backdrop-blur-md flex items-center justify-center text-white/90 shadow-lg shadow-black/30 hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none";

export default function ReelNavButtons({ onUp, onDown, canUp, canDown, busy }: ReelNavButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="absolute top-16 right-2.5 md:top-1/2 md:-translate-y-1/2 z-30 flex flex-col items-center gap-2.5"
    >
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onUp}
        disabled={!canUp}
        aria-label="Previous reel"
        title="Previous reel (↑)"
        className={NAV_BUTTON_CLASS}
      >
        <ChevronUp className="w-6 h-6" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onDown}
        disabled={!canDown}
        aria-label={busy ? "Loading next reel" : "Next reel"}
        title="Next reel (↓)"
        className={NAV_BUTTON_CLASS}
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronDown className="w-6 h-6" />}
      </motion.button>
    </motion.div>
  );
}