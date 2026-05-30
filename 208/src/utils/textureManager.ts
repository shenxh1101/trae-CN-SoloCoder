import * as THREE from 'three';
import type { ArtStyle, CubeFace } from '../types';
import { getStyleTextureUrl } from '../data/styleTextures';

const textureCache: Map<string, THREE.Texture> = new Map();
const loadingPromises: Map<string, Promise<THREE.Texture>> = new Map();

export const loadStyleTexture = async (
  style: ArtStyle,
  size: number = 512
): Promise<THREE.Texture> => {
  const cacheKey = `${style.id}-${size}`;

  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey)!;
  }

  const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
    const textureUrl = getStyleTextureUrl(style.id);

    if (!textureUrl) {
      reject(new Error('No texture URL available'));
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    loader.load(
      textureUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;

        textureCache.set(cacheKey, texture);
        loadingPromises.delete(cacheKey);
        resolve(texture);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load texture for ${style.name}, using fallback:`, error);
        loadingPromises.delete(cacheKey);
        resolve(createFallbackTexture(style, size));
      }
    );
  });

  loadingPromises.set(cacheKey, loadPromise);
  return loadPromise;
};

const createFallbackTexture = (style: ArtStyle, size: number): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, style.baseColor);
  gradient.addColorStop(0.5, style.accentColor);
  gradient.addColorStop(1, style.baseColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = i % 2 === 0 ? style.accentColor : style.baseColor;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 40 + 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(style.nameCn, size / 2, size / 2);
  ctx.font = '14px Arial';
  ctx.fillText(style.author, size / 2, size / 2 + 25);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  textureCache.set(`${style.id}-${size}`, texture);
  return texture;
};

export const loadContentTexture = (imageData: string): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      const scale = Math.max(512 / img.width, 512 / img.height);
      const x = (512 - img.width * scale) / 2;
      const y = (512 - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
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
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const image1 = texture1.image as HTMLCanvasElement | HTMLImageElement;
  const image2 = texture2.image as HTMLCanvasElement | HTMLImageElement;

  ctx.globalAlpha = 1;
  ctx.drawImage(image1, 0, 0, 512, 512);
  ctx.globalAlpha = intensity;
  ctx.drawImage(image2, 0, 0, 512, 512);
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

export const preloadAllStyleTextures = async (
  styles: ArtStyle[],
  size: number = 512
): Promise<Map<string, THREE.Texture>> => {
  const results = new Map<string, THREE.Texture>();
  const promises = styles.map(async (style) => {
    try {
      const texture = await loadStyleTexture(style, size);
      results.set(style.id, texture);
    } catch (error) {
      console.warn(`Failed to preload texture for ${style.name}:`, error);
    }
  });
  await Promise.allSettled(promises);
  return results;
};

export const clearTextureCache = (): void => {
  textureCache.forEach((texture) => {
    texture.dispose();
  });
  textureCache.clear();
};
