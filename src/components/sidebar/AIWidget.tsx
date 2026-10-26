"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import Button from "@/components/ui/Button";

const TIPS = [
  "Ask NOVAX to draft, summarize, or translate any text — it's all in one place.",
  "Use the AI Router to pick the best model for every task automatically.",
  "Turn long articles into key takeaways with a single AI conversation.",
  "You can attach AI-generated images directly to your posts.",
];

export default function AIWidget() {
  const router = useRouter();
  const [model, setModel] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRouterInfo()
      .then((res) => setModel(res?.data?.primaryModel || res?.data?.model || null))
      .catch(() => setModel(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="glass rounded-2xl p-4 overflow-hidden relative" aria-label="AI widget">
      <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> NOVAX
          </h2>
          {loading ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /> : null}
        </div>

        <div className="min-h-[72px]">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-foreground leading-relaxed"
          >
            {TIPS[tipIndex]}
          </motion.p>
        </div>

        {model && (
          <p className="text-[11px] text-muted-foreground mt-2">Powered by <span className="text-accent font-medium">{model}</span></p>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push("/dashboard/learning/ai-search")}
          className="mt-3 w-full"
        >
          Ask NOVAX <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </section>
  );
}
