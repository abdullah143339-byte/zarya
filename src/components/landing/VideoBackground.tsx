"use client";

import { useRef, useEffect, useState } from "react";

interface Props {
  src: string;
  fallback?: string;
  className?: string;
  opacity?: number;
}

export default function VideoBackground({ src, className = "", opacity = 1 }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const play = () => v.play().catch(() => {});
    if (document.hidden) {
      const onVis = () => { if (!document.hidden) play(); };
      document.addEventListener("visibilitychange", onVis);
      return () => document.removeEventListener("visibilitychange", onVis);
    }
    play();
  }, [reduced]);

  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        poster={undefined}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: reduced ? 0.7 : opacity,
        }}
      />
    </div>
  );
}
