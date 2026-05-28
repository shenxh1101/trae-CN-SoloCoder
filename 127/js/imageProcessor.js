import { shuffleArray } from './utils.js';

const DEFAULT_IMAGE_SIZE = 500;

export const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const sliceImageIntoSectors = (image, sectorCount, size = DEFAULT_IMAGE_SIZE) => {
  const sectorAngle = 360 / sectorCount;
  const results = [];

  for (let i = 0; i < sectorCount; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.clearRect(0, 0, size, size);
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    const startAngle = (i * sectorAngle - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * sectorAngle - 90) * (Math.PI / 180);
    ctx.arc(size / 2, size / 2, size / 2, startAngle, endAngle);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();

    results.push(canvas.toDataURL());
  }

  return results;
};

export const createSectorsFromImage = async (imageSrc, difficulty) => {
  const img = await loadImage(imageSrc);
  const sectorImages = sliceImageIntoSectors(img, difficulty);

  const indices = shuffleArray([...Array(difficulty).keys()]);

  const sectors = indices.map((originalIndex, i) => ({
    id: i,
    originalIndex,
    imageData: sectorImages[originalIndex],
    isAligned: false,
  }));

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = DEFAULT_IMAGE_SIZE;
  fullCanvas.height = DEFAULT_IMAGE_SIZE;
  const fullCtx = fullCanvas.getContext('2d');
  if (fullCtx) {
    fullCtx.drawImage(img, 0, 0, DEFAULT_IMAGE_SIZE, DEFAULT_IMAGE_SIZE);
  }

  return {
    sectors,
    fullImageData: fullCanvas.toDataURL(),
  };
};

export const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateDefaultImage = () => {
  const canvas = document.createElement('canvas');
  const size = DEFAULT_IMAGE_SIZE;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, '#ff6b6b');
  gradient.addColorStop(0.25, '#feca57');
  gradient.addColorStop(0.5, '#48dbfb');
  gradient.addColorStop(0.75, '#ff9ff3');
  gradient.addColorStop(1, '#54a0ff');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('旋转拼图', size / 2, size / 2 - 40);
  ctx.font = '24px Arial';
  ctx.fillText('将碎片拼回原位', size / 2, size / 2 + 20);

  const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c'];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = size / 2 + Math.cos(angle) * (size / 3);
    const y = size / 2 + Math.sin(angle) * (size / 3);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText((i + 1).toString(), x, y);
  }

  return canvas.toDataURL();
};
