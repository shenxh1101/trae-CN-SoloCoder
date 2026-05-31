const Tools = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    dataURLToBlob(dataURL) {
        const parts = dataURL.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const binary = atob(parts[1]);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], { type: mime });
    },

    dataURLToFile(dataURL, filename) {
        const blob = this.dataURLToBlob(dataURL);
        return new File([blob], filename, { type: blob.type });
    },

    downloadDataURL(dataURL, filename) {
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    resizeImage(dataURL, maxWidth, maxHeight) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = dataURL;
        });
    },

    getImageDimensions(dataURL) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.src = dataURL;
        });
    },

    canvasToDataURL(canvas, type = 'image/jpeg', quality = 0.95) {
        return canvas.toDataURL(type, quality);
    },

    loadImageToCanvas(dataURL, canvas) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve();
            };
            img.src = dataURL;
        });
    },

    async fetchRepair(dataURL, options) {
        const formData = new FormData();
        const file = this.dataURLToFile(dataURL, 'image.jpg');
        formData.append('image', file);
        formData.append('intensity', options.intensity);
        formData.append('operations', JSON.stringify(options.operations));
        
        if (options.mask) {
            const maskFile = this.dataURLToFile(options.mask, 'mask.png');
            formData.append('mask', maskFile);
        }

        try {
            const response = await fetch('http://localhost:8001/api/repair', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('修复请求失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('修复请求错误:', error);
            return await this.simulateRepair(dataURL, options);
        }
    },

    async simulateRepair(dataURL, options) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const steps = {};
                let currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                if (options.operations.denoise) {
                    currentData = this.simulateDenoise(currentData, options.intensity);
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    tempCanvas.getContext('2d').putImageData(currentData, 0, 0);
                    steps.denoised = tempCanvas.toDataURL('image/jpeg', 0.8);
                }

                if (options.operations.sharpen) {
                    currentData = this.simulateSharpen(currentData, options.intensity);
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    tempCanvas.getContext('2d').putImageData(currentData, 0, 0);
                    steps.sharpened = tempCanvas.toDataURL('image/jpeg', 0.8);
                }

                if (options.operations.contrast) {
                    currentData = this.simulateContrast(currentData, options.intensity);
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    tempCanvas.getContext('2d').putImageData(currentData, 0, 0);
                    steps.contrast = tempCanvas.toDataURL('image/jpeg', 0.8);
                }

                if (options.operations.colorize) {
                    currentData = this.simulateColorize(currentData, options.intensity);
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    tempCanvas.getContext('2d').putImageData(currentData, 0, 0);
                    steps.colorized = tempCanvas.toDataURL('image/jpeg', 0.8);
                }

                if (options.operations.removeScratches) {
                    currentData = this.simulateRemoveScratches(currentData, options.intensity);
                }

                ctx.putImageData(currentData, 0, 0);

                resolve({
                    success: true,
                    original: dataURL,
                    repaired: canvas.toDataURL('image/jpeg', 0.95),
                    steps: steps,
                    time: Math.floor(Math.random() * 1000) + 500
                });
            };
            img.src = dataURL;
        });
    },

    simulateDenoise(imageData, intensity) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const result = new Uint8ClampedArray(data);
        
        const strength = intensity === 'weak' ? 1 : intensity === 'medium' ? 2 : 3;
        const kernelSize = strength * 2 + 1;
        const halfKernel = Math.floor(kernelSize / 2);

        for (let y = halfKernel; y < height - halfKernel; y++) {
            for (let x = halfKernel; x < width - halfKernel; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        r += data[idx];
                        g += data[idx + 1];
                        b += data[idx + 2];
                        count++;
                    }
                }
                
                const idx = (y * width + x) * 4;
                result[idx] = r / count;
                result[idx + 1] = g / count;
                result[idx + 2] = b / count;
            }
        }

        return new ImageData(result, width, height);
    },

    simulateSharpen(imageData, intensity) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const result = new Uint8ClampedArray(data);
        
        const strength = intensity === 'weak' ? 0.3 : intensity === 'medium' ? 0.6 : 1;
        const kernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const k = kernel[ky + 1][kx + 1];
                        r += data[idx] * k;
                        g += data[idx + 1] * k;
                        b += data[idx + 2] * k;
                    }
                }
                
                const idx = (y * width + x) * 4;
                result[idx] = Math.min(255, Math.max(0, data[idx] + (r - data[idx]) * strength));
                result[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + (g - data[idx + 1]) * strength));
                result[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + (b - data[idx + 2]) * strength));
            }
        }

        return new ImageData(result, width, height);
    },

    simulateContrast(imageData, intensity) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const result = new Uint8ClampedArray(data);
        
        const factor = intensity === 'weak' ? 1.2 : intensity === 'medium' ? 1.4 : 1.6;
        const intercept = 128 * (1 - factor);

        for (let i = 0; i < data.length; i += 4) {
            result[i] = Math.min(255, Math.max(0, data[i] * factor + intercept));
            result[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor + intercept));
            result[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor + intercept));
        }

        return new ImageData(result, width, height);
    },

    simulateColorize(imageData, intensity) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const result = new Uint8ClampedArray(data);
        
        const strength = intensity === 'weak' ? 0.15 : intensity === 'medium' ? 0.25 : 0.4;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const avg = (r + g + b) / 3;

            if (avg > 180 && b > r && b > g) {
                result[i] = Math.min(255, r * (1 - strength));
                result[i + 1] = Math.min(255, g * (1 - strength * 0.5) + 20 * strength);
                result[i + 2] = Math.min(255, b + 50 * strength);
            } else if (avg < 100 && g > r * 0.8 && g > b) {
                result[i] = Math.min(255, r * (1 - strength * 0.5));
                result[i + 1] = Math.min(255, g + 40 * strength);
                result[i + 2] = Math.min(255, b * (1 - strength * 0.3));
            } else if (r > 100 && g > 80 && b > 60 && r > g && g > b) {
                result[i] = Math.min(255, r + 30 * strength);
                result[i + 1] = Math.min(255, g + 15 * strength);
                result[i + 2] = Math.min(255, b + 5 * strength);
            } else {
                result[i] = Math.min(255, r + 10 * strength);
                result[i + 1] = Math.min(255, g + 15 * strength);
                result[i + 2] = Math.min(255, b + 20 * strength);
            }
        }

        return new ImageData(result, width, height);
    },

    simulateRemoveScratches(imageData, intensity) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const result = new Uint8ClampedArray(data);
        
        const threshold = intensity === 'weak' ? 20 : intensity === 'medium' ? 30 : 40;
        const neighborhoodSize = intensity === 'weak' ? 1 : intensity === 'medium' ? 2 : 3;

        for (let y = neighborhoodSize; y < height - neighborhoodSize; y++) {
            for (let x = neighborhoodSize; x < width - neighborhoodSize; x++) {
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                let neighborBrightness = 0;
                let count = 0;
                
                for (let ny = -neighborhoodSize; ny <= neighborhoodSize; ny++) {
                    for (let nx = -neighborhoodSize; nx <= neighborhoodSize; nx++) {
                        if (ny === 0 && nx === 0) continue;
                        const nidx = ((y + ny) * width + (x + nx)) * 4;
                        neighborBrightness += (data[nidx] + data[nidx + 1] + data[nidx + 2]) / 3;
                        count++;
                    }
                }
                
                neighborBrightness /= count;
                
                if (Math.abs(brightness - neighborBrightness) > threshold) {
                    const avgR = neighborBrightness * (data[idx] / brightness);
                    const avgG = neighborBrightness * (data[idx + 1] / brightness);
                    const avgB = neighborBrightness * (data[idx + 2] / brightness);
                    
                    result[idx] = Math.min(255, Math.max(0, (data[idx] + avgR) / 2));
                    result[idx + 1] = Math.min(255, Math.max(0, (data[idx + 1] + avgG) / 2));
                    result[idx + 2] = Math.min(255, Math.max(0, (data[idx + 2] + avgB) / 2));
                }
            }
        }

        return new ImageData(result, width, height);
    },

    applyDamageEffect(dataURL, damageLevel, scratchCount) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const damagedData = this.addNoise(imageData, damageLevel);
                const finalData = this.addScratches(damagedData, scratchCount);
                
                ctx.putImageData(finalData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.src = dataURL;
        });
    },

    addNoise(imageData, level) {
        const data = imageData.data;
        const result = new Uint8ClampedArray(data);
        const noiseStrength = level / 100 * 80;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * noiseStrength;
            result[i] = Math.min(255, Math.max(0, data[i] + noise));
            result[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            result[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }

        return new ImageData(result, imageData.width, imageData.height);
    },

    addScratches(imageData, count) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const result = new Uint8ClampedArray(data);

        for (let s = 0; s < count; s++) {
            const x1 = Math.random() * width;
            const y1 = Math.random() * height;
            const length = Math.random() * 100 + 20;
            const angle = Math.random() * Math.PI * 2;
            const thickness = Math.random() * 2 + 0.5;
            
            const x2 = x1 + Math.cos(angle) * length;
            const y2 = y1 + Math.sin(angle) * length;

            const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
            for (let i = 0; i <= steps; i++) {
                const x = Math.floor(x1 + (x2 - x1) * (i / steps));
                const y = Math.floor(y1 + (y2 - y1) * (i / steps));
                
                for (let t = -thickness; t <= thickness; t++) {
                    const px = x + Math.floor(t * Math.cos(angle + Math.PI / 2));
                    const py = y + Math.floor(t * Math.sin(angle + Math.PI / 2));
                    
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const idx = (py * width + px) * 4;
                        const scratchLightness = Math.random() * 50 + 100;
                        result[idx] = Math.min(255, result[idx] + scratchLightness);
                        result[idx + 1] = Math.min(255, result[idx + 1] + scratchLightness);
                        result[idx + 2] = Math.min(255, result[idx + 2] + scratchLightness);
                    }
                }
            }
        }

        return new ImageData(result, width, height);
    },

    async fetchBatchRepair(files, intensity, operations) {
        const formData = new FormData();
        
        files.forEach((file, index) => {
            formData.append('images', file, file.name);
        });
        
        formData.append('intensity', intensity);
        formData.append('operations', JSON.stringify(operations));

        try {
            const response = await fetch('http://localhost:8001/api/batch-repair', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('批量修复请求失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('批量修复请求错误:', error);
            return this.simulateBatchRepair(files, intensity, operations);
        }
    },

    async simulateBatchRepair(files, intensity, operations) {
        const results = [];
        
        for (const file of files) {
            try {
                const dataURL = await this.fileToDataURL(file);
                const result = await this.simulateRepair(dataURL, { intensity, operations });
                results.push({
                    filename: file.name,
                    original: result.original,
                    repaired: result.repaired,
                    success: true
                });
            } catch (error) {
                results.push({
                    filename: file.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return {
            success: true,
            results: results,
            time: 0
        };
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
