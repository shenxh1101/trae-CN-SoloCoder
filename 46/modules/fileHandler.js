const STORAGE_KEY = 'pixelArtData';

export class FileHandler {
    constructor(canvasEngine, animationController) {
        this.canvasEngine = canvasEngine;
        this.animationController = animationController;
        this.saveTimeout = null;
        this.debounceDelay = 300;
    }

    exportPNG(scale = 10) {
        const exportCanvas = this.canvasEngine.exportScaled(scale);
        const dataURL = exportCanvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `pixel-art-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        
        this.updateStatus('已导出PNG图片');
    }

    exportAnimation(scale = 10) {
        const frames = this.animationController.getFrames();
        if (!frames || frames.length === 0) return;
        
        for (let i = 0; i < frames.length; i++) {
            const tempCanvas = document.createElement('canvas');
            const size = 32 * scale;
            tempCanvas.width = size;
            tempCanvas.height = size;
            const ctx = tempCanvas.getContext('2d');
            
            ctx.imageSmoothingEnabled = false;
            
            for (let y = 0; y < 32; y++) {
                for (let x = 0; x < 32; x++) {
                    ctx.fillStyle = frames[i][y][x];
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
            
            const dataURL = tempCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `pixel-art-frame-${i + 1}.png`;
            link.href = dataURL;
            link.click();
        }
        
        this.updateStatus(`已导出 ${frames.length} 帧`);
    }

    importPNG(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/png')) {
                reject(new Error('请选择PNG格式的图片'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    this.canvasEngine.importFromImageData(imageData);
                    
                    this.updateStatus('已导入PNG图片');
                    resolve(true);
                };
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    saveToLocalStorage(extraData = {}) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            try {
                this.animationController.saveCurrentFrameToMemory();
                const data = {
                    version: '1.0',
                    frames: this.animationController.getFrames().map(frame => 
                        frame.map(row => [...row])
                    ),
                    currentFrame: this.animationController.getCurrentFrameIndex(),
                    currentColor: extraData.currentColor || '#000000',
                    currentTool: extraData.currentTool || 'pencil',
                    showGrid: extraData.showGrid !== undefined ? extraData.showGrid : true,
                    fps: this.animationController.getFPS(),
                    animationEnabled: extraData.animationEnabled || false,
                    savedAt: Date.now()
                };
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                this.updateStatus('已自动保存');
            } catch (e) {
                console.error('保存到localStorage失败:', e);
            }
        }, this.debounceDelay);
    }

    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;
            
            const data = JSON.parse(stored);
            if (data.version !== '1.0') return null;
            
            return data;
        } catch (e) {
            console.error('从localStorage加载失败:', e);
            return null;
        }
    }

    hasSavedData() {
        return localStorage.getItem(STORAGE_KEY) !== null;
    }

    clearSavedData() {
        localStorage.removeItem(STORAGE_KEY);
    }

    updateStatus(text) {
        const statusEl = document.getElementById('status-text');
        if (statusEl) {
            statusEl.textContent = text;
        }
    }
}
