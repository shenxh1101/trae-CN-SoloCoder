import type { ColorRGB, ColorPalette } from './colorExtractor';

export type CurvePoint = { x: number; y: number };

export const DEFAULT_PALETTE: ColorPalette = [
  { r: 26, g: 26, b: 78 },
  { r: 26, g: 107, b: 90 },
  { r: 74, g: 140, b: 63 },
  { r: 196, g: 160, b: 53 },
  { r: 212, g: 98, b: 42 },
  { r: 139, g: 26, b: 26 },
];

export const DEFAULT_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.15 },
  { x: 0.75, y: 0.85 },
  { x: 1, y: 1 },
];

export function remapHeight(height: number, curvePoints: CurvePoint[]): number {
  const points = [...curvePoints].sort((a, b) => a.x - b.x);
  const n = points.length;

  if (height <= points[0].x) return points[0].y;
  if (height >= points[n - 1].x) return points[n - 1].y;

  const dx: number[] = new Array(n);
  const dy: number[] = new Array(n);
  const m: number[] = new Array(n);
  const c1: number[] = new Array(n);
  const c2: number[] = new Array(n);

  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    dy[i] = points[i + 1].y - points[i].y;
    m[i] = dy[i] / dx[i];
  }

  c1[0] = m[0];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      c1[i] = 0;
    } else {
      const common = dx[i - 1] + dx[i];
      c1[i] = (3 * common) / ((common + dx[i]) / m[i - 1] + (common + dx[i - 1]) / m[i]);
    }
  }
  c1[n - 1] = m[n - 2];

  for (let i = 0; i < n - 1; i++) {
    const invDx = 1 / dx[i];
    c2[i] = (3 * m[i] - 2 * c1[i] - c1[i + 1]) * invDx;
    dx[i] = (c1[i] + c1[i + 1] - 2 * m[i]) * invDx * invDx;
  }

  for (let i = 0; i < n - 1; i++) {
    if (height >= points[i].x && height <= points[i + 1].x) {
      const diff = height - points[i].x;
      return points[i].y + c1[i] * diff + c2[i] * diff * diff + dx[i] * diff * diff * diff;
    }
  }

  return points[n - 1].y;
}

function luminance(c: ColorRGB): number {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

export function mapHeightToColor(
  height: number,
  palette: ColorPalette,
  curvePoints: CurvePoint[]
): ColorRGB {
  const remapped = remapHeight(height, curvePoints);
  const sorted = [...palette].sort((a, b) => luminance(a) - luminance(b));

  if (sorted.length === 0) return { r: 0, g: 0, b: 0 };
  if (sorted.length === 1) return { ...sorted[0] };

  const clamped = Math.max(0, Math.min(1, remapped));
  const scaledT = clamped * (sorted.length - 1);
  const idx = Math.floor(scaledT);
  const frac = scaledT - idx;

  if (idx >= sorted.length - 1) return { ...sorted[sorted.length - 1] };

  const a = sorted[idx];
  const b = sorted[idx + 1];

  return {
    r: Math.round(a.r + (b.r - a.r) * frac),
    g: Math.round(a.g + (b.g - a.g) * frac),
    b: Math.round(a.b + (b.b - a.b) * frac),
  };
}
