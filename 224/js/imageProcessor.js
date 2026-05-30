class ImageProcessor {
    static featherMask(maskData, radius) {
        if (radius <= 0) return maskData;

        const { data, width, height } = maskData;
        const resultData = new Uint8ClampedArray(data);
        const tempData = new Uint8ClampedArray(data);

        const sigma = Math.max(radius / 3, 0.5);
        const kernel = this._createGaussianKernel1D(radius, sigma);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                let sum = 0;
                let weightSum = 0;

                for (let k = -radius; k <= radius; k++) {
                    const px = x + k;
                    if (px >= 0 && px < width) {
                        const pidx = (y * width + px) * 4;
                        const weight = kernel[k + radius];
                        sum += data[pidx + 3] * weight;
                        weightSum += weight;
                    }
                }

                tempData[idx + 3] = Math.round(sum / weightSum);
            }
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                let sum = 0;
                let weightSum = 0;

                for (let k = -radius; k <= radius; k++) {
                    const py = y + k;
                    if (py >= 0 && py < height) {
                        const pidx = (py * width + x) * 4;
                        const weight = kernel[k + radius];
                        sum += tempData[pidx + 3] * weight;
                        weightSum += weight;
                    }
                }

                resultData[idx + 3] = Math.round(sum / weightSum);
            }
        }

        for (let i = 0; i < resultData.length; i += 4) {
            resultData[i] = 255;
            resultData[i + 1] = 255;
            resultData[i + 2] = 255;
        }

        return new ImageData(resultData, width, height);
    }

    static _createGaussianKernel1D(radius, sigma) {
        const size = radius * 2 + 1;
        const kernel = new Float32Array(size);
        let sum = 0;

        for (let i = 0; i < size; i++) {
            const x = i - radius;
            const value = Math.exp(-(x * x) / (2 * sigma * sigma));
            kernel[i] = value;
            sum += value;
        }

        for (let i = 0; i < size; i++) {
            kernel[i] /= sum;
        }

        return kernel;
    }

    static erodeMask(maskData, amount) {
        if (amount <= 0) return this.dilateMask(maskData, -amount);
        if (amount === 0) return maskData;

        const { data, width, height } = maskData;
        const resultData = new Uint8ClampedArray(data);

        for (let y = amount; y < height - amount; y++) {
            for (let x = amount; x < width - amount; x++) {
                const idx = (y * width + x) * 4;
                let minAlpha = 255;

                for (let ky = -amount; ky <= amount; ky++) {
                    for (let kx = -amount; kx <= amount; kx++) {
                        const pidx = ((y + ky) * width + (x + kx)) * 4;
                        minAlpha = Math.min(minAlpha, data[pidx + 3]);
                    }
                }

                resultData[idx + 3] = minAlpha;
            }
        }

        return new ImageData(resultData, width, height);
    }

    static dilateMask(maskData, amount) {
        if (amount <= 0) return maskData;

        const { data, width, height } = maskData;
        const resultData = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                let maxAlpha = 0;

                const startY = Math.max(0, y - amount);
                const endY = Math.min(height - 1, y + amount);
                const startX = Math.max(0, x - amount);
                const endX = Math.min(width - 1, x + amount);

                for (let ky = startY; ky <= endY; ky++) {
                    for (let kx = startX; kx <= endX; kx++) {
                        const pidx = (ky * width + kx) * 4;
                        maxAlpha = Math.max(maxAlpha, data[pidx + 3]);
                    }
                }

                resultData[idx + 3] = maxAlpha;
            }
        }

        return new ImageData(resultData, width, height);
    }

    static adjustMaskEdge(maskData, amount) {
        if (amount > 0) {
            return this.dilateMask(maskData, amount);
        } else if (amount < 0) {
            return this.erodeMask(maskData, -amount);
        }
        return maskData;
    }

    static extractShadow(originalImageData, maskData, threshold = 0.3) {
        const { data: origData, width, height } = originalImageData;
        const { data: maskDataArr } = maskData;
        const shadowData = new Uint8ClampedArray(width * height * 4);

        for (let i = 0; i < origData.length; i += 4) {
            const maskAlpha = maskDataArr[i + 3] / 255;
            
            if (maskAlpha > 0.1 && maskAlpha < 0.9) {
                const r = origData[i] / 255;
                const g = origData[i + 1] / 255;
                const b = origData[i + 2] / 255;
                
                const brightness = (r + g + b) / 3;
                const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                
                if (brightness < (1 - threshold) && saturation < 0.3) {
                    const shadowStrength = (1 - brightness) * maskAlpha;
                    shadowData[i] = 0;
                    shadowData[i + 1] = 0;
                    shadowData[i + 2] = 0;
                    shadowData[i + 3] = Math.round(shadowStrength * 255 * 0.8);
                }
            }
        }

        return new ImageData(shadowData, width, height);
    }

    static applyShadowToMask(maskData, shadowData, opacity = 0.6) {
        const { data: maskArr, width, height } = maskData;
        const { data: shadowArr } = shadowData;
        const resultData = new Uint8ClampedArray(maskArr);

        for (let i = 0; i < resultData.length; i += 4) {
            const shadowAlpha = shadowArr[i + 3] / 255;
            if (shadowAlpha > 0) {
                const currentAlpha = resultData[i + 3] / 255;
                const combinedAlpha = currentAlpha + shadowAlpha * opacity * (1 - currentAlpha);
                resultData[i + 3] = Math.round(combinedAlpha * 255);
            }
        }

        return new ImageData(resultData, width, height);
    }

    static composeImage(foregroundImageData, backgroundData, maskData, position = { x: 0, y: 0, scale: 1 }, bgOpacity = 1) {
        const { width, height } = foregroundImageData;
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = width;
        resultCanvas.height = height;
        const ctx = resultCanvas.getContext('2d');

        if (backgroundData) {
            ctx.globalAlpha = bgOpacity;
            if (typeof backgroundData === 'string') {
                if (backgroundData.startsWith('gradient:')) {
                    const gradientInfo = JSON.parse(backgroundData.replace('gradient:', ''));
                    const gradient = ctx.createLinearGradient(
                        0, 0, 
                        width * Math.cos(gradientInfo.angle * Math.PI / 180), 
                        height * Math.sin(gradientInfo.angle * Math.PI / 180)
                    );
                    gradient.addColorStop(0, gradientInfo.colors[0]);
                    gradient.addColorStop(1, gradientInfo.colors[1]);
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = backgroundData;
                }
                ctx.fillRect(0, 0, width, height);
            } else if (backgroundData instanceof HTMLImageElement || backgroundData instanceof CanvasImageSource) {
                ctx.drawImage(backgroundData, 0, 0, width, height);
            } else if (backgroundData instanceof ImageData) {
                ctx.putImageData(backgroundData, 0, 0);
            }
            ctx.globalAlpha = 1;
        }

        const { data: fgData } = foregroundImageData;
        const { data: maskArr } = maskData;

        const drawX = position.x;
        const drawY = position.y;
        const drawWidth = width * position.scale;
        const drawHeight = height * position.scale;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        const fgCanvas = document.createElement('canvas');
        fgCanvas.width = width;
        fgCanvas.height = height;
        fgCanvas.getContext('2d').putImageData(foregroundImageData, 0, 0);

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        maskCanvas.getContext('2d').putImageData(maskData, 0, 0);

        tempCtx.drawImage(fgCanvas, drawX, drawY, drawWidth, drawHeight);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(maskCanvas, drawX, drawY, drawWidth, drawHeight);
        tempCtx.globalCompositeOperation = 'source-over';

        ctx.drawImage(tempCanvas, 0, 0);

        return resultCanvas;
    }

    static createGrayscaleMask(maskData) {
        const { data, width, height } = maskData;
        const resultData = new Uint8ClampedArray(data.length);

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            resultData[i] = alpha;
            resultData[i + 1] = alpha;
            resultData[i + 2] = alpha;
            resultData[i + 3] = 255;
        }

        return new ImageData(resultData, width, height);
    }

    static createColorMaskOverlay(maskData, color = [99, 102, 241, 0.5]) {
        const { data, width, height } = maskData;
        const resultData = new Uint8ClampedArray(data.length);

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3] / 255;
            resultData[i] = color[0];
            resultData[i + 1] = color[1];
            resultData[i + 2] = color[2];
            resultData[i + 3] = Math.round(alpha * color[3] * 255);
        }

        return new ImageData(resultData, width, height);
    }

    static getImageDataFromImage(image) {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    static resizeImageData(imageData, maxSize = 1920) {
        const { width, height, data } = imageData;
        
        if (width <= maxSize && height <= maxSize) {
            return imageData;
        }

        const ratio = Math.min(maxSize / width, maxSize / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        const ctx = resizedCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

        return ctx.getImageData(0, 0, newWidth, newHeight);
    }

    static processMask(originalMask, options = {}) {
        const {
            featherRadius = 0,
            edgeAdjust = 0,
            shadowData = null,
            shadowOpacity = 0.6
        } = options;

        let processedMask = this.adjustMaskEdge(originalMask, edgeAdjust);
        
        if (featherRadius > 0) {
            processedMask = this.featherMask(processedMask, featherRadius);
        }

        if (shadowData) {
            processedMask = this.applyShadowToMask(processedMask, shadowData, shadowOpacity);
        }

        return processedMask;
    }
}
