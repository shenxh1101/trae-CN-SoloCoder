class SegmentationEngine {
    constructor() {
        this.model = null;
        this.modelLoaded = false;
        this.modelType = 'general';
        this.processingTime = 0;
        this.confidence = 0;
        this.onProgress = null;
    }

    async loadModel(modelType = 'general') {
        this.modelType = modelType;
        
        if (this.modelLoaded) {
            return true;
        }

        return new Promise((resolve, reject) => {
            try {
                if (typeof SelfieSegmentation === 'undefined') {
                    reject(new Error('MediaPipe Selfie Segmentation not loaded'));
                    return;
                }

                const modelSelection = modelType === 'general' ? 0 : 1;

                this.model = new SelfieSegmentation({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                    }
                });

                this.model.setOptions({
                    modelSelection: modelSelection,
                    selfieMode: false
                });

                this.model.onResults((results) => {
                    this._onResults(results);
                });

                this.model.onLoad = () => {
                    this.modelLoaded = true;
                    resolve(true);
                };

                this.model.initialize().then(() => {
                    this.modelLoaded = true;
                    resolve(true);
                }).catch(reject);

            } catch (e) {
                reject(e);
            }
        });
    }

    setModelType(modelType) {
        this.modelType = modelType;
        if (this.model) {
            const modelSelection = modelType === 'general' ? 0 : 1;
            this.model.setOptions({
                modelSelection: modelSelection,
                selfieMode: false
            });
        }
    }

    async segmentImage(imageElement) {
        if (!this.modelLoaded) {
            await this.loadModel(this.modelType);
        }

        const startTime = performance.now();

        return new Promise((resolve, reject) => {
            const originalOnResults = this.model.onResults;
            
            this.model.onResults = (results) => {
                this.processingTime = performance.now() - startTime;
                
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = results.segmentationMask.width;
                maskCanvas.height = results.segmentationMask.height;
                const maskCtx = maskCanvas.getContext('2d');
                maskCtx.drawImage(results.segmentationMask, 0, 0);
                
                const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                this.confidence = this._calculateConfidence(maskData);
                
                this.model.onResults = originalOnResults;
                resolve({
                    mask: maskData,
                    maskCanvas: maskCanvas,
                    processingTime: this.processingTime,
                    confidence: this.confidence
                });
            };

            this.model.send({ image: imageElement }).catch(reject);
        });
    }

    async segmentImageWithProgress(imageElement, progressCallback) {
        this.onProgress = progressCallback;
        
        if (progressCallback) {
            progressCallback(0.1, '加载模型...');
        }

        await this.loadModel(this.modelType);
        
        if (progressCallback) {
            progressCallback(0.4, '分析图片...');
        }

        const result = await this.segmentImage(imageElement);
        
        if (progressCallback) {
            progressCallback(1.0, '处理完成');
        }

        return result;
    }

    _onResults(results) {
    }

    _calculateConfidence(maskData) {
        const data = maskData.data;
        let foregroundPixels = 0;
        let totalPixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha > 128) {
                foregroundPixels++;
            }
        }

        const foregroundRatio = foregroundPixels / totalPixels;
        const edgeConfidence = this._calculateEdgeConfidence(maskData);
        
        const confidence = (foregroundRatio * 0.4 + edgeConfidence * 0.6) * 100;
        return Math.min(99, Math.max(30, confidence));
    }

    _calculateEdgeConfidence(maskData) {
        const data = maskData.data;
        const width = maskData.width;
        const height = maskData.height;
        let edgePixels = 0;
        let strongEdges = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const idxLeft = (y * width + (x - 1)) * 4;
                const idxRight = (y * width + (x + 1)) * 4;
                const idxUp = ((y - 1) * width + x) * 4;
                const idxDown = ((y + 1) * width + x) * 4;

                const center = data[idx + 3];
                const left = data[idxLeft + 3];
                const right = data[idxRight + 3];
                const up = data[idxUp + 3];
                const down = data[idxDown + 3];

                const gradX = Math.abs(right - left);
                const gradY = Math.abs(down - up);
                const gradient = Math.sqrt(gradX * gradX + gradY * gradY);

                if (gradient > 20) {
                    edgePixels++;
                    if (gradient > 100) {
                        strongEdges++;
                    }
                }
            }
        }

        if (edgePixels === 0) return 0.5;
        return Math.min(1, strongEdges / edgePixels + 0.3);
    }

    getConfidence() {
        return this.confidence;
    }

    getProcessingTime() {
        return this.processingTime;
    }

    isLoaded() {
        return this.modelLoaded;
    }

    dispose() {
        if (this.model) {
            this.model.close();
            this.model = null;
        }
        this.modelLoaded = false;
    }
}
