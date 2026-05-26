let currentWordcloudFile = null;

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function analyzeText() {
    const text = document.getElementById('input-text').value.trim();
    const topN = document.getElementById('top-n').value;

    if (!text) {
        alert('请输入要分析的文本');
        return;
    }

    showLoading();

    fetch('/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `text=${encodeURIComponent(text)}&top_n=${topN}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            hideLoading();
            return;
        }
        displayResults(data);
        updateHistory();
        hideLoading();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('分析失败，请稍后重试');
        hideLoading();
    });
}

function uploadTxt() {
    const fileInput = document.getElementById('txt-file');
    const file = fileInput.files[0];
    
    if (!file) return;

    const topN = document.getElementById('top-n').value;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('top_n', topN);

    showLoading();

    fetch('/upload_txt', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            hideLoading();
            return;
        }
        if (data.text) {
            document.getElementById('input-text').value = data.text;
        }
        displayResults(data);
        updateHistory();
        hideLoading();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('上传失败，请稍后重试');
        hideLoading();
    });

    fileInput.value = '';
}

function uploadCsv() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) return;

    const topN = document.getElementById('top-n').value;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('top_n', topN);

    showLoading();

    fetch('/upload_csv', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        }
        return response.json().then(data => {
            throw new Error(data.error || '上传失败');
        });
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'keywords_result.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        hideLoading();
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message || '上传失败，请稍后重试');
        hideLoading();
    });

    fileInput.value = '';
}

function displayResults(data) {
    document.getElementById('result-card').style.display = 'block';

    document.getElementById('stat-chars').textContent = data.stats.char_count;
    document.getElementById('stat-sentences').textContent = data.stats.sentence_count;
    document.getElementById('stat-words').textContent = data.stats.word_count;
    document.getElementById('stat-diversity').textContent = data.stats.lexical_diversity;

    const sentimentEl = document.getElementById('sentiment-result');
    sentimentEl.textContent = data.sentiment.polarity;
    sentimentEl.className = 'sentiment-value ' + data.sentiment.polarity;

    const keywordsList = document.getElementById('keywords-list');
    keywordsList.innerHTML = '';
    
    if (data.keywords && data.keywords.length > 0) {
        data.keywords.forEach((keyword, index) => {
            const tag = document.createElement('span');
            tag.className = 'keyword-tag';
            tag.style.animationDelay = `${index * 0.05}s`;
            tag.innerHTML = `${keyword[0]} <span class="score">${keyword[1]}</span>`;
            keywordsList.appendChild(tag);
        });
    } else {
        keywordsList.innerHTML = '<p style="color:#888;">未提取到关键词</p>';
    }

    if (data.wordcloud) {
        currentWordcloudFile = data.wordcloud;
        document.getElementById('wordcloud-section').style.display = 'block';
        document.getElementById('wordcloud-img').src = `/static/wordclouds/${data.wordcloud}`;
    } else {
        document.getElementById('wordcloud-section').style.display = 'none';
        currentWordcloudFile = null;
    }

    document.getElementById('result-card').scrollIntoView({ behavior: 'smooth' });
}

function downloadWordcloud() {
    if (currentWordcloudFile) {
        window.open(`/wordcloud/download/${currentWordcloudFile}`, '_blank');
    }
}

function loadHistory(historyId) {
    showLoading();
    
    fetch(`/history/${historyId}`)
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            hideLoading();
            return;
        }
        
        document.getElementById('input-text').value = data.full_text;
        document.getElementById('top-n').value = data.top_n;
        
        displayResults({
            keywords: data.keywords,
            stats: data.stats,
            sentiment: data.sentiment,
            wordcloud: null
        });
        
        document.getElementById('wordcloud-section').style.display = 'none';
        
        hideLoading();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('加载历史记录失败');
        hideLoading();
    });
}

function updateHistory() {
    fetch('/')
    .then(response => response.text())
    .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newHistory = doc.getElementById('history-list').innerHTML;
        document.getElementById('history-list').innerHTML = newHistory;
    });
}

function clearHistory() {
    if (!confirm('确定要清空所有历史记录吗？')) return;

    fetch('/clear_history', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('history-list').innerHTML = '<p class="empty">暂无历史记录</p>';
        }
    });
}

function uploadStopwords() {
    const fileInput = document.getElementById('stopwords-file');
    const file = fileInput.files[0];
    
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showLoading();

    fetch('/upload_stopwords', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        const statusEl = document.getElementById('stopwords-status');
        if (data.success) {
            statusEl.className = 'success';
            statusEl.textContent = `成功加载 ${data.count} 个停用词`;
        } else {
            alert(data.error || '上传失败');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('上传失败，请稍后重试');
        hideLoading();
    });

    fileInput.value = '';
}

function clearStopwords() {
    if (!confirm('确定要清除所有自定义停用词吗？')) return;

    fetch('/clear_stopwords', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const statusEl = document.getElementById('stopwords-status');
            statusEl.className = 'success';
            statusEl.textContent = '自定义停用词已清除';
        }
    });
}

document.getElementById('input-text').addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        analyzeText();
    }
});
