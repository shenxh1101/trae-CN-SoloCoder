const artStyles = {
  vanGogh: {
    name: '梵高',
    icon: '🌻',
    filters: {
      contrast: 1.25,
      saturation: 1.5,
      brightness: 1.15,
      hueRotate: -15,
      sepia: 0.25,
      blur: 0
    },
    colorPalette: [
      [255, 200, 100],
      [200, 150, 50],
      [100, 150, 200],
      [50, 100, 150],
      [200, 100, 80]
    ],
    brushStroke: 3,
    ditherLevel: 0.3
  },
  monet: {
    name: '莫奈',
    icon: '🪷',
    filters: {
      contrast: 0.9,
      saturation: 1.2,
      brightness: 1.1,
      hueRotate: 10,
      sepia: 0.15,
      blur: 1
    },
    colorPalette: [
      [180, 200, 220],
      [150, 180, 150],
      [200, 180, 160],
      [100, 150, 180],
      [220, 200, 180]
    ],
    brushStroke: 5,
    ditherLevel: 0.1
  },
  picasso: {
    name: '毕加索',
    icon: '🎭',
    filters: {
      contrast: 1.4,
      saturation: 1.8,
      brightness: 1.0,
      hueRotate: 30,
      sepia: 0.0,
      blur: 0
    },
    colorPalette: [
      [255, 100, 100],
      [100, 150, 255],
      [255, 200, 50],
      [50, 200, 150],
      [150, 100, 200]
    ],
    brushStroke: 1,
    ditherLevel: 0.6,
    geometric: true
  },
  ukiyo: {
    name: '浮世绘',
    icon: '🏯',
    filters: {
      contrast: 1.15,
      saturation: 1.3,
      brightness: 1.05,
      hueRotate: -5,
      sepia: 0.1,
      blur: 0
    },
    colorPalette: [
      [200, 50, 50],
      [50, 80, 150],
      [240, 220, 180],
      [80, 120, 100],
      [220, 180, 150]
    ],
    brushStroke: 2,
    ditherLevel: 0.4,
    outline: true
  },
  kandinsky: {
    name: '康定斯基',
    icon: '🔷',
    filters: {
      contrast: 1.3,
      saturation: 2.0,
      brightness: 1.1,
      hueRotate: 45,
      sepia: 0.0,
      blur: 0
    },
    colorPalette: [
      [50, 50, 150],
      [255, 200, 0],
      [200, 50, 50],
      [0, 150, 100],
      [255, 100, 0]
    ],
    brushStroke: 1,
    ditherLevel: 0.7,
    abstract: true
  },
  daVinci: {
    name: '达芬奇',
    icon: '📜',
    filters: {
      contrast: 1.1,
      saturation: 0.7,
      brightness: 0.95,
      hueRotate: 0,
      sepia: 0.4,
      blur: 0.5
    },
    colorPalette: [
      [180, 160, 120],
      [120, 100, 80],
      [200, 180, 150],
      [80, 70, 50],
      [150, 130, 100]
    ],
    brushStroke: 4,
    ditherLevel: 0.2
  },
  warhol: {
    name: '沃霍尔',
    icon: '🥫',
    filters: {
      contrast: 1.5,
      saturation: 2.5,
      brightness: 1.1,
      hueRotate: 0,
      sepia: 0.0,
      blur: 0
    },
    colorPalette: [
      [255, 0, 0],
      [0, 255, 255],
      [255, 255, 0],
      [255, 0, 255],
      [0, 255, 0]
    ],
    brushStroke: 0,
    ditherLevel: 0.8,
    popArt: true
  },
  hokusai: {
    name: '北斋',
    icon: '🌊',
    filters: {
      contrast: 1.2,
      saturation: 1.1,
      brightness: 1.0,
      hueRotate: -20,
      sepia: 0.05,
      blur: 0
    },
    colorPalette: [
      [30, 60, 120],
      [200, 220, 240],
      [60, 100, 150],
      [150, 150, 150],
      [180, 200, 220]
    ],
    brushStroke: 2,
    ditherLevel: 0.35,
    waveEffect: true
  }
};

class ImageProcessor {
  constructor() {
    this.workerCanvas = document.createElement('canvas');
    this.workerCtx = this.workerCanvas.getContext('2d', { willReadFrequently: true });
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  resizeImage(img, maxWidth = 1200, maxHeight = 900) {
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      height = (maxWidth / width) * height;
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = (maxHeight / height) * width;
      height = maxHeight;
    }

    this.workerCanvas.width = Math.floor(width);
    this.workerCanvas.height = Math.floor(height);
    this.workerCtx.drawImage(img, 0, 0, width, height);
    
    return this.workerCtx.getImageData(0, 0, width, height);
  }

  applyStyle(imageData, style, intensity) {
    const intensityRatio = intensity / 100;
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const styleConfig = artStyles[style];
    if (!styleConfig) return imageData;

    const filters = styleConfig.filters;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      r = this.applyBrightness(r, filters.brightness, intensityRatio);
      g = this.applyBrightness(g, filters.brightness, intensityRatio);
      b = this.applyBrightness(b, filters.brightness, intensityRatio);

      r = this.applyContrast(r, filters.contrast, intensityRatio);
      g = this.applyContrast(g, filters.contrast, intensityRatio);
      b = this.applyContrast(b, filters.contrast, intensityRatio);

      const hsl = this.rgbToHsl(r, g, b);
      hsl[0] = (hsl[0] + filters.hueRotate * intensityRatio + 360) % 360;
      hsl[1] = Math.min(1, hsl[1] * (1 + (filters.saturation - 1) * intensityRatio));
      const rgb = this.hslToRgb(hsl[0], hsl[1], hsl[2]);
      r = rgb[0];
      g = rgb[1];
      b = rgb[2];

      const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;
      const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;
      const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;
      r = r + (sepiaR - r) * filters.sepia * intensityRatio;
      g = g + (sepiaG - g) * filters.sepia * intensityRatio;
      b = b + (sepiaB - b) * filters.sepia * intensityRatio;

      if (styleConfig.colorPalette && intensityRatio > 0.3) {
        const paletteRatio = (intensityRatio - 0.3) / 0.7;
        const nearestColor = this.findNearestColor([r, g, b], styleConfig.colorPalette);
        r = r + (nearestColor[0] - r) * styleConfig.ditherLevel * paletteRatio;
        g = g + (nearestColor[1] - g) * styleConfig.ditherLevel * paletteRatio;
        b = b + (nearestColor[2] - b) * styleConfig.ditherLevel * paletteRatio;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    if (styleConfig.ditherLevel > 0.4 && intensityRatio > 0.5) {
      this.applyFloydSteinbergDither(imageData, styleConfig.colorPalette, intensityRatio);
    }

    if (styleConfig.brushStroke > 2 && intensityRatio > 0.3) {
      this.applyBrushStrokes(imageData, styleConfig.brushStroke, intensityRatio);
    }

    return imageData;
  }

  applyBrightness(value, factor, ratio) {
    const adjusted = value * (1 + (factor - 1) * ratio);
    return Math.max(0, Math.min(255, adjusted));
  }

  applyContrast(value, factor, ratio) {
    const adjusted = ((value / 255 - 0.5) * (1 + (factor - 1) * ratio) + 0.5) * 255;
    return Math.max(0, Math.min(255, adjusted));
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s, l];
  }

  hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  findNearestColor(color, palette) {
    let minDist = Infinity;
    let nearest = palette[0];

    for (const pColor of palette) {
      const dist = Math.sqrt(
        Math.pow(color[0] - pColor[0], 2) +
        Math.pow(color[1] - pColor[1], 2) +
        Math.pow(color[2] - pColor[2], 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = pColor;
      }
    }
    return nearest;
  }

  applyFloydSteinbergDither(imageData, palette, intensityRatio) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const oldR = data[i];
        const oldG = data[i + 1];
        const oldB = data[i + 2];

        const nearest = this.findNearestColor([oldR, oldG, oldB], palette);
        const newR = nearest[0];
        const newG = nearest[1];
        const newB = nearest[2];

        const errR = (oldR - newR) * intensityRatio * 0.5;
        const errG = (oldG - newG) * intensityRatio * 0.5;
        const errB = (oldB - newB) * intensityRatio * 0.5;

        data[i] = newR + (oldR - newR) * (1 - intensityRatio * 0.5);
        data[i + 1] = newG + (oldG - newG) * (1 - intensityRatio * 0.5);
        data[i + 2] = newB + (oldB - newB) * (1 - intensityRatio * 0.5);

        if (x + 1 < width) {
          const right = i + 4;
          data[right] += errR * 7 / 16;
          data[right + 1] += errG * 7 / 16;
          data[right + 2] += errB * 7 / 16;
        }
        if (y + 1 < height) {
          if (x > 0) {
            const bottomLeft = ((y + 1) * width + x - 1) * 4;
            data[bottomLeft] += errR * 3 / 16;
            data[bottomLeft + 1] += errG * 3 / 16;
            data[bottomLeft + 2] += errB * 3 / 16;
          }
          const bottom = ((y + 1) * width + x) * 4;
          data[bottom] += errR * 5 / 16;
          data[bottom + 1] += errG * 5 / 16;
          data[bottom + 2] += errB * 5 / 16;
          if (x + 1 < width) {
            const bottomRight = ((y + 1) * width + x + 1) * 4;
            data[bottomRight] += errR * 1 / 16;
            data[bottomRight + 1] += errG * 1 / 16;
            data[bottomRight + 2] += errB * 1 / 16;
          }
        }
      }
    }
  }

  applyBrushStrokes(imageData, strokeSize, intensityRatio) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const tempData = new Uint8ClampedArray(data);
    const size = Math.floor(strokeSize * intensityRatio * 2);

    if (size < 2) return;

    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        for (let dy = 0; dy < size && y + dy < height; dy++) {
          for (let dx = 0; dx < size && x + dx < width; dx++) {
            const i = ((y + dy) * width + x + dx) * 4;
            sumR += tempData[i];
            sumG += tempData[i + 1];
            sumB += tempData[i + 2];
            count++;
          }
        }

        const avgR = sumR / count;
        const avgG = sumG / count;
        const avgB = sumB / count;

        for (let dy = 0; dy < size && y + dy < height; dy++) {
          for (let dx = 0; dx < size && x + dx < width; dx++) {
            const i = ((y + dy) * width + x + dx) * 4;
            data[i] = tempData[i] + (avgR - tempData[i]) * 0.6 * intensityRatio;
            data[i + 1] = tempData[i + 1] + (avgG - tempData[i + 1]) * 0.6 * intensityRatio;
            data[i + 2] = tempData[i + 2] + (avgB - tempData[i + 2]) * 0.6 * intensityRatio;
          }
        }
      }
    }
  }

  blendStyles(style1Id, style2Id, ratio) {
    const style1 = artStyles[style1Id];
    const style2 = artStyles[style2Id];
    
    if (!style1 || !style2) return null;

    const blended = {
      name: `${style1.name} + ${style2.name}`,
      icon: '🎨',
      filters: {},
      colorPalette: [],
      brushStroke: 0,
      ditherLevel: 0
    };

    for (const key in style1.filters) {
      blended.filters[key] = style1.filters[key] * (1 - ratio) + style2.filters[key] * ratio;
    }

    const paletteLength = Math.min(style1.colorPalette.length, style2.colorPalette.length);
    for (let i = 0; i < paletteLength; i++) {
      blended.colorPalette.push([
        Math.round(style1.colorPalette[i][0] * (1 - ratio) + style2.colorPalette[i][0] * ratio),
        Math.round(style1.colorPalette[i][1] * (1 - ratio) + style2.colorPalette[i][1] * ratio),
        Math.round(style1.colorPalette[i][2] * (1 - ratio) + style2.colorPalette[i][2] * ratio)
      ]);
    }

    blended.brushStroke = style1.brushStroke * (1 - ratio) + style2.brushStroke * ratio;
    blended.ditherLevel = style1.ditherLevel * (1 - ratio) + style2.ditherLevel * ratio;

    return blended;
  }

  async processInChunks(img, style, intensity, targetWidth, targetHeight, onProgress) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    tempCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
    const width = targetWidth;
    const height = targetHeight;
    const chunkSize = 64;
    const totalChunks = Math.ceil(width / chunkSize) * Math.ceil(height / chunkSize);
    let processedChunks = 0;

    const resultData = new ImageData(width, height);
    
    const styleConfig = artStyles[style];
    if (!styleConfig) return imageData;

    const intensityRatio = intensity / 100;

    for (let y = 0; y < height; y += chunkSize) {
      for (let x = 0; x < width; x += chunkSize) {
        const chunkWidth = Math.min(chunkSize, width - x);
        const chunkHeight = Math.min(chunkSize, height - y);

        for (let dy = 0; dy < chunkHeight; dy++) {
          for (let dx = 0; dx < chunkWidth; dx++) {
            const srcIdx = ((y + dy) * width + x + dx) * 4;
            const dstIdx = srcIdx;
            
            resultData.data[dstIdx] = imageData.data[srcIdx];
            resultData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
            resultData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
            resultData.data[dstIdx + 3] = imageData.data[srcIdx + 3];

            let r = resultData.data[dstIdx];
            let g = resultData.data[dstIdx + 1];
            let b = resultData.data[dstIdx + 2];

            r = this.applyBrightness(r, styleConfig.filters.brightness, intensityRatio);
            g = this.applyBrightness(g, styleConfig.filters.brightness, intensityRatio);
            b = this.applyBrightness(b, styleConfig.filters.brightness, intensityRatio);

            r = this.applyContrast(r, styleConfig.filters.contrast, intensityRatio);
            g = this.applyContrast(g, styleConfig.filters.contrast, intensityRatio);
            b = this.applyContrast(b, styleConfig.filters.contrast, intensityRatio);

            const hsl = this.rgbToHsl(r, g, b);
            hsl[0] = (hsl[0] + styleConfig.filters.hueRotate * intensityRatio + 360) % 360;
            hsl[1] = Math.min(1, hsl[1] * (1 + (styleConfig.filters.saturation - 1) * intensityRatio));
            const rgb = this.hslToRgb(hsl[0], hsl[1], hsl[2]);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];

            const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;
            const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;
            const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;
            r = r + (sepiaR - r) * styleConfig.filters.sepia * intensityRatio;
            g = g + (sepiaG - g) * styleConfig.filters.sepia * intensityRatio;
            b = b + (sepiaB - b) * styleConfig.filters.sepia * intensityRatio;

            if (styleConfig.colorPalette && intensityRatio > 0.3) {
              const paletteRatio = (intensityRatio - 0.3) / 0.7;
              const nearestColor = this.findNearestColor([r, g, b], styleConfig.colorPalette);
              r = r + (nearestColor[0] - r) * styleConfig.ditherLevel * paletteRatio;
              g = g + (nearestColor[1] - g) * styleConfig.ditherLevel * paletteRatio;
              b = b + (nearestColor[2] - b) * styleConfig.ditherLevel * paletteRatio;
            }

            resultData.data[dstIdx] = Math.max(0, Math.min(255, r));
            resultData.data[dstIdx + 1] = Math.max(0, Math.min(255, g));
            resultData.data[dstIdx + 2] = Math.max(0, Math.min(255, b));
          }
        }

        processedChunks++;
        if (onProgress) {
          onProgress(processedChunks / totalChunks, { x, y, width: chunkWidth, height: chunkHeight });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    return resultData;
  }
}
