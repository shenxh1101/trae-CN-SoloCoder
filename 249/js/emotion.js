class EmotionDetector {
    constructor() {
        this.isModelLoaded = false;
        this.modelUrl = './models';
        this.options = null;
        this.lastEmotions = null;
        this.lowConfidenceThreshold = 0.5;
        this.onEmotionDetected = null;
        this.onLowConfidence = null;
        this.onNoFace = null;
    }

    async loadModels(onProgress) {
        try {
            if (onProgress) onProgress('正在加载面部检测模型...');
            await faceapi.nets.tinyFaceDetector.loadFromUri(this.modelUrl);
            
            if (onProgress) onProgress('正在加载表情识别模型...');
            await faceapi.nets.faceExpressionNet.loadFromUri(this.modelUrl);
            
            this.options = new faceapi.TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.5
            });
            
            this.isModelLoaded = true;
            if (onProgress) onProgress('模型加载完成！');
            return true;
        } catch (error) {
            console.error('Failed to load models:', error);
            throw new Error('模型加载失败，请检查网络连接');
        }
    }

    async detectEmotions(videoElement) {
        if (!this.isModelLoaded) {
            return null;
        }

        try {
            const detections = await faceapi
                .detectAllFaces(videoElement, this.options)
                .withFaceExpressions();

            if (detections.length > 0) {
                const expressions = detections[0].expressions;
                const box = detections[0].detection.box;
                const emotions = this.processExpressions(expressions, box);
                
                if (emotions.confidence >= this.lowConfidenceThreshold) {
                    this.lastEmotions = emotions;
                    if (this.onEmotionDetected) {
                        this.onEmotionDetected(emotions);
                    }
                } else {
                    if (this.onLowConfidence) {
                        this.onLowConfidence(emotions);
                    }
                }
                
                return emotions;
            } else {
                if (this.onNoFace) {
                    this.onNoFace();
                }
            }
            
            return null;
        } catch (error) {
            console.error('Detection error:', error);
            return null;
        }
    }

    processExpressions(expressions, faceBox) {
        const emotions = {
            happy: expressions.happy,
            sad: expressions.sad,
            surprised: expressions.surprised,
            angry: expressions.angry,
            fearful: expressions.fearful,
            disgusted: expressions.disgusted,
            neutral: expressions.neutral
        };

        let dominant = 'neutral';
        let maxValue = 0;
        
        Object.entries(emotions).forEach(([key, value]) => {
            if (value > maxValue) {
                maxValue = value;
                dominant = key;
            }
        });

        return {
            timestamp: Date.now(),
            emotions,
            dominant,
            confidence: maxValue,
            faceBox: faceBox ? {
                x: faceBox.x,
                y: faceBox.y,
                width: faceBox.width,
                height: faceBox.height
            } : null
        };
    }

    getLastEmotions() {
        return this.lastEmotions;
    }

    setLowConfidenceThreshold(threshold) {
        this.lowConfidenceThreshold = threshold;
    }
}
