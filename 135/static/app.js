const CHUNK_SIZE = 5 * 1024 * 1024;

let uploadQueue = [];
let uploadedResults = [];
let currentBatchId = null;

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
        'pdf': '📄',
        'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
        'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'flac': '🎵',
        'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬', 'webm': '🎬',
        'doc': '📝', 'docx': '📝',
        'xls': '📊', 'xlsx': '📊',
        'ppt': '📽️', 'pptx': '📽️',
        'txt': '📃', 'md': '📃', 'csv': '📃', 'json': '📃', 'xml': '📃', 'html': '📃', 'css': '📃', 'js': '📃', 'py': '📃'
    };
    return icons[ext] || '📁';
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.select();
        document.execCommand('copy');
        showToast('已复制到剪贴板');
    }
}

function createFileItem(file, fileId) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.id = `file-${fileId}`;
    div.innerHTML = `
        <div class="file-item-icon">${getFileIcon(file.name)}</div>
        <div class="file-item-info">
            <div class="file-item-name">${file.name}</div>
            <div class="file-item-size">${formatFileSize(file.size)}</div>
        </div>
        <div class="file-item-status">
            <span class="status-pending" id="status-${fileId}">等待上传</span>
            <div class="progress-bar" id="progress-bar-${fileId}" style="display: none;">
                <div class="progress-fill" id="progress-fill-${fileId}" style="width: 0%"></div>
            </div>
            <div class="progress-text" id="progress-text-${fileId}" style="display: none;"></div>
        </div>
        <button class="file-item-remove" onclick="removeFile('${fileId}')" id="remove-${fileId}">移除</button>
    `;
    return div;
}

function removeFile(fileId) {
    const index = uploadQueue.findIndex(item => item.fileId === fileId);
    if (index !== -1) {
        uploadQueue.splice(index, 1);
    }
    const element = document.getElementById(`file-${fileId}`);
    if (element) {
        element.remove();
    }
    updateBatchActions();
}

function updateBatchActions() {
    const batchActions = document.getElementById('batchActions');
    if (uploadedResults.length >= 2) {
        batchActions.style.display = 'flex';
    } else {
        batchActions.style.display = 'none';
    }
}

async function uploadChunks(file, fileId) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const statusEl = document.getElementById(`status-${fileId}`);
    const progressBar = document.getElementById(`progress-bar-${fileId}`);
    const progressFill = document.getElementById(`progress-fill-${fileId}`);
    const progressText = document.getElementById(`progress-text-${fileId}`);
    const removeBtn = document.getElementById(`remove-${fileId}`);

    statusEl.textContent = '检查已上传分片...';
    statusEl.className = 'status-uploading';
    progressBar.style.display = 'block';
    progressText.style.display = 'block';
    removeBtn.style.display = 'none';

    let uploadedChunks = [];
    try {
        const response = await fetch(`/api/check-chunks/${fileId}`);
        const data = await response.json();
        uploadedChunks = data.chunks || [];
    } catch (e) {
        uploadedChunks = [];
    }

    const expiry = document.getElementById('expirySelect').value;
    const maxDownloads = document.getElementById('maxDownloads').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;

    for (let i = 0; i < totalChunks; i++) {
        if (uploadedChunks.includes(i)) {
            const percent = Math.round(((i + 1) / totalChunks) * 100);
            progressFill.style.width = percent + '%';
            progressText.textContent = `${percent}% (${i + 1}/${totalChunks})`;
            continue;
        }

        const chunk = file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size));
        const formData = new FormData();
        formData.append('file_id', fileId);
        formData.append('chunk_index', i);
        formData.append('total_chunks', totalChunks);
        formData.append('filename', file.name);
        formData.append('chunk', chunk);

        try {
            const response = await fetch('/api/upload/chunk', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '上传失败');
            }
            const percent = Math.round(((i + 1) / totalChunks) * 100);
            progressFill.style.width = percent + '%';
            progressText.textContent = `${percent}% (${i + 1}/${totalChunks})`;
        } catch (e) {
            statusEl.textContent = '上传失败: ' + e.message;
            statusEl.className = 'status-error';
            progressBar.style.display = 'none';
            progressText.style.display = 'none';
            removeBtn.style.display = 'block';
            throw e;
        }
    }

    statusEl.textContent = '完成上传...';

    const completeData = {
        file_id: fileId,
        filename: file.name,
        file_size: file.size,
        content_type: file.type,
        expiry: expiry,
        max_downloads: maxDownloads || null,
        password: password || null,
        email: email || null,
        batch_id: currentBatchId
    };

    const completeResponse = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeData)
    });

    const result = await completeResponse.json();
    if (result.success) {
        statusEl.textContent = '上传成功';
        statusEl.className = 'status-success';
        progressBar.style.display = 'none';
        progressText.style.display = 'none';
        return result;
    } else {
        statusEl.textContent = '上传失败: ' + result.error;
        statusEl.className = 'status-error';
        progressBar.style.display = 'none';
        progressText.style.display = 'none';
        removeBtn.style.display = 'block';
        throw new Error(result.error);
    }
}

function addResultCard(result) {
    const resultArea = document.getElementById('resultArea');
    const resultId = `result-${result.short_code}`;

    const div = document.createElement('div');
    div.className = 'result-card';
    div.id = resultId;
    div.innerHTML = `
        <h4>✅ ${result.filename}</h4>
        <p style="color: #666; margin-bottom: 15px;">${result.formatted_size}</p>
        <div class="link-item">
            <label>下载链接</label>
            <div class="link-input-group">
                <input type="text" value="${result.download_url}" readonly id="link-${result.short_code}">
                <button class="btn btn-small" onclick="copyToClipboard('link-${result.short_code}')">复制</button>
            </div>
        </div>
        <div class="link-item" style="margin-top: 10px;">
            <label>删除链接</label>
            <div class="link-input-group">
                <input type="text" value="${result.delete_url}" readonly id="delete-${result.short_code}">
                <button class="btn btn-small" onclick="copyToClipboard('delete-${result.short_code}')">复制</button>
            </div>
        </div>
        <div class="link-item" style="margin-top: 10px;">
            <label>管理密钥</label>
            <div class="link-input-group">
                <input type="text" value="${result.manage_key}" readonly id="manage-${result.short_code}">
                <button class="btn btn-small" onclick="copyToClipboard('manage-${result.short_code}')">复制</button>
            </div>
        </div>
    `;

    resultArea.appendChild(div);
    resultArea.style.display = 'block';
}

async function processQueue() {
    for (const item of uploadQueue) {
        if (item.status === 'completed' || item.status === 'error') continue;
        try {
            item.status = 'uploading';
            const result = await uploadChunks(item.file, item.fileId);
            item.status = 'completed';
            item.result = result;
            uploadedResults.push(result);
            addResultCard(result);
            updateBatchActions();
        } catch (e) {
            item.status = 'error';
            console.error('Upload error:', e);
        }
    }
}

function handleFiles(files) {
    if (!files || files.length === 0) return;

    if (!currentBatchId) {
        currentBatchId = generateId();
    }

    const fileList = document.getElementById('fileList');

    for (const file of files) {
        const fileId = generateId();
        const fileItem = createFileItem(file, fileId);
        fileList.appendChild(fileItem);

        uploadQueue.push({
            file: file,
            fileId: fileId,
            status: 'pending'
        });
    }

    processQueue();
}

async function createBatchShare() {
    if (uploadedResults.length < 2) {
        showToast('至少需要2个文件才能创建批量分享');
        return;
    }

    const expiry = document.getElementById('expirySelect').value;
    const email = document.getElementById('email').value;

    const data = {
        batch_id: currentBatchId,
        short_codes: uploadedResults.map(r => r.short_code),
        expiry: expiry,
        email: email || null
    };

    try {
        const response = await fetch('/api/upload/batch/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            const resultArea = document.getElementById('resultArea');
            const div = document.createElement('div');
            div.className = 'result-card';
            div.style.background = '#e8f4fd';
            div.style.borderLeftColor = '#3498db';
            div.innerHTML = `
                <h4 style="color: #3498db;">📦 批量分享已创建</h4>
                <p style="color: #666; margin-bottom: 15px;">共 ${uploadedResults.length} 个文件</p>
                <div class="link-item">
                    <label>分享页面链接</label>
                    <div class="link-input-group">
                        <input type="text" value="${result.share_url}" readonly id="batch-link">
                        <button class="btn btn-small" onclick="copyToClipboard('batch-link')">复制</button>
                    </div>
                </div>
                <div class="link-item" style="margin-top: 10px;">
                    <label>管理密钥</label>
                    <div class="link-input-group">
                        <input type="text" value="${result.manage_key}" readonly id="batch-manage">
                        <button class="btn btn-small" onclick="copyToClipboard('batch-manage')">复制</button>
                    </div>
                </div>
            `;
            resultArea.appendChild(div);

            showToast('批量分享创建成功');
        } else {
            showToast(result.error || '创建失败');
        }
    } catch (e) {
        showToast('创建失败: ' + e.message);
    }
}

function clearAllFiles() {
    if (!confirm('确定要清空所有上传的文件吗？')) return;
    uploadQueue = [];
    uploadedResults = [];
    currentBatchId = null;
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('resultArea').innerHTML = '';
    document.getElementById('resultArea').style.display = 'none';
    updateBatchActions();
}

document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const createBatchBtn = document.getElementById('createBatchBtn');
    const clearFilesBtn = document.getElementById('clearFilesBtn');

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
            fileInput.value = '';
        });

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
            handleFiles(e.dataTransfer.files);
        });
    }

    if (createBatchBtn) {
        createBatchBtn.addEventListener('click', createBatchShare);
    }

    if (clearFilesBtn) {
        clearFilesBtn.addEventListener('click', clearAllFiles);
    }

    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const links = document.querySelectorAll('.batch-file-item .file-actions a.btn-primary');
            links.forEach((link, index) => {
                setTimeout(() => {
                    window.open(link.href, '_blank');
                }, index * 500);
            });
        });
    }
});
