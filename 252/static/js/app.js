let batchAnalysisData = null;

document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initFileUpload();
    initAnalyze();
    initBatchAnalyze();
    initSnippets();
    loadSnippets();
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

function initFileUpload() {
    const uploadBtn = document.getElementById('uploadBtn');
    const resumeFile = document.getElementById('resume_file');
    const fileName = document.getElementById('fileName');

    uploadBtn.addEventListener('click', () => resumeFile.click());

    resumeFile.addEventListener('change', function() {
        if (this.files.length > 0) {
            fileName.textContent = this.files[0].name;
        } else {
            fileName.textContent = '未选择文件';
        }
    });

    const batchUploadBtn = document.getElementById('batchUploadBtn');
    const batchResumeFiles = document.getElementById('batch_resume_files');
    const batchFileList = document.getElementById('batchFileList');

    batchUploadBtn.addEventListener('click', () => batchResumeFiles.click());

    batchResumeFiles.addEventListener('change', function() {
        batchFileList.innerHTML = '';
        for (let i = 0; i < this.files.length; i++) {
            const div = document.createElement('div');
            div.className = 'file-list-item';
            div.textContent = this.files[i].name;
            batchFileList.appendChild(div);
        }
    });
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function initAnalyze() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const results = document.getElementById('results');

    analyzeBtn.addEventListener('click', async function() {
        const jobDescription = document.getElementById('job_description').value;
        const resumeText = document.getElementById('resume_text').value;
        const customWeights = document.getElementById('custom_weights').value;
        const resumeFile = document.getElementById('resume_file').files[0];

        if (!jobDescription) {
            alert('请输入岗位描述');
            return;
        }

        if (!resumeText && !resumeFile) {
            alert('请上传简历文件或粘贴简历文本');
            return;
        }

        showLoading();

        const formData = new FormData();
        formData.append('job_description', jobDescription);
        formData.append('resume_text', resumeText);
        formData.append('custom_weights', customWeights);
        if (resumeFile) {
            formData.append('resume_file', resumeFile);
        }

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                displayResults(data);
                results.style.display = 'block';
                results.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert(data.error || '分析失败');
            }
        } catch (error) {
            alert('请求失败，请稍后重试');
        } finally {
            hideLoading();
        }
    });

    document.getElementById('exportReportBtn').addEventListener('click', exportReport);
}

function displayResults(data) {
    document.getElementById('atsScore').textContent = data.ats_score + '分';
    document.getElementById('coverage').textContent = (data.match_result.coverage * 100).toFixed(1) + '%';
    document.getElementById('passProb').textContent = data.pass_probability + '%';

    const keywordDetails = document.getElementById('keywordDetails');
    keywordDetails.innerHTML = '';
    data.match_result.keyword_details.forEach(item => {
        const div = document.createElement('div');
        div.className = `keyword-item ${item.status}`;
        div.innerHTML = `
            <span class="keyword-name">${item.keyword}</span>
            <span class="keyword-count">${item.found ? item.occurrences + '次' : '缺失'}</span>
        `;
        keywordDetails.appendChild(div);
    });

    const suggestions = document.getElementById('suggestions');
    suggestions.innerHTML = '';
    if (data.suggestions.length > 0) {
        data.suggestions.forEach(sug => {
            const div = document.createElement('div');
            div.className = `suggestion-item ${sug.priority}`;
            div.textContent = sug.message;
            suggestions.appendChild(div);
        });
    } else {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = '🎉 简历表现优秀，暂无优化建议';
        suggestions.appendChild(div);
    }

    const formatIssues = document.getElementById('formatIssues');
    formatIssues.innerHTML = '';
    if (data.format_issues && data.format_issues.length > 0) {
        data.format_issues.forEach(issue => {
            const div = document.createElement('div');
            div.className = 'format-issue';
            div.textContent = '⚠️ ' + issue;
            formatIssues.appendChild(div);
        });
    } else {
        const div = document.createElement('div');
        div.className = 'format-issue none';
        div.textContent = '✅ 未检测到格式问题';
        formatIssues.appendChild(div);
    }

    const missingKeywords = document.getElementById('missingKeywords');
    missingKeywords.innerHTML = '';
    Object.entries(data.keyword_examples).forEach(([keyword, examples]) => {
        const div = document.createElement('div');
        div.className = 'missing-keyword';
        let examplesHtml = examples.map(ex => `<div class="example-item">${ex}</div>`).join('');
        div.innerHTML = `
            <div class="missing-keyword-name">${keyword}</div>
            <div class="missing-keyword-examples">
                ${examplesHtml}
            </div>
        `;
        missingKeywords.appendChild(div);
    });

    if (Object.keys(data.keyword_examples).length === 0) {
        const div = document.createElement('div');
        div.className = 'missing-keyword';
        div.textContent = '🎉 所有关键词都已覆盖！';
        missingKeywords.appendChild(div);
    }

    const verbSuggestions = document.getElementById('verbSuggestions');
    verbSuggestions.innerHTML = '';
    if (data.verb_suggestions && data.verb_suggestions.length > 0) {
        data.verb_suggestions.forEach(vs => {
            const div = document.createElement('div');
            div.className = 'verb-suggestion';
            div.innerHTML = `
                <span class="verb-original">${vs.original}</span>
                <span class="verb-suggestions-list">→ ${vs.suggestions.join(', ')}</span>
            `;
            verbSuggestions.appendChild(div);
        });
    } else {
        const div = document.createElement('div');
        div.className = 'verb-suggestion';
        div.textContent = '✅ 动词使用良好';
        verbSuggestions.appendChild(div);
    }

    const keywordCloud = document.getElementById('keywordCloud');
    keywordCloud.innerHTML = '';
    data.job_keywords.forEach(([keyword, count]) => {
        const span = document.createElement('span');
        span.className = 'keyword-cloud-item';
        span.textContent = keyword;
        span.style.fontSize = Math.min(0.8 + count * 0.2, 1.5) + 'rem';
        keywordCloud.appendChild(span);
    });
}

function exportReport() {
    alert('报告导出功能演示：建议复制分析结果');
}

function initBatchAnalyze() {
    const batchAnalyzeBtn = document.getElementById('batchAnalyzeBtn');
    const batchResults = document.getElementById('batchResults');

    batchAnalyzeBtn.addEventListener('click', async function() {
        const jobDescription = document.getElementById('batch_job_description').value;
        const customWeights = document.getElementById('batch_custom_weights').value;
        const resumeFiles = document.getElementById('batch_resume_files').files;

        if (!jobDescription) {
            alert('请输入岗位描述');
            return;
        }

        if (resumeFiles.length === 0) {
            alert('请上传至少一份简历文件');
            return;
        }

        showLoading();

        const formData = new FormData();
        formData.append('job_description', jobDescription);
        formData.append('custom_weights', customWeights);
        for (let i = 0; i < resumeFiles.length; i++) {
            formData.append('resume_files', resumeFiles[i]);
        }

        try {
            const response = await fetch('/batch-analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                batchAnalysisData = data.batch_results;
                displayBatchResults(data);
                batchResults.style.display = 'block';
            } else {
                alert(data.error || '批量分析失败');
            }
        } catch (error) {
            alert('请求失败，请稍后重试');
        } finally {
            hideLoading();
        }
    });

    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
}

function displayBatchResults(data) {
    const summary = document.getElementById('batchSummary');
    summary.innerHTML = `
        <p>共分析 <strong>${data.total_resumes}</strong> 份简历，提取关键词 <strong>${data.job_keywords.length}</strong> 个</p>
    `;

    const table = document.getElementById('rankingTable');
    table.innerHTML = `
        <thead>
            <tr>
                <th>排名</th>
                <th>简历名称</th>
                <th>ATS评分</th>
                <th>关键词覆盖率</th>
                <th>匹配数量</th>
                <th>通过概率</th>
            </tr>
        </thead>
        <tbody>
            ${data.batch_results.map(r => `
                <tr>
                    <td class="rank-${r.rank <= 3 ? r.rank : ''}">${r.rank}</td>
                    <td>${r.name}</td>
                    <td>${r.ats_score}分</td>
                    <td>${(r.coverage * 100).toFixed(1)}%</td>
                    <td>${r.matched_count}/${r.total_keywords}</td>
                    <td>${(r.pass_probability * 100).toFixed(1)}%</td>
                </tr>
            `).join('')}
        </tbody>
    `;
}

async function exportCsv() {
    if (!batchAnalysisData) {
        alert('没有可导出的数据');
        return;
    }

    try {
        const response = await fetch('/export-csv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: batchAnalysisData,
                filename: 'resume_ranking.csv'
            })
        });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume_ranking.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert('导出失败');
    }
}

function initSnippets() {
    const modal = document.getElementById('addSnippetModal');
    const addBtn = document.getElementById('addSnippetBtn');
    const closeBtn = document.querySelector('.close');
    const saveBtn = document.getElementById('saveSnippetBtn');

    addBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    saveBtn.addEventListener('click', async () => {
        const category = document.getElementById('newSnippetCategory').value;
        const content = document.getElementById('newSnippetContent').value;
        const keywordsStr = document.getElementById('newSnippetKeywords').value;

        if (!content) {
            alert('请输入片段内容');
            return;
        }

        const keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k);

        try {
            const response = await fetch('/snippets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category,
                    content,
                    keywords
                })
            });

            const data = await response.json();
            if (data.success) {
                modal.style.display = 'none';
                loadSnippets();
                alert('添加成功！');
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('添加失败');
        }
    });

    document.getElementById('snippetCategory').addEventListener('change', loadSnippets);
    document.getElementById('snippetSearch').addEventListener('input', debounce(loadSnippets, 300));
}

async function loadSnippets() {
    const category = document.getElementById('snippetCategory').value;
    const keyword = document.getElementById('snippetSearch').value;

    let url = '/snippets?';
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (keyword) url += `keyword=${encodeURIComponent(keyword)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            const categorySelect = document.getElementById('snippetCategory');
            const currentValue = categorySelect.value;
            categorySelect.innerHTML = '<option value="">全部分类</option>';
            data.categories.forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat}" ${cat === currentValue ? 'selected' : ''}>${cat}</option>`;
            });

            const snippetsList = document.getElementById('snippetsList');
            snippetsList.innerHTML = '';

            data.snippets.forEach(snippet => {
                const div = document.createElement('div');
                div.className = 'snippet-card';
                div.innerHTML = `
                    <div class="snippet-category">${snippet.category}</div>
                    <div class="snippet-content">${snippet.content}</div>
                    <div class="snippet-keywords">
                        ${snippet.keywords.map(k => `<span class="snippet-keyword">${k}</span>`).join('')}
                    </div>
                    <div class="snippet-footer">
                        <span class="snippet-rating">⭐ ${snippet.rating || '未评分'}</span>
                        <span class="snippet-date">${snippet.created_at}</span>
                    </div>
                `;
                snippetsList.appendChild(div);
            });
        }
    } catch (error) {
        console.error('加载片段失败');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
