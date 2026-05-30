const App = {
    segmentationEngine: null,
    canvasRenderer: null,
    comparisonView: null,
    batchProcessor: null,
    cameraStream: null,
    currentFacingMode: 'user',
    currentImage: null,
    currentFilename: 'image',
    currentViewMode: 'result',

    async init() {
        try {
            this._initEngines();
            this._bindUIEvents();
            this._bindKeyboardShortcuts();
            this._setupDragAndDrop();
            await this._loadModel();
            this._updateModelStatus(true);
        } catch (e) {
            console.error('Failed to initialize app:', e);
            this._showError('初始化失败，请刷新页面重试');
        }
    },

    _initEngines() {
        this.segmentationEngine = new SegmentationEngine();
        this.canvasRenderer = new CanvasRenderer(document.getElementById('mainCanvas'));
        this.comparisonView = new ComparisonView(
            document.getElementById('mainCanvas'),
            document.getElementById('compareCanvas'),
            document.getElementById('compareSlider')
        );
        this.batchProcessor = new BatchProcessor();
        this.batchProcessor.setSegmentationEngine(this.segmentationEngine);
    },

    async _loadModel() {
        this._updateModelStatus(false);
        const modelType = document.querySelector('input[name="modelType"]:checked')?.value || 'general';
        await this.segmentationEngine.loadModel(modelType);
    },

    _updateModelStatus(ready) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (ready) {
            statusDot.classList.add('ready');
            statusText.textContent = '模型已就绪';
        } else {
            statusDot.classList.remove('ready');
            statusText.textContent = '模型加载中...';
        }
    },

    _bindUIEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this._switchTab(tab);
            });
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this._handleImageFile(e.target.files[0]);
            }
        });

        document.getElementById('uploadZone').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('cameraBtn').addEventListener('click', () => {
            this._openCamera();
        });

        document.getElementById('pasteBtn').addEventListener('click', async () => {
            const image = await Utils.readClipboardImage();
            if (image) {
                this._handleImage(image, 'clipboard');
            } else {
                this._showError('剪贴板中没有图片');
            }
        });

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this._switchViewMode(view);
            });
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.canvasRenderer.resetPosition();
        });

        document.getElementById('downloadBtn').addEventListener('click', () => {
            this._downloadResult();
        });

        document.getElementById('downloadMaskBtn').addEventListener('click', () => {
            this._downloadMask();
        });

        document.querySelectorAll('.bg-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.bgType;
                this._switchBackgroundType(type);
            });
        });

        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                document.getElementById('solidColor').value = color;
                this.canvasRenderer.setBackground('solid', color);
            });
        });

        document.getElementById('solidColor').addEventListener('input', (e) => {
            this.canvasRenderer.setBackground('solid', e.target.value);
        });

        document.querySelectorAll('.gradient-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gradient = JSON.parse(e.currentTarget.dataset.gradient);
                document.getElementById('gradientStart').value = gradient[0];
                document.getElementById('gradientEnd').value = gradient[1];
                this._updateGradient();
            });
        });

        document.getElementById('gradientStart').addEventListener('input', () => this._updateGradient());
        document.getElementById('gradientEnd').addEventListener('input', () => this._updateGradient());
        document.getElementById('gradientAngle').addEventListener('input', (e) => {
            document.getElementById('gradientAngleValue').textContent = `${e.target.value}°`;
            this._updateGradient();
        });

        document.getElementById('bgImageUpload').addEventListener('click', () => {
            document.getElementById('bgImageInput').click();
        });

        document.getElementById('bgImageInput').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                const image = await Utils.fileToImage(e.target.files[0]);
                this.canvasRenderer.setBackground('image', image);
            }
        });

        document.getElementById('bgOpacity').addEventListener('input', (e) => {
            const value = e.target.value / 100;
            document.getElementById('bgOpacityValue').textContent = `${e.target.value}%`;
            this.canvasRenderer.setBackgroundOpacity(value);
        });

        document.getElementById('featherRadius').addEventListener('input', Utils.throttle((e) => {
            const value = parseInt(e.target.value);
            document.getElementById('featherValue').textContent = `${value}px`;
            this.canvasRenderer.setFeatherRadius(value);
        }, 30));

        document.getElementById('edgeShrink').addEventListener('input', Utils.throttle((e) => {
            const value = parseInt(e.target.value);
            document.getElementById('edgeShrinkValue').textContent = `${value}px`;
            this.canvasRenderer.setEdgeAdjust(value);
        }, 30));

        document.getElementById('shadowEnabled').addEventListener('change', (e) => {
            const enabled = e.target.checked;
            this.canvasRenderer.enableShadow(enabled);
            document.getElementById('shadowOpacityGroup').style.opacity = enabled ? '1' : '0.5';
        });

        document.getElementById('shadowOpacity').addEventListener('input', Utils.throttle((e) => {
            const value = e.target.value / 100;
            document.getElementById('shadowOpacityValue').textContent = `${e.target.value}%`;
            this.canvasRenderer.setShadowOpacity(value);
        }, 30));

        document.getElementById('confidenceMaskEnabled').addEventListener('change', (e) => {
            const enabled = e.target.checked;
            this.canvasRenderer.enableConfidenceMask(enabled);
            document.getElementById('confidenceColorGroup').style.display = enabled ? 'block' : 'none';
        });

        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const colorStr = e.target.dataset.color;
                const color = colorStr.split(',').map((c, i) => i < 3 ? parseInt(c) : parseFloat(c));
                this.canvasRenderer.setConfidenceMaskColor(color);
                document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        document.getElementById('foregroundScale').addEventListener('input', Utils.throttle((e) => {
            const value = e.target.value / 100;
            document.getElementById('scaleValue').textContent = `${e.target.value}%`;
            const pos = this.canvasRenderer.getForegroundPosition();
            this.canvasRenderer.setPosition(pos.x, pos.y, value);
        }, 30));

        document.getElementById('positionX').addEventListener('input', Utils.throttle((e) => {
            const x = parseInt(e.target.value);
            const pos = this.canvasRenderer.getForegroundPosition();
            this.canvasRenderer.setPosition(x, pos.y, pos.scale);
        }, 30));

        document.getElementById('positionY').addEventListener('input', Utils.throttle((e) => {
            const y = parseInt(e.target.value);
            const pos = this.canvasRenderer.getForegroundPosition();
            this.canvasRenderer.setPosition(pos.x, y, pos.scale);
        }, 30));

        document.querySelectorAll('input[name="modelType"]').forEach(radio => {
            radio.addEventListener('change', async (e) => {
                this.segmentationEngine.setModelType(e.target.value);
                if (this.currentImage) {
                    await this._processImage(this.currentImage);
                }
            });
        });

        document.getElementById('batchFileInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this._handleBatchZip(e.target.files[0]);
            }
        });

        document.getElementById('batchUploadZone').addEventListener('click', () => {
            document.getElementById('batchFileInput').click();
        });

        document.getElementById('batchUploadBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('batchFileInput').click();
        });

        document.getElementById('startBatchBtn').addEventListener('click', () => {
            this._startBatchProcessing();
        });

        document.getElementById('downloadBatchBtn').addEventListener('click', () => {
            this._downloadBatchResults();
        });

        document.getElementById('clearBatchBtn').addEventListener('click', () => {
            this._clearBatch();
        });

        document.getElementById('captureBtn').addEventListener('click', () => {
            this._capturePhoto();
        });

        document.getElementById('switchCameraBtn').addEventListener('click', () => {
            this._switchCamera();
        });

        document.getElementById('closeCameraModal').addEventListener('click', () => {
            this._closeCamera();
        });

        document.getElementById('helpBtn').addEventListener('click', () => {
            document.getElementById('helpModal').classList.add('active');
        });

        document.getElementById('closeHelpModal').addEventListener('click', () => {
            document.getElementById('helpModal').classList.remove('active');
        });

        document.getElementById('cameraModal').addEventListener('click', (e) => {
            if (e.target.id === 'cameraModal') {
                this._closeCamera();
            }
        });

        document.getElementById('helpModal').addEventListener('click', (e) => {
            if (e.target.id === 'helpModal') {
                document.getElementById('helpModal').classList.remove('active');
            }
        });

        window.addEventListener('resize', () => {
            this._resizeCanvas();
        });
    },

    _bindKeyboardShortcuts() {
        document.addEventListener('keydown', async (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (this.currentImage) {
                    this._downloadResult();
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                return;
            }

            if (e.key === 'r' || e.key === 'R') {
                if (this.canvasRenderer) {
                    this.canvasRenderer.resetPosition();
                }
                return;
            }

            if (e.key === '1') {
                this._switchViewMode('result');
            } else if (e.key === '2') {
                this._switchViewMode('compare');
            } else if (e.key === '3') {
                this._switchViewMode('mask');
            }

            if (e.key === 'Escape') {
                this._closeCamera();
                document.getElementById('helpModal').classList.remove('active');
            }
        });

        document.addEventListener('paste', async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    const image = await Utils.fileToImage(blob);
                    this._handleImage(image, 'clipboard');
                    break;
                }
            }
        });
    },

    _setupDragAndDrop() {
        const uploadZone = document.getElementById('uploadZone');
        const batchUploadZone = document.getElementById('batchUploadZone');

        const zones = [uploadZone, batchUploadZone];

        zones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    if (zone === uploadZone) {
                        this._handleImageFile(files[0]);
                    } else {
                        this._handleBatchZip(files[0]);
                    }
                }
            });
        });
    },

    _switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });
    },

    _switchViewMode(mode) {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });

        this.currentViewMode = mode;

        if (mode === 'result') {
            this.comparisonView.deactivate();
            this.canvasRenderer.showMask(false);
        } else if (mode === 'compare') {
            this.comparisonView.activate();
            this.canvasRenderer.showMask(false);
        } else if (mode === 'mask') {
            this.comparisonView.deactivate();
            this.canvasRenderer.showMask(true);
        }
    },

    _switchBackgroundType(type) {
        document.querySelectorAll('.bg-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bgType === type);
        });

        document.querySelectorAll('.bg-option').forEach(option => {
            option.classList.toggle('active', option.dataset.bgOption === type);
        });

        if (type === 'transparent') {
            this.canvasRenderer.setBackground('transparent');
        } else if (type === 'solid') {
            const color = document.getElementById('solidColor').value;
            this.canvasRenderer.setBackground('solid', color);
        } else if (type === 'gradient') {
            this._updateGradient();
        } else if (type === 'image') {
            const bgImage = this.canvasRenderer.background.image;
            if (bgImage) {
                this.canvasRenderer.setBackground('image', bgImage);
            }
        }
    },

    _updateGradient() {
        const start = document.getElementById('gradientStart').value;
        const end = document.getElementById('gradientEnd').value;
        const angle = parseInt(document.getElementById('gradientAngle').value);
        
        this.canvasRenderer.setBackground('gradient', {
            colors: [start, end],
            angle: angle
        });
    },

    async _handleImageFile(file) {
        try {
            const image = await Utils.fileToImage(file);
            this._handleImage(image, file.name);
        } catch (e) {
            console.error('Failed to load image:', e);
            this._showError('图片加载失败，请检查文件格式');
        }
    },

    async _handleImage(image, filename = 'image') {
        this.currentImage = image;
        this.currentFilename = Utils.getFilenameWithoutExtension(filename);
        this.comparisonView.setOriginalImage(image);
        
        document.getElementById('emptyState').classList.add('hidden');
        
        const resizedData = ImageProcessor.resizeImageData(
            ImageProcessor.getImageDataFromImage(image),
            1920
        );
        
        this.canvasRenderer.setForeground(image, resizedData);
        this._resizeCanvas();
        
        this._updateResolutionInfo();
        
        await this._processImage(image);
    },

    async _processImage(image) {
        this._showLoading('正在分析图片...');
        
        try {
            const result = await this.segmentationEngine.segmentImageWithProgress(
                image,
                (progress, text) => {
                    this._updateLoadingProgress(progress, text);
                }
            );
            
            this.canvasRenderer.setMask(result.mask);
            
            document.getElementById('processingTime').textContent = Utils.formatTime(result.processingTime);
            document.getElementById('confidenceValue').textContent = `${result.confidence.toFixed(1)}%`;
            
            document.getElementById('downloadBtn').disabled = false;
            document.getElementById('downloadMaskBtn').disabled = false;
            
            this._hideLoading();
            
        } catch (e) {
            console.error('Processing failed:', e);
            this._hideLoading();
            this._showError('图片处理失败，请重试');
        }
    },

    async _openCamera() {
        try {
            this.cameraStream = await Utils.getCameraStream(this.currentFacingMode);
            const video = document.getElementById('cameraVideo');
            video.srcObject = this.cameraStream;
            document.getElementById('cameraModal').classList.add('active');
        } catch (e) {
            console.error('Failed to open camera:', e);
            this._showError('无法访问摄像头，请检查权限设置');
        }
    },

    async _switchCamera() {
        if (this.cameraStream) {
            Utils.stopCameraStream(this.cameraStream);
        }
        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
        await this._openCamera();
    },

    _capturePhoto() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        
        if (this.currentFacingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0);
        
        const dataURL = canvas.toDataURL('image/png');
        Utils.loadImage(dataURL).then(image => {
            this._handleImage(image, `photo_${Utils.getTimestamp()}`);
            this._closeCamera();
        });
    },

    _closeCamera() {
        if (this.cameraStream) {
            Utils.stopCameraStream(this.cameraStream);
            this.cameraStream = null;
        }
        document.getElementById('cameraModal').classList.remove('active');
    },

    async _handleBatchZip(file) {
        try {
            this._showLoading('正在解析ZIP文件...');
            
            const files = await this.batchProcessor.loadZip(file);
            
            this._hideLoading();
            
            document.getElementById('batchInfoBar').style.display = 'flex';
            document.getElementById('batchUploadZone').style.display = 'none';
            
            this._updateBatchStats();
            this._renderBatchGrid();
            
        } catch (e) {
            console.error('Failed to load ZIP:', e);
            this._hideLoading();
            this._showError('ZIP文件解析失败，请检查文件');
        }
    },

    async _startBatchProcessing() {
        document.getElementById('batchProgress').style.display = 'flex';
        document.getElementById('startBatchBtn').disabled = true;
        
        try {
            const result = await this.batchProcessor.processAll(
                (progress, filename, status) => {
                    const percent = Math.round(progress * 100);
                    document.getElementById('batchProgressFill').style.width = `${percent}%`;
                    document.getElementById('batchProgressText').textContent = `${percent}%`;
                    this._updateBatchStats();
                    this._renderBatchGrid();
                }
            );
            
            document.getElementById('downloadBatchBtn').disabled = false;
            this._updateBatchStats();
            this._renderBatchGrid();
            
        } catch (e) {
            console.error('Batch processing failed:', e);
            this._showError('批量处理失败');
        }
        
        document.getElementById('startBatchBtn').disabled = false;
    },

    async _downloadBatchResults() {
        try {
            this._showLoading('正在生成下载包...');
            
            const zipBlob = await this.batchProcessor.exportZip((progress, filename) => {
                const percent = Math.round(progress * 100);
                this._updateLoadingProgress(progress, `正在打包: ${filename}`);
            });
            
            Utils.downloadBlob(zipBlob, `processed_images_${Utils.getTimestamp()}.zip`);
            
            this._hideLoading();
            
        } catch (e) {
            console.error('Export failed:', e);
            this._hideLoading();
            this._showError('导出失败，请重试');
        }
    },

    _clearBatch() {
        this.batchProcessor.clear();
        document.getElementById('batchInfoBar').style.display = 'none';
        document.getElementById('batchProgress').style.display = 'none';
        document.getElementById('batchUploadZone').style.display = 'block';
        document.getElementById('downloadBatchBtn').disabled = true;
        this._renderBatchGrid();
    },

    _updateBatchStats() {
        const stats = this.batchProcessor.getStats();
        document.getElementById('batchTotal').textContent = stats.total;
        document.getElementById('batchCompleted').textContent = stats.completed;
        document.getElementById('batchFailed').textContent = stats.failed;
    },

    _renderBatchGrid() {
        const grid = document.getElementById('batchGrid');
        const files = this.batchProcessor.getFiles();
        
        grid.innerHTML = files.map(file => {
            const statusIcons = {
                pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
                processing: '<svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>',
                completed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
                failed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
            };
            
            let thumbSrc = '';
            let thumbClass = '';
            
            if (file.status === 'completed' && file.result && file.result.previewCanvas) {
                thumbSrc = file.result.previewCanvas.toDataURL('image/png');
                thumbClass = 'result-thumb';
            } else if (file.image) {
                thumbSrc = file.image.src;
            }
            
            return `
                <div class="batch-item ${file.status}" data-id="${file.id}">
                    <div class="batch-item-thumb">
                        ${thumbSrc ? `<img src="${thumbSrc}" alt="${file.name}" class="${thumbClass}">` : '<span style="color: var(--text-muted)">无法预览</span>'}
                        <div class="batch-item-status ${file.status}">
                            ${statusIcons[file.status]}
                        </div>
                    </div>
                    <div class="batch-item-info">
                        <div class="batch-item-name">${file.name}</div>
                        <div class="batch-item-meta">
                            ${file.result ? `${Utils.formatTime(file.result.processingTime)} · ${file.result.confidence.toFixed(1)}%` : 
                              file.status === 'failed' ? '处理失败' : '等待处理'}
                        </div>
                    </div>
                    ${file.status === 'completed' ? `
                        <div class="batch-item-actions">
                            <button onclick="App._downloadBatchItem('${file.id}')">下载</button>
                            <button onclick="App._downloadBatchItemMask('${file.id}')">掩码</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    _downloadBatchItem(id) {
        this.batchProcessor.downloadResult(id);
    },

    _downloadBatchItemMask(id) {
        this.batchProcessor.downloadMask(id);
    },

    async _downloadResult() {
        const canvas = this.canvasRenderer.exportPNG();
        const blob = await Utils.canvasToBlob(canvas, 'image/png');
        Utils.downloadBlob(blob, `${this.currentFilename}_no_bg.png`);
    },

    async _downloadMask() {
        const canvas = this.canvasRenderer.exportMask();
        if (canvas) {
            const blob = await Utils.canvasToBlob(canvas, 'image/png');
            Utils.downloadBlob(blob, `${this.currentFilename}_mask.png`);
        }
    },

    _showLoading(text = '处理中...') {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('loadingOverlay').classList.add('active');
    },

    _hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    },

    _updateLoadingProgress(progress, text) {
        document.getElementById('progressBar').style.width = `${progress * 100}%`;
        if (text) {
            document.getElementById('loadingText').textContent = text;
        }
    },

    _showError(message) {
        alert(message);
    },

    _updateResolutionInfo() {
        const size = this.canvasRenderer.getSize();
        document.getElementById('resolutionInfo').textContent = `${size.width} × ${size.height}`;
    },

    _resizeCanvas() {
        const wrapper = document.getElementById('canvasWrapper');
        if (wrapper && this.canvasRenderer) {
            const rect = wrapper.getBoundingClientRect();
            this.canvasRenderer.resize(rect.width, rect.height);
            this.comparisonView.updateCanvasSize();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
