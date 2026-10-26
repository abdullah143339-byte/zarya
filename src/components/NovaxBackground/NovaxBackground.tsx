"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

type Tier = "high" | "med" | "low";

function computeTier(): Tier {
  const mobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4;
  if (mobile || cores <= 4) return "low";
  if (cores <= 8 && (window.devicePixelRatio || 1) > 1) return "med";
  return "high";
}

export default function NovaxBackground() {
  const [tier, setTier] = useState<Tier>("med");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setTier(computeTier());
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
      <Scene tier={tier} reduced={reduced} />
    </div>
  );
}
