const MAX_FRAMES = 8;

export class AnimationController {
    constructor(canvasEngine) {
        this.canvasEngine = canvasEngine;
        this.frames = [this.canvasEngine.createEmptyFrame()];
        this.currentFrame = 0;
        this.fps = 8;
        this.isPlaying = false;
        this.intervalId = null;
        this.maxFrames = MAX_FRAMES;
        this.onFrameChangeCallback = null;
    }

    setOnFrameChangeCallback(callback) {
        this.onFrameChangeCallback = callback;
    }

    getFrames() {
        return this.frames.map(frame => frame.map(row => [...row]));
    }

    setFrames(frames) {
        this.frames = frames.map(frame => frame.map(row => [...row]));
        if (this.currentFrame >= this.frames.length) {
            this.currentFrame = this.frames.length - 1;
        }
        this.renderCurrentFrame();
        this.updateFrameUI();
    }

    getCurrentFrame() {
        return this.frames[this.currentFrame].map(row => [...row]);
    }

    getCurrentFrameIndex() {
        return this.currentFrame;
    }

    setCurrentFrame(index) {
        if (index < 0 || index >= this.frames.length) return false;
        
        this.saveCurrentFrameToMemory();
        this.currentFrame = index;
        this.renderCurrentFrame();
        this.updateFrameUI();
        
        if (this.onFrameChangeCallback) {
            this.onFrameChangeCallback();
        }
        
        return true;
    }

    saveCurrentFrameToMemory() {
        const currentData = this.canvasEngine.getGridData();
        this.frames[this.currentFrame] = currentData;
    }

    renderCurrentFrame() {
        const frameData = this.frames[this.currentFrame];
        this.canvasEngine.setGridData(frameData);
    }

    addFrame() {
        if (this.frames.length >= this.maxFrames) {
            this.updateStatus(`最多只能创建 ${this.maxFrames} 帧`);
            return false;
        }
        
        this.saveCurrentFrameToMemory();
        const newFrame = this.canvasEngine.createEmptyFrame();
        this.frames.push(newFrame);
        this.currentFrame = this.frames.length - 1;
        this.renderCurrentFrame();
        this.updateFrameUI();
        
        this.updateStatus(`已添加第 ${this.frames.length} 帧`);
        return true;
    }

    removeFrame() {
        if (this.frames.length <= 1) {
            this.updateStatus('至少需要保留1帧');
            return false;
        }
        
        this.frames.splice(this.currentFrame, 1);
        
        if (this.currentFrame >= this.frames.length) {
            this.currentFrame = this.frames.length - 1;
        }
        
        this.renderCurrentFrame();
        this.updateFrameUI();
        
        this.updateStatus(`已删除帧，当前第 ${this.currentFrame + 1} 帧`);
        return true;
    }

    duplicateFrame() {
        if (this.frames.length >= this.maxFrames) {
            this.updateStatus(`最多只能创建 ${this.maxFrames} 帧`);
            return false;
        }
        
        this.saveCurrentFrameToMemory();
        const currentData = this.getCurrentFrame();
        this.frames.push(currentData);
        this.currentFrame = this.frames.length - 1;
        this.renderCurrentFrame();
        this.updateFrameUI();
        
        this.updateStatus('已复制当前帧');
        return true;
    }

    play() {
        if (this.isPlaying) return;
        if (this.frames.length <= 1) {
            this.updateStatus('至少需要2帧才能播放动画');
            return;
        }
        
        this.isPlaying = true;
        this.saveCurrentFrameToMemory();
        
        const btnPlay = document.getElementById('btn-play');
        const btnStop = document.getElementById('btn-stop');
        if (btnPlay) btnPlay.disabled = true;
        if (btnStop) btnStop.disabled = false;
        
        const interval = 1000 / this.fps;
        let frameIndex = 0;
        
        this.playFrame(frameIndex);
        
        this.intervalId = setInterval(() => {
            frameIndex = (frameIndex + 1) % this.frames.length;
            this.playFrame(frameIndex);
        }, interval);
        
        this.updateStatus('正在播放动画');
    }

    playFrame(index) {
        const frameData = this.frames[index];
        this.canvasEngine.setGridData(frameData);
        
        const thumbs = document.querySelectorAll('.frame-thumb');
        thumbs.forEach((thumb, i) => {
            if (i === index) {
                thumb.classList.add('playing');
            } else {
                thumb.classList.remove('playing');
            }
        });
    }

    stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        const btnPlay = document.getElementById('btn-play');
        const btnStop = document.getElementById('btn-stop');
        if (btnPlay) btnPlay.disabled = false;
        if (btnStop) btnStop.disabled = true;
        
        document.querySelectorAll('.frame-thumb').forEach(thumb => {
            thumb.classList.remove('playing');
        });
        
        this.renderCurrentFrame();
        this.updateStatus('已停止播放');
    }

    setFPS(fps) {
        this.fps = Math.max(1, Math.min(30, fps));
        
        const fpsValue = document.getElementById('fps-value');
        if (fpsValue) {
            fpsValue.textContent = this.fps;
        }
        
        if (this.isPlaying) {
            this.stop();
            this.play();
        }
    }

    getFPS() {
        return this.fps;
    }

    getFrameCount() {
        return this.frames.length;
    }

    updateFrameUI() {
        const framesList = document.getElementById('frames-list');
        if (!framesList) return;
        
        framesList.innerHTML = '';
        
        this.frames.forEach((frameData, index) => {
            const thumb = document.createElement('canvas');
            thumb.className = 'frame-thumb';
            if (index === this.currentFrame) {
                thumb.classList.add('active');
            }
            
            this.canvasEngine.drawFrameToCanvas(frameData, thumb, 1.25);
            
            const frameNumber = document.createElement('span');
            frameNumber.className = 'frame-number';
            frameNumber.textContent = index + 1;
            
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.appendChild(thumb);
            container.appendChild(frameNumber);
            
            thumb.addEventListener('click', () => {
                if (!this.isPlaying) {
                    this.setCurrentFrame(index);
                }
            });
            
            framesList.appendChild(container);
        });
        
        const frameInfo = document.getElementById('current-frame-info');
        if (frameInfo) {
            frameInfo.textContent = `帧: ${this.currentFrame + 1} / ${this.frames.length}`;
        }
        
        const btnRemove = document.getElementById('btn-remove-frame');
        if (btnRemove) {
            btnRemove.disabled = this.frames.length <= 1;
        }
        
        const btnAdd = document.getElementById('btn-add-frame');
        if (btnAdd) {
            btnAdd.disabled = this.frames.length >= this.maxFrames;
        }
    }

    clearAllFrames() {
        this.frames = [this.canvasEngine.createEmptyFrame()];
        this.currentFrame = 0;
        this.renderCurrentFrame();
        this.updateFrameUI();
    }

    updateStatus(text) {
        const statusEl = document.getElementById('status-text');
        if (statusEl) {
            statusEl.textContent = text;
        }
    }

    destroy() {
        this.stop();
    }
}
