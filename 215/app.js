class EmotionVisualizer {
    constructor() {
        this.analyzer = new EmotionAnalyzer();
        this.emotionHistory = [];
        this.snapshotSpheres = [];
        
        this.manualOverride = false;
        this.manualParams = {
            particleCount: 5000,
            particleSize: 1.0,
            motionSpeed: 1.0,
            rotationSpeed: 1.0
        };
        
        this.currentEmotion = {
            positive: 0.33,
            neutral: 0.34,
            negative: 0.33,
            dominant: 'neutral'
        };
        
        this.targetEmotion = { ...this.currentEmotion };
        
        this.init();
        this.bindEvents();
        this.animate();
    }

    init() {
        const canvas = document.getElementById('scene');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 15;
        
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.createParticleSystem();
        this.createSnapshotPositions();
        
        this.autoRotate = false;
        this.cameraAngle = 0;
        
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        
        this.voiceRecognition = null;
        this.isListening = false;
        
        this.initVoiceRecognition();
    }

    createParticleSystem() {
        const particleCount = this.manualParams.particleCount;
        
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(particleCount * 3);
        this.colors = new Float32Array(particleCount * 3);
        this.sizes = new Float32Array(particleCount);
        this.velocities = new Float32Array(particleCount * 3);
        this.offsets = new Float32Array(particleCount);
        this.basePositions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 4 + Math.random() * 0.5;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            this.positions[i * 3] = x;
            this.positions[i * 3 + 1] = y;
            this.positions[i * 3 + 2] = z;
            
            this.basePositions[i * 3] = x;
            this.basePositions[i * 3 + 1] = y;
            this.basePositions[i * 3 + 2] = z;
            
            this.colors[i * 3] = 0.4 + Math.random() * 0.2;
            this.colors[i * 3 + 1] = 0.4 + Math.random() * 0.2;
            this.colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
            
            this.sizes[i] = 0.02 + Math.random() * 0.02;
            this.offsets[i] = Math.random() * Math.PI * 2;
            
            this.velocities[i * 3] = (Math.random() - 0.5) * 0.01;
            this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
            this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
        }
        
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        this.particleSystem = new THREE.Points(this.geometry, material);
        this.scene.add(this.particleSystem);
        
        const glowGeometry = new THREE.SphereGeometry(4.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x667eea,
            transparent: true,
            opacity: 0.05,
            side: THREE.BackSide
        });
        this.glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        this.scene.add(this.glowSphere);
    }

    createSnapshotPositions() {
        this.snapshotPositions = [];
        const radius = 12;
        const count = 5;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            this.snapshotPositions.push({ x, y: 0, z });
        }
    }

    updateParticleSystem(newCount) {
        this.scene.remove(this.particleSystem);
        this.geometry.dispose();
        this.particleSystem.material.dispose();
        
        this.manualParams.particleCount = newCount;
        this.createParticleSystem();
        
        document.getElementById('particleCountDisplay').textContent = newCount;
    }

    initVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.voiceRecognition = new SpeechRecognition();
            this.voiceRecognition.continuous = true;
            this.voiceRecognition.interimResults = true;
            this.voiceRecognition.lang = 'zh-CN';
            
            this.voiceRecognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                const textInput = document.getElementById('textInput');
                textInput.value = finalTranscript || interimTranscript;
                
                if (finalTranscript) {
                    this.analyzeText(finalTranscript);
                }
            };
            
            this.voiceRecognition.onerror = (event) => {
                console.error('Voice recognition error:', event.error);
                this.stopListening();
            };
            
            this.voiceRecognition.onend = () => {
                if (this.isListening) {
                    this.voiceRecognition.start();
                }
            };
        }
    }

    startListening() {
        if (this.voiceRecognition) {
            this.isListening = true;
            this.voiceRecognition.start();
            document.getElementById('voiceBtn').style.display = 'none';
            document.getElementById('stopVoiceBtn').style.display = 'inline-block';
            document.getElementById('voiceStatus').textContent = '正在聆听...';
            document.getElementById('voiceStatus').classList.add('listening');
        } else {
            alert('您的浏览器不支持语音识别功能');
        }
    }

    stopListening() {
        if (this.voiceRecognition) {
            this.isListening = false;
            this.voiceRecognition.stop();
            document.getElementById('voiceBtn').style.display = 'inline-block';
            document.getElementById('stopVoiceBtn').style.display = 'none';
            document.getElementById('voiceStatus').textContent = '';
            document.getElementById('voiceStatus').classList.remove('listening');
        }
    }

    analyzeText(text) {
        const emotion = this.analyzer.analyze(text);
        this.targetEmotion = emotion;
        
        this.updateEmotionUI(emotion);
        this.addToHistory(text, emotion);
        this.createSnapshot(emotion);
    }

    updateEmotionUI(emotion) {
        document.getElementById('positiveBar').style.width = `${emotion.positive * 100}%`;
        document.getElementById('neutralBar').style.width = `${emotion.neutral * 100}%`;
        document.getElementById('negativeBar').style.width = `${emotion.negative * 100}%`;
        
        document.getElementById('positiveVal').textContent = `${Math.round(emotion.positive * 100)}%`;
        document.getElementById('neutralVal').textContent = `${Math.round(emotion.neutral * 100)}%`;
        document.getElementById('negativeVal').textContent = `${Math.round(emotion.negative * 100)}%`;
        
        document.getElementById('emotionText').textContent = this.analyzer.getEmotionDescription(emotion);
    }

    addToHistory(text, emotion) {
        const item = {
            text,
            emotion,
            timestamp: new Date()
        };
        
        this.emotionHistory.unshift(item);
        if (this.emotionHistory.length > 100) {
            this.emotionHistory.pop();
        }
        
        this.updateHistoryUI();
    }

    updateHistoryUI() {
        const historyList = document.getElementById('historyList');
        const recentHistory = this.emotionHistory.slice(0, 5);
        
        if (recentHistory.length === 0) {
            historyList.innerHTML = '<div class="empty-history">暂无历史记录</div>';
            return;
        }
        
        historyList.innerHTML = recentHistory.map((item, index) => `
            <div class="history-item">
                <div class="text">${item.text}</div>
                <div class="meta">
                    <span class="emotion-tag ${item.emotion.dominant}">${this.getEmotionLabel(item.emotion.dominant)}</span>
                    <span>${this.formatTime(item.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }

    getEmotionLabel(dominant) {
        const labels = {
            positive: '正面',
            neutral: '中性',
            negative: '负面'
        };
        return labels[dominant] || '未知';
    }

    formatTime(date) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    createSnapshot(emotion) {
        if (this.snapshotSpheres.length >= 5) {
            const oldSphere = this.snapshotSpheres.shift();
            this.scene.remove(oldSphere);
            oldSphere.geometry.dispose();
            oldSphere.material.dispose();
        }
        
        const color = this.getEmotionColor(emotion);
        const snapshotGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const snapshotMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.6
        });
        
        const sphere = new THREE.Mesh(snapshotGeometry, snapshotMaterial);
        const position = this.snapshotPositions[this.snapshotSpheres.length];
        sphere.position.set(position.x, position.y, position.z);
        
        this.scene.add(sphere);
        this.snapshotSpheres.push(sphere);
        
        this.animateSnapshots();
    }

    animateSnapshots() {
        this.snapshotSpheres.forEach((sphere, index) => {
            const targetPos = this.snapshotPositions[index];
            if (targetPos) {
                sphere.position.x = THREE.MathUtils.lerp(sphere.position.x, targetPos.x, 0.05);
                sphere.position.z = THREE.MathUtils.lerp(sphere.position.z, targetPos.z, 0.05);
            }
        });
    }

    getEmotionColor(emotion) {
        const r = emotion.positive * 1 + emotion.neutral * 0.4 + emotion.negative * 0.1;
        const g = emotion.positive * 0.85 + emotion.neutral * 0.5 + emotion.negative * 0.05;
        const b = emotion.positive * 0.6 + emotion.neutral * 0.9 + emotion.negative * 0.4;
        return new THREE.Color(r, g, b);
    }

    bindEvents() {
        const canvas = document.getElementById('scene');
        
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            const text = document.getElementById('textInput').value;
            if (text.trim()) {
                this.analyzeText(text);
            }
        });
        
        document.getElementById('textInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = document.getElementById('textInput').value;
                if (text.trim()) {
                    this.analyzeText(text);
                }
            }
        });
        
        document.getElementById('voiceBtn').addEventListener('click', () => this.startListening());
        document.getElementById('stopVoiceBtn').addEventListener('click', () => this.stopListening());
        
        document.getElementById('particleCount').addEventListener('input', (e) => {
            this.manualOverride = true;
            this.manualParams.particleCount = parseInt(e.target.value);
            document.getElementById('countVal').textContent = e.target.value;
            this.updateParticleSystem(this.manualParams.particleCount);
        });
        
        document.getElementById('particleSize').addEventListener('input', (e) => {
            this.manualOverride = true;
            this.manualParams.particleSize = parseFloat(e.target.value);
            document.getElementById('sizeVal').textContent = e.target.value;
        });
        
        document.getElementById('motionSpeed').addEventListener('input', (e) => {
            this.manualOverride = true;
            this.manualParams.motionSpeed = parseFloat(e.target.value);
            document.getElementById('speedVal').textContent = e.target.value;
        });
        
        document.getElementById('rotationSpeed').addEventListener('input', (e) => {
            this.manualOverride = true;
            this.manualParams.rotationSpeed = parseFloat(e.target.value);
            document.getElementById('rotationVal').textContent = e.target.value;
        });
        
        document.getElementById('resetManual').addEventListener('click', () => {
            this.manualOverride = false;
            document.getElementById('particleCount').value = 5000;
            document.getElementById('particleSize').value = 1;
            document.getElementById('motionSpeed').value = 1;
            document.getElementById('rotationSpeed').value = 1;
            document.getElementById('countVal').textContent = 5000;
            document.getElementById('sizeVal').textContent = 1.0;
            document.getElementById('speedVal').textContent = 1.0;
            document.getElementById('rotationVal').textContent = 1.0;
            this.updateParticleSystem(5000);
        });
        
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                this.scene.background = new THREE.Color(color);
            });
        });
        
        document.getElementById('autoRotate').addEventListener('change', (e) => {
            this.autoRotate = e.target.checked;
        });
        
        document.getElementById('screenshotBtn').addEventListener('click', () => this.takeScreenshot());
        
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportCSV());
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isDragging && !this.autoRotate) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;
                
                this.particleSystem.rotation.y += deltaX * 0.01;
                this.particleSystem.rotation.x += deltaY * 0.01;
                
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        canvas.addEventListener('mouseup', () => isDragging = false);
        canvas.addEventListener('mouseleave', () => isDragging = false);
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camera.position.z += e.deltaY * 0.01;
            this.camera.position.z = Math.max(8, Math.min(30, this.camera.position.z));
        });
    }

    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `emotion-snapshot-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    }

    exportCSV() {
        if (this.emotionHistory.length === 0) {
            alert('暂无历史数据可导出');
            return;
        }
        
        const headers = ['时间', '文本', '主导情感', '正面(%)', '中性(%)', '负面(%)', '置信度'];
        const rows = this.emotionHistory.map(item => [
            item.timestamp.toLocaleString('zh-CN'),
            `"${item.text.replace(/"/g, '""')}"`,
            this.getEmotionLabel(item.emotion.dominant),
            Math.round(item.emotion.positive * 100),
            Math.round(item.emotion.neutral * 100),
            Math.round(item.emotion.negative * 100),
            Math.round(item.emotion.confidence * 100)
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `emotion-history-${Date.now()}.csv`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    updateParticles(time) {
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        
        this.currentEmotion.positive = THREE.MathUtils.lerp(this.currentEmotion.positive, this.targetEmotion.positive, 0.02);
        this.currentEmotion.neutral = THREE.MathUtils.lerp(this.currentEmotion.neutral, this.targetEmotion.neutral, 0.02);
        this.currentEmotion.negative = THREE.MathUtils.lerp(this.currentEmotion.negative, this.targetEmotion.negative, 0.02);
        
        const speedMultiplier = this.manualOverride ? this.manualParams.motionSpeed : 
            (this.currentEmotion.positive * 1.5 + this.currentEmotion.neutral * 1 + this.currentEmotion.negative * 0.5);
        const sizeMultiplier = this.manualOverride ? this.manualParams.particleSize : 1;
        const rotationMult = this.manualOverride ? this.manualParams.rotationSpeed : 
            (this.currentEmotion.positive * 1.5 + this.currentEmotion.neutral * 1 + this.currentEmotion.negative * 0.8);
        
        const particleCount = this.manualParams.particleCount;
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            const baseX = this.basePositions[i3];
            const baseY = this.basePositions[i3 + 1];
            const baseZ = this.basePositions[i3 + 2];
            
            const emotionFactor = this.currentEmotion.positive - this.currentEmotion.negative;
            const expansion = emotionFactor * 1.5;
            
            const noise = Math.sin(time * 0.001 + this.offsets[i]) * 0.3;
            const radius = 4 + expansion * 0.5 + noise;
            
            const currentRadius = Math.sqrt(
                positions[i3] ** 2 + 
                positions[i3 + 1] ** 2 + 
                positions[i3 + 2] ** 2
            );
            
            const targetRadius = radius + Math.sin(time * 0.002 + this.offsets[i]) * 0.2;
            
            if (emotionFactor > 0) {
                const expandSpeed = 0.005 * speedMultiplier * emotionFactor;
                const newRadius = THREE.MathUtils.lerp(currentRadius, targetRadius, expandSpeed);
                const scale = newRadius / currentRadius || 1;
                positions[i3] *= scale;
                positions[i3 + 1] *= scale;
                positions[i3 + 2] *= scale;
            } else if (emotionFactor < 0) {
                const contractSpeed = 0.005 * speedMultiplier * Math.abs(emotionFactor);
                const newRadius = THREE.MathUtils.lerp(currentRadius, targetRadius, contractSpeed);
                const scale = newRadius / currentRadius || 1;
                positions[i3] *= scale;
                positions[i3 + 1] *= scale;
                positions[i3 + 2] *= scale;
            }
            
            const floatSpeed = 0.002 * speedMultiplier;
            const turbulence = this.currentEmotion.negative * 0.5;
            positions[i3] += Math.sin(time * 0.001 + this.offsets[i]) * floatSpeed + turbulence * (Math.random() - 0.5) * 0.01;
            positions[i3 + 1] += Math.cos(time * 0.001 + this.offsets[i] * 1.5) * floatSpeed + turbulence * (Math.random() - 0.5) * 0.01;
            positions[i3 + 2] += Math.sin(time * 0.001 + this.offsets[i] * 0.7) * floatSpeed + turbulence * (Math.random() - 0.5) * 0.01;
            
            const distFromCenter = Math.sqrt(positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2);
            const maxDist = 7;
            const minDist = 2;
            if (distFromCenter > maxDist) {
                const scale = maxDist / distFromCenter;
                positions[i3] *= scale;
                positions[i3 + 1] *= scale;
                positions[i3 + 2] *= scale;
            } else if (distFromCenter < minDist) {
                const scale = minDist / distFromCenter;
                positions[i3] *= scale;
                positions[i3 + 1] *= scale;
                positions[i3 + 2] *= scale;
            }
            
            const r = this.currentEmotion.positive * 1 + this.currentEmotion.neutral * 0.4 + this.currentEmotion.negative * 0.2;
            const g = this.currentEmotion.positive * 0.85 + this.currentEmotion.neutral * 0.5 + this.currentEmotion.negative * 0.1;
            const b = this.currentEmotion.positive * 0.6 + this.currentEmotion.neutral * 0.9 + this.currentEmotion.negative * 0.6;
            
            const colorVar = 0.1;
            colors[i3] = r + (Math.sin(time * 0.001 + this.offsets[i]) * colorVar);
            colors[i3 + 1] = g + (Math.cos(time * 0.001 + this.offsets[i] * 1.3) * colorVar);
            colors[i3 + 2] = b + (Math.sin(time * 0.001 + this.offsets[i] * 0.5) * colorVar);
        }
        
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        
        this.particleSystem.material.size = 0.05 * sizeMultiplier;
        
        this.particleSystem.rotation.y += 0.003 * rotationMult;
        this.particleSystem.rotation.x += 0.001 * rotationMult;
        
        const glowColor = this.getEmotionColor(this.currentEmotion);
        this.glowSphere.material.color = glowColor;
        this.glowSphere.material.opacity = 0.03 + this.currentEmotion.positive * 0.05;
    }

    animate(time = 0) {
        requestAnimationFrame((t) => this.animate(t));
        
        this.frameCount++;
        if (time - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / (time - this.lastFpsUpdate));
            document.getElementById('fpsCounter').textContent = this.fps;
            this.frameCount = 0;
            this.lastFpsUpdate = time;
        }
        
        this.updateParticles(time);
        this.updateSnapshotPositions(time);
        
        if (this.autoRotate) {
            this.cameraAngle += 0.003;
            this.camera.position.x = Math.sin(this.cameraAngle) * 15;
            this.camera.position.z = Math.cos(this.cameraAngle) * 15;
            this.camera.lookAt(0, 0, 0);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    updateSnapshotPositions(time) {
        this.snapshotSpheres.forEach((sphere, index) => {
            const totalSnapshots = this.snapshotSpheres.length;
            if (totalSnapshots === 0) return;
            
            const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
            const radius = 10;
            const targetX = Math.cos(angle) * radius;
            const targetZ = Math.sin(angle) * radius;
            const targetY = Math.sin(time * 0.001 + index) * 0.5;
            
            sphere.position.x = THREE.MathUtils.lerp(sphere.position.x, targetX, 0.05);
            sphere.position.z = THREE.MathUtils.lerp(sphere.position.z, targetZ, 0.05);
            sphere.position.y = THREE.MathUtils.lerp(sphere.position.y, targetY, 0.05);
            
            sphere.rotation.y += 0.01;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window._vis = new EmotionVisualizer();
});
