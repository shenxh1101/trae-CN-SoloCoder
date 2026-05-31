export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function midpoint(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export function smoothPoints(points, windowSize = 3) {
  if (points.length < windowSize) return points;
  const smoothed = [];
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(points.length, i + Math.ceil(windowSize / 2));
    let sx = 0, sy = 0;
    for (let j = start; j < end; j++) {
      sx += points[j].x;
      sy += points[j].y;
    }
    const count = end - start;
    smoothed.push({ ...points[i], x: sx / count, y: sy / count });
  }
  return smoothed;
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
