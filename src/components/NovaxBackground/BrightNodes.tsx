"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { generateNodes } from "./galaxy";
import { SPRITE_FRAGMENT } from "./shaders";

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;

  attribute float aRadius;
  attribute float aAngle;
  attribute float aY;
  attribute float aSize;
  attribute float aSeed;
  attribute float aTint;

  varying float vAlpha;
  varying float vTint;

  void main() {
    float speed = 0.14 / (0.38 + aRadius * 0.12);
    float ang   = aAngle + uTime * speed;
    float breath = 1.0 + sin(uTime * 0.055) * 0.03;
    float r     = aRadius * breath;

    vec3 p;
    p.x = cos(ang) * r
        + sin(uTime * (0.10 + fract(aSeed * 7.31)) + aSeed * 17.0) * 0.22;
    p.z = sin(ang) * r
        + cos(uTime * (0.08 + fract(aSeed * 3.17)) + aSeed * 11.0) * 0.22;
    p.y = aY + sin(uTime * 0.06 + aSeed * 23.0) * 0.26;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    float pulse = pow(0.5 + 0.5 * sin(uTime * 0.35 + aSeed * 43.0), 3.0);
    vAlpha = 0.15 + pulse * 0.85;
    vTint  = aTint;

    float size = aSize * uPixelRatio * (160.0 / max(1.0, -mv.z));
    gl_PointSize = min(size, 32.0 * uPixelRatio);
    gl_Position  = projectionMatrix * mv;
  }
`;

interface Props {
  count: number;
  reduced: boolean;
}

export default function BrightNodes({ count, reduced }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const data = useMemo(() => generateNodes(count), [count]);
  const dpr = useThree((s) => s.viewport.dpr);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 10 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color("#e0e6f0") },
      uColorB: { value: new THREE.Color("#a78bfa") },
    }),
    [],
  );

  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uPixelRatio.value = dpr;
  }, [dpr]);

  useFrame((_, delta) => {
    if (matRef.current && !reduced) {
      matRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aRadius" args={[data.radii, 1]} />
        <bufferAttribute attach="attributes-aAngle" args={[data.angles, 1]} />
        <bufferAttribute attach="attributes-aY" args={[data.ys, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 1]} />
        <bufferAttribute attach="attributes-aTint" args={[data.tints, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERTEX}
        fragmentShader={SPRITE_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
