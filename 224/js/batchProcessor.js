class BatchProcessor {
    constructor() {
        this.files = [];
        this.results = [];
        this.isProcessing = false;
        this.segmentationEngine = null;
        this.onProgress = null;
        this.onComplete = null;
    }

    setSegmentationEngine(engine) {
        this.segmentationEngine = engine;
    }

    async loadZip(zipFile) {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip not loaded');
        }

        this.files = [];
        this.results = [];

        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
        const imageFiles = [];

        content.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                const ext = relativePath.toLowerCase().slice(-4);
                if (imageExtensions.some(e => ext === e || ext === '.jpeg')) {
                    imageFiles.push({
                        name: zipEntry.name,
                        path: relativePath,
                        entry: zipEntry
                    });
                }
            }
        });

        for (const file of imageFiles) {
            try {
                const blob = await file.entry.async('blob');
                const image = await Utils.fileToImage(blob);
                this.files.push({
                    id: Utils.generateId(),
                    name: file.name,
                    image: image,
                    status: 'pending',
                    result: null
                });
            } catch (e) {
                console.error(`Failed to load ${file.name}:`, e);
                this.files.push({
                    id: Utils.generateId(),
                    name: file.name,
                    image: null,
                    status: 'failed',
                    error: e.message
                });
            }
        }

        return this.files;
    }

    addFile(file) {
        return new Promise((resolve, reject) => {
            Utils.fileToImage(file).then(image => {
                const fileItem = {
                    id: Utils.generateId(),
                    name: file.name,
                    image: image,
                    status: 'pending',
                    result: null
                };
                this.files.push(fileItem);
                resolve(fileItem);
            }).catch(reject);
        });
    }

    async processAll(progressCallback = null) {
        if (this.isProcessing) return;
        if (!this.segmentationEngine) {
            throw new Error('Segmentation engine not set');
        }

        this.isProcessing = true;
        this.results = [];
        
        const pendingFiles = this.files.filter(f => f.status !== 'failed');
        const total = pendingFiles.length;
        let completed = 0;
        let failed = 0;

        for (const file of pendingFiles) {
            if (!this.isProcessing) break;
            
            file.status = 'processing';
            if (progressCallback) {
                progressCallback(completed / total, file.name, 'processing');
            }

            try {
                const result = await this._processSingle(file);
                file.status = 'completed';
                file.result = result;
                this.results.push(file);
                completed++;
            } catch (e) {
                console.error(`Failed to process ${file.name}:`, e);
                file.status = 'failed';
                file.error = e.message;
                failed++;
            }

            if (progressCallback) {
                progressCallback((completed + failed) / total, file.name, file.status);
            }
        }

        this.isProcessing = false;
        
        if (this.onComplete) {
            this.onComplete({
                total,
                completed,
                failed,
                results: this.results
            });
        }

        return {
            total,
            completed,
            failed,
            results: this.results
        };
    }

    async _processSingle(fileItem) {
        if (!fileItem.image) {
            throw new Error('No image data');
        }

        const result = await this.segmentationEngine.segmentImage(fileItem.image);
        
        const foregroundData = ImageProcessor.getImageDataFromImage(fileItem.image);
        
        const processedMask = ImageProcessor.processMask(result.mask, {
            featherRadius: 5,
            edgeAdjust: 0,
            shadowData: null,
            shadowOpacity: 0.6
        });

        const resultCanvas = ImageProcessor.composeImage(
            foregroundData,
            null,
            processedMask,
            { x: 0, y: 0, scale: 1 },
            1
        );

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = result.mask.width;
        maskCanvas.height = result.mask.height;
        const grayscaleMask = ImageProcessor.createGrayscaleMask(processedMask);
        maskCanvas.getContext('2d').putImageData(grayscaleMask, 0, 0);

        const previewCanvas = document.createElement('canvas');
        const previewSize = 200;
        const scale = Math.min(previewSize / resultCanvas.width, previewSize / resultCanvas.height);
        previewCanvas.width = resultCanvas.width * scale;
        previewCanvas.height = resultCanvas.height * scale;
        const previewCtx = previewCanvas.getContext('2d');
        
        previewCtx.fillStyle = '#1a1a2e';
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 10;
        patternCanvas.height = 10;
        const patternCtx = patternCanvas.getContext('2d');
        patternCtx.fillStyle = '#16213e';
        patternCtx.fillRect(0, 0, 10, 10);
        patternCtx.fillStyle = '#1a1a2e';
        patternCtx.fillRect(0, 0, 5, 5);
        patternCtx.fillRect(5, 5, 5, 5);
        const pattern = previewCtx.createPattern(patternCanvas, 'repeat');
        previewCtx.fillStyle = pattern;
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        previewCtx.drawImage(resultCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

        return {
            resultCanvas,
            maskCanvas,
            previewCanvas,
            processingTime: result.processingTime,
            confidence: result.confidence
        };
    }

    async exportZip(progressCallback = null) {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip not loaded');
        }

        const zip = new JSZip();
        const resultsFolder = zip.folder('processed_images');
        const masksFolder = zip.folder('masks');

        const completedResults = this.results.filter(r => r.status === 'completed');
        const total = completedResults.length;
        let processed = 0;

        for (const fileItem of completedResults) {
            const baseName = Utils.getFilenameWithoutExtension(fileItem.name);
            
            const resultBlob = await Utils.canvasToBlob(fileItem.result.resultCanvas, 'image/png');
            resultsFolder.file(`${baseName}_no_bg.png`, resultBlob);
            
            const maskBlob = await Utils.canvasToBlob(fileItem.result.maskCanvas, 'image/png');
            masksFolder.file(`${baseName}_mask.png`, maskBlob);

            processed++;
            if (progressCallback) {
                progressCallback(processed / total, fileItem.name);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' }, (meta) => {
            if (progressCallback) {
                progressCallback(meta.percent / 100, 'Generating ZIP...');
            }
        });

        return zipBlob;
    }

    async downloadResult(fileId) {
        const fileItem = this.files.find(f => f.id === fileId);
        if (!fileItem || !fileItem.result) return;

        const baseName = Utils.getFilenameWithoutExtension(fileItem.name);
        const blob = await Utils.canvasToBlob(fileItem.result.resultCanvas, 'image/png');
        Utils.downloadBlob(blob, `${baseName}_no_bg.png`);
    }

    async downloadMask(fileId) {
        const fileItem = this.files.find(f => f.id === fileId);
        if (!fileItem || !fileItem.result) return;

        const baseName = Utils.getFilenameWithoutExtension(fileItem.name);
        const blob = await Utils.canvasToBlob(fileItem.result.maskCanvas, 'image/png');
        Utils.downloadBlob(blob, `${baseName}_mask.png`);
    }

    getFiles() {
        return [...this.files];
    }

    getResults() {
        return [...this.results];
    }

    getStats() {
        const total = this.files.length;
        const completed = this.files.filter(f => f.status === 'completed').length;
        const failed = this.files.filter(f => f.status === 'failed').length;
        const pending = this.files.filter(f => f.status === 'pending').length;
        const processing = this.files.filter(f => f.status === 'processing').length;

        return {
            total,
            completed,
            failed,
            pending,
            processing
        };
    }

    stopProcessing() {
        this.isProcessing = false;
    }

    clear() {
        this.stopProcessing();
        this.files = [];
        this.results = [];
    }

    retryFailed() {
        this.files.forEach(f => {
            if (f.status === 'failed') {
                f.status = 'pending';
                f.error = null;
            }
        });
    }
}
