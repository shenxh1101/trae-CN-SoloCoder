export type ColorRGB = { r: number; g: number; b: number };
export type ColorPalette = ColorRGB[];

interface ColorBucket {
  colors: ColorRGB[];
}

function getChannelRange(colors: ColorRGB[], channel: 'r' | 'g' | 'b'): number {
  let min = 255;
  let max = 0;
  for (const c of colors) {
    if (c[channel] < min) min = c[channel];
    if (c[channel] > max) max = c[channel];
  }
  return max - min;
}

function splitBucket(bucket: ColorBucket): [ColorBucket, ColorBucket] {
  const { colors } = bucket;
  const rRange = getChannelRange(colors, 'r');
  const gRange = getChannelRange(colors, 'g');
  const bRange = getChannelRange(colors, 'b');

  let channel: 'r' | 'g' | 'b' = 'r';
  if (gRange >= rRange && gRange >= bRange) channel = 'g';
  else if (bRange >= rRange && bRange >= gRange) channel = 'b';

  const sorted = [...colors].sort((a, b) => a[channel] - b[channel]);
  const mid = Math.floor(sorted.length / 2);

  return [
    { colors: sorted.slice(0, mid) },
    { colors: sorted.slice(mid) },
  ];
}

function averageColor(colors: ColorRGB[]): ColorRGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const c of colors) {
    r += c.r;
    g += c.g;
    b += c.b;
  }
  const n = colors.length;
  return {
    r: Math.round(r / n),
    g: Math.round(g / n),
    b: Math.round(b / n),
  };
}

function luminance(c: ColorRGB): number {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

export function extractColors(
  imageElement: HTMLImageElement,
  colorCount: number = 6
): ColorPalette {
  const maxSize = 128;
  const scale = Math.min(maxSize / imageElement.naturalWidth, maxSize / imageElement.naturalHeight, 1);
  const w = Math.floor(imageElement.naturalWidth * scale);
  const h = Math.floor(imageElement.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageElement, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const pixels: ColorRGB[] = [];
  for (let i = 0; i < data.length; i += 4) {
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }

  const buckets: ColorBucket[] = [{ colors: pixels }];

  while (buckets.length < colorCount) {
    let maxRange = -1;
    let maxIdx = 0;

    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].colors.length < 2) continue;
      const rRange = getChannelRange(buckets[i].colors, 'r');
      const gRange = getChannelRange(buckets[i].colors, 'g');
      const bRange = getChannelRange(buckets[i].colors, 'b');
      const maxChannelRange = Math.max(rRange, gRange, bRange);
      if (maxChannelRange > maxRange) {
        maxRange = maxChannelRange;
        maxIdx = i;
      }
    }

    if (maxRange <= 0) break;

    const [left, right] = splitBucket(buckets[maxIdx]);
    buckets.splice(maxIdx, 1, left, right);
  }

  const palette = buckets
    .filter((b) => b.colors.length > 0)
    .map((b) => averageColor(b.colors));

  palette.sort((a, b) => luminance(a) - luminance(b));

  return palette;
}
