const Utils = {
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
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    },

    fileToImage(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('File is not an image'));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                this.loadImage(e.target.result).then(resolve).catch(reject);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    canvasToBlob(canvas, type = 'image/png', quality = 1.0) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to convert canvas to blob'));
            }, type, quality);
        });
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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

    formatTime(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        return `${(ms / 1000).toFixed(2)}s`;
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    getMousePosition(e, element) {
        const rect = element.getBoundingClientRect();
        return {
            x: (e.clientX || e.touches?.[0]?.clientX) - rect.left,
            y: (e.clientY || e.touches?.[0]?.clientY) - rect.top
        };
    },

    getTouchPosition(e, element) {
        if (e.touches && e.touches.length > 0) {
            return this.getMousePosition(e, element);
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            const rect = element.getBoundingClientRect();
            return {
                x: e.changedTouches[0].clientX - rect.left,
                y: e.changedTouches[0].clientY - rect.top
            };
        }
        return { x: 0, y: 0 };
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    async readClipboardImage() {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        return this.loadImage(URL.createObjectURL(blob));
                    }
                }
            }
        } catch (e) {
            console.warn('Clipboard access denied or no image found:', e);
        }
        return null;
    },

    async getCameraStream(facingMode = 'user') {
        try {
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
            console.error('Camera access denied:', e);
            throw e;
        }
    },

    stopCameraStream(stream) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    },

    getFilenameWithoutExtension(filename) {
        return filename.replace(/\.[^/.]+$/, '');
    },

    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    }
};
