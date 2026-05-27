let currentFilter = { type: 'all', value: null };
let currentSort = { field: 'created_at', order: 'desc' };
let currentView = 'list';
let allBookmarks = [];
let allCategories = [];
let allTags = [];

const api = {
    get: (url) => fetch(url).then(r => r.json()),
    post: (url, data) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    put: (url, data) => fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    delete: (url) => fetch(url, { method: 'DELETE' }).then(r => r.json())
};

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = `toast ${type}`;
    }, 2500);
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeButton(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeButton(next);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = theme === 'light' ? '🌙' : '☀️';
        btn.title = theme === 'light' ? '切换暗色模式' : '切换亮色模式';
    }
}

function getStatusClass(status) {
    if (status === 'error') return 'error';
    if (status === 'pending') return 'pending';
    return '';
}

function getStatusIndicator(status) {
    const cls = getStatusClass(status);
    return `<span class="status-indicator ${cls}" title="${status === 'error' ? '链接失效' : status === 'pending' ? '检测中' : '正常'}"></span>`;
}

function renderBookmarks(bookmarks) {
    const container = document.getElementById('bookmarks-container');
    const emptyState = document.getElementById('empty-state');

    if (!bookmarks || bookmarks.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    container.className = `bookmarks-list ${currentView === 'grid' ? 'grid-view' : ''}`;

    const grouped = {};
    bookmarks.forEach(bm => {
        const cat = bm.category || '未分类';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(bm);
    });

    let html = '';
    for (const [category, items] of Object.entries(grouped).sort()) {
        html += `<div class="category-group">
            <h3 class="category-title">📁 ${category} <span class="count-badge">${items.length}</span></h3>`;
        items.forEach(bm => {
            const errorClass = bm.status === 'error' ? 'bookmark-error' : '';
            const tagsHtml = (bm.tags || []).map(tag =>
                `<span class="tag-item" data-tag="${tag}">#${tag}</span>`
            ).join('');
            const statusCode = bm.status_code ? ` (${bm.status_code})` : '';

            html += `
            <div class="bookmark-item ${errorClass}" data-id="${bm.id}">
                <div class="bookmark-content">
                    <div class="bookmark-info">
                        <h3 class="bookmark-title">
                            ${getStatusIndicator(bm.status)}
                            <a href="${bm.url}" target="_blank" rel="noopener" data-click="${bm.id}">${escapeHtml(bm.title)}</a>
                        </h3>
                        <div class="bookmark-url">${escapeHtml(bm.url)}${statusCode}</div>
                        <div class="bookmark-meta">
                            <span class="bookmark-category">📁 ${escapeHtml(bm.category || '未分类')}</span>
                            ${tagsHtml ? `<span class="bookmark-tags">${tagsHtml}</span>` : ''}
                            <span class="bookmark-clicks">👆 ${bm.clicks || 0}</span>
                            ${bm.last_checked ? `<span class="bookmark-time">🕐 ${formatDate(bm.last_checked)}</span>` : ''}
                        </div>
                    </div>
                    <div class="bookmark-actions">
                        <button class="action-btn" data-share="${bm.id}" title="分享">🔗</button>
                        <button class="action-btn" data-edit="${bm.id}" title="编辑">✏️</button>
                        <button class="action-btn danger" data-delete="${bm.id}" title="删除">🗑️</button>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
    }

    container.innerHTML = html;
    bindBookmarkEvents();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function bindBookmarkEvents() {
    document.querySelectorAll('[data-click]').forEach(el => {
        el.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.click;
            api.post(`/api/bookmarks/${id}/click`, {});
        });
    });

    document.querySelectorAll('[data-edit]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.edit;
            const bm = allBookmarks.find(b => b.id === id);
            if (bm) openBookmarkModal(bm);
        });
    });

    document.querySelectorAll('[data-delete]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.delete;
            if (confirm('确定要删除这个书签吗？')) {
                api.delete(`/api/bookmarks/${id}`).then(() => {
                    showToast('删除成功', 'success');
                    loadData();
                });
            }
        });
    });

    document.querySelectorAll('[data-share]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.share;
            const bm = allBookmarks.find(b => b.id === id);
            if (bm) {
                openShareModal();
                document.getElementById('share-type').value = 'category';
                updateShareValueOptions();
                document.getElementById('share-value').value = bm.category;
            }
        });
    });

    document.querySelectorAll('.tag-item[data-tag]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const tag = e.currentTarget.dataset.tag;
            currentFilter = { type: 'tag', value: tag };
            updateFilterUI();
            filterAndRenderBookmarks();
        });
    });
}

function renderCategories(categories) {
    const list = document.getElementById('category-list');
    const errorCount = allBookmarks.filter(b => b.status === 'error').length;
    document.getElementById('count-all').textContent = allBookmarks.length;
    document.getElementById('count-error').textContent = errorCount;

    list.querySelectorAll('.category-dynamic').forEach(el => el.remove());

    categories.forEach(cat => {
        const count = allBookmarks.filter(b => b.category === cat.name).length;
        const li = document.createElement('li');
        li.className = `nav-item category-dynamic ${currentFilter.type === 'category' && currentFilter.value === cat.name ? 'active' : ''}`;
        li.dataset.filter = 'category';
        li.dataset.value = cat.name;
        li.innerHTML = `<span>📁 ${escapeHtml(cat.name)}</span><span class="count-badge">${count}</span>`;
        li.addEventListener('click', () => {
            currentFilter = { type: 'category', value: cat.name };
            updateFilterUI();
            filterAndRenderBookmarks();
        });
        list.appendChild(li);
    });
}

function renderTags(tags) {
    const container = document.getElementById('tag-list');
    container.innerHTML = tags.map(tag => {
        const active = currentFilter.type === 'tag' && currentFilter.value === tag;
        return `<span class="tag-item ${active ? 'active' : ''}" data-tag-filter="${tag}">#${tag}</span>`;
    }).join('');

    container.querySelectorAll('[data-tag-filter]').forEach(el => {
        el.addEventListener('click', () => {
            const tag = el.dataset.tagFilter;
            if (currentFilter.type === 'tag' && currentFilter.value === tag) {
                currentFilter = { type: 'all', value: null };
            } else {
                currentFilter = { type: 'tag', value: tag };
            }
            updateFilterUI();
            filterAndRenderBookmarks();
        });
    });
}

function updateFilterUI() {
    document.querySelectorAll('#category-list .nav-item').forEach(el => {
        const type = el.dataset.filter;
        const value = el.dataset.value;
        el.classList.toggle('active',
            (type === 'all' && currentFilter.type === 'all') ||
            (type === 'error' && currentFilter.type === 'error') ||
            (type === currentFilter.type && value === currentFilter.value)
        );
    });

    renderTags(allTags);
}

function filterAndRenderBookmarks() {
    let filtered = [...allBookmarks];
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    if (searchTerm) {
        filtered = filtered.filter(b =>
            b.title.toLowerCase().includes(searchTerm) ||
            b.url.toLowerCase().includes(searchTerm)
        );
    }

    if (currentFilter.type === 'category') {
        filtered = filtered.filter(b => b.category === currentFilter.value);
    } else if (currentFilter.type === 'tag') {
        filtered = filtered.filter(b => (b.tags || []).includes(currentFilter.value));
    } else if (currentFilter.type === 'error') {
        filtered = filtered.filter(b => b.status === 'error');
    }

    const reverse = currentSort.order === 'desc';
    if (currentSort.field === 'title') {
        filtered.sort((a, b) => reverse ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
    } else if (currentSort.field === 'clicks') {
        filtered.sort((a, b) => reverse ? (b.clicks || 0) - (a.clicks || 0) : (a.clicks || 0) - (b.clicks || 0));
    } else if (currentSort.field === 'created_at') {
        filtered.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return reverse ? dateB - dateA : dateA - dateB;
        });
    }

    renderBookmarks(filtered);
}

function openBookmarkModal(bookmark = null) {
    const modal = document.getElementById('bookmark-modal');
    const form = document.getElementById('bookmark-form');
    const title = document.getElementById('modal-title');

    document.getElementById('bookmark-id').value = bookmark ? bookmark.id : '';
    document.getElementById('bookmark-title').value = bookmark ? bookmark.title : '';
    document.getElementById('bookmark-url').value = bookmark ? bookmark.url : '';
    document.getElementById('bookmark-tags').value = bookmark ? (bookmark.tags || []).join(', ') : '';

    const categorySelect = document.getElementById('bookmark-category');
    categorySelect.innerHTML = '<option value="未分类">未分类</option>' +
        allCategories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');

    if (bookmark) {
        title.textContent = '编辑书签';
        categorySelect.value = bookmark.category || '未分类';
    } else {
        title.textContent = '添加书签';
    }

    modal.classList.add('show');
    setTimeout(() => document.getElementById('bookmark-title').focus(), 100);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function loadData() {
    return Promise.all([
        api.get('/api/bookmarks'),
        api.get('/api/categories'),
        api.get('/api/tags')
    ]).then(([bookmarks, categories, tags]) => {
        allBookmarks = bookmarks;
        allCategories = categories;
        allTags = tags;
        renderCategories(categories);
        renderTags(tags);
        filterAndRenderBookmarks();
    });
}

function updateShareValueOptions() {
    const type = document.getElementById('share-type').value;
    const select = document.getElementById('share-value');
    select.innerHTML = '';

    if (type === 'category') {
        allCategories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            select.appendChild(opt);
        });
    } else if (type === 'tag') {
        allTags.forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag;
            opt.textContent = tag;
            select.appendChild(opt);
        });
    }
}

function openShareModal() {
    updateShareValueOptions();
    document.getElementById('share-modal').classList.add('show');
    document.getElementById('share-result').classList.remove('show');
}

function openCategoryModal() {
    const list = document.getElementById('manage-category-list');
    list.innerHTML = allCategories.map(c => `
        <li data-id="${c.id}">
            <div class="item-info">
                <input type="text" value="${escapeHtml(c.name)}" data-category-input="${c.id}">
            </div>
            <div class="item-actions">
                <button data-save="${c.id}">保存</button>
                <button class="danger" data-delete-category="${c.id}">删除</button>
            </div>
        </li>
    `).join('');

    list.querySelectorAll('[data-save]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.save;
            const input = document.querySelector(`[data-category-input="${id}"]`);
            const newName = input.value.trim();
            if (newName) {
                api.put(`/api/categories/${id}`, { name: newName }).then(result => {
                    if (result.error) {
                        showToast(result.error, 'error');
                    } else {
                        showToast('更新成功', 'success');
                        loadData().then(() => openCategoryModal());
                    }
                });
            }
        });
    });

    list.querySelectorAll('[data-delete-category]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.deleteCategory;
            if (confirm('确定要删除这个分类吗？该分类下的书签将移动到"未分类"。')) {
                api.delete(`/api/categories/${id}`).then(() => {
                    showToast('删除成功', 'success');
                    loadData().then(() => openCategoryModal());
                });
            }
        });
    });

    document.getElementById('category-modal').classList.add('show');
}

function openBackupModal() {
    loadBackups();
    document.getElementById('backup-modal').classList.add('show');
}

function loadBackups() {
    api.get('/api/backups').then(backups => {
        const list = document.getElementById('backup-list');
        if (backups.length === 0) {
            list.innerHTML = '<li style="justify-content:center; color: var(--text-muted);">暂无备份</li>';
            return;
        }
        list.innerHTML = backups.map(b => `
            <li>
                <div class="item-info">
                    <div><strong>${escapeHtml(b.filename)}</strong></div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">${formatDate(b.created_at)} · ${(b.size / 1024).toFixed(1)} KB</div>
                </div>
                <div class="item-actions">
                    <button data-restore="${b.filename}">恢复</button>
                </div>
            </li>
        `).join('');

        list.querySelectorAll('[data-restore]').forEach(btn => {
            btn.addEventListener('click', () => {
                const filename = btn.dataset.restore;
                if (confirm('确定要恢复这个备份吗？当前数据将被覆盖。')) {
                    api.post(`/api/restore/${filename}`, {}).then(() => {
                        showToast('恢复成功', 'success');
                        loadData();
                        closeModal('backup-modal');
                    });
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadData();

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    document.getElementById('add-bookmark-btn').addEventListener('click', () => openBookmarkModal());

    document.querySelectorAll('#category-list .nav-item').forEach(el => {
        el.addEventListener('click', () => {
            const type = el.dataset.filter;
            if (type === 'all' || type === 'error') {
                currentFilter = { type, value: null };
                updateFilterUI();
                filterAndRenderBookmarks();
            }
        });
    });

    document.getElementById('add-category-btn').addEventListener('click', openCategoryModal);

    document.getElementById('add-category-confirm').addEventListener('click', () => {
        const name = document.getElementById('new-category-name').value.trim();
        if (name) {
            api.post('/api/categories', { name }).then(result => {
                if (result.error) {
                    showToast(result.error, 'error');
                } else {
                    document.getElementById('new-category-name').value = '';
                    showToast('添加成功', 'success');
                    loadData().then(() => openCategoryModal());
                }
            });
        }
    });

    document.getElementById('search-input').addEventListener('input', filterAndRenderBookmarks);

    document.getElementById('sort-select').addEventListener('change', (e) => {
        const [field, order] = e.target.value.split('_');
        currentSort = { field, order };
        filterAndRenderBookmarks();
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            filterAndRenderBookmarks();
        });
    });

    document.getElementById('bookmark-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('bookmark-id').value;
        const data = {
            title: document.getElementById('bookmark-title').value.trim(),
            url: document.getElementById('bookmark-url').value.trim(),
            category: document.getElementById('bookmark-category').value,
            tags: document.getElementById('bookmark-tags').value.split(',').map(t => t.trim()).filter(t => t)
        };

        if (!data.url.startsWith('http://') && !data.url.startsWith('https://')) {
            data.url = 'https://' + data.url;
        }

        const promise = id ? api.put(`/api/bookmarks/${id}`, data) : api.post('/api/bookmarks', data);
        promise.then(() => {
            showToast(id ? '更新成功' : '添加成功', 'success');
            closeModal('bookmark-modal');
            loadData();
        });
    });

    document.getElementById('check-all-btn').addEventListener('click', () => {
        api.post('/api/bookmarks/check', {}).then(() => {
            showToast('正在检查所有链接，刷新后查看结果', 'success');
            setTimeout(loadData, 2000);
        });
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        window.location.href = '/api/export/html';
        showToast('导出成功', 'success');
    });

    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-modal').classList.add('show');
        document.getElementById('import-result').classList.remove('show');
    });

    document.getElementById('import-confirm-btn').addEventListener('click', () => {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        if (!file) {
            showToast('请选择文件', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        fetch('/api/import/html', {
            method: 'POST',
            body: formData
        }).then(r => r.json()).then(result => {
            const resultEl = document.getElementById('import-result');
            resultEl.className = 'import-result show success';
            resultEl.textContent = `成功导入 ${result.imported} 个书签`;
            showToast(`导入 ${result.imported} 个书签`, 'success');
            loadData();
        });
    });

    document.getElementById('backup-btn').addEventListener('click', openBackupModal);

    document.getElementById('create-backup-btn').addEventListener('click', () => {
        api.get('/api/backup').then(result => {
            showToast(`备份创建成功: ${result.filename}`, 'success');
            loadBackups();
        });
    });

    document.getElementById('restore-btn').addEventListener('click', openBackupModal);

    document.getElementById('share-type').addEventListener('change', updateShareValueOptions);

    document.getElementById('create-share-btn').addEventListener('click', () => {
        const type = document.getElementById('share-type').value;
        const value = document.getElementById('share-value').value;
        api.post('/api/share', { type, value }).then(result => {
            const resultEl = document.getElementById('share-result');
            const fullUrl = window.location.origin + result.url;
            resultEl.className = 'share-result show success';
            resultEl.innerHTML = `分享链接已生成: <a href="${result.url}" target="_blank">${fullUrl}</a>`;
            navigator.clipboard.writeText(fullUrl).then(() => {
                showToast('链接已复制到剪贴板', 'success');
            });
        });
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('show');
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
        }
        if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            openBookmarkModal();
        }
        if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
            if (document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                document.getElementById('search-input').focus();
            }
        }
    });
});
