document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tab).classList.add('active');
        });
    });

    const hashForm = document.getElementById('hash-form');
    if (hashForm) {
        hashForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('hash-file');
            const progressBar = document.getElementById('hash-progress');
            const progressFill = progressBar.querySelector('.progress-fill');
            const progressText = progressBar.querySelector('.progress-text');
            const resultBox = document.getElementById('hash-result');
            
            if (!fileInput.files[0]) {
                alert('请选择文件');
                return;
            }

            progressBar.style.display = 'block';
            progressFill.style.width = '0%';
            progressText.textContent = '0%';
            resultBox.innerHTML = '<p>正在计算哈希值...</p>';

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            const algos = document.querySelectorAll('input[name="algorithms"]:checked');
            algos.forEach(algo => {
                formData.append('algorithms', algo.value);
            });

            try {
                const initResponse = await fetch('/upload/async', {
                    method: 'POST',
                    body: formData
                });
                
                const initData = await initResponse.json();
                
                if (initData.error) {
                    resultBox.innerHTML = `<div class="error">${initData.error}</div>`;
                    progressBar.style.display = 'none';
                    return;
                }

                const taskId = initData.task_id;
                const eventSource = new EventSource(`/progress/stream/${taskId}`);
                
                eventSource.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    
                    if (data.progress !== undefined) {
                        progressFill.style.width = data.progress + '%';
                        progressText.textContent = data.progress + '%';
                    }
                    
                    if (data.status === 'completed' && data.result) {
                        eventSource.close();
                        
                        if (data.result.success) {
                            let html = `<h3>文件: ${data.result.filename}</h3>`;
                            for (const [algo, hash] of Object.entries(data.result.hashes)) {
                                html += `<div class="hash-item">
                                    <h4>${algo.toUpperCase()}</h4>
                                    <div class="hash-value">${hash}</div>
                                </div>`;
                            }
                            resultBox.innerHTML = html;
                        } else {
                            resultBox.innerHTML = `<div class="error">${data.result.error || '计算失败'}</div>`;
                        }
                        progressBar.style.display = 'none';
                    } else if (data.status === 'error') {
                        eventSource.close();
                        resultBox.innerHTML = `<div class="error">${data.result?.error || '计算失败'}</div>`;
                        progressBar.style.display = 'none';
                    }
                };
                
                eventSource.onerror = function() {
                    eventSource.close();
                    resultBox.innerHTML = '<div class="error">连接中断，请重试</div>';
                    progressBar.style.display = 'none';
                };
                
            } catch (error) {
                resultBox.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
                progressBar.style.display = 'none';
            }
        });
    }

    const verifyForm = document.getElementById('verify-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('verify-file');
            const expectedHash = document.getElementById('expected-hash').value;
            const resultBox = document.getElementById('verify-result');
            
            if (!fileInput.files[0] || !expectedHash) {
                alert('请填写完整信息');
                return;
            }

            resultBox.innerHTML = '<p>正在校验...</p>';

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('expected_hash', expectedHash);

            try {
                const response = await fetch('/verify', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.error) {
                    resultBox.innerHTML = `<div class="error">${data.error}</div>`;
                } else if (!data.success) {
                    resultBox.innerHTML = `<div class="error">${data.error}</div>`;
                } else {
                    const statusClass = data.match ? 'status-pass' : 'status-fail';
                    const statusText = data.match ? '✓ 校验通过' : '✗ 校验失败';
                    
                    resultBox.innerHTML = `
                        <h3>文件: ${data.filename}</h3>
                        <p class="${statusClass}">${statusText}</p>
                        <div class="hash-item">
                            <h4>算法: ${data.algorithm}</h4>
                        </div>
                        <div class="hash-item">
                            <h4>预期哈希</h4>
                            <div class="hash-value">${data.expected_hash}</div>
                        </div>
                        <div class="hash-item">
                            <h4>实际哈希</h4>
                            <div class="hash-value">${data.actual_hash}</div>
                        </div>
                        <button class="btn btn-secondary" onclick="generateVerifyReport()">生成报告</button>
                        <button class="btn btn-secondary" onclick="exportVerifyCSV()">导出CSV</button>
                    `;
                    
                    window.lastVerifyResult = data;
                }
            } catch (error) {
                resultBox.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
            }
        });
    }

    const urlForm = document.getElementById('url-form');
    if (urlForm) {
        urlForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fileUrl = document.getElementById('file-url').value;
            const resultBox = document.getElementById('url-result');
            
            if (!fileUrl) {
                alert('请输入文件URL');
                return;
            }

            resultBox.innerHTML = '<p>正在下载并计算...</p>';

            const algos = Array.from(document.querySelectorAll('input[name="url_algorithms"]:checked')).map(cb => cb.value);

            try {
                const response = await fetch('/api/url-hash', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: fileUrl, algorithms: algos })
                });
                
                const data = await response.json();
                
                if (data.error) {
                    resultBox.innerHTML = `<div class="error">${data.error}</div>`;
                } else {
                    let html = `<h3>URL: ${data.url}</h3>`;
                    for (const [algo, hash] of Object.entries(data.hashes)) {
                        html += `<div class="hash-item">
                            <h4>${algo.toUpperCase()}</h4>
                            <div class="hash-value">${hash}</div>
                        </div>`;
                    }
                    resultBox.innerHTML = html;
                }
            } catch (error) {
                resultBox.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
            }
        });
    }

    const batchForm = document.getElementById('batch-form');
    if (batchForm) {
        batchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('batch-file');
            const resultBox = document.getElementById('batch-result');
            
            if (!fileInput.files[0]) {
                alert('请选择文件列表');
                return;
            }

            resultBox.innerHTML = `
                <p>正在批量计算...</p>
                <div class="progress-bar" style="display:block;">
                    <div class="progress-fill" id="batch-progress-fill" style="width: 0%"></div>
                    <span class="progress-text" id="batch-progress-text">0%</span>
                </div>
            `;

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            const algos = document.querySelectorAll('input[name="batch_algorithms"]:checked');
            algos.forEach(algo => {
                formData.append('algorithms', algo.value);
            });

            try {
                const initResponse = await fetch('/api/batch-hash', {
                    method: 'POST',
                    body: formData
                });
                
                const initData = await initResponse.json();
                
                if (initData.error) {
                    resultBox.innerHTML = `<div class="error">${initData.error}</div>`;
                    return;
                }

                const taskId = initData.task_id;
                const eventSource = new EventSource(`/progress/stream/${taskId}`);
                
                eventSource.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    
                    const progressFill = document.getElementById('batch-progress-fill');
                    const progressText = document.getElementById('batch-progress-text');
                    
                    if (data.progress !== undefined && progressFill) {
                        progressFill.style.width = data.progress + '%';
                        progressText.textContent = data.progress + '%';
                    }
                    
                    if (data.status === 'completed' && data.result) {
                        eventSource.close();
                        
                        if (data.result.success) {
                            window.lastBatchResults = data.result.results;
                            
                            let html = `<h3>批量计算结果 (共 ${data.result.results.length} 个文件)</h3>`;
                            html += '<table class="result-table"><thead><tr><th>文件名</th><th>状态</th>';
                            
                            if (data.result.results.length > 0 && data.result.results[0].hashes) {
                                for (const algo of Object.keys(data.result.results[0].hashes)) {
                                    html += `<th>${algo.toUpperCase()}</th>`;
                                }
                            }
                            
                            html += '</tr></thead><tbody>';
                            
                            for (const result of data.result.results) {
                                html += `<tr><td>${result.filename}</td><td>${result.status}</td>`;
                                if (result.hashes) {
                                    for (const hash of Object.values(result.hashes)) {
                                        html += `<td class="hash">${hash}</td>`;
                                    }
                                }
                                html += '</tr>';
                            }
                            
                            html += '</tbody></table>';
                            html += `<button class="btn btn-secondary" onclick="exportBatchCSV()">导出CSV</button>`;
                            resultBox.innerHTML = html;
                        } else {
                            resultBox.innerHTML = `<div class="error">${data.result.error || '计算失败'}</div>`;
                        }
                    } else if (data.status === 'error') {
                        eventSource.close();
                        resultBox.innerHTML = `<div class="error">${data.result?.error || '计算失败'}</div>`;
                    }
                };
                
                eventSource.onerror = function() {
                    eventSource.close();
                    resultBox.innerHTML = '<div class="error">连接中断，请重试</div>';
                };
                
            } catch (error) {
                resultBox.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
            }
        });
    }

    const manifestForm = document.getElementById('manifest-form');
    if (manifestForm) {
        manifestForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const pathsText = document.getElementById('manifest-paths').value;
            const algorithm = document.getElementById('manifest-algo').value;
            const resultBox = document.getElementById('manifest-result');
            
            if (!pathsText.trim()) {
                alert('请输入文件路径');
                return;
            }

            resultBox.innerHTML = '<p>正在生成清单...</p>';

            const filePaths = pathsText.split('\n').map(p => p.trim()).filter(p => p);

            try {
                const response = await fetch('/api/generate-manifest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file_paths: filePaths, algorithm: algorithm })
                });
                
                const data = await response.json();
                
                if (data.error) {
                    resultBox.innerHTML = `<div class="error">${data.error}</div>`;
                } else {
                    resultBox.innerHTML = `
                        <h3>哈希清单 (${algorithm.toUpperCase()})</h3>
                        <div class="manifest-content">${data.content}</div>
                        <a href="/download/manifest/${data.manifest_id}" class="download-btn">下载清单文件</a>
                    `;
                }
            } catch (error) {
                resultBox.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
            }
        });
    }

    const verifyFolderForm = document.getElementById('verify-folder-form');
    if (verifyFolderForm) {
        verifyFolderForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const manifestInput = document.getElementById('folder-manifest');
            const folderPath = document.getElementById('folder-path').value;
            const resultBox = document.getElementById('folder-result');
            
            if (!manifestInput.files[0] || !folderPath) {
                alert('请填写完整信息');
                return;
            }

            resultBox.innerHTML = '<p>正在批量校验...</p>';

            const formData = new FormData();
            formData.append('manifest', manifestInput.files[0]);
            formData.append('folder_path', folderPath);

            try {
                const response = await fetch('/api/verify-folder', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.error) {
                    resultBox.innerHTML = `<div class="error">${data.error}</div>`;
                } else {
                    window.lastFolderResults = data.results;
                    
                    let html = `<h3>批量校验结果 (共 ${data.results.length} 个文件)</h3>`;
                    html += '<table class="result-table"><thead><tr><th>文件名</th><th>预期哈希</th><th>实际哈希</th><th>状态</th></tr></thead><tbody>';
                    
                    for (const result of data.results) {
                        const statusClass = result.status === '通过' ? 'status-pass' : 'status-fail';
                        html += `<tr>
                            <td>${result.filename}</td>
                            <td class="hash">${result.expected_hash}</td>
                            <td class="hash">${result.actual_hash}</td>
                            <td class="${statusClass}">${result.status}</td>
                        </tr>`;
                    }
                    
                    html += '</tbody></table>';
                    html += `<button class="btn btn-secondary" onclick="exportFolderCSV()">导出CSV</button>
                             <button class="btn btn-secondary" onclick="generateFolderReport()">生成校验报告</button>`;
                    resultBox.innerHTML = html;
                }
            } catch (error) {
                resultBox.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
            }
        });
    }
});

async function exportVerifyCSV() {
    if (!window.lastVerifyResult) return;
    
    const result = window.lastVerifyResult;
    const results = [{
        filename: result.filename,
        algorithm: result.algorithm,
        expected_hash: result.expected_hash,
        actual_hash: result.actual_hash,
        status: result.match ? '通过' : '不匹配'
    }];
    
    try {
        const response = await fetch('/api/export-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: results })
        });
        
        const data = await response.json();
        if (data.csv_id) {
            window.open(`/download/csv/${data.csv_id}`, '_blank');
        }
    } catch (error) {
        alert('导出失败');
    }
}

async function exportBatchCSV() {
    if (!window.lastBatchResults) return;
    
    const flatResults = window.lastBatchResults.map(r => {
        const flat = { filename: r.filename, status: r.status };
        if (r.hashes) {
            for (const [algo, hash] of Object.entries(r.hashes)) {
                flat[algo.toUpperCase()] = hash;
            }
        }
        return flat;
    });
    
    try {
        const response = await fetch('/api/export-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: flatResults })
        });
        
        const data = await response.json();
        if (data.csv_id) {
            window.open(`/download/csv/${data.csv_id}`, '_blank');
        }
    } catch (error) {
        alert('导出失败');
    }
}

async function exportFolderCSV() {
    if (!window.lastFolderResults) return;
    
    try {
        const response = await fetch('/api/export-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: window.lastFolderResults })
        });
        
        const data = await response.json();
        if (data.csv_id) {
            window.open(`/download/csv/${data.csv_id}`, '_blank');
        }
    } catch (error) {
        alert('导出失败');
    }
}

async function generateVerifyReport() {
    if (!window.lastVerifyResult) return;
    
    const result = window.lastVerifyResult;
    const results = [{
        filename: result.filename,
        expected_hash: result.expected_hash,
        actual_hash: result.actual_hash,
        status: result.match ? '通过' : '不匹配'
    }];
    
    try {
        const response = await fetch('/api/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: results })
        });
        
        const data = await response.json();
        if (data.report_id) {
            window.open(`/download/report/${data.report_id}`, '_blank');
        }
    } catch (error) {
        alert('生成报告失败');
    }
}

async function generateFolderReport() {
    if (!window.lastFolderResults) return;
    
    try {
        const response = await fetch('/api/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: window.lastFolderResults })
        });
        
        const data = await response.json();
        if (data.report_id) {
            window.open(`/download/report/${data.report_id}`, '_blank');
        }
    } catch (error) {
        alert('生成报告失败');
    }
}
