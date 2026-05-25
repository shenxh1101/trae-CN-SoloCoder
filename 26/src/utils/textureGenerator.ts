import * as THREE from 'three';
import type { TexturePattern } from '@/types';
import { hexToRgb, darkenColor } from './colorUtils';

export const generateTexture = (
  pattern: TexturePattern,
  baseColor: string,
  secondaryColor?: string
): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const base = hexToRgb(baseColor);
  const secondary = secondaryColor
    ? hexToRgb(secondaryColor)
    : hexToRgb(darkenColor(baseColor, 30));

  switch (pattern) {
    case 'solid':
      generateSolidTexture(ctx, base);
      break;
    case 'stripes':
      generateStripesTexture(ctx, base, secondary);
      break;
    case 'dots':
      generateDotsTexture(ctx, base, secondary);
      break;
    case 'camouflage':
      generateCamouflageTexture(ctx, baseColor);
      break;
    case 'carbon':
      generateCarbonFiberTexture(ctx, base);
      break;
    default:
      generateSolidTexture(ctx, base);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;

  return texture;
};

const _getContrastColor = (
  base: { r: number; g: number; b: number },
  factor: number
): { r: number; g: number; b: number } => {
  const luminance = (0.299 * base.r + 0.587 * base.g + 0.114 * base.b) / 255;
  const adjust = luminance > 0.5 ? -factor : factor;
  return {
    r: Math.min(255, Math.max(0, base.r + adjust * 255)),
    g: Math.min(255, Math.max(0, base.g + adjust * 255)),
    b: Math.min(255, Math.max(0, base.b + adjust * 255))
  };
};

const generateSolidTexture = (
  ctx: CanvasRenderingContext2D,
  color: { r: number; g: number; b: number }
) => {
  ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
  ctx.fillRect(0, 0, 512, 512);
  addNoise(ctx, 0.02);
};

const generateStripesTexture = (
  ctx: CanvasRenderingContext2D,
  base: { r: number; g: number; b: number },
  secondary: { r: number; g: number; b: number }
) => {
  ctx.fillStyle = `rgb(${base.r}, ${base.g}, ${base.b})`;
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = `rgb(${secondary.r}, ${secondary.g}, ${secondary.b})`;
  const stripeWidth = 32;
  const gapWidth = 32;

  for (let i = 0; i < 512; i += stripeWidth + gapWidth) {
    ctx.fillRect(i, 0, stripeWidth, 512);
  }
};

const generateDotsTexture = (
  ctx: CanvasRenderingContext2D,
  base: { r: number; g: number; b: number },
  secondary: { r: number; g: number; b: number }
) => {
  ctx.fillStyle = `rgb(${base.r}, ${base.g}, ${base.b})`;
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = `rgb(${secondary.r}, ${secondary.g}, ${secondary.b})`;
  const dotRadius = 12;
  const spacing = 48;

  for (let x = spacing / 2; x < 512; x += spacing) {
    for (let y = spacing / 2; y < 512; y += spacing) {
      const offsetX = (Math.floor(y / spacing) % 2) * (spacing / 2);
      ctx.beginPath();
      ctx.arc(x + offsetX, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

const generateCamouflageTexture = (
  ctx: CanvasRenderingContext2D,
  baseColor: string
) => {
  const base = hexToRgb(baseColor);
  const colors = [
    base,
    { r: Math.max(0, base.r - 40), g: Math.max(0, base.g - 40), b: Math.max(0, base.b - 40) },
    { r: Math.min(255, base.r + 20), g: Math.min(255, base.g + 20), b: Math.min(255, base.b + 20) },
    { r: Math.max(0, base.r - 20), g: Math.max(0, base.g + 30), b: Math.max(0, base.b - 10) }
  ];

  for (let i = 0; i < 50; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
    ctx.beginPath();

    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = 40 + Math.random() * 80;

    ctx.moveTo(x + radius, y);
    for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
      const r = radius * (0.7 + Math.random() * 0.6);
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  addNoise(ctx, 0.05);
};

const generateCarbonFiberTexture = (
  ctx: CanvasRenderingContext2D,
  base: { r: number; g: number; b: number }
) => {
  const imageData = ctx.createImageData(512, 512);
  const data = imageData.data;

  const tileSize = 8;

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;

      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      const localX = x % tileSize;
      const localY = y % tileSize;

      const isHorizontal = tileY % 2 === 0;
      const linePos = isHorizontal ? localY : localX;
      const isLine = linePos === 0 || linePos === tileSize - 1;

      const variation = (Math.random() - 0.5) * 20;

      if (isLine) {
        data[idx] = Math.min(255, Math.max(0, base.r * 0.6 + variation));
        data[idx + 1] = Math.min(255, Math.max(0, base.g * 0.6 + variation));
        data[idx + 2] = Math.min(255, Math.max(0, base.b * 0.6 + variation));
      } else {
        const highlight = (Math.sin((localX + localY) * 0.5) + 1) * 10;
        data[idx] = Math.min(255, Math.max(0, base.r + variation + highlight));
        data[idx + 1] = Math.min(255, Math.max(0, base.g + variation + highlight));
        data[idx + 2] = Math.min(255, Math.max(0, base.b + variation + highlight));
      }

      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const addNoise = (ctx: CanvasRenderingContext2D, intensity: number) => {
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * intensity;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
};

export const generateNormalMap = (
  baseTexture: THREE.Texture,
  strength: number = 0.5
): THREE.Texture => {
  const canvas = document.createElement('canvas');
  const image = baseTexture.image as HTMLCanvasElement;
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);

  const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const dst = ctx.createImageData(canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;

      const getGray = (px: number, py: number) => {
        const clampedX = Math.max(0, Math.min(canvas.width - 1, px));
        const clampedY = Math.max(0, Math.min(canvas.height - 1, py));
        const i = (clampedY * canvas.width + clampedX) * 4;
        return (src.data[i] + src.data[i + 1] + src.data[i + 2]) / 3;
      };

      const tl = getGray(x - 1, y - 1);
      const t = getGray(x, y - 1);
      const tr = getGray(x + 1, y - 1);
      const l = getGray(x - 1, y);
      const r = getGray(x + 1, y);
      const bl = getGray(x - 1, y + 1);
      const b = getGray(x, y + 1);
      const br = getGray(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 255;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      dst.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      dst.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      dst.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      dst.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(dst, 0, 0);

  const normalMap = new THREE.CanvasTexture(canvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(2, 2);

  return normalMap;
};
