"use client";

import { Canvas } from "@react-three/fiber";
import CameraController from "./CameraController";
import GalaxyParticles from "./GalaxyParticles";
import BackgroundDust from "./BackgroundDust";
import BrightNodes from "./BrightNodes";

const COUNTS = {
  high: { galaxy: 14800, dustFar: 2600, dustNear: 1250, nodes: 105 },
  med:  { galaxy: 8800,  dustFar: 1750, dustNear: 860,  nodes: 68 },
  low:  { galaxy: 4800,  dustFar: 960,  dustNear: 520,  nodes: 42 },
} as const;

export type Tier = "high" | "med" | "low";

interface Props {
  tier: Tier;
  reduced: boolean;
}

export default function Scene({ tier, reduced }: Props) {
  const counts = COUNTS[tier];

  return (
    <Canvas
      dpr={[1, tier === "high" ? 1.8 : tier === "med" ? 1.5 : 1.25]}
      camera={{ fov: 52, position: [0, 7, 24], near: 0.1, far: 240 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <CameraController reduced={reduced} />
      <GalaxyParticles count={counts.galaxy} reduced={reduced} />
      <BackgroundDust counts={{ far: counts.dustFar, near: counts.dustNear }} reduced={reduced} />
      <BrightNodes count={counts.nodes} reduced={reduced} />
    </Canvas>
  );
}
