const state = {
    model: null,
    modelName: '',
    videoStream: null,
    isCameraRunning: false,
    isDetecting: false,
    currentDetections: [],
    rawDetections: [],
    animationId: null,
    lastFrameTime: 0,
    fpsLimit: 30,
    frameCount: 0,
    lastFpsUpdate: 0,
    currentFps: 0,
    detectionMode: 'video',
    uploadedImage: null,
    settings: {
        threshold: 0.5,
        maxDetections: 20,
        performanceMode: false,
        resolution: { width: 1280, height: 720 }
    }
};

const modelUrls = {
    lite_mobilenet_v2: {
        url: 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json',
        name: 'MobileNet V2 (快速)'
    },
    ssd_mobilenet_v2: {
        url: 'https://storage.googleapis.com/tfhub-tfjs-modules/tensorflow/ssd_mobilenet_v2/1/default/1/model.json',
        name: 'SSD MobileNet V2 (平衡)'
    }
};

const classColors = {};
const accentColors = ['#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

function getClassColor(className) {
    if (!classColors[className]) {
        const hash = className.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        classColors[className] = accentColors[Math.abs(hash) % accentColors.length];
    }
    return classColors[className];
}

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const placeholder = document.getElementById('placeholder');

const elements = {
    btnCamera: document.getElementById('btn-camera'),
    btnStopCamera: document.getElementById('btn-stop-camera'),
    btnScreenshot: document.getElementById('btn-screenshot'),
    btnExport: document.getElementById('btn-export'),
    btnClear: document.getElementById('btn-clear'),
    btnSample: document.getElementById('btn-sample'),
    fileInput: document.getElementById('file-input'),
    customFileInput: document.getElementById('custom-file-input'),
    threshold: document.getElementById('threshold'),
    thresholdValue: document.getElementById('threshold-value'),
    maxDetections: document.getElementById('max-detections'),
    maxDetectionsValue: document.getElementById('max-detections-value'),
    modelSelect: document.getElementById('model-select'),
    performanceMode: document.getElementById('performance-mode'),
    fpsLimit: document.getElementById('fps-limit'),
    fpsLimitValue: document.getElementById('fps-limit-value'),
    resolution: document.getElementById('resolution'),
    detectionList: document.getElementById('detection-list'),
    detectionCount: document.getElementById('detection-count'),
    detectionTime: document.getElementById('detection-time'),
    currentModel: document.getElementById('current-model'),
    fps: document.getElementById('fps')
};

async function loadModel(modelKey) {
    showLoading('正在加载模型...');
    
    try {
        if (state.model && typeof state.model.dispose === 'function') {
            state.model.dispose();
            state.model = null;
        }

        if (!window.cocoSsd) {
            await loadCOCOSSDModel();
        }
        
        const modelInfo = modelUrls[modelKey];
        state.model = await cocoSsd.load({
            base: modelKey === 'lite_mobilenet_v2' ? 'lite_mobilenet_v2' : 'mobilenet_v2'
        });
        
        state.modelName = modelInfo.name;
        elements.currentModel.textContent = state.modelName;
        hideLoading();
        console.log(`模型加载成功: ${modelInfo.name}`);
    } catch (error) {
        console.error('模型加载失败:', error);
        try {
            if (!window.cocoSsd) {
                await loadCOCOSSDModel();
            }
            state.model = await cocoSsd.load();
            state.modelName = 'COCO-SSD (默认)';
            elements.currentModel.textContent = state.modelName;
            hideLoading();
        } catch (e) {
            loadingText.textContent = '模型加载失败，请刷新页面重试';
            console.error('默认模型加载也失败:', e);
        }
    }
}

async function loadCOCOSSDModel() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd';
        script.onload = async () => {
            try {
                const model = await cocoSsd.load();
                resolve(model);
            } catch (e) {
                reject(e);
            }
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function startCamera() {
    showLoading('正在启动摄像头...');
    
    try {
        const constraints = {
            audio: false,
            video: {
                facingMode: 'environment',
                width: { ideal: state.settings.resolution.width },
                height: { ideal: state.settings.resolution.height }
            }
        };

        state.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = state.videoStream;
        
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        resizeCanvas();
        state.isCameraRunning = true;
        state.detectionMode = 'video';
        state.uploadedImage = null;
        
        elements.btnCamera.disabled = true;
        elements.btnStopCamera.disabled = false;
        elements.btnScreenshot.disabled = false;
        elements.btnClear.disabled = false;
        
        hideLoading();
        hidePlaceholder();
        
        startDetection();
    } catch (error) {
        console.error('摄像头启动失败:', error);
        loadingText.textContent = '无法访问摄像头，请检查权限设置';
        setTimeout(hideLoading, 2000);
    }
}

function stopCamera() {
    if (state.videoStream) {
        state.videoStream.getTracks().forEach(track => track.stop());
        state.videoStream = null;
    }
    
    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
    }
    
    video.srcObject = null;
    state.isCameraRunning = false;
    state.isDetecting = false;
    
    elements.btnCamera.disabled = false;
    elements.btnStopCamera.disabled = true;
    
    showPlaceholder();
    clearCanvas();
    clearDetectionResults();
}

function handleImageUpload(event, isCustom = false) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            state.uploadedImage = img;
            state.detectionMode = 'image';
            
            if (state.isCameraRunning) {
                stopCamera();
            }
            
            resizeCanvasToImage(img);
            drawImageOnCanvas(img);
            hidePlaceholder();
            
            elements.btnScreenshot.disabled = false;
            elements.btnExport.disabled = false;
            elements.btnClear.disabled = false;
            
            detectImage(img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    if (state.detectionMode === 'video' && video.videoWidth) {
        const videoRatio = video.videoWidth / video.videoHeight;
        const containerRatio = rect.width / rect.height;
        
        let width, height;
        if (videoRatio > containerRatio) {
            width = rect.width;
            height = rect.width / videoRatio;
        } else {
            height = rect.height;
            width = rect.height * videoRatio;
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
    } else if (state.uploadedImage) {
        resizeCanvasToImage(state.uploadedImage);
    }
}

function resizeCanvasToImage(img) {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    const imgRatio = img.width / img.height;
    const containerRatio = rect.width / rect.height;
    
    let styleWidth, styleHeight;
    if (imgRatio > containerRatio) {
        styleWidth = rect.width;
        styleHeight = rect.width / imgRatio;
    } else {
        styleHeight = rect.height;
        styleWidth = rect.height * imgRatio;
    }
    
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.width = styleWidth + 'px';
    canvas.style.height = styleHeight + 'px';
}

function drawImageOnCanvas(img) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function detectImage(img) {
    if (!state.model) return;
    
    const startTime = performance.now();
    
    try {
        let predictions;
        
        if (typeof state.model.detect === 'function') {
            predictions = await state.model.detect(img);
        } else {
            predictions = await detectWithGraphModel(img);
        }
        
        state.rawDetections = predictions.map(d => ({
            ...d,
            bbox: d.bbox || [d.x, d.y, d.width, d.height]
        }));
        
        const filteredDetections = filterDetections(state.rawDetections);
        state.currentDetections = filteredDetections;
        
        const detectionTime = performance.now() - startTime;
        const roundedTime = Math.round(detectionTime);
        elements.detectionTime.textContent = roundedTime + ' ms';
        
        console.log(`[检测完成] 耗时: ${roundedTime}ms, 检测到 ${filteredDetections.length} 个物体 (原始: ${predictions.length})`);
        
        drawDetections(filteredDetections);
        updateDetectionList(filteredDetections);
        
        elements.btnExport.disabled = filteredDetections.length === 0;
    } catch (error) {
        console.error('检测失败:', error);
    }
}

async function detectWithGraphModel(source) {
    const sourceWidth = source.videoWidth || source.width;
    const sourceHeight = source.videoHeight || source.height;
    
    const img = tf.browser.fromPixels(source);
    const expanded = img.expandDims(0);
    const resized = tf.image.resizeBilinear(expanded, [300, 300]);
    const casted = resized.toFloat().div(255);
    
    const results = await state.model.executeAsync(casted);
    
    let boxes, scores, classes;
    
    if (Array.isArray(results)) {
        boxes = results[0].squeeze();
        scores = results[1].squeeze();
        classes = results[2] ? results[2].squeeze() : tf.zeros(scores.shape);
    } else {
        const dict = results;
        boxes = dict['detection_boxes'].squeeze();
        scores = dict['detection_scores'].squeeze();
        classes = dict['detection_classes'].squeeze();
    }
    
    const boxesData = await boxes.data();
    const scoresData = await scores.data();
    const classesData = await classes.data();
    
    const cocoClasses = {
        1: 'person', 2: 'bicycle', 3: 'car', 4: 'motorcycle', 5: 'airplane',
        6: 'bus', 7: 'train', 8: 'truck', 9: 'boat', 10: 'traffic light',
        11: 'fire hydrant', 13: 'stop sign', 14: 'parking meter', 15: 'bench',
        16: 'bird', 17: 'cat', 18: 'dog', 19: 'horse', 20: 'sheep', 21: 'cow',
        22: 'elephant', 23: 'bear', 24: 'zebra', 25: 'giraffe', 27: 'backpack',
        28: 'umbrella', 31: 'handbag', 32: 'tie', 33: 'suitcase', 34: 'frisbee',
        35: 'skis', 36: 'snowboard', 37: 'sports ball', 38: 'kite',
        39: 'baseball bat', 40: 'baseball glove', 41: 'skateboard', 42: 'surfboard',
        43: 'tennis racket', 44: 'bottle', 46: 'wine glass', 47: 'cup', 48: 'fork',
        49: 'knife', 50: 'spoon', 51: 'bowl', 52: 'banana', 53: 'apple',
        54: 'sandwich', 55: 'orange', 56: 'broccoli', 57: 'carrot', 58: 'hot dog',
        59: 'pizza', 60: 'donut', 61: 'cake', 62: 'chair', 63: 'couch',
        64: 'potted plant', 65: 'bed', 67: 'dining table', 70: 'toilet', 72: 'tv',
        73: 'laptop', 74: 'mouse', 75: 'remote', 76: 'keyboard', 77: 'cell phone',
        78: 'microwave', 79: 'oven', 80: 'toaster', 81: 'sink', 82: 'refrigerator',
        84: 'book', 85: 'clock', 86: 'vase', 87: 'scissors', 88: 'teddy bear',
        89: 'hair drier', 90: 'toothbrush'
    };
    
    const predictions = [];
    const numDetections = scoresData.length;
    
    for (let i = 0; i < numDetections; i++) {
        const classId = Math.round(classesData[i]);
        const className = cocoClasses[classId] || 'unknown';
        
        const yMin = boxesData[i * 4] * sourceHeight;
        const xMin = boxesData[i * 4 + 1] * sourceWidth;
        const yMax = boxesData[i * 4 + 2] * sourceHeight;
        const xMax = boxesData[i * 4 + 3] * sourceWidth;
        
        predictions.push({
            bbox: [
                xMin,
                yMin,
                xMax - xMin,
                yMax - yMin
            ],
            class: className,
            score: scoresData[i]
        });
    }
    
    tf.dispose([img, expanded, resized, casted, boxes, scores, classes]);
    
    return predictions;
}

function filterDetections(detections) {
    return detections
        .filter(d => d.score >= state.settings.threshold)
        .slice(0, state.settings.maxDetections)
        .map(d => ({
            ...d,
            bbox: d.bbox || [d.x, d.y, d.width, d.height]
        }));
}

function drawDetections(detections) {
    if (state.detectionMode === 'video') {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else if (state.uploadedImage) {
        drawImageOnCanvas(state.uploadedImage);
    }
    
    detections.forEach(detection => {
        const [x, y, width, height] = detection.bbox;
        const color = getClassColor(detection.class);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        
        const label = `${detection.class} ${(detection.score * 100).toFixed(0)}%`;
        const fontSize = Math.max(12, Math.min(24, canvas.width / 50));
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        
        const textMetrics = ctx.measureText(label);
        const labelWidth = textMetrics.width + 16;
        const labelHeight = fontSize + 12;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);
        
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + 8, y - labelHeight / 2);
    });
}

function updateDetectionList(detections) {
    elements.detectionCount.textContent = detections.length;
    
    if (detections.length === 0) {
        elements.detectionList.innerHTML = '<p class="empty-message">暂无检测结果</p>';
        return;
    }
    
    const sortedDetections = [...detections].sort((a, b) => b.score - a.score);
    
    elements.detectionList.innerHTML = sortedDetections.map((d, index) => {
        const color = getClassColor(d.class);
        return `
            <div class="detection-item" style="border-left-color: ${color}">
                <span class="class-name">${index + 1}. ${d.class}</span>
                <span class="confidence">${(d.score * 100).toFixed(1)}%</span>
            </div>
        `;
    }).join('');
}

function clearDetectionResults() {
    state.currentDetections = [];
    elements.detectionCount.textContent = '0';
    elements.detectionTime.textContent = '0 ms';
    elements.detectionList.innerHTML = '<p class="empty-message">暂无检测结果</p>';
    elements.btnExport.disabled = true;
}

async function detectFrame(timestamp) {
    if (!state.isCameraRunning || !state.model) return;
    
    const frameInterval = 1000 / state.fpsLimit;
    if (timestamp - state.lastFrameTime < frameInterval) {
        state.animationId = requestAnimationFrame(detectFrame);
        return;
    }
    
    state.lastFrameTime = timestamp;
    
    state.frameCount++;
    if (timestamp - state.lastFpsUpdate >= 1000) {
        state.currentFps = state.frameCount;
        state.frameCount = 0;
        state.lastFpsUpdate = timestamp;
        elements.fps.textContent = state.currentFps;
    }
    
    const startTime = performance.now();
    
    try {
        let predictions;
        
        if (typeof state.model.detect === 'function') {
            predictions = await state.model.detect(video);
        } else {
            predictions = await detectWithGraphModel(video);
        }
        
        const filteredDetections = filterDetections(predictions);
        state.currentDetections = filteredDetections;
        
        const detectionTime = performance.now() - startTime;
        const roundedTime = Math.round(detectionTime);
        elements.detectionTime.textContent = roundedTime + ' ms';
        
        drawDetections(filteredDetections);
        updateDetectionList(filteredDetections);
    } catch (error) {
        console.error('检测帧失败:', error);
    }
    
    if (state.isCameraRunning) {
        state.animationId = requestAnimationFrame(detectFrame);
    }
}

function startDetection() {
    if (!state.isDetecting && state.isCameraRunning) {
        state.isDetecting = true;
        state.lastFrameTime = 0;
        state.frameCount = 0;
        state.lastFpsUpdate = performance.now();
        state.animationId = requestAnimationFrame(detectFrame);
    }
}

function takeScreenshot() {
    if (state.currentDetections.length === 0 && state.detectionMode === 'video') {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    
    const link = document.createElement('a');
    link.download = `detection_screenshot_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function exportJSON() {
    if (state.currentDetections.length === 0) return;
    
    const exportData = {
        timestamp: new Date().toISOString(),
        model: state.modelName,
        threshold: state.settings.threshold,
        detectionMode: state.detectionMode,
        resolution: {
            width: canvas.width,
            height: canvas.height
        },
        totalDetections: state.currentDetections.length,
        detections: state.currentDetections.map((d, index) => ({
            id: index + 1,
            class: d.class,
            confidence: d.score,
            confidencePercent: (d.score * 100).toFixed(1) + '%',
            boundingBox: {
                x: Math.round(d.bbox[0]),
                y: Math.round(d.bbox[1]),
                width: Math.round(d.bbox[2]),
                height: Math.round(d.bbox[3])
            }
        }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `detection_results_${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

function loadSampleImage() {
    showLoading('正在加载示例图片...');
    
    const sampleImages = [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1535930749574-1399327ce78f?w=800&h=600&fit=crop'
    ];
    
    const randomImage = sampleImages[Math.floor(Math.random() * sampleImages.length)];
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
        state.uploadedImage = img;
        state.detectionMode = 'image';
        
        if (state.isCameraRunning) {
            stopCamera();
        }
        
        resizeCanvasToImage(img);
        drawImageOnCanvas(img);
        hidePlaceholder();
        hideLoading();
        
        elements.btnScreenshot.disabled = false;
        elements.btnExport.disabled = false;
        elements.btnClear.disabled = false;
        
        detectImage(img);
    };
    
    img.onerror = () => {
        hideLoading();
        alert('示例图片加载失败，请尝试上传本地图片。');
    };
    
    img.src = randomImage;
}

function clearAll() {
    if (state.isCameraRunning) {
        stopCamera();
    }
    
    state.uploadedImage = null;
    clearCanvas();
    clearDetectionResults();
    showPlaceholder();
    
    elements.btnScreenshot.disabled = true;
    elements.btnExport.disabled = true;
    elements.btnClear.disabled = true;
    elements.fps.textContent = '0';
}

function showLoading(text = '加载中...') {
    loadingText.textContent = text;
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showPlaceholder() {
    placeholder.classList.remove('hidden');
}

function hidePlaceholder() {
    placeholder.classList.add('hidden');
}

function initEventListeners() {
    elements.btnCamera.addEventListener('click', startCamera);
    elements.btnStopCamera.addEventListener('click', stopCamera);
    elements.btnScreenshot.addEventListener('click', takeScreenshot);
    elements.btnExport.addEventListener('click', exportJSON);
    elements.btnClear.addEventListener('click', clearAll);
    
    elements.fileInput.addEventListener('change', (e) => handleImageUpload(e, false));
    elements.customFileInput.addEventListener('change', (e) => handleImageUpload(e, true));
    
    elements.btnSample.addEventListener('click', loadSampleImage);
    
    elements.threshold.addEventListener('input', (e) => {
        state.settings.threshold = parseFloat(e.target.value);
        elements.thresholdValue.textContent = state.settings.threshold.toFixed(2);
        
        if (state.rawDetections.length > 0) {
            const filtered = filterDetections(state.rawDetections);
            state.currentDetections = filtered;
            drawDetections(filtered);
            updateDetectionList(filtered);
            elements.btnExport.disabled = filtered.length === 0;
        }
    });
    
    elements.maxDetections.addEventListener('input', (e) => {
        state.settings.maxDetections = parseInt(e.target.value);
        elements.maxDetectionsValue.textContent = state.settings.maxDetections;
        
        if (state.rawDetections.length > 0) {
            const filtered = filterDetections(state.rawDetections);
            state.currentDetections = filtered;
            drawDetections(filtered);
            updateDetectionList(filtered);
        }
    });
    
    elements.modelSelect.addEventListener('change', (e) => {
        const modelKey = e.target.value;
        loadModel(modelKey);
    });
    
    elements.performanceMode.addEventListener('change', (e) => {
        state.settings.performanceMode = e.target.checked;
        
        if (state.settings.performanceMode) {
            state.fpsLimit = 15;
            elements.fpsLimit.value = 15;
            elements.fpsLimitValue.textContent = '15';
            elements.resolution.value = '640x360';
            state.settings.resolution = { width: 640, height: 360 };
        } else {
            state.fpsLimit = 30;
            elements.fpsLimit.value = 30;
            elements.fpsLimitValue.textContent = '30';
            elements.resolution.value = '1280x720';
            state.settings.resolution = { width: 1280, height: 720 };
        }
        
        if (state.isCameraRunning) {
            alert('性能模式设置已更新，请重启摄像头以应用新的分辨率设置。');
        }
    });
    
    elements.fpsLimit.addEventListener('input', (e) => {
        state.fpsLimit = parseInt(e.target.value);
        elements.fpsLimitValue.textContent = state.fpsLimit;
    });
    
    elements.resolution.addEventListener('change', (e) => {
        const [width, height] = e.target.value.split('x').map(Number);
        state.settings.resolution = { width, height };
        
        if (state.isCameraRunning) {
            alert('分辨率设置已更新，请重启摄像头以应用新设置。');
        }
    });
    
    window.addEventListener('resize', resizeCanvas);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (state.isCameraRunning) {
                stopCamera();
            }
        } else if (e.key === 's' || e.key === 'S') {
            if (!elements.btnScreenshot.disabled) {
                takeScreenshot();
            }
        }
    });
}

async function init() {
    initEventListeners();
    
    const defaultModel = elements.modelSelect.value;
    await loadModel(defaultModel);
}

init();
