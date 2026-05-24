document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const folderDropArea = document.getElementById('folder-drop-area');
    const folderInput = document.getElementById('folder-input');
    const fileInfo = document.getElementById('file-info');
    const folderInfo = document.getElementById('folder-info');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadProgress = document.getElementById('upload-progress');
    const resultArea = document.getElementById('result-area');
    const removeFileBtn = document.getElementById('remove-file');
    const removeFolderBtn = document.getElementById('remove-folder');
    const chunkInfo = document.getElementById('chunk-info');
    const folderTree = document.getElementById('folder-tree');
    const treeContent = document.getElementById('tree-content');
    
    let selectedFile = null;
    let selectedFolder = null;
    let folderFileList = null;
    let currentTab = 'single';
    let uploadId = null;
    let isPaused = false;
    let isCancelled = false;
    let xhr = null;
    let uploadStartTime = 0;
    
    function setupDragDrop(area, input, type) {
        area.addEventListener('click', () => input.click());
        
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            area.classList.add('drag-over');
        });
        
        area.addEventListener('dragleave', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
        });
        
        area.addEventListener('drop', async (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            
            if (type === 'single') {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFileSelect(files[0]);
                }
            } else {
                await handleFolderDrop(e.dataTransfer);
            }
        });
        
        input.addEventListener('change', (e) => {
            if (type === 'single') {
                if (e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                }
            } else {
                if (e.target.files.length > 0) {
                    handleFolderSelect(e.target.files);
                }
            }
        });
    }
    
    async function handleFolderDrop(dataTransfer) {
        const items = dataTransfer.items;
        if (items && items.length > 0 && items[0].webkitGetAsEntry) {
            const entry = items[0].webkitGetAsEntry();
            if (entry && entry.isDirectory) {
                const files = [];
                const structure = {};
                
                await traverseFileTree(entry, '', files, structure);
                
                folderFileList = files;
                const folderName = entry.name;
                displayFolderInfo(files, folderName, structure);
                return;
            }
        }
        
        const files = dataTransfer.files;
        if (files.length > 0) {
            handleFolderSelect(files);
        }
    }
    
    function traverseFileTree(item, path, files, structure) {
        return new Promise((resolve) => {
            if (item.isFile) {
                item.file((file) => {
                    const relativePath = path + item.name;
                    Object.defineProperty(file, 'webkitRelativePath', {
                        value: relativePath,
                        writable: false
                    });
                    files.push(file);
                    
                    const parts = path.split('/').filter(p => p);
                    let current = structure;
                    parts.forEach(p => {
                        if (!current[p]) current[p] = {};
                        current = current[p];
                    });
                    current[item.name] = 'file';
                    
                    resolve();
                });
            } else if (item.isDirectory) {
                const dirReader = item.createReader();
                const parts = path.split('/').filter(p => p);
                let current = structure;
                parts.forEach(p => {
                    if (!current[p]) current[p] = {};
                    current = current[p];
                });
                current[item.name] = {};
                
                dirReader.readEntries(async (entries) => {
                    for (let i = 0; i < entries.length; i++) {
                        await traverseFileTree(entries[i], path + item.name + '/', files, current[item.name]);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
    
    function handleFileSelect(file) {
        selectedFile = file;
        document.getElementById('selected-filename').textContent = file.name;
        document.getElementById('selected-size').textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';
        folderInfo.style.display = 'none';
        uploadBtn.disabled = false;
        currentTab = 'single';
        
        const folderNameInput = document.getElementById('folder-name-input');
        if (folderNameInput) {
            folderNameInput.style.display = 'none';
        }
    }
    
    function handleFolderSelect(files) {
        selectedFolder = files;
        folderFileList = files;
        
        const folderName = files[0].webkitRelativePath 
            ? files[0].webkitRelativePath.split('/')[0] 
            : 'folder';
        
        const structure = {};
        for (let file of files) {
            const path = file.webkitRelativePath || file.name;
            const parts = path.split('/');
            let current = structure;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) current[parts[i]] = {};
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = 'file';
        }
        
        displayFolderInfo(Array.from(files), folderName, structure);
    }
    
    function displayFolderInfo(files, folderName, structure) {
        selectedFolder = files;
        folderFileList = files;
        
        let totalSize = 0;
        for (let file of files) {
            totalSize += file.size;
        }
        
        document.getElementById('folder-name').textContent = `📂 ${folderName}`;
        document.getElementById('folder-count').textContent = `${files.length} 个文件`;
        document.getElementById('folder-total-size').textContent = formatFileSize(totalSize);
        
        const folderNameInput = document.getElementById('folder-name-input');
        if (folderNameInput && !folderNameInput.value) {
            folderNameInput.value = folderName;
        }
        if (folderNameInput) {
            folderNameInput.style.display = 'block';
        }
        
        folderInfo.style.display = 'block';
        fileInfo.style.display = 'none';
        uploadBtn.disabled = false;
        currentTab = 'folder';
        
        renderTree(structure, treeContent);
        folderTree.style.display = 'block';
    }
    
    function renderTree(structure, container, level = 0) {
        container.innerHTML = '';
        const entries = Object.entries(structure);
        
        entries.forEach(([name, value], index) => {
            const isLast = index === entries.length - 1;
            const prefix = level > 0 ? '│  '.repeat(level - 1) + (isLast ? '└── ' : '├── ') : '';
            
            const line = document.createElement('div');
            line.style.whiteSpace = 'pre';
            
            if (value === 'file') {
                line.innerHTML = `${prefix}📄 ${name}`;
            } else {
                line.innerHTML = `${prefix}📁 ${name}/`;
            }
            
            container.appendChild(line);
            
            if (value !== 'file') {
                const subContainer = document.createElement('div');
                renderTree(value, subContainer, level + 1);
                container.appendChild(subContainer);
            }
        });
    }
    
    function clearSelection() {
        selectedFile = null;
        selectedFolder = null;
        folderFileList = null;
        fileInput.value = '';
        folderInput.value = '';
        fileInfo.style.display = 'none';
        folderInfo.style.display = 'none';
        folderTree.style.display = 'none';
        uploadBtn.disabled = true;
        uploadProgress.style.display = 'none';
        resultArea.style.display = 'none';
        chunkInfo.style.display = 'none';
        isPaused = false;
        isCancelled = false;
    }
    
    removeFileBtn.addEventListener('click', clearSelection);
    removeFolderBtn.addEventListener('click', clearSelection);
    
    uploadBtn.addEventListener('click', startUpload);
    
    async function startUpload() {
        if (isPaused) {
            isPaused = false;
            return;
        }
        
        uploadBtn.disabled = true;
        uploadProgress.style.display = 'block';
        resultArea.style.display = 'none';
        chunkInfo.style.display = 'none';
        isCancelled = false;
        isPaused = false;
        uploadStartTime = Date.now();
        
        updatePauseResumeButtons(false);
        
        const description = document.getElementById('description').value;
        const tags = document.getElementById('tags').value;
        const expiration = document.getElementById('expiration').value;
        const maxDownloads = document.getElementById('max-downloads').value;
        
        if (currentTab === 'single') {
            if (selectedFile.size > 50 * 1024 * 1024) {
                chunkInfo.style.display = 'block';
                await startChunkUpload(selectedFile, description, tags, expiration, maxDownloads);
            } else {
                await startSimpleUpload(selectedFile, description, tags, expiration, maxDownloads);
            }
        } else {
            await startFolderUpload(folderFileList, description, tags, expiration, maxDownloads);
        }
    }
    
    function updatePauseResumeButtons(paused) {
        const pauseBtn = document.getElementById('pause-btn');
        const resumeBtn = document.getElementById('resume-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        if (paused) {
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline-block';
        } else {
            pauseBtn.style.display = 'inline-block';
            resumeBtn.style.display = 'none';
        }
        cancelBtn.style.display = 'inline-block';
    }
    
    async function startSimpleUpload(file, description, tags, expiration, maxDownloads) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', description);
        formData.append('tags', tags);
        formData.append('expiration', expiration);
        if (maxDownloads) formData.append('max_downloads', maxDownloads);
        
        xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);
        
        const startTime = Date.now();
        
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && !isCancelled) {
                const percent = Math.round((e.loaded / e.total) * 100);
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = elapsed > 0 ? e.loaded / elapsed : 0;
                updateProgress(percent, speed, e.loaded, e.total);
            }
        };
        
        xhr.onload = () => {
            if (isCancelled) return;
            
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                showResult(data);
            } else {
                const data = JSON.parse(xhr.responseText);
                alert('上传失败: ' + (data.error || '未知错误'));
                resetUploadState();
            }
        };
        
        xhr.onerror = () => {
            if (isCancelled) return;
            alert('上传失败，请检查网络连接');
            resetUploadState();
        };
        
        xhr.onabort = () => {
            if (!isCancelled && !isPaused) {
                resetUploadState();
            }
        };
        
        xhr.send(formData);
    }
    
    async function startChunkUpload(file, description, tags, expiration, maxDownloads) {
        const chunkSize = 5 * 1024 * 1024;
        const totalChunks = Math.ceil(file.size / chunkSize);
        
        updateChunkStatus(`正在初始化上传... (共 ${totalChunks} 个分片)`);
        
        try {
            const initResponse = await fetch('/upload/chunk/init', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    filename: file.name,
                    total_size: file.size,
                    total_chunks: totalChunks
                })
            });
            
            if (!initResponse.ok) throw new Error('初始化上传失败');
            
            const initData = await initResponse.json();
            uploadId = initData.upload_id;
            
            updateChunkStatus(`正在检查已上传的分片...`);
            
            const resumeResponse = await fetch('/upload/chunk/resume', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({upload_id: uploadId})
            });
            
            const resumeData = await resumeResponse.json();
            const uploadedChunks = resumeData.uploaded_chunks || [];
            
            if (uploadedChunks.length > 0) {
                updateChunkStatus(`已上传 ${uploadedChunks.length}/${totalChunks} 个分片，将继续上传剩余部分`);
            }
            
            let uploadedBytes = uploadedChunks.length * chunkSize;
            const startTime = Date.now();
            
            for (let i = 0; i < totalChunks; i++) {
                if (isCancelled) {
                    resetUploadState();
                    return;
                }
                
                while (isPaused) {
                    await waitForResume();
                    if (isCancelled) {
                        resetUploadState();
                        return;
                    }
                }
                
                if (uploadedChunks.includes(i)) {
                    uploadedBytes = Math.min((i + 1) * chunkSize, file.size);
                    const percent = Math.round((uploadedBytes / file.size) * 100);
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
                    updateProgress(percent, speed, uploadedBytes, file.size);
                    updateChunkStatus(`分片 ${i + 1}/${totalChunks} 已存在，跳过`);
                    continue;
                }
                
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const chunk = file.slice(start, end);
                
                updateChunkStatus(`正在上传分片 ${i + 1}/${totalChunks}...`);
                
                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('upload_id', uploadId);
                formData.append('chunk_index', i);
                formData.append('total_chunks', totalChunks);
                formData.append('filename', file.name);
                
                const success = await uploadChunk(formData);
                if (!success) {
                    if (isCancelled) {
                        resetUploadState();
                        return;
                    }
                    alert(`分片 ${i + 1} 上传失败，请重试`);
                    resetUploadState();
                    return;
                }
                
                uploadedBytes = end;
                const percent = Math.round((uploadedBytes / file.size) * 100);
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
                updateProgress(percent, speed, uploadedBytes, file.size);
            }
            
            updateChunkStatus(`正在合并分片...`);
            
            const completeResponse = await fetch('/upload/chunk/complete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    upload_id: uploadId,
                    description,
                    tags,
                    expiration,
                    max_downloads: maxDownloads || null
                })
            });
            
            const data = await completeResponse.json();
            if (data.success) {
                showResult(data);
            } else {
                alert('上传完成处理失败: ' + (data.error || '未知错误'));
                resetUploadState();
            }
            
        } catch (e) {
            console.error(e);
            if (isCancelled) {
                resetUploadState();
                return;
            }
            alert('上传失败: ' + e.message);
            resetUploadState();
        }
    }
    
    function uploadChunk(formData) {
        return new Promise((resolve) => {
            xhr = new XMLHttpRequest();
            xhr.open('POST', '/upload/chunk', true);
            
            xhr.onload = () => {
                if (xhr.status === 200 && !isCancelled) {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data.success);
                } else {
                    resolve(false);
                }
            };
            
            xhr.onerror = () => resolve(false);
            xhr.onabort = () => resolve(false);
            
            xhr.send(formData);
        });
    }
    
    async function startFolderUpload(files, description, tags, expiration, maxDownloads) {
        const folderName = document.getElementById('folder-name-input').value || 'folder';
        
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const relativePath = file.webkitRelativePath || file.name;
            formData.append('files', file, relativePath);
        }
        formData.append('folder_name', folderName);
        formData.append('description', description);
        formData.append('tags', tags);
        formData.append('expiration', expiration);
        if (maxDownloads) formData.append('max_downloads', maxDownloads);
        
        xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload/folder', true);
        
        const startTime = Date.now();
        
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && !isCancelled) {
                const percent = Math.round((e.loaded / e.total) * 100);
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = elapsed > 0 ? e.loaded / elapsed : 0;
                updateProgress(percent, speed, e.loaded, e.total);
            }
        };
        
        xhr.onload = () => {
            if (isCancelled) return;
            
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                showResult(data);
            } else {
                const data = JSON.parse(xhr.responseText);
                alert('上传失败: ' + (data.error || '未知错误'));
                resetUploadState();
            }
        };
        
        xhr.onerror = () => {
            if (isCancelled) return;
            alert('上传失败，请检查网络连接');
            resetUploadState();
        };
        
        xhr.send(formData);
    }
    
    function updateProgress(percent, speed = 0, loaded = 0, total = 0) {
        document.getElementById('progress-fill').style.width = percent + '%';
        document.getElementById('progress-percent').textContent = percent + '%';
        
        if (speed > 0) {
            document.getElementById('progress-speed').textContent = formatFileSize(speed) + '/s';
        }
        
        if (speed > 0 && total > 0 && loaded > 0) {
            const remaining = ((total - loaded) / speed);
            document.getElementById('progress-remaining').textContent = `剩余: ${formatTime(remaining)}`;
        }
    }
    
    function formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)}秒`;
        } else if (seconds < 3600) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.round(seconds % 60);
            return `${mins}分${secs}秒`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hours}小时${mins}分`;
        }
    }
    
    function updateChunkStatus(status) {
        document.getElementById('chunk-status').textContent = status;
    }
    
    function showResult(data) {
        uploadProgress.style.display = 'none';
        chunkInfo.style.display = 'none';
        resultArea.style.display = 'block';
        
        document.getElementById('result-url').value = data.download_url;
        document.getElementById('result-code').value = data.extract_code;
        document.getElementById('result-admin').value = data.admin_key;
        
        if (data.preview_url) {
            document.getElementById('preview-link').href = data.preview_url;
            document.getElementById('preview-link').style.display = 'inline-flex';
        } else {
            document.getElementById('preview-link').style.display = 'none';
        }
        
        document.getElementById('manage-link').href = '/manage?admin_key=' + data.admin_key;
        
        clearSelection();
        uploadBtn.disabled = true;
    }
    
    function resetUploadState() {
        uploadBtn.disabled = false;
        uploadProgress.style.display = 'none';
        chunkInfo.style.display = 'none';
        isPaused = false;
        isCancelled = false;
        updateProgress(0);
    }
    
    function waitForResume() {
        return new Promise((resolve) => {
            const checkResume = setInterval(() => {
                if (!isPaused || isCancelled) {
                    clearInterval(checkResume);
                    resolve();
                }
            }, 100);
        });
    }
    
    document.getElementById('pause-btn').addEventListener('click', () => {
        isPaused = true;
        updatePauseResumeButtons(true);
        if (xhr) xhr.abort();
    });
    
    document.getElementById('resume-btn').addEventListener('click', () => {
        isPaused = false;
        updatePauseResumeButtons(false);
        if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
            startUpload();
        }
    });
    
    document.getElementById('cancel-btn').addEventListener('click', () => {
        if (confirm('确定要取消上传吗？')) {
            isCancelled = true;
            if (xhr) xhr.abort();
            resetUploadState();
            clearSelection();
        }
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(tab + '-tab').classList.add('active');
            
            const folderNameInput = document.getElementById('folder-name-input');
            if (folderNameInput) {
                folderNameInput.style.display = tab === 'folder' ? 'block' : 'none';
            }
            
            currentTab = tab;
            clearSelection();
        });
    });
    
    setupDragDrop(dropArea, fileInput, 'single');
    setupDragDrop(folderDropArea, folderInput, 'folder');
});
