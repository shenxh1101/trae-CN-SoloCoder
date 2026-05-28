document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initTabs();
    initLengthSlider();
    initGenerateForm();
    initPassphraseForm();
    initWifiForm();
    initCheckForm();
    initBatchForm();
    initExportForm();
    initClearHistory();
});

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

function setTheme(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeToggle.textContent = theme === 'dark' ? '☀️ 亮色模式' : '🌙 暗色模式';
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
        });
    });
}

function initLengthSlider() {
    const slider = document.getElementById('length');
    const valueDisplay = document.getElementById('length-value');

    if (slider && valueDisplay) {
        slider.addEventListener('input', function() {
            valueDisplay.textContent = this.value;
        });
    }
}

function initGenerateForm() {
    const form = document.getElementById('generate-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const resultDiv = document.getElementById('generate-result');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<span class="loading"></span>生成中...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const response = await fetch('/generate', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                let html = '<div class="password-list">';
                data.passwords.forEach((pwd, index) => {
                    html += `
                        <div class="password-item">
                            <span class="password-text">${escapeHtml(pwd)}</span>
                            <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(pwd).replace(/'/g, "\\'")}', this)">复制</button>
                        </div>
                    `;
                });
                html += '</div>';
                html += `<p style="margin-top: 10px; color: var(--text-secondary); font-size: 14px;">生成时间: ${data.timestamp} | 共 ${data.count} 个密码</p>`;
                resultDiv.innerHTML = html;
                updateHistoryList();
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
            }
        } catch (error) {
            resultDiv.innerHTML = `<div class="alert alert-error">请求失败: ${error.message}</div>`;
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initPassphraseForm() {
    const form = document.getElementById('passphrase-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const resultDiv = document.getElementById('passphrase-result');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<span class="loading"></span>生成中...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const response = await fetch('/generate_passphrase', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                resultDiv.innerHTML = `
                    <div class="password-item">
                        <span class="password-text">${escapeHtml(data.passphrase)}</span>
                        <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(data.passphrase).replace(/'/g, "\\'")}', this)">复制</button>
                    </div>
                    <p style="margin-top: 10px; color: var(--text-secondary); font-size: 14px;">密码长度: ${data.length} 字符</p>
                `;
                updateHistoryList();
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
            }
        } catch (error) {
            resultDiv.innerHTML = `<div class="alert alert-error">请求失败: ${error.message}</div>`;
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initWifiForm() {
    const form = document.getElementById('wifi-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const resultDiv = document.getElementById('wifi-result');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<span class="loading"></span>生成中...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const response = await fetch('/generate_wifi', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                resultDiv.innerHTML = `
                    <div class="wifi-result">
                        <div class="wifi-info">
                            <p><strong>WiFi名称:</strong> ${escapeHtml(data.ssid)}</p>
                            <p><strong>密码:</strong> <code>${escapeHtml(data.password)}</code></p>
                            <p><strong>加密方式:</strong> ${data.encryption}</p>
                            <button class="copy-btn" style="margin-top: 10px;" onclick="copyToClipboard('${escapeHtml(data.password).replace(/'/g, "\\'")}', this)">复制密码</button>
                        </div>
                        <div class="qr-code" id="qrcode"></div>
                        <p style="color: var(--text-secondary); font-size: 14px;">使用手机相机扫描二维码自动连接</p>
                    </div>
                `;

                if (typeof QRCode !== 'undefined') {
                    document.getElementById('qrcode').innerHTML = '';
                    try {
                        new QRCode(document.getElementById('qrcode'), {
                            text: data.qr_string,
                            width: 200,
                            height: 200,
                            colorDark: '#000000',
                            colorLight: '#ffffff',
                            correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.M : 1
                        });
                    } catch (e) {
                        new QRCode(document.getElementById('qrcode'), data.qr_string);
                    }
                } else {
                    document.getElementById('qrcode').innerHTML = `
                        <p style="color: var(--text-secondary);">二维码库加载失败</p>
                        <p style="font-family: monospace; font-size: 12px; word-break: break-all;">${escapeHtml(data.qr_string)}</p>
                        <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(data.qr_string).replace(/'/g, "\\'")}', this)">复制QR字符串</button>
                    `;
                }
                updateHistoryList();
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
            }
        } catch (error) {
            resultDiv.innerHTML = `<div class="alert alert-error">请求失败: ${error.message}</div>`;
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initCheckForm() {
    const form = document.getElementById('check-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const resultDiv = document.getElementById('check-result');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<span class="loading"></span>检测中...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const response = await fetch('/check_strength', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                const strengthClass = getStrengthClass(data.rating);
                const charTypesMap = {
                    'lowercase': '小写字母',
                    'uppercase': '大写字母',
                    'digits': '数字',
                    'special': '特殊符号'
                };
                const charTypesText = data.details.character_types.value.map(t => charTypesMap[t] || t).join('、') || '无';

                let patternsHtml = '无';
                if (data.details.repeating_patterns.value.length > 0) {
                    patternsHtml = data.details.repeating_patterns.value.map(p =>
                        `<code>${escapeHtml(p.pattern)}</code>`
                    ).join(', ');
                }

                resultDiv.innerHTML = `
                    <div class="strength-meter">
                        <div class="strength-bar">
                            <div class="strength-fill ${strengthClass}" style="width: ${data.score}%"></div>
                        </div>
                        <div class="strength-label">
                            <span>密码强度: ${data.rating}</span>
                            <span>${data.score}/100</span>
                        </div>
                    </div>
                    <div class="strength-details">
                        <div class="strength-detail-item">
                            <span class="detail-label">密码长度</span>
                            <span class="detail-value">${data.details.length.value} 字符 (${data.details.length.points}/${data.details.length.max} 分)</span>
                        </div>
                        <div class="strength-detail-item">
                            <span class="detail-label">字符种类</span>
                            <span class="detail-value">${charTypesText} (${data.details.character_types.points}/${data.details.character_types.max} 分)</span>
                        </div>
                        <div class="strength-detail-item">
                            <span class="detail-label">常见弱密码</span>
                            <span class="detail-value" style="color: ${data.details.common_password.value ? 'var(--danger-color)' : 'var(--success-color)'}">
                                ${data.details.common_password.value ? '❌ 是常见弱密码' : '✅ 不是常见弱密码'}
                                (${data.details.common_password.points}/${data.details.common_password.max} 分)
                            </span>
                        </div>
                        <div class="strength-detail-item">
                            <span class="detail-label">重复/连续模式</span>
                            <span class="detail-value">${patternsHtml} (${data.details.repeating_patterns.points}/${data.details.repeating_patterns.max} 分)</span>
                        </div>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
            }
        } catch (error) {
            resultDiv.innerHTML = `<div class="alert alert-error">请求失败: ${error.message}</div>`;
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initBatchForm() {
    const form = document.getElementById('batch-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const resultDiv = document.getElementById('batch-result');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<span class="loading"></span>检测中...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const response = await fetch('/batch_check', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                let html = '<div class="batch-result"><table>';
                html += '<thead><tr><th>序号</th><th>密码</th><th>长度</th><th>评分</th><th>强度等级</th></tr></thead>';
                html += '<tbody>';
                data.results.forEach((item, index) => {
                    const ratingClass = getRatingClass(item.rating);
                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td><code>${escapeHtml(item.password)}</code></td>
                            <td>${item.length}</td>
                            <td>${item.score}</td>
                            <td><span class="rating-badge ${ratingClass}">${item.rating}</span></td>
                        </tr>
                    `;
                });
                html += '</tbody></table></div>';
                html += `<p style="margin-top: 15px; color: var(--text-secondary);">共检测 ${data.results.length} 个密码</p>`;
                resultDiv.innerHTML = html;
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
            }
        } catch (error) {
            resultDiv.innerHTML = `<div class="alert alert-error">请求失败: ${error.message}</div>`;
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initExportForm() {
    const form = document.getElementById('export-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const resultDiv = document.getElementById('export-result');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<span class="loading"></span>导出中...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const response = await fetch('/export_csv', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'passwords_encrypted.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                resultDiv.innerHTML = `<div class="alert alert-success">✅ 导出成功！文件已下载，请妥善保管加密密码。</div>`;
            } else {
                const data = await response.json();
                resultDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
            }
        } catch (error) {
            resultDiv.innerHTML = `<div class="alert alert-error">请求失败: ${error.message}</div>`;
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initClearHistory() {
    const btn = document.getElementById('clear-history-btn');
    if (!btn) return;

    btn.addEventListener('click', async function() {
        if (!confirm('确定要清空所有历史记录吗？')) return;

        try {
            const response = await fetch('/clear_history', {
                method: 'POST'
            });

            if (response.ok) {
                document.getElementById('history-list').innerHTML = '<p class="empty-history">暂无历史记录</p>';
            }
        } catch (error) {
            alert('清空失败: ' + error.message);
        }
    });
}

function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = element.textContent;
        element.textContent = '已复制!';
        element.classList.add('copy-success');
        setTimeout(() => {
            element.textContent = originalText;
            element.classList.remove('copy-success');
        }, 1500);
    }).catch(err => {
        alert('复制失败，请手动复制');
    });
}

function revealPassword(btn, password) {
    const passwordSpan = btn.parentElement.querySelector('.password-mask');
    if (passwordSpan.textContent === password) {
        passwordSpan.textContent = password.substring(0, 4) + '*'.repeat(Math.max(0, password.length - 4));
        btn.textContent = '👁';
    } else {
        passwordSpan.textContent = password;
        btn.textContent = '🙈';
    }
}

function getStrengthClass(rating) {
    const classes = {
        '非常弱': 'strength-very-weak',
        '弱': 'strength-weak',
        '中等': 'strength-medium',
        '强': 'strength-strong',
        '非常强': 'strength-very-strong'
    };
    return classes[rating] || 'strength-medium';
}

function getRatingClass(rating) {
    const classes = {
        '非常弱': 'rating-very-weak',
        '弱': 'rating-weak',
        '中等': 'rating-medium',
        '强': 'rating-strong',
        '非常强': 'rating-very-strong'
    };
    return classes[rating] || 'rating-medium';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function updateHistoryList() {
    try {
        const response = await fetch('/');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newHistoryList = doc.getElementById('history-list');
        const currentHistoryList = document.getElementById('history-list');
        if (newHistoryList && currentHistoryList) {
            currentHistoryList.innerHTML = newHistoryList.innerHTML;
            initClearHistory();
        }
    } catch (error) {
        console.log('更新历史记录失败:', error);
    }
}
