class GestureRecognition {
    constructor() {
        this.hands = null;
        this.video = document.getElementById('videoInput');
        this.canvas = document.getElementById('handCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.onGestureDetected = null;
        this.onSwipeDetected = null;
        this.onCalibrationComplete = null;
        
        this.sensitivity = 0.7;
        this.calibrationData = null;
        this.isCalibrating = false;
        this.calibrationSamples = [];
        this.calibrationSampleCount = 0;
        this.requiredSamples = 30;
        
        this.handHistory = [];
        this.maxHistory = 15;
        this.swipeThreshold = 0.15;
        this.lastGestureTime = 0;
        this.gestureCooldown = 800;
        
        this.currentScheme = 'default';
        this.schemes = {
            default: {
                swipeRight: 'next',
                swipeLeft: 'prev',
                fist: 'togglePause',
                victory: 'goToFirst',
                openPalm: null
            },
            alternative: {
                swipeRight: 'prev',
                swipeLeft: 'next',
                openPalm: 'togglePause',
                thumbUp: 'goToFirst',
                fist: null
            },
            presentation: {
                swipeRight: 'next',
                swipeLeft: 'prev',
                fist: 'togglePause',
                victory: 'goToLast',
                openPalm: 'goToFirst'
            }
        };
        
        this.gestureIcons = {
            openPalm: '🖐️',
            fist: '✊',
            victory: '✌️',
            thumbUp: '👍',
            pointing: '👆',
            swipeRight: '👉',
            swipeLeft: '👈',
            unknown: '✋'
        };
        
        this.gestureNames = {
            openPalm: '张开手掌',
            fist: '握拳',
            victory: 'V字手势',
            thumbUp: '点赞',
            pointing: '指方向',
            swipeRight: '向右滑动',
            swipeLeft: '向左滑动',
            unknown: '等待手势...'
        };
        
        this.loadCalibration();
    }

    async init(onProgress) {
        return new Promise((resolve, reject) => {
            if (onProgress) onProgress(0.2, '正在加载手部识别模型...');
            
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });
            
            const initialConfidence = 0.4 + (this.sensitivity * 0.4);
            
            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: initialConfidence,
                minTrackingConfidence: initialConfidence
            });
            
            this.hands.onResults(this.onResults.bind(this));
            
            this.hands.initialize()
                .then(() => {
                    this.swipeThreshold = 0.3 - (this.sensitivity * 0.2);
                    this.gestureCooldown = 1200 - (this.sensitivity * 600);
                    
                    if (onProgress) onProgress(0.6, '模型加载完成');
                    resolve();
                })
                .catch(reject);
        });
    }

    start(videoStream) {
        this.video.srcObject = videoStream;
        this.video.onloadedmetadata = () => {
            this.video.play().catch(e => console.warn('Video play error:', e));
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.isRunning = true;
            
            console.log('Starting gesture recognition...');
            this.processFrame();
        };
    }

    stop() {
        this.isRunning = false;
        this.frameCount = 0;
        
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }

    async processFrame() {
        if (!this.isRunning) return;
        
        try {
            if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
                await this.hands.send({image: this.video});
            }
        } catch (e) {
            console.warn('Frame processing error:', e.message);
        }
        
        setTimeout(() => this.processFrame(), 50);
    }

    onResults(results) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            if (this.isCalibrating) {
                this.processCalibration(landmarks);
                this.drawLandmarks(landmarks);
                return;
            }
            
            const adjustedLandmarks = this.applyCalibration(landmarks);
            this.drawLandmarks(adjustedLandmarks);
            
            const handCenter = this.getHandCenter(adjustedLandmarks);
            this.handHistory.push({
                x: handCenter.x,
                y: handCenter.y,
                time: Date.now()
            });
            
            if (this.handHistory.length > this.maxHistory) {
                this.handHistory.shift();
            }
            
            const gesture = this.classifyGesture(adjustedLandmarks);
            const swipe = this.detectSwipe();
            
            const now = Date.now();
            if (now - this.lastGestureTime > this.gestureCooldown) {
                if (swipe && this.onSwipeDetected) {
                    const action = this.schemes[this.currentScheme][swipe];
                    if (action) {
                        this.onSwipeDetected(swipe, action);
                        this.lastGestureTime = now;
                        this.updateGestureUI(swipe, 0.9);
                    }
                } else if (gesture && gesture !== 'unknown' && this.onGestureDetected) {
                    const action = this.schemes[this.currentScheme][gesture];
                    if (action) {
                        this.onGestureDetected(gesture, action);
                        this.lastGestureTime = now;
                        this.updateGestureUI(gesture, 0.85);
                    } else {
                        this.updateGestureUI(gesture, 0.85);
                    }
                } else if (!swipe) {
                    this.updateGestureUI(gesture || 'unknown', 0.5);
                }
            }
        } else {
            this.handHistory = [];
            this.updateGestureUI('unknown', 0);
        }
    }

    drawLandmarks(landmarks) {
        this.ctx.fillStyle = '#00fff5';
        this.ctx.strokeStyle = '#00fff5';
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < landmarks.length; i++) {
            const x = landmarks[i].x * this.canvas.width;
            const y = landmarks[i].y * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];
        
        for (const [a, b] of connections) {
            const ax = landmarks[a].x * this.canvas.width;
            const ay = landmarks[a].y * this.canvas.height;
            const bx = landmarks[b].x * this.canvas.width;
            const by = landmarks[b].y * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.moveTo(ax, ay);
            this.ctx.lineTo(bx, by);
            this.ctx.stroke();
        }
    }

    getHandCenter(landmarks) {
        const wrist = landmarks[0];
        const middleTip = landmarks[12];
        return {
            x: (wrist.x + middleTip.x) / 2,
            y: (wrist.y + middleTip.y) / 2
        };
    }

    classifyGesture(landmarks) {
        const fingerTips = [4, 8, 12, 16, 20];
        const fingerPips = [3, 6, 10, 14, 18];
        const fingerMcps = [2, 5, 9, 13, 17];
        
        const isFingerExtended = [];
        const fingerAngles = [];
        
        for (let i = 0; i < 5; i++) {
            const tip = landmarks[fingerTips[i]];
            const pip = landmarks[fingerPips[i]];
            const mcp = landmarks[fingerMcps[i]];
            
            const tipToMcp = Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
            const pipToMcp = Math.hypot(pip.x - mcp.x, pip.y - mcp.y);
            
            const angle = this.calculateFingerAngle(tip, pip, mcp);
            fingerAngles.push(angle);
            
            const extended = tipToMcp > pipToMcp * 1.15 && angle > 160;
            isFingerExtended.push(extended);
        }
        
        const extendedCount = isFingerExtended.filter(e => e).length;
        
        if (extendedCount === 0) {
            return 'fist';
        }
        
        if (extendedCount === 5) {
            return 'openPalm';
        }
        
        if (isFingerExtended[1] && isFingerExtended[2] && extendedCount === 2) {
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const distance = Math.hypot(indexTip.x - middleTip.x, indexTip.y - middleTip.y);
            
            if (distance > 0.05 && !isFingerExtended[0] && !isFingerExtended[3] && !isFingerExtended[4]) {
                const ringTip = landmarks[16];
                const pinkyTip = landmarks[20];
                const ringPip = landmarks[14];
                const pinkyPip = landmarks[18];
                
                const ringFolded = Math.hypot(ringTip.x - ringPip.x, ringTip.y - ringPip.y) < 0.08;
                const pinkyFolded = Math.hypot(pinkyTip.x - pinkyPip.x, pinkyTip.y - pinkyPip.y) < 0.08;
                
                if (ringFolded && pinkyFolded) {
                    return 'victory';
                }
            }
        }
        
        if (isFingerExtended[0] && extendedCount === 1) {
            return 'thumbUp';
        }
        
        if (isFingerExtended[1] && extendedCount === 1) {
            return 'pointing';
        }
        
        return 'unknown';
    }

    calculateFingerAngle(tip, pip, mcp) {
        const v1 = { x: pip.x - mcp.x, y: pip.y - mcp.y };
        const v2 = { x: tip.x - pip.x, y: tip.y - pip.y };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        const cos = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
        
        return angle;
    }

    detectSwipe() {
        if (this.handHistory.length < 10) return null;
        
        const first = this.handHistory[0];
        const last = this.handHistory[this.handHistory.length - 1];
        const timeDiff = last.time - first.time;
        
        if (timeDiff > 500) return null;
        
        const xDiff = last.x - first.x;
        const yDiff = last.y - first.y;
        
        if (Math.abs(xDiff) > this.swipeThreshold && Math.abs(xDiff) > Math.abs(yDiff) * 2) {
            if (xDiff > 0) {
                this.handHistory = [];
                return 'swipeRight';
            } else {
                this.handHistory = [];
                return 'swipeLeft';
            }
        }
        
        return null;
    }

    updateGestureUI(gesture, confidence) {
        const iconEl = document.getElementById('gestureIcon');
        const nameEl = document.getElementById('gestureName');
        const confFillEl = document.getElementById('confidenceFill');
        const confTextEl = document.getElementById('gestureConfidence');
        
        if (iconEl) {
            iconEl.textContent = this.gestureIcons[gesture] || '✋';
            if (confidence > 0.7) {
                iconEl.classList.add('detected');
            } else {
                iconEl.classList.remove('detected');
            }
        }
        
        if (nameEl) {
            nameEl.textContent = this.gestureNames[gesture] || '等待手势...';
        }
        
        if (confFillEl) {
            confFillEl.style.width = `${confidence * 100}%`;
        }
        
        if (confTextEl) {
            confTextEl.textContent = `${Math.round(confidence * 100)}%`;
        }
    }

    setScheme(schemeName) {
        if (this.schemes[schemeName]) {
            this.currentScheme = schemeName;
            
            const schemeNames = {
                default: '默认方案',
                alternative: '左手模式',
                presentation: '演讲模式'
            };
            
            const toast = document.createElement('div');
            toast.className = 'toast-message';
            toast.textContent = `已切换到：${schemeNames[schemeName] || schemeName}`;
            toast.style.cssText = `
                position: fixed;
                top: 24px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                background: var(--glass-bg);
                backdrop-filter: blur(20px);
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                color: var(--accent-cyan);
                font-size: 0.95rem;
                font-weight: 500;
                z-index: 10000;
                animation: slideDown 0.3s ease;
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideUp 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
            
            if (this.onSchemeChange) {
                this.onSchemeChange(schemeName);
            }
            
            return true;
        }
        return false;
    }

    setSensitivity(value) {
        this.sensitivity = value;
        this.swipeThreshold = 0.3 - (value * 0.2);
        this.gestureCooldown = 1200 - (value * 600);
        
        if (this.hands) {
            try {
                this.hands.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.4 + (value * 0.4),
                    minTrackingConfidence: 0.4 + (value * 0.4)
                });
            } catch (e) {
                console.warn('Could not update hands options:', e);
            }
        }
    }

    processCalibration(landmarks) {
        this.calibrationSamples.push(this.getHandCenter(landmarks));
        this.calibrationSampleCount++;
        
        const progress = this.calibrationSampleCount / this.requiredSamples;
        const btn = document.getElementById('calibrateBtn');
        if (btn) {
            btn.textContent = `校准中... ${Math.round(progress * 100)}%`;
        }
        
        if (this.calibrationSampleCount >= this.requiredSamples) {
            this.completeCalibration(this.calibrationSamples);
        }
        
        this.drawCalibrationOverlay();
    }

    drawCalibrationOverlay() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const size = 120;
        const progress = this.calibrationSampleCount / this.requiredSamples;
        
        this.ctx.strokeStyle = '#e94560';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(centerX - size/2, centerY - size/2, size, size);
        this.ctx.setLineDash([]);
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 40, -Math.PI/2, -Math.PI/2 + (progress * Math.PI * 2));
        this.ctx.strokeStyle = '#00fff5';
        this.ctx.lineWidth = 6;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#00fff5';
        this.ctx.font = 'bold 18px Poppins';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${Math.round(progress * 100)}%`, centerX, centerY + 6);
    }

    startCalibration() {
        this.isCalibrating = true;
        this.calibrationData = null;
        this.calibrationSamples = [];
        this.calibrationSampleCount = 0;
        
        const btn = document.getElementById('calibrateBtn');
        if (btn) {
            btn.classList.add('calibrating');
            btn.textContent = '请将手放在框内...';
        }
    }

    completeCalibration(samples) {
        const avgX = samples.reduce((sum, s) => sum + s.x, 0) / samples.length;
        const avgY = samples.reduce((sum, s) => sum + s.y, 0) / samples.length;
        
        this.calibrationData = {
            reference: { x: avgX, y: avgY },
            timestamp: Date.now()
        };
        
        this.isCalibrating = false;
        this.calibrationSamples = [];
        this.calibrationSampleCount = 0;
        
        this.saveCalibration();
        
        const btn = document.getElementById('calibrateBtn');
        if (btn) {
            btn.classList.remove('calibrating');
            btn.textContent = '校准完成 ✓';
            setTimeout(() => {
                btn.textContent = '重新校准';
            }, 3000);
        }
        
        if (this.onCalibrationComplete) {
            this.onCalibrationComplete(this.calibrationData);
        }
        
        return this.calibrationData;
    }

    applyCalibration(landmarks) {
        if (!this.calibrationData) return landmarks;
        
        const offsetX = 0.5 - this.calibrationData.reference.x;
        const offsetY = 0.5 - this.calibrationData.reference.y;
        
        return landmarks.map(point => ({
            x: Math.max(0, Math.min(1, point.x + offsetX)),
            y: Math.max(0, Math.min(1, point.y + offsetY)),
            z: point.z
        }));
    }

    saveCalibration() {
        if (this.calibrationData) {
            localStorage.setItem('gestureCalibration', JSON.stringify(this.calibrationData));
        }
    }

    loadCalibration() {
        const saved = localStorage.getItem('gestureCalibration');
        if (saved) {
            try {
                this.calibrationData = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load calibration data:', e);
                this.calibrationData = null;
            }
        }
    }

    resetCalibration() {
        this.calibrationData = null;
        localStorage.removeItem('gestureCalibration');
        
        const btn = document.getElementById('calibrateBtn');
        if (btn) {
            btn.textContent = '开始校准';
        }
    }
}
