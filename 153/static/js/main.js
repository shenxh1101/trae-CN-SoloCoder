const DEVICE_PRESETS = {
    desktop: { width: 1920, height: 1080 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
};

const elements = {
    screenshotForm: document.getElementById('screenshotForm'),
    batchForm: document.getElementById('batchForm'),
    scheduleForm: document.getElementById('scheduleForm'),
    urlInput: document.getElementById('urlInput'),
    widthInput: document.getElementById('widthInput'),
    heightInput: document.getElementById('heightInput'),
    deviceInput: document.getElementById('deviceInput'),
    deviceBtns: document.querySelectorAll('.device-btn'),
    delayInput: document.getElementById('delayInput'),
    delayValue: document.getElementById('delayValue'),
    qualityInput: document.getElementById('qualityInput'),
    qualityValue: document.getElementById('qualityValue'),
    toggleAdvanced: document.getElementById('toggleAdvanced'),
    advancedOptions: document.getElementById('advancedOptions'),
    advancedIcon: document.getElementById('advancedIcon'),
    aspectLock: document.getElementById('aspectLock'),
    keepAspectRatio: document.getElementById('keepAspectRatio'),
    screenshotBtn: document.getElementById('screenshotBtn'),
    batchBtn: document.getElementById('batchBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    resultModal: document.getElementById('resultModal'),
    modalOverlay: document.getElementById('modalOverlay'),
    closeModal: document.getElementById('closeModal'),
    resultImage: document.getElementById('resultImage'),
    downloadLink: document.getElementById('downloadLink'),
    copyBase64: document.getElementById('copyBase64'),
    resultDimensions: document.getElementById('resultDimensions'),
    resultFormat: document.getElementById('resultFormat'),
    resultSize: document.getElementById('resultSize'),
    ocrResultContainer: document.getElementById('ocrResultContainer'),
    ocrResult: document.getElementById('ocrResult'),
    copyOcr: document.getElementById('copyOcr'),
    base64Container: document.getElementById('base64Container'),
    base64Result: document.getElementById('base64Result'),
    historyList: document.getElementById('historyList'),
    dropZone: document.getElementById('dropZone'),
    batchFile: document.getElementById('batchFile'),
    batchPreview: document.getElementById('batchPreview'),
    batchFileName: document.getElementById('batchFileName'),
    clearBatchFile: document.getElementById('clearBatchFile'),
    taskList: document.getElementById('taskList'),
    refreshTasks: document.getElementById('refreshTasks'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    toastIcon: document.getElementById('toastIcon'),
    themeToggle: document.getElementById('themeToggle'),
    cronPresets: document.querySelectorAll('.cron-preset')
};

let currentResult = null;
let aspectLocked = false;
let aspectRatio = DEVICE_PRESETS.desktop.width / DEVICE_PRESETS.desktop.height;

function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    elements.toastIcon.className = type === 'success'
        ? 'fas fa-check-circle text-green-400 text-xl'
        : 'fas fa-exclamation-circle text-red-400 text-xl';
    elements.toast.classList.remove('hidden');
    setTimeout(() => elements.toast.classList.add('hidden'), 3000);
}

function showLoading(text = '正在加载页面...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

elements.deviceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.deviceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const device = btn.dataset.device;
        elements.deviceInput.value = device;

        const preset = DEVICE_PRESETS[device];
        if (!aspectLocked) {
            elements.widthInput.value = preset.width;
            elements.heightInput.value = preset.height;
            aspectRatio = preset.width / preset.height;
        }
    });
});

elements.delayInput.addEventListener('input', () => {
    elements.delayValue.textContent = elements.delayInput.value;
});

elements.qualityInput.addEventListener('input', () => {
    elements.qualityValue.textContent = elements.qualityInput.value;
});

elements.toggleAdvanced.addEventListener('click', () => {
    elements.advancedOptions.classList.toggle('hidden');
    elements.advancedIcon.style.transform = elements.advancedOptions.classList.contains('hidden')
        ? 'rotate(0deg)'
        : 'rotate(180deg)';
});

function toggleAspectLock() {
    aspectLocked = !aspectLocked;
    elements.aspectLock.innerHTML = aspectLocked
        ? '<i class="fas fa-lock"></i>'
        : '<i class="fas fa-unlock"></i>';
    elements.keepAspectRatio.checked = aspectLocked;

    if (aspectLocked && elements.widthInput.value && elements.heightInput.value) {
        aspectRatio = parseInt(elements.widthInput.value) / parseInt(elements.heightInput.value);
    }
}

elements.aspectLock.addEventListener('click', toggleAspectLock);
elements.keepAspectRatio.addEventListener('change', toggleAspectLock);

elements.widthInput.addEventListener('input', () => {
    if (aspectLocked && elements.widthInput.value) {
        const newHeight = Math.round(parseInt(elements.widthInput.value) / aspectRatio);
        elements.heightInput.value = newHeight;
    }
});

elements.heightInput.addEventListener('input', () => {
    if (aspectLocked && elements.heightInput.value) {
        const newWidth = Math.round(parseInt(elements.heightInput.value) * aspectRatio);
        elements.widthInput.value = newWidth;
    }
});

elements.screenshotForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = elements.urlInput.value.trim();
    if (!url) {
        showToast('请输入目标URL', 'error');
        return;
    }

    showLoading('正在加载页面...');

    try {
        const formData = new FormData(elements.screenshotForm);
        formData.set('base64', 'on');

        const response = await fetch('/screenshot', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            currentResult = result;
            showResult(result);
            loadHistory();
            showToast('截图成功！');
        } else {
            showToast(result.error || '截图失败', 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
});

function showResult(result) {
    if (result.base64) {
        elements.resultImage.src = result.base64;
    } else {
        elements.resultImage.src = result.download_url;
    }

    elements.downloadLink.href = result.download_url;
    elements.resultDimensions.textContent = `${result.width} × ${result.height}`;
    elements.resultFormat.textContent = result.format.toUpperCase();
    elements.resultSize.textContent = formatFileSize(result.file_size);

    if (result.ocr_text) {
        elements.ocrResult.textContent = result.ocr_text;
        elements.ocrResultContainer.classList.remove('hidden');
    } else {
        elements.ocrResultContainer.classList.add('hidden');
    }

    if (result.base64) {
        elements.base64Result.textContent = result.base64.substring(0, 200) + '...';
        elements.base64Container.classList.remove('hidden');
    } else {
        elements.base64Container.classList.add('hidden');
    }

    elements.resultModal.classList.remove('hidden');
}

elements.closeModal.addEventListener('click', () => {
    elements.resultModal.classList.add('hidden');
});

elements.modalOverlay.addEventListener('click', () => {
    elements.resultModal.classList.add('hidden');
});

elements.copyBase64.addEventListener('click', async () => {
    if (currentResult && currentResult.base64) {
        try {
            await navigator.clipboard.writeText(currentResult.base64);
            showToast('Base64已复制到剪贴板');
        } catch (error) {
            showToast('复制失败', 'error');
        }
    }
});

elements.copyOcr.addEventListener('click', async () => {
    const text = elements.ocrResult.textContent;
    if (text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('文字已复制到剪贴板');
        } catch (error) {
            showToast('复制失败', 'error');
        }
    }
});

elements.dropZone.addEventListener('click', () => elements.batchFile.click());

elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('drag-over');
});

elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('drag-over');
});

elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'text/plain') {
        handleBatchFile(files[0]);
    } else {
        showToast('请上传TXT文件', 'error');
    }
});

elements.batchFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleBatchFile(e.target.files[0]);
    }
});

function handleBatchFile(file) {
    elements.batchFileName.textContent = file.name;
    elements.batchPreview.classList.remove('hidden');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    elements.batchFile.files = dataTransfer.files;
}

elements.clearBatchFile.addEventListener('click', () => {
    elements.batchFile.value = '';
    elements.batchPreview.classList.add('hidden');
});

elements.batchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!elements.batchFile.files.length) {
        showToast('请选择URL文件', 'error');
        return;
    }

    showLoading('正在批量截图...');

    try {
        const formData = new FormData(elements.batchForm);
        const otherFormData = new FormData(elements.screenshotForm);
        for (let [key, value] of otherFormData.entries()) {
            if (key !== 'url' && key !== 'base64') {
                formData.append(key, value);
            }
        }

        const response = await fetch('/batch', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `batch_screenshots_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            loadHistory();
            showToast('批量截图完成，ZIP已开始下载');
        } else {
            const result = await response.json();
            showToast(result.error || '批量截图失败', 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
        console.error(error);
    } finally {
        hideLoading();
        elements.clearBatchFile.click();
    }
});

async function loadHistory() {
    try {
        const response = await fetch('/history');
        const history = await response.json();

        if (history.length === 0) {
            elements.historyList.innerHTML = '<p class="text-dark-500 text-sm text-center py-8">暂无历史记录</p>';
            return;
        }

        elements.historyList.innerHTML = history.map(item => `
            <div class="history-card group">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <i class="fas fa-globe text-primary-400 text-xs"></i>
                            <p class="text-sm text-dark-200 truncate">${item.params.url}</p>
                        </div>
                        <div class="flex items-center gap-3 text-xs text-dark-400">
                            <span>${item.result.width}×${item.result.height}</span>
                            <span>${item.result.format.toUpperCase()}</span>
                            <span>${formatFileSize(item.result.file_size)}</span>
                        </div>
                        <p class="text-xs text-dark-500 mt-1">${item.timestamp}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                        <button onclick="regenerateHistory('${item.id}')"
                                class="regen-btn w-8 h-8 rounded-lg bg-dark-700 hover:bg-primary-600 flex items-center justify-center transition-all"
                                title="重新生成">
                            <i class="fas fa-sync-alt text-xs"></i>
                        </button>
                        <a href="${item.result.download_url}"
                           class="regen-btn w-8 h-8 rounded-lg bg-dark-700 hover:bg-primary-600 flex items-center justify-center transition-all"
                           title="下载">
                            <i class="fas fa-download text-xs"></i>
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

window.regenerateHistory = async (id) => {
    showLoading('正在重新生成截图...');

    try {
        const response = await fetch(`/history/regen/${id}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            currentResult = result;
            showResult(result);
            loadHistory();
            showToast('截图重新生成成功！');
        } else {
            showToast(result.error || '重新生成失败', 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
};

elements.cronPresets.forEach(btn => {
    btn.addEventListener('click', () => {
        const input = elements.scheduleForm.querySelector('[name="cron_expr"]');
        input.value = btn.dataset.cron;
    });
});

elements.scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(elements.scheduleForm);
    const data = Object.fromEntries(formData.entries());

    const mainFormData = new FormData(elements.screenshotForm);
    for (let [key, value] of mainFormData.entries()) {
        if (key !== 'url' && key !== 'base64') {
            if (key === 'full_page' || key === 'dark_mode' || key === 'ocr' || key === 'keep_aspect_ratio') {
                data[key] = value === 'on';
            } else {
                data[key] = value;
            }
        }
    }

    try {
        const response = await fetch('/schedule/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast('定时任务添加成功！');
            elements.scheduleForm.reset();
            loadTasks();
        } else {
            showToast(result.error || '添加失败', 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
        console.error(error);
    }
});

elements.refreshTasks.addEventListener('click', loadTasks);

async function loadTasks() {
    try {
        const response = await fetch('/schedule/list');
        const tasks = await response.json();

        if (tasks.length === 0) {
            elements.taskList.innerHTML = '<p class="text-dark-500 text-sm text-center py-4">暂无定时任务</p>';
            return;
        }

        elements.taskList.innerHTML = tasks.map(task => `
            <div class="task-item">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <code class="text-xs bg-dark-800 px-2 py-0.5 rounded text-primary-400">${task.cron_expr}</code>
                    </div>
                    <p class="text-sm text-dark-300 truncate">${task.url}</p>
                    <p class="text-xs text-dark-500">${task.email || '无邮箱通知'}</p>
                    <p class="text-xs text-dark-500 mt-1">创建于 ${task.created_at}</p>
                </div>
                <button onclick="deleteTask('${task.id}')"
                        class="w-8 h-8 rounded-lg bg-dark-700 hover:bg-red-600 flex items-center justify-center transition-all ml-3">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

window.deleteTask = async (id) => {
    try {
        const response = await fetch(`/schedule/delete/${id}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showToast('任务已删除');
            loadTasks();
        } else {
            showToast(result.error || '删除失败', 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
        console.error(error);
    }
};

elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const icon = elements.themeToggle.querySelector('i');
    if (document.body.classList.contains('light-theme')) {
        icon.className = 'fas fa-sun text-dark-300';
    } else {
        icon.className = 'fas fa-moon text-dark-300';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!elements.resultModal.classList.contains('hidden')) {
            elements.resultModal.classList.add('hidden');
        }
    }
});

loadHistory();
loadTasks();
