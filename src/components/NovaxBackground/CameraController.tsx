"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function CameraController({ reduced }: { reduced: boolean }) {
  const target = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  useFrame(({ camera, clock }, delta) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-delta * 1.6);
    smooth.current.x += (target.current.x - smooth.current.x) * k;
    smooth.current.y += (target.current.y - smooth.current.y) * k;

    camera.position.x = Math.sin(t * 0.028) * 1.1 + smooth.current.x * 2.4;
    camera.position.y = 7 + Math.sin(t * 0.02) * 0.7 + smooth.current.y * 1.5;
    camera.position.z = 24 + Math.sin(t * 0.016) * 1.4;
    (camera as THREE.PerspectiveCamera).lookAt(0, 0, 0);
  });

  return null;
}
