"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { generateShell } from "./galaxy";
import { SPRITE_FRAGMENT } from "./shaders";

const FAR_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  attribute float aSize;
  attribute float aSeed;
  varying float vAlpha;
  varying float vTint;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.02 + aSeed * 13.0) * 0.8;
    p.y += cos(uTime * 0.016 + aSeed * 29.0) * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vAlpha = (0.45 + 0.55 * sin(uTime * 0.18 + aSeed * 19.0)) * uOpacity;
    vTint  = 0.06;

    float s = aSize * uPixelRatio * (100.0 / max(1.0, -mv.z));
    gl_PointSize = min(s, 8.0 * uPixelRatio);
    gl_Position  = projectionMatrix * mv;
  }
`;

const NEAR_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  attribute float aSize;
  attribute float aSeed;
  varying float vAlpha;
  varying float vTint;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.04 + aSeed * 11.0) * 1.6;
    p.y += cos(uTime * 0.033 + aSeed * 23.0) * 1.1;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vAlpha = (0.4 + 0.6 * sin(uTime * 0.22 + aSeed * 17.0)) * uOpacity;
    vTint  = 0.04;

    float s = aSize * uPixelRatio * (120.0 / max(1.0, -mv.z));
    gl_PointSize = min(s, 14.0 * uPixelRatio);
    gl_Position  = projectionMatrix * mv;
  }
`;

interface Counts {
  far: number;
  near: number;
}

interface Props {
  counts: Counts;
  reduced: boolean;
}

export default function BackgroundDust({ counts, reduced }: Props) {
  const farRef = useRef<THREE.Points>(null);
  const nearRef = useRef<THREE.Points>(null);
  const farMat = useRef<THREE.ShaderMaterial>(null);
  const nearMat = useRef<THREE.ShaderMaterial>(null);

  const farPos = useMemo(() => generateShell(counts.far, 34, 78), [counts.far]);
  const nearPos = useMemo(() => generateShell(counts.near, 6, 32), [counts.near]);

  const dpr = useThree((s) => s.viewport.dpr);

  const farSizes = useMemo(() => {
    const s = new Float32Array(counts.far);
    for (let i = 0; i < counts.far; i++) s[i] = 0.4 + Math.random() * 0.7;
    return s;
  }, [counts.far]);

  const farSeeds = useMemo(() => {
    const s = new Float32Array(counts.far);
    for (let i = 0; i < counts.far; i++) s[i] = Math.random();
    return s;
  }, [counts.far]);

  const nearSizes = useMemo(() => {
    const s = new Float32Array(counts.near);
    for (let i = 0; i < counts.near; i++) s[i] = 0.9 + Math.random() * 1.3;
    return s;
  }, [counts.near]);

  const nearSeeds = useMemo(() => {
    const s = new Float32Array(counts.near);
    for (let i = 0; i < counts.near; i++) s[i] = Math.random();
    return s;
  }, [counts.near]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 10 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 1 },
      uColorA: { value: new THREE.Color("#cdd8e6") },
      uColorB: { value: new THREE.Color("#a78bfa") },
    }),
    [],
  );

  useEffect(() => {
    if (farMat.current) farMat.current.uniforms.uPixelRatio.value = dpr;
    if (nearMat.current) nearMat.current.uniforms.uPixelRatio.value = dpr;
  }, [dpr]);

  useFrame((_, delta) => {
    if (reduced) return;
    if (uniforms.uTime) uniforms.uTime.value += delta;
    if (farRef.current) farRef.current.rotation.y += delta * 0.0015;
    if (nearRef.current) nearRef.current.rotation.y -= delta * 0.002;
  });

  return (
    <>
      <points ref={farRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[farPos, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[farSizes, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[farSeeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={farMat}
          vertexShader={FAR_VERTEX}
          fragmentShader={SPRITE_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={nearRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nearPos, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[nearSizes, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[nearSeeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={nearMat}
          vertexShader={NEAR_VERTEX}
          fragmentShader={SPRITE_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
