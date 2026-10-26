/** Soft cinematic round sprite shared by every particle layer. */
export const SPRITE_FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying float vAlpha;
  varying float vTint;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.05, d);
    float halo = smoothstep(0.5, 0.16, d);

    float a = (core * 0.85 + halo * 0.4) * vAlpha;
    if (a < 0.004) discard;

    vec3 col = mix(uColorA, uColorB, vTint);
    gl_FragColor = vec4(col, a);
  }
`;
