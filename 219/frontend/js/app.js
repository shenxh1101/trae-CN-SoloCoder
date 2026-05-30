const App = {
    originalFile: null,
    originalDataUrl: null,
    colorizedDataUrl: null,
    originalImg: null,
    colorizedImg: null,
    currentWarmth: 0,
    currentSaturation: 1,
    batchZipFile: null,

    async init() {
        ComparisonView.init();
        Editor.init();
        this._bindEvents();
        this._checkServerStatus();
        setInterval(() => this._pollQueueStatus(), 5000);
    },

    _bindEvents() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) this._handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this._handleFile(e.target.files[0]);
            e.target.value = '';
        });

        document.getElementById('btnReupload').addEventListener('click', () => this._resetUpload());

        document.getElementById('btnColorize').addEventListener('click', () => this._doColorize());
        document.getElementById('btnAdjust').addEventListener('click', () => this._doAdjust());

        document.getElementById('warmthSlider').addEventListener('input', (e) => {
            this.currentWarmth = parseInt(e.target.value) / 100;
            document.getElementById('warmthValue').textContent = e.target.value;
        });
        document.getElementById('saturationSlider').addEventListener('input', (e) => {
            this.currentSaturation = parseInt(e.target.value) / 100;
            document.getElementById('saturationValue').textContent = e.target.value + '%';
        });

        document.getElementById('btnExport').addEventListener('click', () => this._doExport());

        document.getElementById('btnHistory').addEventListener('click', () => this._openHistory());
        document.getElementById('btnCloseHistory').addEventListener('click', () => this._closeHistory());
        document.getElementById('btnClearHistory').addEventListener('click', () => {
            History.clear();
            History.renderList(document.getElementById('historyList'), (item) => this._loadHistoryItem(item));
            this.showToast('历史已清空', 'success');
        });
        document.getElementById('btnExportHistory').addEventListener('click', () => History.exportData());
        document.getElementById('btnImportHistory').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                if (e.target.files.length) {
                    try {
                        await History.importData(e.target.files[0]);
                        History.renderList(document.getElementById('historyList'), (item) => this._loadHistoryItem(item));
                        this.showToast('历史已导入', 'success');
                    } catch {
                        this.showToast('导入失败', 'error');
                    }
                }
            };
            input.click();
        });

        document.getElementById('btnBatch').addEventListener('click', () => this._openBatch());
        document.getElementById('btnCloseBatch').addEventListener('click', () => this._closeBatch());

        const batchZone = document.getElementById('batchUploadZone');
        const batchInput = document.getElementById('batchFileInput');
        batchZone.addEventListener('click', () => batchInput.click());
        batchZone.addEventListener('dragover', (e) => { e.preventDefault(); batchZone.style.borderColor = 'var(--accent)'; });
        batchZone.addEventListener('dragleave', () => { batchZone.style.borderColor = ''; });
        batchZone.addEventListener('drop', (e) => {
            e.preventDefault();
            batchZone.style.borderColor = '';
            if (e.dataTransfer.files.length) this._handleBatchFile(e.dataTransfer.files[0]);
        });
        batchInput.addEventListener('change', (e) => {
            if (e.target.files.length) this._handleBatchFile(e.target.files[0]);
            e.target.value = '';
        });

        document.getElementById('btnStartBatch').addEventListener('click', () => this._doBatchColorize());

        Editor.onMaskReady = async (maskData) => {
            await this._doRegionColorize();
        };
    },

    async _handleFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showToast('请上传图片文件', 'error');
            return;
        }

        this.originalFile = file;

        try {
            const processed = await WorkerAPI.toGrayscale(
                await this._fileToImageData(file),
                ...(await this._getFileDimensions(file))
            );
        } catch (e) {
            // Worker may not be supported; continue anyway
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalDataUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
                this.originalImg = img;
                document.getElementById('uploadZone').style.display = 'none';
                document.getElementById('comparisonContainer').style.display = 'flex';
                document.getElementById('btnColorize').disabled = false;
                ComparisonView.setImages(img, img);
                ComparisonView.setView('slider');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    _fileToImageData(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(ctx.getImageData(0, 0, img.width, img.height));
            };
            img.src = URL.createObjectURL(file);
        });
    },

    _getFileDimensions(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve([img.width, img.height]);
            img.src = URL.createObjectURL(file);
        });
    },

    _resetUpload() {
        this.originalFile = null;
        this.originalDataUrl = null;
        this.colorizedDataUrl = null;
        this.originalImg = null;
        this.colorizedImg = null;
        document.getElementById('uploadZone').style.display = 'flex';
        document.getElementById('comparisonContainer').style.display = 'none';
        document.getElementById('btnColorize').disabled = true;
        document.getElementById('btnAdjust').disabled = true;
        document.getElementById('btnExport').disabled = true;

        if (Editor.brushActive) Editor.toggleBrush();
        Editor.clearMask();
    },

    async _doColorize() {
        if (!this.originalFile) return;

        this._showLoading('正在着色...');

        try {
            const warmth = this.currentWarmth;
            const saturation = this.currentSaturation;
            const result = await Api.colorize(this.originalFile, warmth, saturation);

            document.getElementById('inferenceTime').textContent = result.inference_time;
            document.getElementById('queueLength').textContent = result.queue_length;

            const colorizedUrl = Api.getResultUrl(result.task_id);
            const img = new Image();
            img.onload = () => {
                this.colorizedImg = img;
                this.colorizedDataUrl = colorizedUrl;
                ComparisonView.setColorized(img);
                document.getElementById('btnAdjust').disabled = false;
                document.getElementById('btnExport').disabled = false;

                this._saveToHistory(colorizedUrl);

                this._hideLoading();
                this.showToast(`着色完成，耗时 ${result.inference_time}s`, 'success');
            };
            img.onerror = () => {
                this._hideLoading();
                this.showToast('加载着色结果失败', 'error');
            };
            img.crossOrigin = 'anonymous';
            img.src = colorizedUrl;
        } catch (err) {
            this._hideLoading();
            this.showToast('着色失败: ' + err.message, 'error');
        }
    },

    async _doAdjust() {
        if (!this.colorizedImg) return;

        this._showLoading('正在调整...');

        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.colorizedImg.naturalWidth || this.colorizedImg.width;
            canvas.height = this.colorizedImg.naturalHeight || this.colorizedImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.colorizedImg, 0, 0);

            const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
            const file = new File([blob], 'adjust.png', { type: 'image/png' });

            const result = await Api.adjust(file, this.currentWarmth, this.currentSaturation);

            const adjustedUrl = Api.getResultUrl(result.task_id);
            const img = new Image();
            img.onload = () => {
                this.colorizedImg = img;
                this.colorizedDataUrl = adjustedUrl;
                ComparisonView.setColorized(img);
                this._hideLoading();
                this.showToast('调整完成', 'success');
            };
            img.onerror = () => {
                this._hideLoading();
                this.showToast('加载调整结果失败', 'error');
            };
            img.crossOrigin = 'anonymous';
            img.src = adjustedUrl;
        } catch (err) {
            this._hideLoading();
            this.showToast('调整失败: ' + err.message, 'error');
        }
    },

    async _doRegionColorize() {
        if (!this.colorizedImg) {
            this.showToast('请先进行全局着色', 'warning');
            return;
        }

        this._showLoading('正在局部重新着色...');

        try {
            const maskFile = await Editor.getMaskAsFile();

            const canvas = document.createElement('canvas');
            canvas.width = this.colorizedImg.naturalWidth || this.colorizedImg.width;
            canvas.height = this.colorizedImg.naturalHeight || this.colorizedImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.colorizedImg, 0, 0);

            const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
            const imgFile = new File([blob], 'region.png', { type: 'image/png' });

            const result = await Api.colorizeRegion(imgFile, maskFile, this.currentWarmth, this.currentSaturation);

            document.getElementById('inferenceTime').textContent = result.inference_time;
            document.getElementById('queueLength').textContent = result.queue_length;

            const colorizedUrl = Api.getResultUrl(result.task_id);
            const img = new Image();
            img.onload = () => {
                this.colorizedImg = img;
                this.colorizedDataUrl = colorizedUrl;
                ComparisonView.setColorized(img);
                Editor.clearMask();
                this._hideLoading();
                this.showToast('局部着色完成', 'success');
            };
            img.crossOrigin = 'anonymous';
            img.src = colorizedUrl;
        } catch (err) {
            this._hideLoading();
            this.showToast('局部着色失败: ' + err.message, 'error');
        }
    },

    _doExport() {
        if (!this.colorizedImg) return;
        const format = document.getElementById('exportFormat').value;
        const keepTransparency = document.getElementById('keepTransparency').checked;
        Export.exportImage(this.colorizedImg, format, keepTransparency);
        this.showToast(`已导出为 ${format.toUpperCase()}`, 'success');
    },

    async _saveToHistory(colorizedUrl) {
        try {
            let colorizedDataUrl = colorizedUrl;
            if (!colorizedUrl.startsWith('data:')) {
                const canvas = document.createElement('canvas');
                canvas.width = this.colorizedImg.naturalWidth || this.colorizedImg.width;
                canvas.height = this.colorizedImg.naturalHeight || this.colorizedImg.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(this.colorizedImg, 0, 0);
                colorizedDataUrl = canvas.toDataURL('image/png');
            }
            const entry = await History.createEntry(
                this.originalDataUrl,
                colorizedDataUrl,
                { warmth: this.currentWarmth, saturation: this.currentSaturation }
            );
            History.save(entry);
        } catch (e) {
            // silently fail
        }
    },

    _openHistory() {
        document.getElementById('historyModal').style.display = 'flex';
        History.renderList(
            document.getElementById('historyList'),
            (item) => this._loadHistoryItem(item),
            (id) => {}
        );
    },

    _closeHistory() {
        document.getElementById('historyModal').style.display = 'none';
    },

    _loadHistoryItem(item) {
        this.currentWarmth = item.params.warmth;
        this.currentSaturation = item.params.saturation;

        document.getElementById('warmthSlider').value = Math.round(item.params.warmth * 100);
        document.getElementById('warmthValue').textContent = Math.round(item.params.warmth * 100);
        document.getElementById('saturationSlider').value = Math.round(item.params.saturation * 100);
        document.getElementById('saturationValue').textContent = Math.round(item.params.saturation * 100) + '%';

        const origImg = new Image();
        origImg.onload = () => {
            this.originalImg = origImg;
            this.originalDataUrl = item.originalDataUrl;

            const colorImg = new Image();
            colorImg.crossOrigin = 'anonymous';
            colorImg.onload = () => {
                this.colorizedImg = colorImg;
                this.colorizedDataUrl = item.colorizedDataUrl;

                document.getElementById('uploadZone').style.display = 'none';
                document.getElementById('comparisonContainer').style.display = 'flex';
                document.getElementById('btnColorize').disabled = false;
                document.getElementById('btnAdjust').disabled = false;
                document.getElementById('btnExport').disabled = false;

                ComparisonView.setImages(origImg, colorImg);
                ComparisonView.setView('slider');
                this._closeHistory();
                this.showToast('历史记录已加载', 'success');
            };
            colorImg.src = item.colorizedDataUrl;
        };
        origImg.src = item.originalDataUrl;
    },

    _openBatch() {
        document.getElementById('batchModal').style.display = 'flex';
    },

    _closeBatch() {
        document.getElementById('batchModal').style.display = 'none';
        this.batchZipFile = null;
        document.getElementById('btnStartBatch').disabled = true;
    },

    _handleBatchFile(file) {
        if (!file.name.endsWith('.zip')) {
            this.showToast('请上传 ZIP 文件', 'error');
            return;
        }
        this.batchZipFile = file;
        document.getElementById('btnStartBatch').disabled = false;
        document.querySelector('#batchUploadZone p').textContent = `已选择: ${file.name}`;
    },

    async _doBatchColorize() {
        if (!this.batchZipFile) return;

        const progressEl = document.getElementById('batchProgress');
        const fillEl = document.getElementById('batchProgressFill');
        const statusEl = document.getElementById('batchStatus');

        progressEl.style.display = 'block';
        fillEl.style.width = '30%';
        statusEl.textContent = '正在上传并处理...';
        document.getElementById('btnStartBatch').disabled = true;

        try {
            const result = await Api.batchColorize(this.batchZipFile, this.currentWarmth, this.currentSaturation);

            fillEl.style.width = '100%';
            statusEl.textContent = `完成！共处理 ${result.image_count} 张图片，总耗时 ${result.total_inference_time}s`;

            const downloadUrl = Api.getBatchResultUrl(result.batch_id);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'colorized_results.zip';
            a.click();

            this.showToast(`批量着色完成，${result.image_count} 张图片`, 'success');
        } catch (err) {
            statusEl.textContent = '处理失败';
            fillEl.style.width = '0%';
            this.showToast('批量着色失败: ' + err.message, 'error');
        } finally {
            document.getElementById('btnStartBatch').disabled = false;
        }
    },

    async _checkServerStatus() {
        const dot = document.getElementById('statusDot');
        const text = document.getElementById('statusText');
        const ok = await Api.checkHealth();
        if (ok) {
            dot.className = 'status-dot connected';
            text.textContent = '已连接';
        } else {
            dot.className = 'status-dot error';
            text.textContent = '离线';
        }
    },

    async _pollQueueStatus() {
        try {
            const status = await Api.getQueueStatus();
            document.getElementById('queueLength').textContent = status.queue_length;
        } catch {
            // ignore
        }
    },

    _showLoading(text = '处理中...') {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').style.display = 'flex';
    },

    _hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
