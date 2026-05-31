class EmotionMirrorApp {
    constructor() {
        this.camera = new CameraManager();
        this.emotionDetector = new EmotionDetector();
        this.effectRenderer = null;
        this.speechManager = new SpeechManager();
        this.videoRecorder = new VideoRecorder();
        this.reporter = new EmotionReporter();
        
        this.videoElement = null;
        this.effectCanvas = null;
        this.photoCanvas = null;
        this.currentSticker = null;
        this.currentStickerType = null;
        this.currentPhoto = null;
        this.currentEmotionData = null;
        this.lastRecordingData = null;
        this.placedStickers = [];
        this.stickerImages = {};
        
        this.frameCount = 0;
        this.fps = 0;
        this.lastFpsTime = Date.now();
        this.lowConfidenceTimeout = null;
        this.confidenceAlertTimeout = null;
        this.lastConfidenceAlertTime = 0;
        
        this.settings = {
            effectsIntensity: 50,
            particleCount: 50,
            voiceFeedback: true,
            privacyMode: false,
            showStickers: true,
            mirrorMode: true,
            voiceRate: 1,
            voicePitch: 1
        };
    }

    async init() {
        this.loadSettings();
        this.initElements();
        this.initEventListeners();
        
        this.speechManager.init();
        this.applySettings();
        this.validateStickers();
        
        try {
            const overlay = document.getElementById('loadingOverlay');
            await this.emotionDetector.loadModels((msg) => {
                if (overlay) {
                    overlay.querySelector('p').textContent = msg;
                }
            });
            this.updateModelStatus(true);
            await this.startCamera();
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateModelStatus(false);
            this.showError(error.message);
        }
        
        this.startFpsCounter();
        this.reporter.startSession();
    }

    loadSettings() {
        const stored = Utils.getStoredSettings();
        if (stored) {
            this.settings = { ...this.settings, ...stored };
        }
    }

    saveSettings() {
        Utils.saveSettings(this.settings);
    }

    applySettings() {
        document.getElementById('effectIntensity').value = this.settings.effectsIntensity;
        document.getElementById('intensityValue').textContent = this.settings.effectsIntensity + '%';
        
        document.getElementById('particleCount').value = this.settings.particleCount;
        document.getElementById('particleValue').textContent = this.settings.particleCount;
        
        document.getElementById('voiceToggle').checked = this.settings.voiceFeedback;
        document.getElementById('privacyToggle').checked = this.settings.privacyMode;
        document.getElementById('stickerToggle').checked = this.settings.showStickers;
        document.getElementById('mirrorToggle').checked = this.settings.mirrorMode;
        
        document.getElementById('voiceRate').value = this.settings.voiceRate;
        document.getElementById('rateValue').textContent = this.settings.voiceRate.toFixed(1) + 'x';
        
        document.getElementById('voicePitch').value = this.settings.voicePitch;
        document.getElementById('pitchValue').textContent = this.settings.voicePitch.toFixed(1);
        
        this.speechManager.setEnabled(this.settings.voiceFeedback);
        this.speechManager.setRate(this.settings.voiceRate);
        this.speechManager.setPitch(this.settings.voicePitch);
        
        if (this.effectRenderer) {
            this.effectRenderer.setIntensity(this.settings.effectsIntensity);
            this.effectRenderer.setMaxParticles(this.settings.particleCount);
        }
        
        const video = document.getElementById('video');
        if (this.settings.mirrorMode) {
            video.classList.remove('mirror-off');
        } else {
            video.classList.add('mirror-off');
        }
    }

    initElements() {
        this.videoElement = document.getElementById('video');
        this.effectCanvas = document.getElementById('effectCanvas');
        this.photoCanvas = document.getElementById('photoCanvas');
        
        this.effectRenderer = new EffectRenderer(this.effectCanvas);
        this.effectRenderer.setIntensity(this.settings.effectsIntensity);
        this.effectRenderer.setMaxParticles(this.settings.particleCount);
        
        this.videoRecorder.setEmotionAnalyzer(async (videoEl) => {
            return await this.emotionDetector.detectEmotions(videoEl);
        });
    }

    validateStickers() {
        const stickerButtons = document.querySelectorAll('.sticker-btn');
        const statusEl = document.getElementById('stickerStatus');
        
        this.stickerImages = {};
        let loadedCount = 0;
        let errorCount = 0;
        const totalCount = stickerButtons.length;
        
        const checkComplete = () => {
            if (loadedCount + errorCount === totalCount) {
                if (statusEl) {
                    if (errorCount === 0) {
                        statusEl.innerHTML = `✅ 12款贴纸全部加载成功 (${loadedCount}/${totalCount})`;
                        statusEl.style.color = '#22c55e';
                        statusEl.style.background = 'rgba(34, 197, 94, 0.1)';
                    } else {
                        statusEl.innerHTML = `⚠️ 部分贴纸加载失败 (${loadedCount}/${totalCount}成功, ${errorCount}失败)`;
                        statusEl.style.color = '#fbbf24';
                        statusEl.style.background = 'rgba(251, 191, 36, 0.1)';
                    }
                }
                console.log(`🎨 贴纸验证完成：${loadedCount}/${totalCount} 成功, ${errorCount} 失败`);
            }
        };
        
        stickerButtons.forEach((btn) => {
            const stickerName = btn.dataset.sticker;
            const stickerType = btn.dataset.type;
            
            if (stickerType === 'image') {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    this.stickerImages[stickerName] = img;
                    loadedCount++;
                    btn.classList.add('loaded');
                    checkComplete();
                };
                img.onerror = () => {
                    errorCount++;
                    btn.classList.add('load-error');
                    checkComplete();
                };
                img.src = `stickers/${stickerName}.png`;
            } else {
                loadedCount++;
                this.stickerImages[stickerName] = stickerName;
                btn.classList.add('loaded');
                checkComplete();
            }
        });
    }

    initEventListeners() {
        document.getElementById('photoBtn').addEventListener('click', () => this.takePhoto());
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('reportBtn').addEventListener('click', () => this.showReport());
        
        document.getElementById('effectIntensity').addEventListener('input', (e) => {
            this.settings.effectsIntensity = parseInt(e.target.value);
            document.getElementById('intensityValue').textContent = this.settings.effectsIntensity + '%';
            this.effectRenderer.setIntensity(this.settings.effectsIntensity);
            this.saveSettings();
        });
        
        document.getElementById('particleCount').addEventListener('input', (e) => {
            this.settings.particleCount = parseInt(e.target.value);
            document.getElementById('particleValue').textContent = this.settings.particleCount;
            this.effectRenderer.setMaxParticles(this.settings.particleCount);
            this.saveSettings();
        });
        
        document.getElementById('voiceToggle').addEventListener('change', (e) => {
            this.settings.voiceFeedback = e.target.checked;
            this.speechManager.setEnabled(this.settings.voiceFeedback);
            this.saveSettings();
        });
        
        document.getElementById('privacyToggle').addEventListener('change', (e) => {
            this.settings.privacyMode = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('stickerToggle').addEventListener('change', (e) => {
            this.settings.showStickers = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('mirrorToggle').addEventListener('change', (e) => {
            this.settings.mirrorMode = e.target.checked;
            const video = document.getElementById('video');
            if (this.settings.mirrorMode) {
                video.classList.remove('mirror-off');
            } else {
                video.classList.add('mirror-off');
            }
            this.saveSettings();
        });
        
        document.getElementById('voiceRate').addEventListener('input', (e) => {
            this.settings.voiceRate = parseFloat(e.target.value);
            document.getElementById('rateValue').textContent = this.settings.voiceRate.toFixed(1) + 'x';
            this.speechManager.setRate(this.settings.voiceRate);
            this.saveSettings();
        });
        
        document.getElementById('voicePitch').addEventListener('input', (e) => {
            this.settings.voicePitch = parseFloat(e.target.value);
            document.getElementById('pitchValue').textContent = this.settings.voicePitch.toFixed(1);
            this.speechManager.setPitch(this.settings.voicePitch);
            this.saveSettings();
        });
        
        document.getElementById('closePhotoModal').addEventListener('click', () => {
            document.getElementById('photoModal').classList.add('hidden');
        });
        
        document.getElementById('retakeBtn').addEventListener('click', () => {
            document.getElementById('photoModal').classList.add('hidden');
        });
        
        document.getElementById('savePhotoBtn').addEventListener('click', () => this.savePhoto());
        
        document.querySelectorAll('.sticker-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stickerEl = e.currentTarget;
                const wasActive = stickerEl.classList.contains('active');
                
                document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('active'));
                
                if (wasActive) {
                    this.currentSticker = null;
                    this.currentStickerType = null;
                    document.querySelector('.photo-canvas-wrapper').classList.remove('sticker-mode');
                } else {
                    stickerEl.classList.add('active');
                    this.currentSticker = stickerEl.dataset.sticker;
                    this.currentStickerType = stickerEl.dataset.type;
                    document.querySelector('.photo-canvas-wrapper').classList.add('sticker-mode');
                }
            });
        });
        
        document.getElementById('clearStickersBtn').addEventListener('click', () => {
            this.placedStickers = [];
            this.currentSticker = null;
            document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.photo-canvas-wrapper').classList.remove('sticker-mode');
            this.updatePhotoPreview();
        });
        
        this.photoCanvas.addEventListener('click', (e) => {
            if (!this.currentSticker || !this.currentPhoto) return;
            
            const rect = this.photoCanvas.getBoundingClientRect();
            const scaleX = this.photoCanvas.width / rect.width;
            const scaleY = this.photoCanvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            this.placedStickers.push({
                name: this.currentSticker,
                type: this.currentStickerType,
                x: x,
                y: y,
                size: 70
            });
            
            this.updatePhotoPreview();
        });
        
        document.getElementById('closeReportModal').addEventListener('click', () => {
            document.getElementById('reportModal').classList.add('hidden');
        });
        
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            if (confirm('确定要清除所有情绪数据吗？')) {
                this.reporter.clearHistory();
                this.updateReport();
            }
        });
        
        document.getElementById('exportReportBtn').addEventListener('click', () => this.exportReport());
        
        document.getElementById('closeConfidenceAlert').addEventListener('click', () => {
            document.getElementById('confidenceAlert').classList.add('hidden');
        });
        
        document.getElementById('closeRecordingResult').addEventListener('click', () => {
            document.getElementById('recordingResultModal').classList.add('hidden');
        });
        
        document.getElementById('downloadVideoBtn').addEventListener('click', () => {
            if (this.lastRecordingData && this.lastRecordingData.videoBlob) {
                this.videoRecorder.downloadVideo(this.lastRecordingData.videoBlob);
            }
        });
        
        document.getElementById('downloadAnalysisBtn').addEventListener('click', () => {
            this.videoRecorder.downloadAnalysisResults();
        });
        
        this.emotionDetector.onEmotionDetected = (emotions) => this.handleEmotionDetected(emotions);
        this.emotionDetector.onLowConfidence = (emotions) => this.handleLowConfidence(emotions);
        this.emotionDetector.onNoFace = () => this.handleNoFace();
        
        this.videoRecorder.onRecordingStop = (data) => this.handleRecordingStop(data);
        this.videoRecorder.onRecordingProgress = (elapsed) => {
            document.getElementById('recordTime').textContent = Utils.formatTime(elapsed);
        };
        this.videoRecorder.onFrameAnalyzed = (entry) => {
            this.reporter.addEmotionData({
                timestamp: entry.timestamp,
                emotions: entry.emotions,
                dominant: entry.dominant,
                confidence: entry.confidence
            });
            document.getElementById('frameCount').textContent = this.videoRecorder.getAnalysisResults().length;
        };
    }

    async startCamera() {
        try {
            await this.camera.init(this.videoElement);
            this.updateCameraStatus(true);
            
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            
            this.effectRenderer.start();
            
            this.camera.onFrame(async (video) => {
                await this.emotionDetector.detectEmotions(video);
            });
            
        } catch (error) {
            console.error('Camera error:', error);
            throw error;
        }
    }

    resizeCanvas() {
        const wrapper = document.querySelector('.camera-wrapper');
        const rect = wrapper.getBoundingClientRect();
        this.effectRenderer.resize(rect.width, rect.height);
    }

    handleEmotionDetected(emotions) {
        this.hideLowConfidenceWarning();
        
        this.currentEmotionData = emotions;
        this.updateEmotionDisplay(emotions);
        this.effectRenderer.setEmotion(emotions.dominant);
        this.speechManager.speakEmotion(emotions.dominant);
        this.reporter.addEmotionData(emotions);
        
        this.frameCount++;
        document.getElementById('frameCount').textContent = this.frameCount;
    }

    handleLowConfidence(emotions) {
        this.currentEmotionData = emotions;
        this.updateEmotionDisplay(emotions);
        
        this.reporter.addEmotionData(emotions);
        this.frameCount++;
        document.getElementById('frameCount').textContent = this.frameCount;
        
        this.showLowConfidenceWarning();
        this.showConfidenceAlert();
        
        if (emotions.dominant) {
            this.effectRenderer.setEmotion(emotions.dominant);
        }
    }

    handleNoFace() {
        this.hideLowConfidenceWarning();
    }

    showLowConfidenceWarning() {
        const warning = document.getElementById('lowConfidenceWarning');
        warning.classList.remove('hidden');
        
        if (this.lowConfidenceTimeout) {
            clearTimeout(this.lowConfidenceTimeout);
        }
        
        this.lowConfidenceTimeout = setTimeout(() => {
            this.hideLowConfidenceWarning();
        }, 3000);
    }

    hideLowConfidenceWarning() {
        const warning = document.getElementById('lowConfidenceWarning');
        warning.classList.add('hidden');
    }

    showConfidenceAlert() {
        const now = Date.now();
        if (now - this.lastConfidenceAlertTime < 10000) return;
        this.lastConfidenceAlertTime = now;
        
        console.log('⚠️ 置信度弹窗触发 - 情绪置信度低于0.5');
        document.getElementById('confidenceAlert').classList.remove('hidden');
        
        if (this.confidenceAlertTimeout) {
            clearTimeout(this.confidenceAlertTimeout);
        }
        
        this.confidenceAlertTimeout = setTimeout(() => {
            document.getElementById('confidenceAlert').classList.add('hidden');
        }, 8000);
    }

    updateEmotionDisplay(emotions) {
        const config = Utils.getEmotionInfo(emotions.dominant);
        
        document.getElementById('dominantEmoji').textContent = config.emoji;
        document.getElementById('dominantEmotion').textContent = config.name;
        document.getElementById('dominantConfidence').textContent = Utils.formatPercent(emotions.confidence);
        
        Object.entries(emotions.emotions).forEach(([emotion, value]) => {
            const bar = document.querySelector(`.emotion-bar-item[data-emotion="${emotion}"] .bar-fill`);
            const val = document.querySelector(`.emotion-bar-item[data-emotion="${emotion}"] .bar-value`);
            
            if (bar) bar.style.width = (value * 100) + '%';
            if (val) val.textContent = Utils.formatPercent(value);
        });
    }

    updateModelStatus(loaded) {
        const status = document.getElementById('modelStatus');
        status.classList.remove('status-loading');
        status.classList.add(loaded ? 'status-on' : 'status-off');
        status.innerHTML = `<span class="status-dot"></span>${loaded ? '模型已加载' : '模型加载失败'}`;
        
        if (loaded) {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }
    }

    updateCameraStatus(active) {
        const status = document.getElementById('cameraStatus');
        status.classList.remove('status-off');
        status.classList.add(active ? 'status-on' : 'status-off');
        status.innerHTML = `<span class="status-dot"></span>${active ? '摄像头运行中' : '摄像头未启动'}`;
    }

    startFpsCounter() {
        setInterval(() => {
            const now = Date.now();
            const elapsed = (now - this.lastFpsTime) / 1000;
            this.fps = Math.round(this.frameCount / elapsed);
            document.getElementById('fpsDisplay').textContent = this.fps;
            this.frameCount = 0;
            this.lastFpsTime = now;
        }, 1000);
    }

    takePhoto() {
        if (!this.videoElement.videoWidth) return;
        
        this.currentPhoto = this.videoRecorder.takePhoto(this.videoElement, this.effectCanvas);
        this.currentSticker = null;
        this.currentStickerType = null;
        this.placedStickers = [];
        
        if (this.currentEmotionData) {
            this.videoRecorder.addEmotionLabel(this.currentPhoto, this.currentEmotionData);
        }
        
        document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.photo-canvas-wrapper').classList.remove('sticker-mode');
        
        this.updatePhotoPreview();
        document.getElementById('photoModal').classList.remove('hidden');
    }

    updatePhotoPreview() {
        if (!this.currentPhoto) return;
        
        const ctx = this.photoCanvas.getContext('2d');
        this.photoCanvas.width = this.currentPhoto.width;
        this.photoCanvas.height = this.currentPhoto.height;
        
        ctx.drawImage(this.currentPhoto, 0, 0);
        
        if (this.settings.showStickers) {
            this.placedStickers.forEach(sticker => {
                if (sticker.type === 'image' && this.stickerImages[sticker.name]) {
                    const img = this.stickerImages[sticker.name];
                    const size = sticker.size || 70;
                    ctx.drawImage(img, sticker.x - size/2, sticker.y - size/2, size, size);
                } else if (sticker.type === 'emoji') {
                    ctx.font = `${sticker.size || 60}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(sticker.name, sticker.x, sticker.y);
                }
            });
        }
    }

    savePhoto() {
        if (!this.photoCanvas) return;
        this.videoRecorder.downloadPhoto(this.photoCanvas);
        document.getElementById('photoModal').classList.add('hidden');
    }

    toggleRecording() {
        const btn = document.getElementById('recordBtn');
        
        if (this.videoRecorder.isRecording) {
            this.videoRecorder.stopRecording();
            btn.classList.remove('recording');
            btn.textContent = '⏺️ 录制';
        } else {
            const stream = this.camera.getStream();
            if (stream && this.videoRecorder.startRecording(stream, this.videoElement)) {
                btn.classList.add('recording');
                btn.textContent = '⏹️ 停止';
            }
        }
    }

    handleRecordingStop(data) {
        this.lastRecordingData = data;
        
        const btn = document.getElementById('recordBtn');
        btn.classList.remove('recording');
        btn.textContent = '⏺️ 录制';
        document.getElementById('recordTime').textContent = '00:00';
        
        if (data.analysisResults.length > 0) {
            this.showRecordingResult(data);
        } else {
            this.videoRecorder.downloadVideo(data.videoBlob);
        }
    }

    showRecordingResult(data) {
        const modal = document.getElementById('recordingResultModal');
        const chartCanvas = document.getElementById('recordingChart');
        const statsContainer = document.getElementById('recordingStats');
        
        modal.classList.remove('hidden');
        
        requestAnimationFrame(() => {
            const canvasWidth = chartCanvas.parentElement ? chartCanvas.parentElement.clientWidth - 48 : 800;
            chartCanvas.width = Math.max(canvasWidth, 400);
            chartCanvas.height = 300;
            
            this.drawRecordingChart(chartCanvas, data.analysisResults);
        });
        
        const dominantCounts = {};
        let totalConfidence = 0;
        data.analysisResults.forEach(r => {
            dominantCounts[r.dominant] = (dominantCounts[r.dominant] || 0) + 1;
            totalConfidence += r.confidence;
        });
        
        let topEmotion = 'neutral';
        let topCount = 0;
        Object.entries(dominantCounts).forEach(([e, c]) => {
            if (c > topCount) { topEmotion = e; topCount = c; }
        });
        
        const topInfo = Utils.getEmotionInfo(topEmotion);
        const avgConf = data.analysisResults.length > 0 ? totalConfidence / data.analysisResults.length : 0;
        
        statsContainer.innerHTML = `
            <div class="stat-card"><span class="stat-label">录制时长</span><span class="stat-value">${Utils.formatTime(data.duration)}</span></div>
            <div class="stat-card"><span class="stat-label">分析帧数</span><span class="stat-value">${data.analysisResults.length}</span></div>
            <div class="stat-card"><span class="stat-label">主导情绪</span><span class="stat-value">${topInfo.emoji} ${topInfo.name}</span></div>
            <div class="stat-card"><span class="stat-label">平均置信度</span><span class="stat-value">${Utils.formatPercent(avgConf)}</span></div>
        `;
        
        modal.classList.remove('hidden');
    }

    drawRecordingChart(canvas, results) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 50;
        const chartW = width - padding * 2;
        const chartH = height - padding * 2;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);

        if (results.length < 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '14px Noto Sans SC';
            ctx.textAlign = 'center';
            ctx.fillText('数据不足', width / 2, height / 2);
            return;
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartH / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartW, y);
            ctx.stroke();
        }
        
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px Noto Sans SC';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartH / 5) * i;
            ctx.fillText((100 - i * 20) + '%', padding - 5, y + 4);
        }
        
        const maxSec = results[results.length - 1].elapsedSeconds;
        ctx.textAlign = 'center';
        const tickStep = Math.max(1, Math.ceil(maxSec / 10));
        for (let s = 0; s <= maxSec; s += tickStep) {
            const x = padding + (s / maxSec) * chartW;
            ctx.fillText(s + 's', x, height - 10);
        }

        const emotions = Object.keys(Utils.EMOTION_CONFIG);
        emotions.forEach(emotion => {
            const config = Utils.getEmotionInfo(emotion);
            ctx.strokeStyle = config.color;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            results.forEach((r, i) => {
                const x = padding + (r.elapsedSeconds / maxSec) * chartW;
                const val = r.emotions[emotion] || 0;
                const y = padding + (1 - val) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        });

        const legendX = width - 90;
        emotions.forEach((emotion, i) => {
            const config = Utils.getEmotionInfo(emotion);
            const y = padding + i * 18;
            ctx.fillStyle = config.color;
            ctx.fillRect(legendX, y, 10, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '11px Noto Sans SC';
            ctx.textAlign = 'left';
            ctx.fillText(config.name, legendX + 15, y + 5);
        });
    }

    showReport() {
        document.getElementById('reportModal').classList.remove('hidden');
        requestAnimationFrame(() => {
            this.updateReport();
        });
    }

    updateReport() {
        const stats = this.reporter.getStatistics();
        const chartCanvas = document.getElementById('reportChart');
        
        const canvasWidth = chartCanvas.parentElement ? chartCanvas.parentElement.clientWidth - 48 : 800;
        chartCanvas.width = Math.max(canvasWidth, 400);
        chartCanvas.height = 300;
        this.reporter.drawChart(chartCanvas);
        
        if (stats) {
            document.getElementById('statDuration').textContent = Utils.formatTime(stats.duration);
            document.getElementById('statFrames').textContent = stats.totalFrames;
            document.getElementById('statDominant').textContent = Utils.getEmotionInfo(stats.dominantEmotion).emoji + ' ' + Utils.getEmotionInfo(stats.dominantEmotion).name;
            document.getElementById('statConfidence').textContent = Utils.formatPercent(stats.averageConfidence);
        } else {
            document.getElementById('statDuration').textContent = '00:00';
            document.getElementById('statFrames').textContent = '0';
            document.getElementById('statDominant').textContent = '-';
            document.getElementById('statConfidence').textContent = '0%';
        }
        
        const breakdownEl = document.getElementById('emotionBreakdown');
        this.reporter.renderBreakdown(breakdownEl, stats);
    }

    exportReport() {
        const report = this.reporter.exportReport();
        if (report) {
            Utils.downloadJson(report, `emotion_report_${Date.now()}.json`);
        }
    }

    showError(message) {
        alert('错误: ' + message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new EmotionMirrorApp();
    app.init();
});
