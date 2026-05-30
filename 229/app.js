class FoodRecognizerApp {
    constructor() {
        this.mobilenetModel = null;
        this.cocoSsdModel = null;
        this.currentImage = null;
        this.currentPredictions = [];
        this.currentDetections = [];
        this.batchImages = [];
        this.batchResults = [];
        this.db = null;
        this.facingMode = 'user';
        this.currentStream = null;
        
        this.init();
    }

    async init() {
        this.initIndexedDB();
        this.bindEvents();
        await this.loadModels();
        this.loadHistory();
        this.loadCorrections();
    }

    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FoodRecognizerDB', 1);
            
            request.onerror = () => {
                console.error('IndexedDB 打开失败');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('corrections')) {
                    const correctionsStore = db.createObjectStore('corrections', { keyPath: 'id', autoIncrement: true });
                    correctionsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    correctionsStore.createIndex('originalLabel', 'originalLabel', { unique: false });
                    correctionsStore.createIndex('correctedLabel', 'correctedLabel', { unique: false });
                }
            };
        });
    }

    async loadModels() {
        try {
            this.updateStatus('正在加载 MobileNet 模型...');
            this.mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
            this.updateStatus('正在加载 COCO-SSD 模型...');
            this.cocoSsdModel = await cocoSsd.load();
            this.updateStatus('✅ AI 模型已就绪，开始识别美食吧！', 'ready');
            this.enableButtons();
        } catch (error) {
            console.error('模型加载失败:', error);
            this.updateStatus('❌ 模型加载失败，请刷新页面重试', 'error');
            this.showToast('模型加载失败，请检查网络连接', 'error');
        }
    }

    updateStatus(text, statusClass = '') {
        const statusElement = document.getElementById('modelStatus');
        const statusText = document.getElementById('statusText');
        
        statusText.textContent = text;
        statusElement.className = 'model-status';
        if (statusClass) {
            statusElement.classList.add(statusClass);
        }
        
        const spinner = statusElement.querySelector('.loading-spinner');
        if (statusClass === 'ready' || statusClass === 'error') {
            if (spinner) spinner.style.display = 'none';
        } else {
            if (spinner) spinner.style.display = 'inline-block';
        }
    }

    enableButtons() {
        document.querySelectorAll('button').forEach(btn => {
            if (btn.id !== 'detectBtn' && btn.id !== 'detectMultiBtn' && btn.id !== 'batchDetectBtn') {
                btn.disabled = false;
            }
        });
    }

    bindEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchInputMethod(e.target.dataset.method));
        });

        const uploadArea = document.getElementById('uploadArea');
        const imageInput = document.getElementById('imageInput');
        
        uploadArea.addEventListener('click', () => imageInput.click());
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e, uploadArea));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e, uploadArea));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e, uploadArea, 'single'));
        imageInput.addEventListener('change', (e) => this.handleImageSelect(e, 'single'));

        const batchUploadArea = document.getElementById('batchUploadArea');
        const batchImageInput = document.getElementById('batchImageInput');
        
        batchUploadArea.addEventListener('click', () => batchImageInput.click());
        batchUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e, batchUploadArea));
        batchUploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e, batchUploadArea));
        batchUploadArea.addEventListener('drop', (e) => this.handleDrop(e, batchUploadArea, 'batch'));
        batchImageInput.addEventListener('change', (e) => this.handleImageSelect(e, 'batch'));

        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
        document.getElementById('switchCameraBtn').addEventListener('click', () => this.switchCamera());
        document.getElementById('retakeBtn').addEventListener('click', () => this.retakePhoto());
        document.getElementById('detectBtn').addEventListener('click', () => this.detectFood());
        document.getElementById('detectMultiBtn').addEventListener('click', () => this.detectMultipleFood());

        document.getElementById('speakBtn').addEventListener('click', () => this.speakResults());
        document.getElementById('exportSingleBtn').addEventListener('click', () => this.exportSingleToCSV());
        document.getElementById('submitCorrectionBtn').addEventListener('click', () => this.submitCorrection());

        document.getElementById('clearBatchBtn').addEventListener('click', () => this.clearBatch());
        document.getElementById('batchDetectBtn').addEventListener('click', () => this.batchDetect());
        document.getElementById('exportBatchBtn').addEventListener('click', () => this.exportBatchToCSV());

        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());
        document.getElementById('exportHistoryBtn').addEventListener('click', () => this.exportHistoryToCSV());

        document.getElementById('exportCorrectionsBtn').addEventListener('click', () => this.exportCorrections());
        document.getElementById('importCorrectionsBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
        document.getElementById('importFileInput').addEventListener('change', (e) => this.importCorrections(e));
        document.getElementById('clearCorrectionsBtn').addEventListener('click', () => this.clearCorrections());
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');

        if (tabName === 'history') {
            this.loadHistory();
        } else if (tabName === 'corrections') {
            this.loadCorrections();
        }
    }

    switchInputMethod(method) {
        document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-method="${method}"]`).classList.add('active');

        const uploadArea = document.getElementById('uploadArea');
        const cameraArea = document.getElementById('cameraArea');
        const previewContainer = document.getElementById('previewContainer');
        const resultsSection = document.getElementById('resultsSection');

        this.stopCamera();
        previewContainer.style.display = 'none';
        resultsSection.style.display = 'none';

        if (method === 'upload') {
            uploadArea.style.display = 'block';
            cameraArea.style.display = 'none';
        } else {
            uploadArea.style.display = 'none';
            cameraArea.style.display = 'block';
            this.startCamera();
        }
    }

    handleDragOver(e, element) {
        e.preventDefault();
        element.classList.add('drag-over');
    }

    handleDragLeave(e, element) {
        e.preventDefault();
        element.classList.remove('drag-over');
    }

    handleDrop(e, element, mode) {
        e.preventDefault();
        element.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            this.processFiles(files, mode);
        }
    }

    handleImageSelect(e, mode) {
        const files = e.target.files;
        if (files && files.length > 0) {
            this.processFiles(files, mode);
        }
        e.target.value = '';
    }

    processFiles(files, mode) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showToast('请选择有效的图片文件', 'error');
            return;
        }

        if (mode === 'single') {
            this.processSingleImage(imageFiles[0]);
        } else {
            this.processBatchImages(imageFiles);
        }
    }

    processSingleImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImage = e.target.result;
            const previewImage = document.getElementById('previewImage');
            previewImage.src = this.currentImage;
            
            document.getElementById('uploadArea').style.display = 'none';
            document.getElementById('cameraArea').style.display = 'none';
            document.getElementById('previewContainer').style.display = 'block';
            document.getElementById('resultsSection').style.display = 'none';
            
            this.clearDetectionCanvas();
            this.currentPredictions = [];
            this.currentDetections = [];
        };
        reader.readAsDataURL(file);
    }

    processBatchImages(files) {
        this.batchImages = [];
        this.batchResults = [];
        
        const processFile = (file, index) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.batchImages.push({
                        id: index,
                        file: file,
                        name: file.name,
                        dataUrl: e.target.result,
                        status: 'pending'
                    });
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        };

        Promise.all(files.map((file, index) => processFile(file, index)))
            .then(() => {
                this.renderBatchPreview();
            });
    }

    renderBatchPreview() {
        const batchPreview = document.getElementById('batchPreview');
        const batchGrid = document.getElementById('batchGrid');
        const batchCount = document.getElementById('batchCount');
        const batchUploadArea = document.getElementById('batchUploadArea');

        batchUploadArea.style.display = 'none';
        batchPreview.style.display = 'block';
        batchCount.textContent = `已选择 ${this.batchImages.length} 张图片`;

        batchGrid.innerHTML = '';
        this.batchImages.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'batch-item';
            div.innerHTML = `
                <img src="${item.dataUrl}" alt="${item.name}">
                <span class="batch-item-status ${item.status}">${this.getStatusText(item.status)}</span>
            `;
            batchGrid.appendChild(div);
        });

        document.getElementById('batchDetectBtn').disabled = false;
        document.getElementById('exportBatchBtn').style.display = 'none';
        document.getElementById('batchResults').style.display = 'none';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待识别',
            'success': '识别成功',
            'error': '识别失败',
            'processing': '识别中...'
        };
        return statusMap[status] || status;
    }

    async startCamera() {
        try {
            const constraints = {
                video: { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            };
            
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            const video = document.getElementById('video');
            video.srcObject = this.currentStream;
        } catch (error) {
            console.error('摄像头启动失败:', error);
            this.showToast('无法访问摄像头，请检查权限设置', 'error');
        }
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
    }

    async switchCamera() {
        this.stopCamera();
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        await this.startCamera();
    }

    capturePhoto() {
        const video = document.getElementById('video');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        this.currentImage = canvas.toDataURL('image/jpeg', 0.9);
        const previewImage = document.getElementById('previewImage');
        previewImage.src = this.currentImage;
        
        this.stopCamera();
        document.getElementById('cameraArea').style.display = 'none';
        document.getElementById('previewContainer').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        
        this.clearDetectionCanvas();
        this.currentPredictions = [];
        this.currentDetections = [];
    }

    retakePhoto() {
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        this.currentImage = null;
        this.currentPredictions = [];
        this.currentDetections = [];
        
        const activeMethod = document.querySelector('.method-btn.active').dataset.method;
        if (activeMethod === 'upload') {
            document.getElementById('uploadArea').style.display = 'block';
        } else {
            document.getElementById('cameraArea').style.display = 'block';
            this.startCamera();
        }
    }

    clearDetectionCanvas() {
        const canvas = document.getElementById('detectionCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    async detectFood() {
        if (!this.currentImage || !this.mobilenetModel) {
            this.showToast('请先选择图片并确保模型已加载', 'error');
            return;
        }

        const detectBtn = document.getElementById('detectBtn');
        detectBtn.disabled = true;
        detectBtn.textContent = '🔄 识别中...';

        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = this.currentImage;
            });

            const predictions = await this.mobilenetModel.classify(img, 5);
            
            this.currentPredictions = predictions.map(p => ({
                label: p.className,
                probability: p.probability,
                confidence: Math.round(p.probability * 100)
            }));

            this.renderPredictions();
            this.showNutritionInfo();
            this.showRecipe();
            this.saveToHistory(img);

            document.getElementById('resultsSection').style.display = 'block';
            
        } catch (error) {
            console.error('识别失败:', error);
            this.showToast('识别失败，请重试', 'error');
        } finally {
            detectBtn.disabled = false;
            detectBtn.textContent = '🔍 开始识别';
        }
    }

    async detectMultipleFood() {
        if (!this.currentImage || !this.cocoSsdModel) {
            this.showToast('请先选择图片并确保模型已加载', 'error');
            return;
        }

        const detectBtn = document.getElementById('detectMultiBtn');
        detectBtn.disabled = true;
        detectBtn.textContent = '🔄 检测中...';

        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = this.currentImage;
            });

            const canvas = document.getElementById('detectionCanvas');
            const previewImage = document.getElementById('previewImage');
            
            canvas.width = previewImage.offsetWidth;
            canvas.height = previewImage.offsetHeight;

            const detections = await this.cocoSsdModel.detect(img);
            
            const foodDetections = detections.filter(d => isFoodPrediction(d.class));
            
            this.currentDetections = foodDetections.map(d => ({
                label: d.class,
                bbox: d.bbox,
                score: d.score,
                confidence: Math.round(d.score * 100)
            }));

            this.drawDetectionBoxes(foodDetections, canvas, img);
            
            if (foodDetections.length > 0) {
                this.showToast(`检测到 ${foodDetections.length} 个食物`, 'success');
            } else {
                this.showToast('未检测到食物，请尝试单张识别', 'info');
            }

        } catch (error) {
            console.error('多目标检测失败:', error);
            this.showToast('检测失败，请重试', 'error');
        } finally {
            detectBtn.disabled = false;
            detectBtn.textContent = '🎯 多食物检测';
        }
    }

    drawDetectionBoxes(detections, canvas, img) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;

        detections.forEach((detection, index) => {
            const [x, y, width, height] = detection.bbox;
            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            const scaledWidth = width * scaleX;
            const scaledHeight = height * scaleY;

            const colors = ['#38a169', '#667eea', '#d69e2e', '#e53e3e', '#805ad5'];
            const color = colors[index % colors.length];

            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

            ctx.fillStyle = color;
            const label = `${translateLabel(detection.class)} ${detection.confidence}%`;
            ctx.font = 'bold 14px sans-serif';
            const textWidth = ctx.measureText(label).width;
            
            ctx.fillRect(scaledX, scaledY - 25, textWidth + 10, 25);
            
            ctx.fillStyle = 'white';
            ctx.fillText(label, scaledX + 5, scaledY - 8);
        });
    }

    renderPredictions() {
        const predictionsContainer = document.getElementById('predictions');
        predictionsContainer.innerHTML = '';

        this.currentPredictions.forEach((pred, index) => {
            const translatedLabel = translateLabel(pred.label);
            const isFood = isFoodPrediction(pred.label);
            
            const div = document.createElement('div');
            div.className = `prediction-item ${index === 0 ? 'top' : ''}`;
            div.innerHTML = `
                <div class="prediction-header">
                    <span class="prediction-label">
                        ${translatedLabel}
                        ${!isFood ? '<span style="color:#e53e3e;font-size:0.8rem;"> (可能不是食物)</span>' : ''}
                    </span>
                    <span class="prediction-confidence">${pred.confidence}%</span>
                </div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${pred.confidence}%"></div>
                </div>
                <div style="font-size:0.8rem;color:#a0aec0;margin-top:5px;">
                    原始标签: ${pred.label}
                </div>
            `;
            predictionsContainer.appendChild(div);
        });

        const correctionInput = document.getElementById('correctionInput');
        if (this.currentPredictions.length > 0) {
            correctionInput.placeholder = `例如：这是${translateLabel(this.currentPredictions[0].label)}吗？请输入正确的食物名称`;
        }
    }

    showNutritionInfo() {
        const nutritionSection = document.getElementById('nutritionSection');
        const nutritionGrid = document.getElementById('nutritionGrid');
        
        if (this.currentPredictions.length === 0) {
            nutritionSection.style.display = 'none';
            return;
        }

        const topPrediction = this.currentPredictions[0];
        const nutrition = findNutrition(topPrediction.label);

        if (!nutrition) {
            nutritionSection.style.display = 'none';
            return;
        }

        const nutritionItems = [
            { label: '热量', value: nutrition.calories, unit: 'kcal' },
            { label: '蛋白质', value: nutrition.protein, unit: 'g' },
            { label: '碳水', value: nutrition.carbs, unit: 'g' },
            { label: '脂肪', value: nutrition.fat, unit: 'g' },
            { label: '膳食纤维', value: nutrition.fiber, unit: 'g' },
            { label: '糖分', value: nutrition.sugar, unit: 'g' }
        ];

        nutritionGrid.innerHTML = '';
        nutritionItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'nutrition-item';
            div.innerHTML = `
                <div class="nutrition-value">${item.value}<small style="font-size:0.6rem;">${item.unit}</small></div>
                <div class="nutrition-label">${item.label}</div>
            `;
            nutritionGrid.appendChild(div);
        });

        nutritionSection.style.display = 'block';
    }

    showRecipe() {
        const recipeSection = document.getElementById('recipeSection');
        const recipeCard = document.getElementById('recipeCard');
        
        if (this.currentPredictions.length === 0) {
            recipeSection.style.display = 'none';
            return;
        }

        const topPrediction = this.currentPredictions[0];
        const recipe = findRecipe(topPrediction.label);

        if (!recipe) {
            recipeSection.style.display = 'none';
            return;
        }

        recipeCard.innerHTML = `
            <div class="recipe-title">${recipe.title}</div>
            <div class="recipe-meta">
                <span>⏱️ ${recipe.time}</span>
                <span>👥 ${recipe.servings}人份</span>
                <span>📊 难度: ${recipe.difficulty}</span>
            </div>
            <div class="recipe-ingredients">
                <h4>🥗 所需食材</h4>
                <ul>${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
            </div>
            <div class="recipe-instructions">
                <h4>👨‍🍳 制作步骤</h4>
                <ol>${recipe.instructions.map(i => `<li>${i}</li>`).join('')}</ol>
            </div>
        `;

        recipeSection.style.display = 'block';
    }

    speakResults() {
        if (this.currentPredictions.length === 0) {
            this.showToast('没有识别结果可以播报', 'info');
            return;
        }

        if (!('speechSynthesis' in window)) {
            this.showToast('您的浏览器不支持语音播报功能', 'error');
            return;
        }

        const topPrediction = this.currentPredictions[0];
        const translatedLabel = translateLabel(topPrediction.label);
        
        let text = `识别结果：最可能是${translatedLabel}，置信度${topPrediction.confidence}%。`;
        
        if (this.currentPredictions.length > 1) {
            const secondPred = this.currentPredictions[1];
            text += `其次可能是${translateLabel(secondPred.label)}，置信度${secondPred.confidence}%。`;
        }

        const nutrition = findNutrition(topPrediction.label);
        if (nutrition) {
            text += `营养成分：每100克含热量${nutrition.calories}千卡，蛋白质${nutrition.protein}克。`;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 1;
        utterance.pitch = 1;

        window.speechSynthesis.speak(utterance);
        this.showToast('正在播报识别结果...', 'info');
    }

    async submitCorrection() {
        const correctionInput = document.getElementById('correctionInput');
        const correctedLabel = correctionInput.value.trim();

        if (!correctedLabel) {
            this.showToast('请输入正确的食物名称', 'error');
            return;
        }

        if (this.currentPredictions.length === 0 || !this.currentImage) {
            this.showToast('没有识别结果可以纠正', 'error');
            return;
        }

        const correction = {
            originalLabel: this.currentPredictions[0].label,
            originalConfidence: this.currentPredictions[0].confidence,
            correctedLabel: correctedLabel,
            imageData: this.currentImage,
            timestamp: Date.now()
        };

        try {
            await this.saveCorrection(correction);
            correctionInput.value = '';
            this.showToast('✅ 纠正样本已保存，感谢您的贡献！', 'success');
            this.loadCorrections();
        } catch (error) {
            console.error('保存纠正失败:', error);
            this.showToast('保存纠正失败，请重试', 'error');
        }
    }

    saveCorrection(correction) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['corrections'], 'readwrite');
            const store = transaction.objectStore('corrections');
            const request = store.add(correction);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    loadCorrections() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['corrections'], 'readonly');
            const store = transaction.objectStore('corrections');
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev');
            
            const corrections = [];
            
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    corrections.push(cursor.value);
                    cursor.continue();
                } else {
                    this.renderCorrections(corrections);
                    resolve(corrections);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    renderCorrections(corrections) {
        const correctionsGrid = document.getElementById('correctionsGrid');
        const correctionsEmpty = document.getElementById('correctionsEmpty');
        const correctionsStats = document.getElementById('correctionsStats');

        if (corrections.length === 0) {
            correctionsGrid.innerHTML = '';
            correctionsEmpty.style.display = 'block';
            correctionsStats.innerHTML = '';
            return;
        }

        correctionsEmpty.style.display = 'none';
        
        correctionsGrid.innerHTML = '';
        corrections.forEach(correction => {
            const div = document.createElement('div');
            div.className = 'correction-item';
            div.innerHTML = `
                <div class="correction-item-header">
                    <img src="${correction.imageData}" alt="纠正样本">
                    <div class="correction-item-labels">
                        <div class="original-label">原识别: ${translateLabel(correction.originalLabel)} (${correction.originalConfidence}%)</div>
                        <div class="corrected-label">正确答案: ${correction.correctedLabel}</div>
                        <div class="correction-item-date">${new Date(correction.timestamp).toLocaleString('zh-CN')}</div>
                    </div>
                </div>
                <div class="correction-item-actions">
                    <button class="secondary-btn" onclick="app.deleteCorrection(${correction.id})">删除</button>
                </div>
            `;
            correctionsGrid.appendChild(div);
        });

        const labelCounts = {};
        corrections.forEach(c => {
            labelCounts[c.correctedLabel] = (labelCounts[c.correctedLabel] || 0) + 1;
        });
        
        const topLabels = Object.entries(labelCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        correctionsStats.innerHTML = `
            <p><strong>📊 纠正样本统计</strong></p>
            <p>总样本数: ${corrections.length} 个</p>
            <p>涉及食物种类: ${Object.keys(labelCounts).length} 种</p>
            ${topLabels.length > 0 ? `<p>最多纠正: ${topLabels[0][0]} (${topLabels[0][1]}次)</p>` : ''}
        `;
    }

    deleteCorrection(id) {
        if (!confirm('确定要删除这个纠正样本吗？')) return;
        
        const transaction = this.db.transaction(['corrections'], 'readwrite');
        const store = transaction.objectStore('corrections');
        store.delete(id);
        
        transaction.oncomplete = () => {
            this.showToast('删除成功', 'success');
            this.loadCorrections();
        };
    }

    clearCorrections() {
        if (!confirm('确定要清空所有纠正样本吗？此操作不可恢复。')) return;
        
        const transaction = this.db.transaction(['corrections'], 'readwrite');
        const store = transaction.objectStore('corrections');
        store.clear();
        
        transaction.oncomplete = () => {
            this.showToast('已清空所有纠正样本', 'success');
            this.loadCorrections();
        };
    }

    exportCorrections() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['corrections'], 'readonly');
            const store = transaction.objectStore('corrections');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const corrections = request.result;
                
                if (corrections.length === 0) {
                    this.showToast('没有纠正样本可以导出', 'info');
                    resolve();
                    return;
                }

                const exportData = corrections.map(c => ({
                    originalLabel: c.originalLabel,
                    correctedLabel: c.correctedLabel,
                    originalConfidence: c.originalConfidence,
                    imageData: c.imageData,
                    timestamp: c.timestamp
                }));

                const jsonStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `food-corrections-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                
                URL.revokeObjectURL(url);
                this.showToast(`✅ 已导出 ${corrections.length} 个纠正样本`, 'success');
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    importCorrections(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const corrections = JSON.parse(event.target.result);
                
                if (!Array.isArray(corrections)) {
                    throw new Error('无效的文件格式');
                }

                for (const correction of corrections) {
                    await this.saveCorrection({
                        ...correction,
                        imported: true
                    });
                }

                this.showToast(`✅ 成功导入 ${corrections.length} 个纠正样本`, 'success');
                this.loadCorrections();
            } catch (error) {
                console.error('导入失败:', error);
                this.showToast('导入失败，请检查文件格式', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    async batchDetect() {
        if (this.batchImages.length === 0 || !this.mobilenetModel) {
            this.showToast('请先选择图片并确保模型已加载', 'error');
            return;
        }

        const detectBtn = document.getElementById('batchDetectBtn');
        detectBtn.disabled = true;
        detectBtn.textContent = '🔄 识别中...';

        this.batchResults = [];

        for (let i = 0; i < this.batchImages.length; i++) {
            const item = this.batchImages[i];
            item.status = 'processing';
            this.updateBatchItemStatus(i);

            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = item.dataUrl;
                });

                const predictions = await this.mobilenetModel.classify(img, 3);
                const topPrediction = predictions[0];
                
                const result = {
                    ...item,
                    predictions: predictions.map(p => ({
                        label: p.className,
                        probability: p.probability,
                        confidence: Math.round(p.probability * 100)
                    })),
                    topLabel: translateLabel(topPrediction.className),
                    topConfidence: Math.round(topPrediction.probability * 100)
                };

                this.batchResults.push(result);
                this.batchImages[i].status = 'success';
                
            } catch (error) {
                console.error('批量识别失败:', error);
                this.batchImages[i].status = 'error';
                this.batchResults.push({ ...item, error: error.message });
            }
            
            this.updateBatchItemStatus(i);
            await this.delay(300);
        }

        this.renderBatchResults();
        detectBtn.disabled = false;
        detectBtn.textContent = '🚀 批量识别';
        document.getElementById('exportBatchBtn').style.display = 'inline-block';
        
        this.showToast(`批量识别完成: ${this.batchImages.filter(i => i.status === 'success').length}/${this.batchImages.length} 成功`, 'success');
    }

    updateBatchItemStatus(index) {
        const batchItems = document.querySelectorAll('.batch-item');
        if (batchItems[index]) {
            const statusSpan = batchItems[index].querySelector('.batch-item-status');
            const item = this.batchImages[index];
            statusSpan.className = `batch-item-status ${item.status}`;
            statusSpan.textContent = this.getStatusText(item.status);
        }
    }

    renderBatchResults() {
        const batchResults = document.getElementById('batchResults');
        const batchResultsBody = document.getElementById('batchResultsBody');

        batchResults.style.display = 'block';
        batchResultsBody.innerHTML = '';

        this.batchResults.forEach((result, index) => {
            const tr = document.createElement('tr');
            
            if (result.error) {
                tr.innerHTML = `
                    <td><img src="${result.dataUrl}" alt="${result.name}"></td>
                    <td>${result.name}</td>
                    <td colspan="3" style="color:#e53e3e;">识别失败: ${result.error}</td>
                `;
            } else {
                tr.innerHTML = `
                    <td><img src="${result.dataUrl}" alt="${result.name}"></td>
                    <td>${result.name}</td>
                    <td>${result.topLabel}</td>
                    <td>
                        <span style="color: ${result.topConfidence >= 70 ? '#38a169' : result.topConfidence >= 50 ? '#d69e2e' : '#e53e3e'}; font-weight: 600;">
                            ${result.topConfidence}%
                        </span>
                    </td>
                    <td>
                        <button class="secondary-btn" onclick="app.viewBatchResult(${index})">查看详情</button>
                    </td>
                `;
            }
            
            batchResultsBody.appendChild(tr);
        });

        this.batchResults.forEach(result => {
            if (!result.error) {
                const img = new Image();
                img.src = result.dataUrl;
                this.saveToHistory(img, result.predictions);
            }
        });
    }

    viewBatchResult(index) {
        const result = this.batchResults[index];
        if (!result || result.error) return;

        this.currentImage = result.dataUrl;
        this.currentPredictions = result.predictions;

        const previewImage = document.getElementById('previewImage');
        previewImage.src = this.currentImage;

        this.switchTab('single');
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('cameraArea').style.display = 'none';
        document.getElementById('previewContainer').style.display = 'block';
        
        this.renderPredictions();
        this.showNutritionInfo();
        this.showRecipe();
        document.getElementById('resultsSection').style.display = 'block';
        
        this.showToast('已切换到单张识别查看详情', 'info');
    }

    clearBatch() {
        this.batchImages = [];
        this.batchResults = [];
        document.getElementById('batchPreview').style.display = 'none';
        document.getElementById('batchResults').style.display = 'none';
        document.getElementById('batchUploadArea').style.display = 'block';
        document.getElementById('exportBatchBtn').style.display = 'none';
    }

    saveToHistory(img, predictions = null) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const historyItem = {
                imageData: canvas.toDataURL('image/jpeg', 0.8),
                predictions: predictions || this.currentPredictions,
                timestamp: Date.now()
            };

            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            const request = store.add(historyItem);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    loadHistory() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev');
            
            const history = [];
            
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    history.push(cursor.value);
                    cursor.continue();
                } else {
                    this.renderHistory(history);
                    resolve(history);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    renderHistory(history) {
        const historyGrid = document.getElementById('historyGrid');
        const historyEmpty = document.getElementById('historyEmpty');

        if (history.length === 0) {
            historyGrid.innerHTML = '';
            historyEmpty.style.display = 'block';
            return;
        }

        historyEmpty.style.display = 'none';
        
        historyGrid.innerHTML = '';
        history.forEach((item, index) => {
            const topPrediction = item.predictions && item.predictions[0];
            const label = topPrediction ? translateLabel(topPrediction.label) : '未知';
            const confidence = topPrediction ? topPrediction.confidence : 0;

            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <img src="${item.imageData}" alt="历史记录">
                <div class="history-item-content">
                    <div class="history-item-title">${label}</div>
                    <div class="history-item-confidence">置信度: ${confidence}%</div>
                    <div class="history-item-date">${new Date(item.timestamp).toLocaleString('zh-CN')}</div>
                    <div class="history-item-actions">
                        <button class="view-details-btn" onclick="app.viewHistoryItem(${index})">查看详情</button>
                        <button class="delete-history-btn" onclick="app.deleteHistory(${item.id})">删除</button>
                    </div>
                </div>
            `;
            historyGrid.appendChild(div);
        });
    }

    viewHistoryItem(index) {
        this.loadHistory().then(history => {
            const item = history[index];
            if (!item) return;

            this.currentImage = item.imageData;
            this.currentPredictions = item.predictions;

            const previewImage = document.getElementById('previewImage');
            previewImage.src = this.currentImage;

            this.switchTab('single');
            document.getElementById('uploadArea').style.display = 'none';
            document.getElementById('cameraArea').style.display = 'none';
            document.getElementById('previewContainer').style.display = 'block';
            
            this.renderPredictions();
            this.showNutritionInfo();
            this.showRecipe();
            document.getElementById('resultsSection').style.display = 'block';
        });
    }

    deleteHistory(id) {
        if (!confirm('确定要删除这条历史记录吗？')) return;
        
        const transaction = this.db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');
        store.delete(id);
        
        transaction.oncomplete = () => {
            this.showToast('删除成功', 'success');
            this.loadHistory();
        };
    }

    clearHistory() {
        if (!confirm('确定要清空所有历史记录吗？此操作不可恢复。')) return;
        
        const transaction = this.db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');
        store.clear();
        
        transaction.oncomplete = () => {
            this.showToast('已清空所有历史记录', 'success');
            this.loadHistory();
        };
    }

    exportSingleToCSV() {
        if (this.currentPredictions.length === 0) {
            this.showToast('没有识别结果可以导出', 'info');
            return;
        }

        const topPrediction = this.currentPredictions[0];
        const label = translateLabel(topPrediction.label);
        const nutrition = findNutrition(topPrediction.label);

        let csvContent = '序号,识别标签,置信度(%)\n';
        this.currentPredictions.forEach((pred, i) => {
            csvContent += `${i + 1},"${translateLabel(pred.label)}",${pred.confidence}\n`;
        });

        if (nutrition) {
            csvContent += '\n营养成分(每100g)\n';
            csvContent += '营养成分,含量,单位\n';
            csvContent += `热量,${nutrition.calories},kcal\n`;
            csvContent += `蛋白质,${nutrition.protein},g\n`;
            csvContent += `碳水化合物,${nutrition.carbs},g\n`;
            csvContent += `脂肪,${nutrition.fat},g\n`;
            csvContent += `膳食纤维,${nutrition.fiber},g\n`;
            csvContent += `糖分,${nutrition.sugar},g\n`;
        }

        this.downloadCSV(csvContent, `food-recognition-${label}-${new Date().toISOString().split('T')[0]}.csv`);
        this.showToast('✅ 导出成功', 'success');
    }

    exportBatchToCSV() {
        if (this.batchResults.length === 0) {
            this.showToast('没有识别结果可以导出', 'info');
            return;
        }

        let csvContent = '序号,文件名,识别结果,置信度(%)\n';
        this.batchResults.forEach((result, i) => {
            if (!result.error) {
                csvContent += `${i + 1},"${result.name}","${result.topLabel}",${result.topConfidence}\n`;
            }
        });

        this.downloadCSV(csvContent, `batch-recognition-${new Date().toISOString().split('T')[0]}.csv`);
        this.showToast('✅ 导出成功', 'success');
    }

    exportHistoryToCSV() {
        this.loadHistory().then(history => {
            if (history.length === 0) {
                this.showToast('没有历史记录可以导出', 'info');
                return;
            }

            let csvContent = '序号,识别结果,置信度(%),时间\n';
            history.forEach((item, i) => {
                const topPrediction = item.predictions && item.predictions[0];
                const label = topPrediction ? translateLabel(topPrediction.label) : '未知';
                const confidence = topPrediction ? topPrediction.confidence : 0;
                csvContent += `${i + 1},"${label}",${confidence},"${new Date(item.timestamp).toLocaleString('zh-CN')}"\n`;
            });

            this.downloadCSV(csvContent, `recognition-history-${new Date().toISOString().split('T')[0]}.csv`);
            this.showToast('✅ 导出成功', 'success');
        });
    }

    downloadCSV(content, filename) {
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.className = `toast ${type}`;
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new FoodRecognizerApp();
});

async function loadModel() {
    if (!app) {
        await new Promise(resolve => {
            const checkApp = setInterval(() => {
                if (app) {
                    clearInterval(checkApp);
                    resolve();
                }
            }, 100);
        });
    }
    return app.loadModels();
}

async function recognizeFood(imageElement) {
    if (!app || !app.mobilenetModel) {
        throw new Error('模型尚未加载完成');
    }
    const predictions = await app.mobilenetModel.classify(imageElement, 5);
    return predictions.map(p => ({
        label: p.className,
        probability: p.probability,
        confidence: Math.round(p.probability * 100)
    }));
}

async function detectMultipleFoods(imageElement) {
    if (!app || !app.cocoSsdModel) {
        throw new Error('模型尚未加载完成');
    }
    const detections = await app.cocoSsdModel.detect(imageElement);
    const foodDetections = detections.filter(d => isFoodPrediction(d.class));
    return foodDetections.map(d => ({
        label: d.class,
        translatedLabel: translateLabel(d.class),
        bbox: d.bbox,
        score: d.score,
        confidence: Math.round(d.score * 100)
    }));
}

function speakResult(text) {
    if (!('speechSynthesis' in window)) {
        console.error('浏览器不支持语音播报');
        return false;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    return true;
}

async function startCamera(videoElement, facingMode = 'user') {
    try {
        const constraints = {
            video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = stream;
        return stream;
    } catch (error) {
        console.error('摄像头启动失败:', error);
        throw error;
    }
}
