class App {
    constructor() {
        this.photoCanvas = null;
        this.compareSlider = null;
        this.overlayViewer = null;
        this.stepsPreview = null;
        this.gifGenerator = null;
        
        this.originalImageDataURL = null;
        this.damagedImageDataURL = null;
        this.repairedImageDataURL = null;
        this.repairSteps = {};
        this.repairSettings = null;
        
        this.batchFiles = [];
        this.batchResults = [];
        
        this.init();
    }

    init() {
        this.photoCanvas = new PhotoCanvas('mainCanvas', 'maskCanvas');
        this.compareSlider = new CompareSlider('compareOriginalCanvas', 'compareContainer', 'compareSlider');
        this.overlayViewer = new OverlayViewer('overlayOriginalCanvas', 'overlayRepairedCanvas', 'overlayOpacity');
        this.stepsPreview = new StepsPreview();
        this.gifGenerator = new GifGenerator();
        
        this.setupNavigation();
        this.setupUpload();
        this.setupDamageControls();
        this.setupBrushControls();
        this.setupRepairControls();
        this.setupViewTabs();
        this.setupExport();
        this.setupBatchProcessing();
        this.setupHistory();
        
        window.loadHistoryItem = (id) => this.loadHistoryItem(id);
        window.deleteHistoryItem = (id) => this.deleteHistoryItem(id);
    }

    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const view = btn.dataset.view;
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById(`${view}-view`).classList.add('active');
                
                if (view === 'history') {
                    this.loadHistory();
                }
            });
        });
    }

    setupUpload() {
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
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleFileUpload(file);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });
    }

    async handleFileUpload(file) {
        this.showLoading('正在加载图片...');
        
        try {
            this.originalImageDataURL = await Tools.fileToDataURL(file);
            this.damagedImageDataURL = this.originalImageDataURL;
            this.repairedImageDataURL = null;
            this.repairSteps = {};
            
            await this.photoCanvas.loadImage(this.originalImageDataURL);
            document.getElementById('canvasPlaceholder').style.display = 'none';
            
            this.resetExportButtons();
            this.stepsPreview.hide();
            
        } catch (error) {
            console.error('加载图片失败:', error);
            alert('加载图片失败，请重试');
        }
        
        this.hideLoading();
    }

    setupDamageControls() {
        const damageLevel = document.getElementById('damageLevel');
        const scratchCount = document.getElementById('scratchCount');
        const simulateBtn = document.getElementById('simulateDamageBtn');
        
        damageLevel.addEventListener('input', () => {
            document.getElementById('damageLevelValue').textContent = `${damageLevel.value}%`;
        });
        
        scratchCount.addEventListener('input', () => {
            document.getElementById('scratchCountValue').textContent = scratchCount.value;
        });
        
        simulateBtn.addEventListener('click', async () => {
            if (!this.originalImageDataURL) {
                alert('请先上传图片');
                return;
            }
            
            this.showLoading('正在应用破损效果...');
            
            try {
                this.damagedImageDataURL = await Tools.applyDamageEffect(
                    this.originalImageDataURL,
                    parseInt(damageLevel.value),
                    parseInt(scratchCount.value)
                );
                
                await this.photoCanvas.loadImage(this.damagedImageDataURL);
                
            } catch (error) {
                console.error('应用破损效果失败:', error);
                alert('应用破损效果失败');
            }
            
            this.hideLoading();
        });
    }

    setupBrushControls() {
        const modeBtns = document.querySelectorAll('.brush-mode-btn');
        const brushSize = document.getElementById('brushSize');
        const brushSettings = document.getElementById('brushSettings');
        const clearMaskBtn = document.getElementById('clearMaskBtn');
        const invertMaskBtn = document.getElementById('invertMaskBtn');
        
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const mode = btn.dataset.mode;
                this.photoCanvas.setBrushMode(mode);
                
                brushSettings.style.display = mode === 'brush' ? 'block' : 'none';
            });
        });
        
        brushSize.addEventListener('input', () => {
            document.getElementById('brushSizeValue').textContent = `${brushSize.value}px`;
            this.photoCanvas.setBrushSize(parseInt(brushSize.value));
        });
        
        clearMaskBtn.addEventListener('click', () => {
            this.photoCanvas.clearMask();
        });
        
        invertMaskBtn.addEventListener('click', () => {
            this.photoCanvas.invertMask();
        });
    }

    setupRepairControls() {
        const intensityBtns = document.querySelectorAll('.intensity-btn');
        const repairBtn = document.getElementById('repairBtn');
        
        intensityBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                intensityBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        repairBtn.addEventListener('click', () => this.doRepair());
    }

    async doRepair() {
        if (!this.damagedImageDataURL) {
            alert('请先上传图片');
            return;
        }
        
        const intensityBtn = document.querySelector('.intensity-btn.active');
        const intensity = intensityBtn.dataset.intensity;
        
        const operations = {
            denoise: document.getElementById('optDenoise').checked,
            sharpen: document.getElementById('optSharpen').checked,
            contrast: document.getElementById('optContrast').checked,
            colorize: document.getElementById('optColorize').checked,
            removeScratches: document.getElementById('optScratches').checked
        };
        
        if (!Object.values(operations).some(v => v)) {
            alert('请至少选择一种修复操作');
            return;
        }
        
        this.repairSettings = { intensity, operations };
        
        const savedBrushMode = this.photoCanvas.brushMode;
        const savedMaskDataURL = this.photoCanvas.getMaskDataURLForDisplay();
        const mask = this.photoCanvas.getMaskDataURL();
        
        this.showLoading('正在修复图片...');
        
        try {
            const result = await Tools.fetchRepair(this.damagedImageDataURL, {
                intensity,
                operations,
                mask
            });
            
            if (result.success) {
                this.repairedImageDataURL = result.repaired;
                this.repairSteps = result.steps || {};
                
                await this.photoCanvas.loadImage(this.repairedImageDataURL);
                
                this.photoCanvas.brushMode = savedBrushMode;
                if (savedBrushMode === 'brush' && savedMaskDataURL) {
                    await this.photoCanvas.restoreMaskFromDataURL(savedMaskDataURL);
                }
                
                await this.compareSlider.loadImages(this.damagedImageDataURL, this.repairedImageDataURL);
                await this.overlayViewer.loadImages(this.damagedImageDataURL, this.repairedImageDataURL);
                await this.stepsPreview.showSteps(this.damagedImageDataURL, this.repairSteps, this.repairedImageDataURL);
                
                this.enableExportButtons();
                
                await historyManager.add({
                    original: this.damagedImageDataURL,
                    repaired: this.repairedImageDataURL,
                    settings: this.repairSettings
                });
            }
            
        } catch (error) {
            console.error('修复失败:', error);
            alert('修复失败，请重试');
        }
        
        this.hideLoading();
    }

    setupViewTabs() {
        const tabs = document.querySelectorAll('.view-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const view = tab.dataset.canvasView;
                document.getElementById('editView').style.display = view === 'edit' ? 'flex' : 'none';
                document.getElementById('compareView').style.display = view === 'compare' ? 'flex' : 'none';
                document.getElementById('overlayView').style.display = view === 'overlay' ? 'flex' : 'none';
                
                if (view === 'compare' && this.damagedImageDataURL && this.repairedImageDataURL) {
                    setTimeout(() => {
                        this.compareSlider.loadImages(this.damagedImageDataURL, this.repairedImageDataURL);
                    }, 50);
                } else if (view === 'overlay' && this.damagedImageDataURL && this.repairedImageDataURL) {
                    setTimeout(() => {
                        this.overlayViewer.loadImages(this.damagedImageDataURL, this.repairedImageDataURL);
                    }, 50);
                }
            });
        });
    }

    setupExport() {
        document.getElementById('exportRepairedBtn').addEventListener('click', () => {
            if (this.repairedImageDataURL) {
                Tools.downloadDataURL(this.repairedImageDataURL, 'repaired-photo.jpg');
            }
        });
        
        document.getElementById('exportStepsBtn').addEventListener('click', async () => {
            if (this.repairedImageDataURL) {
                const zip = new JSZip();
                
                zip.file('01-original.jpg', this.dataURLToBase64(this.damagedImageDataURL), { base64: true });
                
                if (this.repairSteps.denoised) {
                    zip.file('02-denoised.jpg', this.dataURLToBase64(this.repairSteps.denoised), { base64: true });
                }
                if (this.repairSteps.sharpened) {
                    zip.file('03-sharpened.jpg', this.dataURLToBase64(this.repairSteps.sharpened), { base64: true });
                }
                if (this.repairSteps.contrast) {
                    zip.file('04-contrast.jpg', this.dataURLToBase64(this.repairSteps.contrast), { base64: true });
                }
                if (this.repairSteps.colorized) {
                    zip.file('05-colorized.jpg', this.dataURLToBase64(this.repairSteps.colorized), { base64: true });
                }
                
                zip.file('06-final.jpg', this.dataURLToBase64(this.repairedImageDataURL), { base64: true });
                
                this.showLoading('正在打包...');
                const content = await zip.generateAsync({ type: 'blob' });
                this.hideLoading();
                
                Tools.downloadBlob(content, 'repair-steps.zip');
            }
        });
        
        document.getElementById('exportGifBtn').addEventListener('click', async () => {
            if (this.damagedImageDataURL && this.repairedImageDataURL) {
                this.showLoading('正在生成GIF...');
                
                try {
                    const blob = await this.gifGenerator.generate(
                        this.damagedImageDataURL,
                        this.repairedImageDataURL
                    );
                    Tools.downloadBlob(blob, 'repair-comparison.gif');
                } catch (error) {
                    console.error('生成GIF失败:', error);
                    alert('生成GIF失败，请重试');
                }
                
                this.hideLoading();
            }
        });
    }

    dataURLToBase64(dataURL) {
        return dataURL.split(',')[1];
    }

    setupBatchProcessing() {
        const batchUploadArea = document.getElementById('batchUploadArea');
        const batchFileInput = document.getElementById('batchFileInput');
        const batchRepairBtn = document.getElementById('batchRepairBtn');
        const batchDownloadBtn = document.getElementById('batchDownloadBtn');
        
        batchUploadArea.addEventListener('click', () => batchFileInput.click());
        
        batchUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            batchUploadArea.classList.add('dragover');
        });
        
        batchUploadArea.addEventListener('dragleave', () => {
            batchUploadArea.classList.remove('dragover');
        });
        
        batchUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            batchUploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            this.addBatchFiles(files);
        });
        
        batchFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
            this.addBatchFiles(files);
        });
        
        batchRepairBtn.addEventListener('click', () => this.doBatchRepair());
        
        batchDownloadBtn.addEventListener('click', () => this.downloadBatchResults());
    }

    async addBatchFiles(files) {
        for (const file of files) {
            if (!this.batchFiles.find(f => f.name === file.name)) {
                this.batchFiles.push(file);
            }
        }
        
        this.updateBatchFileList();
    }

    updateBatchFileList() {
        const container = document.getElementById('fileListContainer');
        
        if (this.batchFiles.length === 0) {
            container.innerHTML = '<p class="empty-list-text">暂无文件，请上传照片</p>';
            document.getElementById('batchRepairBtn').disabled = true;
            return;
        }
        
        container.innerHTML = this.batchFiles.map((file, index) => `
            <div class="file-item" data-index="${index}">
                <div class="file-info">
                    <span class="file-icon">🖼️</span>
                    <div>
                        <p class="file-name">${file.name}</p>
                        <p class="file-size">${Tools.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <div class="file-status">
                    <span class="status-badge status-pending" id="batch-status-${index}">等待中</span>
                    <button class="remove-file-btn" onclick="app.removeBatchFile(${index})">✕</button>
                </div>
            </div>
        `).join('');
        
        document.getElementById('batchRepairBtn').disabled = false;
    }

    removeBatchFile(index) {
        this.batchFiles.splice(index, 1);
        this.updateBatchFileList();
    }

    async doBatchRepair() {
        if (this.batchFiles.length === 0) return;
        
        this.batchResults = [];
        const intensity = document.getElementById('batchIntensity').value;
        const operations = {
            denoise: document.getElementById('batchOptDenoise').checked,
            sharpen: document.getElementById('batchOptSharpen').checked,
            contrast: document.getElementById('batchOptContrast').checked,
            colorize: document.getElementById('batchOptColorize').checked,
            removeScratches: document.getElementById('batchOptScratches').checked
        };
        
        document.getElementById('batchProgress').style.display = 'block';
        document.getElementById('batchRepairBtn').disabled = true;
        
        try {
            this.showLoading('正在批量处理...');
            const result = await Tools.fetchBatchRepair(this.batchFiles, intensity, operations);
            
            if (result.success) {
                for (let i = 0; i < result.results.length; i++) {
                    const fileResult = result.results[i];
                    const statusEl = document.getElementById(`batch-status-${i}`);
                    
                    document.getElementById('progressFill').style.width = `${((i + 1) / result.results.length) * 100}%`;
                    document.getElementById('progressText').textContent = `正在处理 ${i + 1} / ${result.results.length}: ${fileResult.filename}`;
                    
                    if (fileResult.success) {
                        this.batchResults.push({
                            name: fileResult.filename,
                            original: fileResult.original,
                            repaired: fileResult.repaired
                        });
                        
                        if (statusEl) {
                            statusEl.className = 'status-badge status-done';
                            statusEl.textContent = '已完成';
                        }
                    } else {
                        if (statusEl) {
                            statusEl.className = 'status-badge status-error';
                            statusEl.textContent = '失败';
                        }
                    }
                    
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        } catch (error) {
            console.error('批量处理失败:', error);
            
            for (let i = 0; i < this.batchFiles.length; i++) {
                const file = this.batchFiles[i];
                const statusEl = document.getElementById(`batch-status-${i}`);
                statusEl.className = 'status-badge status-processing';
                statusEl.textContent = '处理中...';
                
                document.getElementById('progressFill').style.width = `${((i) / this.batchFiles.length) * 100}%`;
                document.getElementById('progressText').textContent = `正在处理 ${i + 1} / ${this.batchFiles.length}: ${file.name}`;
                
                try {
                    const dataURL = await Tools.fileToDataURL(file);
                    const result = await Tools.simulateRepair(dataURL, { intensity, operations });
                    
                    this.batchResults.push({
                        name: file.name,
                        original: dataURL,
                        repaired: result.repaired
                    });
                    
                    statusEl.className = 'status-badge status-done';
                    statusEl.textContent = '已完成';
                    
                } catch (error) {
                    console.error(`处理 ${file.name} 失败:`, error);
                    statusEl.className = 'status-badge status-error';
                    statusEl.textContent = '失败';
                }
                
                await new Promise(r => setTimeout(r, 100));
            }
        }
        
        this.hideLoading();
        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('progressText').textContent = `处理完成！成功 ${this.batchResults.length} / ${this.batchFiles.length}`;
        document.getElementById('batchDownloadBtn').disabled = this.batchResults.length === 0;
        document.getElementById('batchRepairBtn').disabled = false;
    }

    async downloadBatchResults() {
        if (this.batchResults.length === 0) return;
        
        this.showLoading('正在打包ZIP...');
        
        const zip = new JSZip();
        
        for (const result of this.batchResults) {
            const ext = result.name.split('.').pop();
            const baseName = result.name.replace(/\.[^/.]+$/, '');
            zip.file(`${baseName}_repaired.${ext}`, this.dataURLToBase64(result.repaired), { base64: true });
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        Tools.downloadBlob(content, 'batch-repaired-photos.zip');
        
        this.hideLoading();
    }

    setupHistory() {
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            if (confirm('确定要清空所有历史记录吗？')) {
                historyManager.clear();
                this.loadHistory();
            }
        });
    }

    loadHistory() {
        historyManager.renderHistoryGrid(document.getElementById('historyGrid'));
    }

    async loadHistoryItem(id) {
        const record = historyManager.getById(id);
        if (record) {
            document.querySelector('[data-view="single"]').click();
            
            this.originalImageDataURL = record.original;
            this.damagedImageDataURL = record.original;
            this.repairedImageDataURL = record.repaired;
            this.repairSettings = record.settings;
            
            await this.photoCanvas.loadImage(this.repairedImageDataURL);
            document.getElementById('canvasPlaceholder').style.display = 'none';
            
            await this.compareSlider.loadImages(this.damagedImageDataURL, this.repairedImageDataURL);
            await this.overlayViewer.loadImages(this.damagedImageDataURL, this.repairedImageDataURL);
            
            this.enableExportButtons();
        }
    }

    deleteHistoryItem(id) {
        if (confirm('确定要删除这条记录吗？')) {
            historyManager.delete(id);
            this.loadHistory();
        }
    }

    showLoading(text = '处理中...') {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    enableExportButtons() {
        document.getElementById('exportRepairedBtn').disabled = false;
        document.getElementById('exportStepsBtn').disabled = false;
        document.getElementById('exportGifBtn').disabled = false;
    }

    resetExportButtons() {
        document.getElementById('exportRepairedBtn').disabled = true;
        document.getElementById('exportStepsBtn').disabled = true;
        document.getElementById('exportGifBtn').disabled = true;
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app;
});
