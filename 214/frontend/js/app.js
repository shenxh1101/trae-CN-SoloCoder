const API_BASE = 'http://localhost:5001/api';

const AppState = {
    currentPage: 'recognize',
    currentRecordId: null,
    currentImageData: null,
    selectedCorrection: null,
    currentTargetChar: '大',
    practiceChars: [],
    practiceCategory: 'all',
    practiceSearch: '',
    historyPage: 1,
    historyPerPage: 20,
    historyType: 'all',
    batchFile: null,
    batchResults: null
};

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(`page-${page}`).classList.add('active');
    
    const titles = {
        recognize: { title: '手写识别', subtitle: '在画板上书写字符，AI将自动识别' },
        practice: { title: '临摹练习', subtitle: '选择标准字体进行临摹，系统给出评分' },
        batch: { title: '批量识别', subtitle: '上传包含多个手写字的图片，自动分割识别' },
        analytics: { title: '数据分析', subtitle: '查看识别混淆矩阵和错误统计' },
        history: { title: '历史记录', subtitle: '回顾之前的识别记录和纠正历史' },
        export: { title: '数据导出', subtitle: '导出训练数据，管理模型更新' }
    };
    
    const pageInfo = titles[page];
    document.getElementById('pageTitle').textContent = pageInfo.title;
    document.getElementById('pageSubtitle').textContent = pageInfo.subtitle;
    
    AppState.currentPage = page;
    
    if (page === 'analytics') {
        loadAnalytics();
    } else if (page === 'history') {
        loadHistory();
    } else if (page === 'export') {
        loadExportStatus();
    } else if (page === 'practice' && AppState.practiceChars.length === 0) {
        loadPracticeChars();
    }
}

function initCanvas(canvasId, isPractice = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    const wrapper = canvas.closest('.canvas-wrapper');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    function startDrawing(e) {
        isDrawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
        wrapper.classList.add('has-content');
    }
    
    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        
        const pos = getPos(e);
        const brushSize = isPractice ? 8 : parseInt(document.getElementById('brushSize').value);
        const brushColor = isPractice ? '#1e3a5f' : document.getElementById('brushColor').value;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        lastX = pos.x;
        lastY = pos.y;
    }
    
    function stopDrawing() {
        isDrawing = false;
    }
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    
    return { canvas, ctx };
}

function clearCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const wrapper = canvas.closest('.canvas-wrapper');
    wrapper.classList.remove('has-content');
}

function getCanvasImageData(canvasId) {
    const canvas = document.getElementById(canvasId);
    return canvas.toDataURL('image/png');
}

async function recognizeHandwriting() {
    const canvas = document.getElementById('drawCanvas');
    const wrapper = canvas.closest('.canvas-wrapper');
    
    if (!wrapper.classList.contains('has-content')) {
        showToast('请先在画板上书写字符', 'warning');
        return;
    }
    
    const imageData = getCanvasImageData('drawCanvas');
    AppState.currentImageData = imageData;
    
    try {
        showToast('正在识别中...', 'success');
        
        const response = await fetch(`${API_BASE}/recognize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });
        
        const result = await response.json();
        
        if (result.success) {
            AppState.currentRecordId = result.record_id;
            displayPredictions(result.predictions);
            showCorrectionOptions(result.predictions);
            updateStatus();
        } else {
            showToast(result.error || '识别失败', 'error');
        }
    } catch (error) {
        showToast('网络错误，请检查后端服务是否启动', 'error');
        console.error(error);
    }
}

function displayPredictions(predictions) {
    const container = document.getElementById('predictionsContainer');
    
    if (!predictions || predictions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❓</span>
                <p>未能识别出结果，请重新书写</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = predictions.map((pred, index) => `
        <div class="prediction-card">
            <div class="prediction-rank">${index + 1}</div>
            <div class="prediction-char">${pred.character}</div>
            <div class="prediction-info">
                <div class="prediction-confidence">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${pred.confidence * 100}%"></div>
                    </div>
                    <span class="confidence-value">${(pred.confidence * 100).toFixed(1)}%</span>
                </div>
            </div>
        </div>
    `).join('');
}

function showCorrectionOptions(predictions) {
    const section = document.getElementById('correctionSection');
    const grid = document.getElementById('charGrid');
    
    section.style.display = 'block';
    
    const allChars = [...new Set(predictions.map(p => p.character))];
    const commonChars = ['一', '二', '三', '大', '小', '中', '人', '口', '手', '日', '月', '水'];
    const displayChars = [...allChars];
    
    for (let char of commonChars) {
        if (!displayChars.includes(char) && displayChars.length < 12) {
            displayChars.push(char);
        }
    }
    
    grid.innerHTML = displayChars.map(char => `
        <button class="char-option" data-char="${char}">${char}</button>
    `).join('');
    
    document.querySelectorAll('.char-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.char-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            AppState.selectedCorrection = btn.dataset.char;
            document.getElementById('customChar').value = '';
        });
    });
    
    AppState.selectedCorrection = null;
}

async function submitCorrection() {
    const customChar = document.getElementById('customChar').value.trim();
    const correctChar = customChar || AppState.selectedCorrection;
    
    if (!correctChar) {
        showToast('请选择或输入正确的字符', 'warning');
        return;
    }
    
    if (!AppState.currentRecordId || !AppState.currentImageData) {
        showToast('请先进行识别', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/correct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                record_id: AppState.currentRecordId,
                correct_char: correctChar,
                image: AppState.currentImageData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`已保存纠正样本，当前共 ${result.sample_count} 个样本`, 'success');
            
            if (result.needs_retrain) {
                document.getElementById('retrainAlert').style.display = 'flex';
                showToast('样本已达阈值，建议训练模型', 'warning');
            }
            
            document.getElementById('correctionSection').style.display = 'none';
            document.getElementById('customChar').value = '';
            AppState.selectedCorrection = null;
            
            updateStatus();
        } else {
            showToast(result.error || '提交失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', 'error');
        console.error(error);
    }
}

async function loadPracticeChars() {
    try {
        const response = await fetch(`${API_BASE}/practice/characters?category=${AppState.practiceCategory}`);
        const result = await response.json();
        
        if (result.success) {
            AppState.practiceChars = result.characters;
            renderPracticeChars();
        }
    } catch (error) {
        console.error('Failed to load practice chars:', error);
        const fallbackChars = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '大', '小', '中', '人', '口', '手', 'A', 'B', 'C', 'D', '0', '1', '2', '3'];
        AppState.practiceChars = fallbackChars;
        renderPracticeChars();
    }
}

function renderPracticeChars() {
    const list = document.getElementById('charList');
    const search = AppState.practiceSearch.toLowerCase();
    
    const filtered = AppState.practiceChars.filter(char => 
        char.toLowerCase().includes(search)
    );
    
    list.innerHTML = filtered.map(char => `
        <button class="char-item ${char === AppState.currentTargetChar ? 'active' : ''}" data-char="${char}">${char}</button>
    `).join('');
    
    document.querySelectorAll('.char-item').forEach(btn => {
        btn.addEventListener('click', () => {
            selectPracticeChar(btn.dataset.char);
        });
    });
}

function selectPracticeChar(char) {
    AppState.currentTargetChar = char;
    document.getElementById('charDisplay').textContent = char;
    
    document.querySelectorAll('.char-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.char === char);
    });
    
    clearCanvas('practiceCanvas');
    resetPracticeScore();
}

function getRandomPracticeChar() {
    if (AppState.practiceChars.length > 0) {
        const randomIndex = Math.floor(Math.random() * AppState.practiceChars.length);
        selectPracticeChar(AppState.practiceChars[randomIndex]);
    }
}

async function comparePractice() {
    const canvas = document.getElementById('practiceCanvas');
    const wrapper = canvas.closest('.canvas-wrapper');
    
    if (!wrapper.classList.contains('has-content')) {
        showToast('请先临摹书写', 'warning');
        return;
    }
    
    const imageData = getCanvasImageData('practiceCanvas');
    
    try {
        showToast('正在评分...', 'success');
        
        const response = await fetch(`${API_BASE}/practice/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_char: AppState.currentTargetChar,
                user_image: imageData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            animateScore(result.score, result.feedback);
        } else {
            showToast(result.error || '评分失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', 'error');
        console.error(error);
    }
}

function resetPracticeScore() {
    document.getElementById('scoreNumber').textContent = '--';
    document.getElementById('scoreRing').style.strokeDashoffset = 283;
    document.getElementById('feedbackText').textContent = '完成临摹后点击评分';
}

function animateScore(targetScore, feedback) {
    const scoreNumber = document.getElementById('scoreNumber');
    const scoreRing = document.getElementById('scoreRing');
    const feedbackText = document.getElementById('feedbackText');
    
    const circumference = 2 * Math.PI * 45;
    const targetOffset = circumference - (targetScore / 100) * circumference;
    
    let currentScore = 0;
    const duration = 1000;
    const steps = 60;
    const increment = targetScore / steps;
    
    const interval = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(interval);
        }
        
        scoreNumber.textContent = Math.round(currentScore);
        const currentOffset = circumference - (currentScore / 100) * circumference;
        scoreRing.style.strokeDashoffset = currentOffset;
        
        if (currentScore >= 90) {
            scoreRing.style.stroke = '#4db6ac';
        } else if (currentScore >= 60) {
            scoreRing.style.stroke = '#ffa726';
        } else {
            scoreRing.style.stroke = '#ef5350';
        }
    }, duration / steps);
    
    setTimeout(() => {
        feedbackText.textContent = feedback;
    }, duration);
}

function initBatchUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('batchFileInput');
    
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleBatchFile(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleBatchFile(e.target.files[0]);
        }
    });
}

function handleBatchFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件', 'error');
        return;
    }
    
    AppState.batchFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('previewImage').src = e.target.result;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('batchResults').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

async function batchRecognize() {
    if (!AppState.batchFile) {
        showToast('请先选择图片文件', 'warning');
        return;
    }
    
    try {
        showToast('正在识别中，请稍候...', 'success');
        
        const formData = new FormData();
        formData.append('image', AppState.batchFile);
        
        const response = await fetch(`${API_BASE}/batch_recognize`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            AppState.batchResults = result.results;
            displayBatchResults(result);
            updateStatus();
        } else {
            showToast(result.error || '识别失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', 'error');
        console.error(error);
    }
}

function displayBatchResults(result) {
    const section = document.getElementById('batchResults');
    const summary = document.getElementById('resultsSummary');
    const tbody = document.getElementById('resultsTableBody');
    
    section.style.display = 'block';
    
    summary.innerHTML = `
        <strong>识别完成！</strong> 共检测到 <strong>${result.segmented_count}</strong> 个字符，
        批次ID：<code>${result.batch_id}</code>
    `;
    
    tbody.innerHTML = result.results.map((item, index) => {
        const getConfidenceClass = (conf) => {
            if (conf >= 0.7) return 'confidence-high';
            if (conf >= 0.4) return 'confidence-medium';
            return 'confidence-low';
        };
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <div class="char-thumb">${item.predictions[0]?.character || '?'}</div>
                </td>
                <td><strong>${item.predictions[0]?.character || '-'}</strong></td>
                <td class="${getConfidenceClass(item.predictions[0]?.confidence || 0)}">
                    ${((item.predictions[0]?.confidence || 0) * 100).toFixed(1)}%
                </td>
                <td>${item.predictions[1]?.character || '-'}</td>
                <td class="${getConfidenceClass(item.predictions[1]?.confidence || 0)}">
                    ${((item.predictions[1]?.confidence || 0) * 100).toFixed(1)}%
                </td>
                <td>${item.predictions[2]?.character || '-'}</td>
                <td class="${getConfidenceClass(item.predictions[2]?.confidence || 0)}">
                    ${((item.predictions[2]?.confidence || 0) * 100).toFixed(1)}%
                </td>
            </tr>
        `;
    }).join('');
}

async function loadAnalytics() {
    try {
        const limit = document.getElementById('matrixLimit').value;
        
        const [cmResponse, statsResponse] = await Promise.all([
            fetch(`${API_BASE}/analytics/confusion_matrix?limit=${limit}`),
            fetch(`${API_BASE}/analytics/error_stats`)
        ]);
        
        const cmData = await cmResponse.json();
        const statsData = await statsResponse.json();
        
        if (cmData.success) {
            const img = document.getElementById('confusionMatrixImg');
            img.src = `${API_BASE}/analytics/confusion_matrix_image?limit=${limit}&t=${Date.now()}`;
            
            document.getElementById('totalErrors').textContent = cmData.total_errors || 0;
            document.getElementById('uniqueChars').textContent = cmData.characters?.length || 0;
            
            if (cmData.common_errors && cmData.common_errors.length > 0) {
                document.getElementById('topError').textContent = cmData.common_errors[0].error_pair;
            } else {
                document.getElementById('topError').textContent = '--';
            }
        }
        
        if (statsData.success) {
            displayErrorStats(statsData.errors);
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

function displayErrorStats(errors) {
    const list = document.getElementById('errorList');
    
    if (!errors || errors.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📊</span>
                <p>暂无错误统计数据</p>
                <p style="font-size: 12px; margin-top: 8px;">当您提交纠正后会显示统计</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = errors.map(error => {
        const [actual, predicted] = error.error_pair.split('->');
        return `
            <div class="error-item">
                <div class="error-pair">
                    <span>${actual}</span>
                    <span class="error-arrow">→</span>
                    <span>${predicted}</span>
                </div>
                <div class="error-count">
                    <span>✕</span>
                    <span>${error.count}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/history?page=${AppState.historyPage}&per_page=${AppState.historyPerPage}&type=${AppState.historyType}`);
        const result = await response.json();
        
        if (result.success) {
            displayHistory(result.history);
            displayPagination(result.page, result.total_pages, result.total);
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

function displayHistory(history) {
    const list = document.getElementById('historyList');
    
    if (!history || history.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>暂无识别历史</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = history.map(item => {
        const time = new Date(item.timestamp).toLocaleString('zh-CN');
        const typeLabel = item.type === 'batch' ? '批量识别' : '单次识别';
        const predictions = item.predictions || [];
        const topPred = predictions[0] || {};
        
        return `
            <div class="history-item ${item.corrected ? 'corrected' : ''}">
                <div class="history-time">${time}</div>
                <div class="history-type">${typeLabel}</div>
                <div class="history-predictions">
                    ${predictions.slice(0, 3).map(p => `
                        <div>
                            <div class="history-char">${p.character}</div>
                            <div class="history-confidence">${(p.confidence * 100).toFixed(0)}%</div>
                        </div>
                    `).join('')}
                </div>
                ${item.corrected ? `
                    <div class="history-correction">
                        <span class="correction-label">纠正为</span>
                        <span class="correction-char">${item.corrected}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function displayPagination(page, totalPages, total) {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = `
        <button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">上一页</button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === page - 3 || i === page + 3) {
            html += '<span style="padding: 8px;">...</span>';
        }
    }
    
    html += `
        <button class="page-btn" ${page === totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})">下一页</button>
        <span style="padding: 8px; color: var(--text-secondary);">共 ${total} 条</span>
    `;
    
    pagination.innerHTML = html;
}

function changePage(page) {
    AppState.historyPage = page;
    loadHistory();
}

async function loadExportStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('exportSampleCount').textContent = result.sample_count;
            document.getElementById('trainSampleCount').textContent = result.sample_count;
            
            const progress = Math.min(100, (result.sample_count / 50) * 100);
            document.getElementById('trainProgress').style.width = `${progress}%`;
            document.getElementById('trainProgressText').textContent = `${Math.round(progress)}%`;
            
            if (result.needs_retrain) {
                document.getElementById('retrainAlert').style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Failed to load status:', error);
    }
}

async function exportCSV() {
    try {
        showToast('正在导出...', 'success');
        
        const response = await fetch(`${API_BASE}/export/csv`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('downloadLink').href = `${API_BASE}/export/download?filename=${result.filename}`;
            document.getElementById('exportResult').style.display = 'block';
            showToast(`成功导出 ${result.sample_count} 个样本`, 'success');
        } else {
            showToast(result.error || '导出失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', 'error');
        console.error(error);
    }
}

async function retrainModel() {
    try {
        document.getElementById('trainingStatus').style.display = 'flex';
        document.getElementById('retrainModelBtn').disabled = true;
        
        showToast('开始训练模型，这可能需要一些时间...', 'warning');
        
        const response = await fetch(`${API_BASE}/retrain`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        document.getElementById('trainingStatus').style.display = 'none';
        document.getElementById('retrainModelBtn').disabled = false;
        
        if (result.success) {
            showToast(`模型训练完成！使用了 ${result.trained_samples} 个新样本`, 'success');
            document.getElementById('retrainAlert').style.display = 'none';
            loadExportStatus();
            updateStatus();
        } else {
            showToast(result.message || '训练失败', 'error');
        }
    } catch (error) {
        document.getElementById('trainingStatus').style.display = 'none';
        document.getElementById('retrainModelBtn').disabled = false;
        showToast('网络错误', 'error');
        console.error(error);
    }
}

async function updateStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('sampleCount').textContent = result.sample_count;
            document.getElementById('historyCount').textContent = result.history_count;
            
            if (result.needs_retrain) {
                document.getElementById('retrainAlert').style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Failed to update status:', error);
    }
}

function initEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });
    
    document.getElementById('brushSize').addEventListener('input', (e) => {
        document.getElementById('brushSizeValue').textContent = `${e.target.value}px`;
    });
    
    document.getElementById('clearBtn').addEventListener('click', () => {
        clearCanvas('drawCanvas');
        document.getElementById('predictionsContainer').innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✨</span>
                <p>书写完成后点击识别按钮</p>
            </div>
        `;
        document.getElementById('correctionSection').style.display = 'none';
    });
    
    document.getElementById('recognizeBtn').addEventListener('click', recognizeHandwriting);
    document.getElementById('submitCorrection').addEventListener('click', submitCorrection);
    
    document.getElementById('practiceClearBtn').addEventListener('click', () => {
        clearCanvas('practiceCanvas');
        resetPracticeScore();
    });
    document.getElementById('compareBtn').addEventListener('click', comparePractice);
    document.getElementById('newCharBtn').addEventListener('click', getRandomPracticeChar);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.practiceCategory = btn.dataset.category;
            loadPracticeChars();
        });
    });
    
    document.getElementById('charSearch').addEventListener('input', (e) => {
        AppState.practiceSearch = e.target.value;
        renderPracticeChars();
    });
    
    initBatchUpload();
    document.getElementById('batchRecognizeBtn').addEventListener('click', batchRecognize);
    
    document.getElementById('refreshMatrix').addEventListener('click', loadAnalytics);
    document.getElementById('matrixLimit').addEventListener('change', loadAnalytics);
    
    document.getElementById('historyTypeFilter').addEventListener('change', (e) => {
        AppState.historyType = e.target.value;
        AppState.historyPage = 1;
        loadHistory();
    });
    
    document.getElementById('historyPerPage').addEventListener('change', (e) => {
        AppState.historyPerPage = parseInt(e.target.value);
        AppState.historyPage = 1;
        loadHistory();
    });
    
    document.getElementById('refreshHistory').addEventListener('click', () => {
        AppState.historyPage = 1;
        loadHistory();
    });
    
    document.getElementById('exportBtn').addEventListener('click', exportCSV);
    document.getElementById('retrainModelBtn').addEventListener('click', retrainModel);
    document.getElementById('trainBtn').addEventListener('click', () => {
        navigateTo('export');
        retrainModel();
    });
}

function init() {
    initCanvas('drawCanvas', false);
    initCanvas('practiceCanvas', true);
    initEventListeners();
    updateStatus();
    
    const drawCanvas = document.getElementById('drawCanvas');
    let touchStartX, touchStartY;
    
    drawCanvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    drawCanvas.addEventListener('touchmove', (e) => {
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        const diffX = Math.abs(touchEndX - touchStartX);
        const diffY = Math.abs(touchEndY - touchStartY);
        
        if (diffX > 10 || diffY > 10) {
            e.preventDefault();
        }
    }, { passive: false });
    
    console.log('AI手写文字识别与学习系统已启动');
}

document.addEventListener('DOMContentLoaded', init);
