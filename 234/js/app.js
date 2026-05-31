class PresentationApp {
    constructor() {
        this.slideController = null;
        this.gestureRecognition = null;
        this.audioController = null;
        this.statsTracker = null;
        this.exportManager = null;
        this.uploadedFiles = [];
        this.uploadedFilesProcessed = null;
        this.endShown = false;
        
        this.settings = {
            gestureScheme: 'default',
            soundEnabled: true,
            bgmEnabled: false,
            voiceEnabled: true,
            debugMode: true,
            sensitivity: 0.7
        };
        
        if ('speechSynthesis' in window) {
            speechSynthesis.onvoiceschanged = () => {
                speechSynthesis.getVoices();
            };
        }
        
        this.init();
    }

    async init() {
        this.loadSettings();
        this.initControllers();
        this.setupEventListeners();
        await this.initGestureRecognition();
    }

    loadSettings() {
        const saved = localStorage.getItem('presentationSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('presentationSettings', JSON.stringify(this.settings));
    }

    initControllers() {
        this.slideController = new SlideController();
        this.gestureRecognition = new GestureRecognition();
        this.audioController = new AudioController();
        this.statsTracker = new StatsTracker();
        this.exportManager = new ExportManager(this.slideController);
        
        this.audioController.init();
        this.applySettings();
    }

    applySettings() {
        this.gestureRecognition.setScheme(this.settings.gestureScheme);
        this.gestureRecognition.setSensitivity(this.settings.sensitivity);
        this.audioController.setSoundEnabled(this.settings.soundEnabled);
        this.audioController.setBgmEnabled(this.settings.bgmEnabled);
        this.audioController.setVoiceEnabled(this.settings.voiceEnabled);
        
        if (this.slideController) {
            this.audioController.setTotalPages(this.slideController.getTotalPages());
        }
        
        document.getElementById('gestureScheme').value = this.settings.gestureScheme;
        document.getElementById('sensitivity').value = this.settings.sensitivity;
        document.getElementById('sensitivityValue').textContent = this.settings.sensitivity;
        document.getElementById('debugMode').checked = this.settings.debugMode;
        document.getElementById('soundEnabled').checked = this.settings.soundEnabled;
        document.getElementById('bgmEnabled').checked = this.settings.bgmEnabled;
        document.getElementById('voiceEnabled').checked = this.settings.voiceEnabled;
        
        const debugPanel = document.getElementById('gestureDebug');
        if (debugPanel) {
            debugPanel.classList.toggle('hidden', !this.settings.debugMode);
        }
    }

    async initGestureRecognition() {
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingStatus = document.getElementById('loadingStatus');
        const progressFill = document.getElementById('progressFill');
        
        try {
            await this.gestureRecognition.init((progress, status) => {
                if (loadingStatus) loadingStatus.textContent = status;
                if (progressFill) progressFill.style.width = `${progress * 100}%`;
            });
            
            if (progressFill) progressFill.style.width = '80%';
            if (loadingStatus) loadingStatus.textContent = '请求摄像头权限...';
            
            const permissionScreen = document.getElementById('cameraPermission');
            if (permissionScreen) {
                permissionScreen.classList.add('show');
            }
            
            document.getElementById('allowCamera').addEventListener('click', async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { width: 640, height: 480 } 
                    });
                    
                    if (permissionScreen) {
                        permissionScreen.classList.remove('show');
                    }
                    
                    this.gestureRecognition.start(stream);
                    this.setupGestureCallbacks();
                    
                    if (progressFill) progressFill.style.width = '100%';
                    if (loadingStatus) loadingStatus.textContent = '初始化完成';
                    
                    setTimeout(() => {
                        if (loadingScreen) {
                            loadingScreen.classList.add('hidden');
                        }
                        this.statsTracker.start();
                    }, 500);
                    
                } catch (e) {
                    console.error('Camera access denied:', e);
                    alert('无法访问摄像头，请确保已授予权限。您仍可以使用手动按钮控制幻灯片。');
                    
                    if (permissionScreen) {
                        permissionScreen.classList.remove('show');
                    }
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                    }
                    this.statsTracker.start();
                }
            });
            
        } catch (e) {
            console.error('Gesture recognition init error:', e);
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
            this.statsTracker.start();
        }
    }

    setupGestureCallbacks() {
        this.gestureRecognition.onSwipeDetected = (swipe, action) => {
            this.executeAction(action);
            this.statsTracker.onSwipe(swipe === 'swipeRight' ? 'right' : 'left');
            this.audioController.playSwipeSound();
        };
        
        this.gestureRecognition.onGestureDetected = (gesture, action) => {
            this.executeAction(action);
            this.statsTracker.onGesture(gesture);
            if (gesture === 'fist') {
                this.audioController.playPauseSound();
            }
        };
    }

    executeAction(action) {
        if (!action) return;
        
        switch (action) {
            case 'next':
                this.slideController.next();
                break;
            case 'prev':
                this.slideController.prev();
                break;
            case 'togglePause':
                const isPaused = this.slideController.togglePause();
                this.updatePauseButton(isPaused);
                break;
            case 'goToFirst':
                this.slideController.goToFirst();
                break;
            case 'goToLast':
                this.slideController.goToLast();
                break;
        }
    }

    onPageChanged() {
        const currentPage = this.slideController.getCurrentPage();
        const totalPages = this.slideController.getTotalPages();
        
        if (currentPage !== totalPages) {
            this.endShown = false;
        }
        
        this.statsTracker.onPageChange(currentPage);
        
        if (this.settings.voiceEnabled) {
            this.audioController.speakPageNumber(currentPage);
        }
        
        this.checkPresentationEnd();
    }

    updatePauseButton(isPaused) {
        const pauseIcon = document.getElementById('pauseIcon');
        const playIcon = document.getElementById('playIcon');
        
        if (isPaused) {
            pauseIcon.style.display = 'none';
            playIcon.style.display = 'block';
            this.statsTracker.stop();
        } else {
            pauseIcon.style.display = 'block';
            playIcon.style.display = 'none';
            this.statsTracker.start();
        }
    }

    setupEventListeners() {
        document.getElementById('prevBtn').addEventListener('click', () => {
            if (this.slideController.prev()) {
                this.audioController.playSwipeSound();
                this.statsTracker.onSwipe('left');
            }
        });
        
        document.getElementById('nextBtn').addEventListener('click', () => {
            if (this.slideController.next()) {
                this.audioController.playSwipeSound();
                this.statsTracker.onSwipe('right');
            }
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            const isPaused = this.slideController.togglePause();
            this.updatePauseButton(isPaused);
            this.audioController.playPauseSound();
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsPanel').classList.add('open');
        });
        
        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsPanel').classList.remove('open');
        });
        
        document.getElementById('gestureScheme').addEventListener('change', (e) => {
            this.settings.gestureScheme = e.target.value;
            this.gestureRecognition.setScheme(e.target.value);
            this.saveSettings();
        });
        
        document.getElementById('sensitivity').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.settings.sensitivity = value;
            document.getElementById('sensitivityValue').textContent = value;
            this.gestureRecognition.setSensitivity(value);
            this.saveSettings();
            
            const valueEl = document.getElementById('sensitivityValue');
            valueEl.style.transition = 'transform 0.2s ease';
            valueEl.style.transform = 'scale(1.2)';
            valueEl.style.color = 'var(--accent-cyan)';
            setTimeout(() => {
                valueEl.style.transform = 'scale(1)';
                valueEl.style.color = '';
            }, 200);
        });
        
        document.getElementById('debugMode').addEventListener('change', (e) => {
            this.settings.debugMode = e.target.checked;
            document.getElementById('gestureDebug').classList.toggle('hidden', !e.target.checked);
            this.saveSettings();
        });
        
        document.getElementById('soundEnabled').addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
            this.audioController.setSoundEnabled(e.target.checked);
            this.saveSettings();
        });
        
        document.getElementById('bgmEnabled').addEventListener('change', (e) => {
            this.settings.bgmEnabled = e.target.checked;
            this.audioController.setBgmEnabled(e.target.checked);
            this.saveSettings();
        });
        
        document.getElementById('voiceEnabled').addEventListener('change', (e) => {
            this.settings.voiceEnabled = e.target.checked;
            this.audioController.setVoiceEnabled(e.target.checked);
            this.saveSettings();
        });
        
        document.getElementById('calibrateBtn').addEventListener('click', () => {
            if (this.gestureRecognition.isCalibrating) return;
            this.gestureRecognition.startCalibration();
        });
        
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('uploadModal').classList.add('open');
        });
        
        document.getElementById('closeUpload').addEventListener('click', () => {
            document.getElementById('uploadModal').classList.remove('open');
        });
        
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        document.getElementById('confirmUpload').addEventListener('click', () => {
            if (this.uploadedFiles.length > 0) {
                this.loadUploadedSlides();
                document.getElementById('uploadModal').classList.remove('open');
            }
        });
        
        document.getElementById('statsBtn').addEventListener('click', () => {
            this.updateStatsDisplay();
            document.getElementById('statsModal').classList.add('open');
        });
        
        document.getElementById('closeStats').addEventListener('click', () => {
            document.getElementById('statsModal').classList.remove('open');
        });
        
        document.getElementById('exportStats').addEventListener('click', () => {
            this.statsTracker.saveToFile();
        });
        
        document.getElementById('exportPdfBtn').addEventListener('click', () => {
            this.exportManager.exportToPDF();
        });
        
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                case 'PageUp':
                    this.slideController.prev();
                    this.audioController.playSwipeSound();
                    break;
                case 'ArrowRight':
                case ' ':
                case 'PageDown':
                    e.preventDefault();
                    this.slideController.next();
                    this.audioController.playSwipeSound();
                    break;
                case 'Escape':
                    document.getElementById('settingsPanel').classList.remove('open');
                    document.getElementById('uploadModal').classList.remove('open');
                    document.getElementById('statsModal').classList.remove('open');
                    break;
            }
        });
        
        let touchStartX = 0;
        let touchEndX = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.slideController.next();
                } else {
                    this.slideController.prev();
                }
                this.audioController.playSwipeSound();
            }
        }, { passive: true });
        
        document.addEventListener('click', () => {
            this.audioController.resumeContext();
        }, { once: true });
        
        this.slideController.onPageChange = (page) => {
            this.statsTracker.onPageChange(page);
            this.onPageChanged();
        };
    }

    async handleFiles(files) {
        this.uploadedFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        
        const preview = document.getElementById('uploadPreview');
        const confirmBtn = document.getElementById('confirmUpload');
        
        if (this.uploadedFiles.length === 0) {
            preview.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">请选择有效的图片文件</p>';
            confirmBtn.disabled = true;
            return;
        }
        
        preview.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">正在处理图片...</p>';
        confirmBtn.disabled = true;
        
        try {
            const result = await this.slideController.uploadSlides(this.uploadedFiles, (progress, status) => {
                preview.innerHTML = `<p style="color: var(--accent-cyan); text-align: center; grid-column: 1/-1;">${status} (${Math.round(progress * 100)}%)</p>`;
            });
            
            this.uploadedFilesProcessed = result;
            preview.innerHTML = this.slideController.generatePreviewHTML(result.previews);
            confirmBtn.disabled = false;
            
        } catch (e) {
            console.error('File processing error:', e);
            preview.innerHTML = '<p style="color: var(--accent-purple); text-align: center; grid-column: 1/-1;">处理失败，请重试</p>';
            confirmBtn.disabled = true;
        }
    }

    loadUploadedSlides() {
        if (!this.uploadedFilesProcessed) return;
        
        this.slideController.loadSlides(this.uploadedFilesProcessed.slides);
        
        this.audioController.setTotalPages(this.slideController.getTotalPages());
        
        this.statsTracker.reset();
        this.statsTracker.start();
        
        this.endShown = false;
        
        this.audioController.speak(`已加载${this.uploadedFilesProcessed.count}张幻灯片`);
    }

    checkPresentationEnd() {
        const isLastPage = this.slideController.getCurrentPage() === this.slideController.getTotalPages();
        const isPaused = this.slideController.isPaused;
        
        if (isLastPage && !this.endShown && !isPaused) {
            this.endShown = true;
            
            setTimeout(() => {
                if (this.slideController.getCurrentPage() === this.slideController.getTotalPages() 
                    && !this.slideController.isPaused) {
                    this.statsTracker.stop();
                    this.updateStatsDisplay();
                    document.getElementById('statsModal').classList.add('open');
                    
                    if (this.settings.voiceEnabled) {
                        this.audioController.speak('演示结束，感谢观看');
                    }
                } else {
                    this.endShown = false;
                }
            }, 2000);
        }
    }

    updateStatsDisplay() {
        const stats = this.statsTracker.getStats();
        document.getElementById('statDuration').textContent = stats.formattedDuration;
        document.getElementById('statSwipes').textContent = stats.totalSwipes;
        document.getElementById('statGestures').textContent = stats.totalGestures;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new PresentationApp();
});
