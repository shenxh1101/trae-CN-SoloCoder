document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initThemeList();
    initHighlight();
});

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedCustomTheme = localStorage.getItem('customTheme') || '';

    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
        body.classList.remove('light-theme');
        if (themeToggle) {
            themeToggle.textContent = '☀️';
        }
    } else {
        body.classList.add('light-theme');
        body.classList.remove('dark-theme');
        if (themeToggle) {
            themeToggle.textContent = '🌙';
        }
    }

    if (savedCustomTheme) {
        applyCustomTheme(savedCustomTheme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            if (body.classList.contains('dark-theme')) {
                body.classList.remove('dark-theme');
                body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
                this.textContent = '🌙';
            } else {
                body.classList.remove('light-theme');
                body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
                this.textContent = '☀️';
            }
            updateMermaidTheme();
        });
    }
}

function updateMermaidTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default'
        });
        document.querySelectorAll('.mermaid').forEach(el => {
            mermaid.run({
                querySelector: null,
                nodes: [el]
            });
        });
    }
}

async function initThemeList() {
    const themeList = document.getElementById('theme-list');
    if (!themeList) return;

    try {
        const response = await fetch('/themes');
        const data = await response.json();
        const themes = data.themes || [];

        const currentCustomTheme = localStorage.getItem('customTheme') || '';

        let html = '';
        html += `<div class="theme-item ${!currentCustomTheme ? 'active' : ''}" onclick="clearCustomTheme()">
            <span>默认</span>
        </div>`;

        themes.forEach(theme => {
            html += `<div class="theme-item ${currentCustomTheme === theme ? 'active' : ''}" onclick="applyCustomTheme('${theme}')">
                <span>${theme}</span>
                <button class="theme-delete" onclick="event.stopPropagation(); deleteTheme('${theme}')">×</button>
            </div>`;
        });

        themeList.innerHTML = html;
    } catch (error) {
        console.error('Failed to load themes:', error);
    }
}

function applyCustomTheme(themeName) {
    const customThemeLink = document.getElementById('custom-theme');
    if (themeName) {
        customThemeLink.href = `/theme/${themeName}`;
        localStorage.setItem('customTheme', themeName);
    } else {
        customThemeLink.href = '';
        localStorage.removeItem('customTheme');
    }
    initThemeList();
}

function clearCustomTheme() {
    applyCustomTheme('');
}

async function deleteTheme(themeName) {
    if (!confirm(`确定要删除主题 "${themeName}" 吗？`)) return;

    try {
        const formData = new FormData();
        const response = await fetch(`/theme/delete/${themeName}`, {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            if (localStorage.getItem('customTheme') === themeName) {
                clearCustomTheme();
            }
            initThemeList();
        }
    } catch (error) {
        console.error('Failed to delete theme:', error);
    }
}

function initHighlight() {
    if (typeof hljs !== 'undefined') {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

function toggleFolder(element) {
    const treeItem = element.closest('.tree-item');
    const children = treeItem.querySelector('.tree-children');
    const toggle = element;

    if (children) {
        if (children.classList.contains('collapsed')) {
            children.classList.remove('collapsed');
            toggle.classList.add('expanded');
        } else {
            children.classList.add('collapsed');
            toggle.classList.remove('expanded');
        }
    }
}

async function togglePin(docPath) {
    try {
        const formData = new FormData();
        const response = await fetch(`/pin/${encodeURIComponent(docPath)}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            const treeItem = document.querySelector(`.tree-item[data-path="${docPath}"]`);
            if (treeItem) {
                if (data.pinned) {
                    treeItem.classList.add('pinned');
                } else {
                    treeItem.classList.remove('pinned');
                }
            }

            const pinBtn = document.querySelector(`.pin-btn[data-path="${docPath}"]`);
            if (pinBtn) {
                pinBtn.innerHTML = data.pinned ? '📌' : '📍';
            }

            location.reload();
        }
    } catch (error) {
        console.error('Failed to toggle pin:', error);
        alert('操作失败，请重试');
    }
}

function addTag(tag) {
    const tagsInput = document.getElementById('tags');
    if (tagsInput) {
        const currentTags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            tagsInput.value = currentTags.join(', ');
        }
    }
}

function insertFormat(before, after) {
    const editor = document.getElementById('editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const newValue = editor.value.substring(0, start) + before + selectedText + after + editor.value.substring(end);

    editor.value = newValue;
    editor.focus();
    editor.selectionStart = start + before.length;
    editor.selectionEnd = end + before.length;

    triggerPreview();
}

function insertTable() {
    const tableTemplate = `\n| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |
| D   | E   | F   |\n`;
    const editor = document.getElementById('editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const newValue = editor.value.substring(0, start) + tableTemplate + editor.value.substring(start);

    editor.value = newValue;
    editor.focus();
    triggerPreview();
}

function insertMermaid() {
    const mermaidTemplate = `\n\`\`\`mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[执行操作]
    B -->|否| D[结束]
    C --> D
\`\`\`\n`;
    const editor = document.getElementById('editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const newValue = editor.value.substring(0, start) + mermaidTemplate + editor.value.substring(start);

    editor.value = newValue;
    editor.focus();
    triggerPreview();
}

function insertLatex() {
    const latexTemplate = `\n$$\n\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n\n$$\n`;
    const editor = document.getElementById('editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const newValue = editor.value.substring(0, start) + latexTemplate + editor.value.substring(start);

    editor.value = newValue;
    editor.focus();
    triggerPreview();
}

let previewTimeout = null;

function triggerPreview() {
    const autoUpdate = document.getElementById('auto-update');
    if (autoUpdate && !autoUpdate.checked) return;

    if (previewTimeout) {
        clearTimeout(previewTimeout);
    }

    previewTimeout = setTimeout(() => {
        updatePreview();
    }, 300);
}

async function updatePreview() {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    if (!editor || !preview) return;

    try {
        const formData = new FormData();
        formData.append('content', editor.value);

        const response = await fetch('/preview', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.html) {
            preview.innerHTML = data.html;
            initHighlight();

            if (typeof mermaid !== 'undefined') {
                mermaid.run({
                    querySelector: '.mermaid'
                });
            }

            if (typeof MathJax !== 'undefined') {
                MathJax.typesetPromise([preview]);
            }
        }
    } catch (error) {
        console.error('Preview update failed:', error);
    }
}

setTimeout(() => {
    document.querySelectorAll('.flash-message').forEach(msg => {
        setTimeout(() => {
            msg.style.opacity = '0';
            msg.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                msg.remove();
            }, 300);
        }, 5000);
    });
}, 100);
