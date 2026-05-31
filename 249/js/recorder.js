class VideoRecorder {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.startTime = 0;
        this.frameInterval = 1000;
        this.lastFrameTime = 0;
        this.onRecordingStop = null;
        this.onFrameAnalyzed = null;
        this.onRecordingProgress = null;
        this.emotionAnalyzer = null;
        this.analysisResults = [];
        this.recordingTimerId = null;
    }

    setEmotionAnalyzer(analyzer) {
        this.emotionAnalyzer = analyzer;
    }

    startRecording(stream, videoElement) {
        try {
            this.recordedChunks = [];
            this.analysisResults = [];
            this.startTime = Date.now();
            this.isRecording = true;
            
            const options = this.getSupportedMimeType();
            this.mediaRecorder = new window.MediaRecorder(stream, options);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                if (this.recordingTimerId) {
                    clearInterval(this.recordingTimerId);
                    this.recordingTimerId = null;
                }
                if (this.onRecordingStop) {
                    const videoBlob = new Blob(this.recordedChunks, { type: options.mimeType });
                    this.onRecordingStop({
                        videoBlob,
                        analysisResults: this.analysisResults,
                        duration: (Date.now() - this.startTime) / 1000
                    });
                }
            };
            
            this.mediaRecorder.start(1000);
            this.startFrameAnalysis(videoElement);
            this.startRecordingTimer();
            
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.isRecording = false;
            return false;
        }
    }

    getSupportedMimeType() {
        const types = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];
        
        for (const type of types) {
            if (window.MediaRecorder.isTypeSupported(type)) {
                return { mimeType: type };
            }
        }
        
        return {};
    }

    startFrameAnalysis(videoElement) {
        const analyzeFrame = async () => {
            if (!this.isRecording) return;
            
            const now = Date.now();
            if (now - this.lastFrameTime >= this.frameInterval) {
                this.lastFrameTime = now;
                
                const frameData = this.captureFrameData(videoElement);
                
                if (this.emotionAnalyzer) {
                    try {
                        const emotionResult = await this.emotionAnalyzer(videoElement);
                        if (emotionResult) {
                            const analysisEntry = {
                                timestamp: now,
                                elapsedSeconds: Math.round((now - this.startTime) / 1000),
                                frameDataUrl: frameData,
                                emotions: emotionResult.emotions,
                                dominant: emotionResult.dominant,
                                confidence: emotionResult.confidence
                            };
                            
                            this.analysisResults.push(analysisEntry);
                            
                            if (this.onFrameAnalyzed) {
                                this.onFrameAnalyzed(analysisEntry);
                            }
                        }
                    } catch (error) {
                        console.warn('Frame analysis error:', error);
                    }
                }
            }
            
            if (this.isRecording) {
                requestAnimationFrame(analyzeFrame);
            }
        };
        
        requestAnimationFrame(analyzeFrame);
    }

    captureFrameData(videoElement) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        return canvas.toDataURL('image/jpeg', 0.5);
    }

    startRecordingTimer() {
        this.recordingTimerId = setInterval(() => {
            if (!this.isRecording) return;
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            if (this.onRecordingProgress) {
                this.onRecordingProgress(elapsed);
            }
        }, 1000);
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }

    getDuration() {
        if (!this.startTime) return 0;
        return (Date.now() - this.startTime) / 1000;
    }

    getAnalysisResults() {
        return this.analysisResults;
    }

    takePhoto(videoElement, effectCanvas) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        if (effectCanvas) {
            ctx.drawImage(effectCanvas, 0, 0, canvas.width, canvas.height);
        }
        
        return canvas;
    }

    addSticker(canvas, sticker, x, y, size) {
        const ctx = canvas.getContext('2d');
        const posX = x !== undefined ? x : canvas.width - 110;
        const posY = y !== undefined ? y : 20;
        const stickerSize = size || 80;
        
        ctx.font = `${stickerSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker, posX + stickerSize / 2, posY + stickerSize / 2);
        
        return canvas;
    }

    addEmotionLabel(canvas, emotionData) {
        if (!emotionData) return canvas;
        
        const ctx = canvas.getContext('2d');
        const info = Utils.getEmotionInfo(emotionData.dominant);
        const label = `${info.emoji} ${info.name} ${Utils.formatPercent(emotionData.confidence)}`;
        
        ctx.save();
        ctx.font = 'bold 24px Noto Sans SC';
        const textWidth = ctx.measureText(label).width;
        
        const padding = 12;
        const boxX = 16;
        const boxY = 16;
        const boxW = textWidth + padding * 2;
        const boxH = 36;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        
        ctx.fillStyle = info.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, boxX + padding, boxY + boxH / 2);
        ctx.restore();
        
        return canvas;
    }

    downloadPhoto(canvas, filename) {
        const name = filename || `emotion_photo_${Date.now()}.png`;
        const dataUrl = canvas.toDataURL('image/png');
        Utils.downloadDataUrl(dataUrl, name);
    }

    downloadVideo(blob, filename) {
        const name = filename || `emotion_video_${Date.now()}.webm`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = name;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    downloadAnalysisResults() {
        if (this.analysisResults.length === 0) return;
        
        const reportData = this.analysisResults.map(r => ({
            timestamp: r.timestamp,
            elapsedSeconds: r.elapsedSeconds,
            dominant: r.dominant,
            dominantName: Utils.getEmotionInfo(r.dominant).name,
            confidence: r.confidence,
            emotions: r.emotions
        }));
        
        Utils.downloadJson(reportData, `emotion_analysis_${Date.now()}.json`);
    }
}
