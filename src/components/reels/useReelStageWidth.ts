"use client";

import { useEffect, useState, type RefObject } from "react";

export interface ReelStageSize {
  width: number;
  height: number;
}

export function useReelStageWidth(containerRef: RefObject<HTMLElement | null>): ReelStageSize {
  const [size, setSize] = useState<ReelStageSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const h = el.clientHeight;
      const w = el.clientWidth;
      if (h <= 0 || w <= 0) return;
      const padY = Math.max(16, Math.round(h * 0.14));
      const padX = Math.max(16, Math.round(w * 0.05));
      const availH = Math.max(0, h - padY);
      const availW = Math.max(0, w - padX);
      const ratio = 0.62;
      const stageW = Math.round(Math.min(availW, availH * ratio));
      const stageH = Math.round(Math.min(availH, stageW / ratio));
      const next = { width: stageW, height: stageH };
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [containerRef]);

  return size;
}