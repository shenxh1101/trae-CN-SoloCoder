import * as THREE from 'three';
import type { ArtStyle } from '../types';

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const generateStarryNightTexture = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a1628');
  gradient.addColorStop(0.5, '#1a365d');
  gradient.addColorStop(1, '#1e3a5f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height * 0.7;
    const radius = Math.random() * 3 + 1;
    const brightness = Math.random() * 0.5 + 0.5;

    const starGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    starGradient.addColorStop(0, `rgba(255, 255, 200, ${brightness})`);
    starGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = starGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 8;
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    const startY = Math.random() * height;
    ctx.moveTo(0, startY);
    for (let x = 0; x <= width; x += 20) {
      const y = startY + Math.sin(x * 0.02 + i * 0.5) * 30 + Math.sin(x * 0.05) * 15;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const moonX = width * 0.8;
  const moonY = height * 0.15;
  const moonGradient = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 60);
  moonGradient.addColorStop(0, 'rgba(255, 255, 220, 1)');
  moonGradient.addColorStop(0.3, 'rgba(255, 230, 150, 0.8)');
  moonGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = moonGradient;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 60, 0, Math.PI * 2);
  ctx.fill();
};

const generateCubismTexture = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#4a1d1d';
  ctx.fillRect(0, 0, width, height);

  const colors = ['#f59e0b', '#dc2626', '#2563eb', '#16a34a', '#7c3aed', '#f97316'];
  const shapes: { type: string; x: number; y: number; size: number; color: string; rotation: number }[] = [];

  for (let i = 0; i < 30; i++) {
    shapes.push({
      type: Math.random() > 0.5 ? 'rect' : 'triangle',
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 100 + 30,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI,
    });
  }

  shapes.forEach((shape) => {
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.rotation);
    ctx.fillStyle = shape.color;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;

    if (shape.type === 'rect') {
      ctx.fillRect(-shape.size / 2, -shape.size / 3, shape.size, shape.size * 0.6);
      ctx.strokeRect(-shape.size / 2, -shape.size / 3, shape.size, shape.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -shape.size / 2);
      ctx.lineTo(shape.size / 2, shape.size / 3);
      ctx.lineTo(-shape.size / 2, shape.size / 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  });
};

const generateUkiyoETexture = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;

  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  skyGradient.addColorStop(0, '#1e3a5f');
  skyGradient.addColorStop(1, '#3b82f6');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.5);

  ctx.fillStyle = '#e0e7ff';
  ctx.beginPath();
  ctx.moveTo(width * 0.3, height * 0.45);
  ctx.lineTo(width * 0.5, height * 0.1);
  ctx.lineTo(width * 0.7, height * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath();
  ctx.moveTo(width * 0.4, height * 0.45);
  ctx.lineTo(width * 0.5, height * 0.2);
  ctx.lineTo(width * 0.6, height * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(224, 231, 255, 0.9)';
  for (let wave = 0; wave < 5; wave++) {
    ctx.beginPath();
    const baseY = height * 0.5 + wave * 40;
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= width; x += 5) {
      const y = baseY + Math.sin(x * 0.03 + wave * 0.8) * 20 - wave * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    const startY = height * 0.5 + Math.random() * height * 0.4;
    ctx.moveTo(0, startY);
    for (let x = 0; x <= width; x += 10) {
      const y = startY + Math.sin(x * 0.04 + i) * 15;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
};

const generateWaterLiliesTexture = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;

  const waterGradient = ctx.createLinearGradient(0, 0, 0, height);
  waterGradient.addColorStop(0, '#0d9488');
  waterGradient.addColorStop(0.5, '#134e4a');
  waterGradient.addColorStop(1, '#042f2e');
  ctx.fillStyle = waterGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 50 + 20;

    ctx.fillStyle = Math.random() > 0.5 ? '#064e3b' : '#065f46';
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const lilyColors = ['#fce7f3', '#fbcfe8', '#f9a8d4', '#ec4899', '#fdf4ff'];
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 25 + 10;
    const color = lilyColors[Math.floor(Math.random() * lilyColors.length)];

    ctx.fillStyle = color;
    for (let p = 0; p < 8; p++) {
      const angle = (p / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(angle) * size * 0.5,
        y + Math.sin(angle) * size * 0.5,
        size * 0.6,
        size * 0.3,
        angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
};

const generateScreamTexture = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;

  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#7c2d12');
  skyGradient.addColorStop(0.3, '#ea580c');
  skyGradient.addColorStop(0.6, '#fbbf24');
  skyGradient.addColorStop(1, '#78350f');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    const startX = Math.random() * width;
    ctx.moveTo(startX, 0);
    for (let y = 0; y <= height; y += 10) {
      const x = startX + Math.sin(y * 0.02 + i * 0.3) * 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const centerX = width / 2;
  const centerY = height * 0.55;

  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, 45, 60, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(centerX - 18, centerY - 15, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(centerX + 18, centerY - 15, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX - 20, centerY + 25);
  ctx.quadraticCurveTo(centerX, centerY + 50, centerX + 20, centerY + 25);
  ctx.stroke();

  ctx.fillStyle = '#4a3728';
  ctx.fillRect(centerX - 30, centerY + 55, 60, 100);
};

const generateDaliTexture = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;

  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  skyGradient.addColorStop(0, '#60a5fa');
  skyGradient.addColorStop(1, '#fef3c7');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.5);

  const groundGradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
  groundGradient.addColorStop(0, '#a16207');
  groundGradient.addColorStop(1, '#78350f');
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);

  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.moveTo(width * 0.1, height * 0.5);
  ctx.lineTo(width * 0.2, height * 0.25);
  ctx.lineTo(width * 0.3, height * 0.5);
  ctx.closePath();
  ctx.fill();

  const drawMeltingClock = (x: number, y: number, scale: number, rotation: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.quadraticCurveTo(-40, -40, 0, -40);
    ctx.quadraticCurveTo(40, -40, 40, 0);
    ctx.quadraticCurveTo(40, 30, 20, 50);
    ctx.quadraticCurveTo(0, 40, -20, 50);
    ctx.quadraticCurveTo(-40, 30, -40, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const numX = Math.cos(angle) * 22;
      const numY = Math.sin(angle) * 22;
      ctx.beginPath();
      ctx.arc(numX, numY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(15, -10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8, 12);
    ctx.stroke();

    ctx.restore();
  };

  drawMeltingClock(width * 0.6, height * 0.45, 0.8, -0.3);
  drawMeltingClock(width * 0.35, height * 0.65, 0.6, 0.4);
  drawMeltingClock(width * 0.75, height * 0.7, 0.5, 0.2);
};

const generatePopArtTexture = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;

  const bgColors = ['#be185d', '#22d3ee', '#fbbf24', '#a855f7', '#22c55e'];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = bgColors[(i + j) % bgColors.length];
      ctx.fillRect((i * width) / 4, (j * height) / 4, width / 4, height / 4);
    }
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  const dotSize = 6;
  const dotSpacing = 12;
  for (let y = 0; y < height; y += dotSpacing) {
    for (let x = 0; x < width; x += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const centerX = width / 2;
  const centerY = height / 2;

  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(centerX - 50, centerY - 30);
  ctx.lineTo(centerX - 30, centerY - 10);
  ctx.lineTo(centerX - 50, centerY + 10);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX + 50, centerY - 30);
  ctx.lineTo(centerX + 30, centerY - 10);
  ctx.lineTo(centerX + 50, centerY + 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(centerX - 30, centerY + 50);
  ctx.quadraticCurveTo(centerX, centerY + 20, centerX + 30, centerY + 50);
  ctx.quadraticCurveTo(centerX, centerY + 70, centerX - 30, centerY + 50);
  ctx.fill();
};

const generateColorFieldTexture = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;

  const colors = [
    { color: '#581c87', y: 0 },
    { color: '#7c3aed', y: height * 0.2 },
    { color: '#a855f7', y: height * 0.4 },
    { color: '#c084fc', y: height * 0.6 },
    { color: '#e879f9', y: height * 0.8 },
    { color: '#f0abfc', y: height },
  ];

  for (let i = 0; i < colors.length - 1; i++) {
    const gradient = ctx.createLinearGradient(0, colors[i].y, 0, colors[i + 1].y);
    gradient.addColorStop(0, colors[i].color);
    gradient.addColorStop(1, colors[i + 1].color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, colors[i].y, width, colors[i + 1].y - colors[i].y);
  }

  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 50; i++) {
    const y = Math.random() * height;
    const gradient = ctx.createLinearGradient(0, y - 50, 0, y + 50);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - 50, width, 100);
  }
  ctx.globalAlpha = 1;
};

const styleGenerators: Record<string, (canvas: HTMLCanvasElement) => void> = {
  'van-gogh-starry-night': generateStarryNightTexture,
  'picasso-cubism': generateCubismTexture,
  'ukiyo-e-hokusai': generateUkiyoETexture,
  'monet-water-lilies': generateWaterLiliesTexture,
  'munch-scream': generateScreamTexture,
  'dali-persistence': generateDaliTexture,
  'warhol-pop': generatePopArtTexture,
  'rothko-color-field': generateColorFieldTexture,
};

export const generateStyleTexture = (style: ArtStyle, size: number = 512): THREE.Texture => {
  const canvas = createCanvas(size, size);
  const generator = styleGenerators[style.id];

  if (generator) {
    generator(canvas);
  } else {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = style.baseColor;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const generateContentTexture = (imageData: string): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = createCanvas(512, 512);
      const ctx = canvas.getContext('2d')!;

      const scale = Math.max(512 / img.width, 512 / img.height);
      const x = (512 - img.width * scale) / 2;
      const y = (512 - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = reject;
    img.src = imageData;
  });
};

export const blendTextures = (
  texture1: THREE.Texture,
  texture2: THREE.Texture,
  intensity: number
): THREE.Texture => {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d')!;

  const image1 = texture1.image as HTMLCanvasElement | HTMLImageElement;
  const image2 = texture2.image as HTMLCanvasElement | HTMLImageElement;

  ctx.globalAlpha = 1;
  ctx.drawImage(image1, 0, 0, 512, 512);
  ctx.globalAlpha = intensity;
  ctx.drawImage(image2, 0, 0, 512, 512);
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};
