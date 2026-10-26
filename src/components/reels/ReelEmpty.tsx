"use client";

import { motion } from "framer-motion";
import { Clapperboard, Upload } from "lucide-react";

interface ReelEmptyProps {
  onUpload: () => void;
}

export default function ReelEmpty({ onUpload }: ReelEmptyProps) {
  return (
    <div className="relative h-full w-full bg-[#0B0D12] flex items-center justify-center overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative text-center px-6"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="w-20 h-20 mx-auto mb-6 rounded-3xl glass-strong flex items-center justify-center"
        >
          <Clapperboard className="w-10 h-10 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground">No Reels Yet</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Be the first to share a short video with the NOVAX community. Capture a moment, upload and let the world watch.
        </p>
        <button
          onClick={onUpload}
          className="mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-2xl bg-gradient-primary text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
        >
          <Upload className="w-4 h-4" /> Upload Reel
        </button>
      </motion.div>
    </div>
  );
}
