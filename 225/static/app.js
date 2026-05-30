const API_BASE = 'http://localhost:5001/api';

const state = {
    currentStyle: 'sketch',
    smoothness: 5,
    detailLevel: 3,
    isDrawing: false,
    brushSize: 5,
    brushColor: '#000000',
    history: [],
    historyIndex: -1,
    compareMode: false,
    resultImage: null,
    originalImage: null,
    trainingPairs: []
};

const elements = {
    drawCanvas: document.getElementById('draw-canvas'),
    originalCanvas: document.getElementById('original-canvas'),
    resultCanvas: document.getElementById('result-canvas'),
    singleView: document.getElementById('single-view'),
    compareView: document.getElementById('compare-view'),
    smoothnessSlider: document.getElementById('smoothness'),
    smoothnessValue: document.getElementById('smoothness-value'),
    detailSlider: document.getElementById('detail'),
    detailValue: document.getElementById('detail-value'),
    imageUpload: document.getElementById('image-upload'),
    batchUpload: document.getElementById('batch-upload'),
    generateBtn: document.getElementById('generate-btn'),
    clearCanvas: document.getElementById('clear-canvas'),
    undoCanvas: document.getElementById('undo-canvas'),
    brushSizeBtn: document.getElementById('brush-size'),
    brushPanel: document.getElementById('brush-panel'),
    brushSlider: document.getElementById('brush-slider'),
    brushSizeValue: document.getElementById('brush-size-value'),
    brushColor: document.getElementById('brush-color'),
    exportPng: document.getElementById('export-png'),
    exportSvg: document.getElementById('export-svg'),
    toggleCompare: document.getElementById('toggle-compare'),
    status: document.getElementById('status'),
    processingTime: document.getElementById('processing-time'),
    trainModal: document.getElementById('train-modal'),
    openTrainModal: document.getElementById('open-train-modal'),
    closeTrainModal: document.getElementById('close-train-modal'),
    trainingPairs: document.getElementById('training-pairs'),
    addPairBtn: document.getElementById('add-pair-btn'),
    styleName: document.getElementById('style-name'),
    startTraining: document.getElementById('start-training'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    customStyles: document.getElementById('custom-styles')
};

let ctx, originalCtx, resultCtx;

function initCanvas() {
    const canvas = elements.drawCanvas;
    const container = canvas.parentElement;
    const newWidth = container.clientWidth - 40;
    const newHeight = container.clientHeight - 100;

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
        const tempData = canvas.toDataURL();
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        img.src = tempData;
    }

    if (!ctx) {
        ctx = canvas.getContext('2d');
    }

    if (state.compareMode) {
        initCompareCanvases();
    }
}

function initCompareCanvases() {
    const origCanvas = elements.originalCanvas;
    const resCanvas = elements.resultCanvas;

    const origParent = origCanvas.parentElement;
    const resParent = resCanvas.parentElement;

    if (!origParent || !resParent) return;

    const ow = origParent.clientWidth - 40;
    const oh = origParent.clientHeight - 60;
    const rw = resParent.clientWidth - 40;
    const rh = resParent.clientHeight - 60;

    if (ow > 0 && oh > 0) {
        origCanvas.width = ow;
        origCanvas.height = oh;
        originalCtx = origCanvas.getContext('2d');
        originalCtx.fillStyle = '#ffffff';
        originalCtx.fillRect(0, 0, ow, oh);
    }

    if (rw > 0 && rh > 0) {
        resCanvas.width = rw;
        resCanvas.height = rh;
        resultCtx = resCanvas.getContext('2d');
        resultCtx.fillStyle = '#ffffff';
        resultCtx.fillRect(0, 0, rw, rh);
    }
}

function drawImageOnCanvas(targetCtx, targetCanvas, imgSrc) {
    const img = new Image();
    img.onload = () => {
        const scale = Math.min(
            targetCanvas.width / img.width,
            targetCanvas.height / img.height,
            1
        );
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (targetCanvas.width - w) / 2;
        const y = (targetCanvas.height - h) / 2;
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        targetCtx.drawImage(img, x, y, w, h);
    };
    img.src = imgSrc;
}

function saveHistory() {
    const canvas = elements.drawCanvas;
    const imageData = canvas.toDataURL();

    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(imageData);
    state.historyIndex++;

    if (state.history.length > 50) {
        state.history.shift();
        state.historyIndex--;
    }
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, elements.drawCanvas.width, elements.drawCanvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = state.history[state.historyIndex];
    }
}

function getMousePos(e) {
    const canvas = elements.drawCanvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    state.isDrawing = true;
    const pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = state.brushColor;
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function draw(e) {
    if (!state.isDrawing) return;
    const pos = getMousePos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

function stopDrawing() {
    if (state.isDrawing) {
        state.isDrawing = false;
        saveHistory();
    }
}

function clearCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, elements.drawCanvas.width, elements.drawCanvas.height);
    state.originalImage = null;
    state.resultImage = null;
    saveHistory();
}

function uploadImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = elements.drawCanvas;
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, x, y, w, h);
            saveHistory();

            state.originalImage = canvas.toDataURL();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

async function batchUpload(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    showLoading('正在批量处理...');

    const formData = new FormData();
    for (const file of files) {
        formData.append('images', file);
    }
    formData.append('style', state.currentStyle);
    formData.append('smoothness', state.smoothness);
    formData.append('detail_level', state.detailLevel);

    try {
        const response = await fetch(`${API_BASE}/batch`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'contours.zip';
            a.click();
            window.URL.revokeObjectURL(url);
            updateStatus('批量处理完成', '-');
        } else {
            throw new Error('批量处理失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('批量处理失败: ' + error.message);
    } finally {
        hideLoading();
    }

    e.target.value = '';
}

async function generateContour() {
    showLoading('正在生成轮廓图...');

    const canvas = elements.drawCanvas;
    const imageData = canvas.toDataURL('image/png');

    if (!state.originalImage) {
        state.originalImage = imageData;
    }

    try {
        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: imageData,
                style: state.currentStyle,
                smoothness: state.smoothness,
                detail_level: state.detailLevel
            })
        });

        const data = await response.json();

        if (data.success) {
            state.resultImage = data.image;
            updateStatus('处理完成', `${data.processing_time} ms`);

            if (state.compareMode) {
                if (resultCtx) {
                    drawImageOnCanvas(resultCtx, elements.resultCanvas, data.image);
                }
                if (originalCtx) {
                    drawImageOnCanvas(originalCtx, elements.originalCanvas, state.originalImage);
                }
            } else {
                const img = new Image();
                img.onload = () => {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    const scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
                    const w = img.width * scale;
                    const h = img.height * scale;
                    const x = (canvas.width - w) / 2;
                    const y = (canvas.height - h) / 2;
                    ctx.drawImage(img, x, y, w, h);
                    saveHistory();
                };
                img.src = data.image;
            }
        } else {
            throw new Error(data.error || '生成失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('生成失败: ' + error.message);
        updateStatus('出错', '-');
    } finally {
        hideLoading();
    }
}

function exportPng() {
    let canvas;
    if (state.compareMode && resultCtx) {
        canvas = elements.resultCanvas;
    } else {
        canvas = elements.drawCanvas;
    }
    const link = document.createElement('a');
    link.download = `contour_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

async function exportSvg() {
    showLoading('正在导出SVG...');

    let canvas;
    if (state.compareMode && resultCtx) {
        canvas = elements.resultCanvas;
    } else {
        canvas = elements.drawCanvas;
    }
    const imageData = canvas.toDataURL('image/png');

    try {
        const response = await fetch(`${API_BASE}/export-svg`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contour_${Date.now()}.svg`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            throw new Error('导出失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('导出失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

function toggleCompareMode() {
    state.compareMode = !state.compareMode;

    if (state.compareMode) {
        if (!state.originalImage) {
            state.originalImage = elements.drawCanvas.toDataURL();
        }

        elements.singleView.style.display = 'none';
        elements.compareView.style.display = 'flex';

        requestAnimationFrame(() => {
            setTimeout(() => {
                initCompareCanvases();

                if (originalCtx && state.originalImage) {
                    drawImageOnCanvas(originalCtx, elements.originalCanvas, state.originalImage);
                }
                if (resultCtx && state.resultImage) {
                    drawImageOnCanvas(resultCtx, elements.resultCanvas, state.resultImage);
                }
            }, 150);
        });

        elements.toggleCompare.textContent = '📊 关闭对比模式';
    } else {
        elements.singleView.style.display = 'flex';
        elements.compareView.style.display = 'none';
        elements.toggleCompare.textContent = '📊 开启对比模式';
    }
}

function updateStatus(status, time) {
    elements.status.textContent = status;
    elements.processingTime.textContent = time;
}

function showLoading(text) {
    elements.loadingText.textContent = text || '处理中...';
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

function addTrainingPair() {
    if (state.trainingPairs.length >= 5) {
        alert('最多添加5对训练图片');
        return;
    }

    const pairId = Date.now();
    state.trainingPairs.push({ id: pairId, sketch: null, target: null });
    renderTrainingPairs();
}

function removeTrainingPair(pairId) {
    state.trainingPairs = state.trainingPairs.filter(p => p.id !== pairId);
    renderTrainingPairs();
}

function renderTrainingPairs() {
    elements.trainingPairs.innerHTML = '';

    state.trainingPairs.forEach((pair, index) => {
        const pairEl = document.createElement('div');
        pairEl.className = 'training-pair';

        const sketchContent = pair.sketch
            ? `<img src="${pair.sketch}" alt="sketch">`
            : `<div class="upload-placeholder"><div class="upload-icon">✏️</div><p>点击上传手绘草稿</p></div>`;

        const targetContent = pair.target
            ? `<img src="${pair.target}" alt="target">`
            : `<div class="upload-placeholder"><div class="upload-icon">🎯</div><p>点击上传目标轮廓图</p></div>`;

        const sketchClass = pair.sketch ? 'image-upload-area has-image' : 'image-upload-area';
        const targetClass = pair.target ? 'image-upload-area has-image' : 'image-upload-area';

        pairEl.innerHTML = `
            <div class="pair-header">
                <span>训练对 ${index + 1}</span>
                <button class="remove-pair" data-id="${pair.id}">✕ 移除</button>
            </div>
            <div class="pair-images">
                <div class="${sketchClass}" data-type="sketch" data-id="${pair.id}">
                    <input type="file" accept="image/*">
                    ${sketchContent}
                </div>
                <div class="${targetClass}" data-type="target" data-id="${pair.id}">
                    <input type="file" accept="image/*">
                    ${targetContent}
                </div>
            </div>
        `;
        elements.trainingPairs.appendChild(pairEl);
    });

    document.querySelectorAll('.remove-pair').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTrainingPair(parseInt(e.target.dataset.id));
        });
    });

    document.querySelectorAll('.image-upload-area').forEach(area => {
        const input = area.querySelector('input[type="file"]');

        area.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                input.click();
            }
        });

        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        input.addEventListener('change', (e) => {
            e.stopPropagation();
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const pairId = parseInt(area.dataset.id);
                const type = area.dataset.type;
                const pair = state.trainingPairs.find(p => p.id === pairId);
                if (pair) {
                    pair[type] = event.target.result;
                }
                renderTrainingPairs();
            };
            reader.readAsDataURL(file);
        });
    });
}

async function trainStyle() {
    const styleName = elements.styleName.value.trim();
    if (!styleName) {
        alert('请输入风格名称');
        return;
    }

    const validPairs = state.trainingPairs.filter(p => p.sketch && p.target);
    if (validPairs.length === 0) {
        alert('请至少添加一组合法的训练图片');
        return;
    }

    showLoading('正在训练自定义风格...');

    try {
        const response = await fetch(`${API_BASE}/train-style`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                style_name: styleName,
                pairs: validPairs
            })
        });

        const data = await response.json();

        if (data.success) {
            const params = data.params || {};
            const paramStr = Object.entries(params)
                .map(([k, v]) => `  ${k}: ${typeof v === 'number' ? v.toFixed(3) : v}`)
                .join('\n');
            alert(`风格 "${styleName}" 训练成功！\n训练耗时: ${data.processing_time} ms\n\n调整参数:\n${paramStr}`);
            closeTrainModal();
            loadCustomStyles();
        } else {
            throw new Error(data.error || '训练失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('训练失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

function openTrainModal() {
    elements.trainModal.classList.add('show');
    state.trainingPairs = [];
    elements.styleName.value = '';
    renderTrainingPairs();
}

function closeTrainModal() {
    elements.trainModal.classList.remove('show');
}

async function loadCustomStyles() {
    try {
        const response = await fetch(`${API_BASE}/styles`);
        const data = await response.json();

        elements.customStyles.innerHTML = '';
        data.custom.forEach(style => {
            const btn = document.createElement('button');
            btn.className = 'style-btn';
            btn.dataset.style = style;
            btn.innerHTML = `
                <span class="style-icon">🎨</span>
                <span>${style}</span>
            `;
            btn.addEventListener('click', () => selectStyle(style));
            elements.customStyles.appendChild(btn);
        });
    } catch (error) {
        console.error('Error loading styles:', error);
    }
}

function selectStyle(style) {
    state.currentStyle = style;
    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.style === style);
    });
}

function initEventListeners() {
    elements.drawCanvas.addEventListener('mousedown', startDrawing);
    elements.drawCanvas.addEventListener('mousemove', draw);
    elements.drawCanvas.addEventListener('mouseup', stopDrawing);
    elements.drawCanvas.addEventListener('mouseleave', stopDrawing);

    elements.smoothnessSlider.addEventListener('input', (e) => {
        state.smoothness = parseInt(e.target.value);
        elements.smoothnessValue.textContent = state.smoothness;
    });

    elements.detailSlider.addEventListener('input', (e) => {
        state.detailLevel = parseInt(e.target.value);
        elements.detailValue.textContent = state.detailLevel;
    });

    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.addEventListener('click', () => selectStyle(btn.dataset.style));
    });

    elements.imageUpload.addEventListener('change', uploadImage);
    elements.batchUpload.addEventListener('change', batchUpload);
    elements.generateBtn.addEventListener('click', generateContour);
    elements.clearCanvas.addEventListener('click', clearCanvas);
    elements.undoCanvas.addEventListener('click', undo);

    elements.brushSizeBtn.addEventListener('click', () => {
        elements.brushPanel.style.display = elements.brushPanel.style.display === 'none' ? 'block' : 'none';
    });

    elements.brushSlider.addEventListener('input', (e) => {
        state.brushSize = parseInt(e.target.value);
        elements.brushSizeValue.textContent = state.brushSize;
    });

    elements.brushColor.addEventListener('change', (e) => {
        state.brushColor = e.target.value;
    });

    elements.exportPng.addEventListener('click', exportPng);
    elements.exportSvg.addEventListener('click', exportSvg);
    elements.toggleCompare.addEventListener('click', toggleCompareMode);

    elements.openTrainModal.addEventListener('click', openTrainModal);
    elements.closeTrainModal.addEventListener('click', closeTrainModal);
    elements.addPairBtn.addEventListener('click', addTrainingPair);
    elements.startTraining.addEventListener('click', trainStyle);

    elements.trainModal.addEventListener('click', (e) => {
        if (e.target === elements.trainModal) {
            closeTrainModal();
        }
    });

    window.addEventListener('resize', () => {
        setTimeout(initCanvas, 200);
    });
}

async function init() {
    initCanvas();
    initEventListeners();
    await loadCustomStyles();
    updateStatus('就绪', '-');
}

init();
