export interface GalaxyData {
  positions: Float32Array;
  radii: Float32Array;
  angles: Float32Array;
  ys: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
  tints: Float32Array;
}

const gauss = () => Math.random() + Math.random() + Math.random() - 1.5;

/**
 * Organic asymmetric spiral galaxy distribution.
 * 4 arms with individual twist rates, widths and thickness,
 * ~10% inter-arm halo so the structure never looks mathematically perfect.
 */
export function generateGalaxy(count: number): GalaxyData {
  const ARMS = 4;
  const twists = [2.05, 2.38, 2.62, 2.92];
  const widths = [0.4, 0.54, 0.46, 0.6];
  const thickness = [0.52, 0.72, 0.58, 0.82];

  const positions = new Float32Array(count * 3);
  const radii = new Float32Array(count);
  const angles = new Float32Array(count);
  const ys = new Float32Array(count);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const tints = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    let arm: number;
    let t: number;
    if (Math.random() < 0.1) {
      arm = Math.floor(Math.random() * ARMS);
      t = Math.pow(Math.random(), 0.45);
    } else {
      arm = i % ARMS;
      t = Math.pow(Math.random(), 0.62);
    }

    const radius = 0.8 + t * 13.4;
    const twist = twists[arm];
    const scatter = widths[arm] * (1.35 - t * 0.75);
    const angle =
      (arm / ARMS) * Math.PI * 2 +
      radius * twist +
      gauss() * scatter +
      gauss() * 0.12;

    const yFall = 1 - t * 0.78;
    const y = gauss() * thickness[arm] * yFall;

    const bulgeBoost = radius < 2.2 ? 0.9 : 0;
    sizes[i] = 0.5 + Math.pow(Math.random(), 3) * 2.1 + bulgeBoost * Math.random();
    radii[i] = radius;
    angles[i] = angle;
    ys[i] = y;
    seeds[i] = Math.random();
    tints[i] = Math.random() < 0.07 ? 0.65 + Math.random() * 0.35 : Math.random() * 0.14;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  return { positions, radii, angles, ys, sizes, seeds, tints };
}

/** Sparse bright nodes hugging the inner spiral regions. */
export function generateNodes(count: number): GalaxyData {
  const full = generateGalaxy(Math.round(count * 2.2));
  const positions = new Float32Array(count * 3);
  const radii = new Float32Array(count);
  const angles = new Float32Array(count);
  const ys = new Float32Array(count);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const tints = new Float32Array(count);

  let kept = 0;
  for (let i = 0; i < full.radii.length && kept < count; i++) {
    if (full.radii[i] > 10.5) continue;
    const j = kept;
    radii[j] = full.radii[i];
    angles[j] = full.angles[i];
    ys[j] = full.ys[i];
    sizes[j] = 2.4 + Math.random() * 2.4;
    seeds[j] = Math.random();
    tints[j] = 0.25 + Math.random() * 0.5;
    positions[j * 3] = full.positions[i * 3];
    positions[j * 3 + 1] = full.positions[i * 3 + 1];
    positions[j * 3 + 2] = full.positions[i * 3 + 2];
    kept++;
  }

  return { positions, radii, angles, ys, sizes, seeds, tints };
}

export function generateShell(count: number, rMin: number, rMax: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const dir = new Array(3)
      .fill(0)
      .map(() => gauss());
    const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]) || 1;
    const r = rMin + Math.random() * (rMax - rMin);
    positions[i * 3] = (dir[0] / len) * r;
    positions[i * 3 + 1] = (dir[1] / len) * r * 0.7;
    positions[i * 3 + 2] = (dir[2] / len) * r;
  }
  return positions;
}
