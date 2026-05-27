const STORAGE_KEYS = {
    READ_ARTICLES: 'news_aggregator_read',
    FAVORITES: 'news_aggregator_favorites',
    THEME: 'news_aggregator_theme',
    CACHE: 'news_aggregator_cache'
};

const state = {
    articles: [],
    feeds: [],
    favorites: [],
    readArticles: new Set(),
    filters: {
        keyword: '',
        days: 0,
        favoritesOnly: false
    },
    isOnline: navigator.onLine
};

function init() {
    loadFromStorage();
    applyTheme();
    setupEventListeners();
    loadFeeds();
    loadArticles();
    setupAutoRefresh();
    setupOnlineListeners();
}

function loadFromStorage() {
    try {
        const read = localStorage.getItem(STORAGE_KEYS.READ_ARTICLES);
        if (read) state.readArticles = new Set(JSON.parse(read));

        const favs = localStorage.getItem(STORAGE_KEYS.FAVORITES);
        if (favs) state.favorites = JSON.parse(favs);
    } catch (e) {
        console.error('加载本地存储失败:', e);
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.READ_ARTICLES, JSON.stringify([...state.readArticles]));
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(state.favorites));
    } catch (e) {
        console.error('保存本地存储失败:', e);
    }
}

function applyTheme() {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButton(theme);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('darkModeBtn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    updateThemeButton(newTheme);
}

function setupEventListeners() {
    document.getElementById('darkModeBtn').addEventListener('click', toggleTheme);
    document.getElementById('refreshBtn').addEventListener('click', () => {
        showToast('正在刷新新闻...');
        fetchFeeds();
    });
    document.getElementById('dailyReportBtn').addEventListener('click', generateDailyReport);

    document.getElementById('feedForm').addEventListener('submit', handleAddFeed);
    document.getElementById('keywordSearch').addEventListener('input', debounce(handleKeywordSearch, 300));
    document.getElementById('timeRange').addEventListener('change', handleTimeRangeChange);
    document.getElementById('showFavoritesOnly').addEventListener('change', handleFavoritesOnlyChange);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    document.getElementById('opmlFile').addEventListener('change', handleOpmlImport);
    document.getElementById('exportOpmlBtn').addEventListener('click', handleOpmlExport);

    document.getElementById('qrModalClose').addEventListener('click', () => hideModal('qrModal'));
    document.getElementById('reportModalClose').addEventListener('click', () => hideModal('reportModal'));
    document.getElementById('copyReportBtn').addEventListener('click', copyReport);

    document.getElementById('qrModal').addEventListener('click', (e) => {
        if (e.target.id === 'qrModal') hideModal('qrModal');
    });
    document.getElementById('reportModal').addEventListener('click', (e) => {
        if (e.target.id === 'reportModal') hideModal('reportModal');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal('qrModal');
            hideModal('reportModal');
        }
    });
}

function setupOnlineListeners() {
    window.addEventListener('online', () => {
        state.isOnline = true;
        document.getElementById('offlineBanner').style.display = 'none';
        showToast('已恢复网络连接');
        loadArticles();
    });

    window.addEventListener('offline', () => {
        state.isOnline = false;
        document.getElementById('offlineBanner').style.display = 'block';
        showToast('网络已断开，显示缓存内容');
    });

    if (!state.isOnline) {
        document.getElementById('offlineBanner').style.display = 'block';
    }
}

function setupAutoRefresh() {
    setInterval(() => {
        if (state.isOnline) {
            loadArticles(true);
        }
    }, 60000);
}

async function loadFeeds() {
    try {
        const response = await fetch('/api/feeds');
        state.feeds = await response.json();
        renderFeeds();
        updateStatus();
    } catch (e) {
        console.error('加载订阅源失败:', e);
    }
}

async function loadArticles(silent = false) {
    if (!silent) {
        showLoadingState();
    }

    try {
        const params = new URLSearchParams();
        if (state.filters.keyword) params.set('keyword', state.filters.keyword);
        if (state.filters.days > 0) params.set('days', state.filters.days);

        const response = await fetch(`/api/articles?${params.toString()}`);
        const data = await response.json();
        state.articles = data.articles;

        if (state.isOnline) {
            localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(state.articles));
        }

        renderArticles();
        updateFilterInfo();
    } catch (e) {
        console.error('加载文章失败:', e);

        const cached = localStorage.getItem(STORAGE_KEYS.CACHE);
        if (cached) {
            state.articles = JSON.parse(cached);
            renderArticles();
            showToast('加载失败，显示缓存内容');
        } else {
            showErrorState();
        }
    }
}

async function fetchFeeds() {
    try {
        const response = await fetch('/api/fetch', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast(`已刷新 ${data.feed_count} 个订阅源`);
            loadFeeds();
            loadArticles();
        }
    } catch (e) {
        console.error('刷新失败:', e);
        showToast('刷新失败，请检查网络连接');
    }
}

async function handleAddFeed(e) {
    e.preventDefault();
    const url = document.getElementById('feedUrl').value.trim();
    const name = document.getElementById('feedName').value.trim();

    if (!url) {
        showToast('请输入RSS源URL');
        return;
    }

    try {
        const response = await fetch('/api/feeds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, name })
        });

        const data = await response.json();
        if (data.success) {
            showToast('RSS源添加成功！');
            document.getElementById('feedUrl').value = '';
            document.getElementById('feedName').value = '';
            loadFeeds();
            loadArticles();
        } else {
            showToast(data.error || '添加失败');
        }
    } catch (e) {
        showToast('添加失败，请重试');
    }
}

async function handleDeleteFeed(url) {
    if (!confirm('确定要删除这个订阅源吗？')) return;

    try {
        const response = await fetch(`/api/feeds/${encodeURIComponent(url)}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
            showToast('订阅源已删除');
            loadFeeds();
            loadArticles();
        }
    } catch (e) {
        showToast('删除失败');
    }
}

async function handleOpmlImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/opml/import', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            showToast(`成功导入 ${data.imported} 个订阅源`);
            loadFeeds();
            loadArticles();
        } else {
            showToast(data.error || '导入失败');
        }
    } catch (e) {
        showToast('导入失败');
    }

    e.target.value = '';
}

function handleOpmlExport() {
    window.location.href = '/api/opml/export';
}

async function generateDailyReport() {
    showModal('reportModal');
    document.getElementById('reportContent').textContent = '正在生成日报...';

    try {
        const response = await fetch('/api/daily-report');
        const data = await response.json();
        document.getElementById('reportContent').textContent = data.report;
    } catch (e) {
        document.getElementById('reportContent').textContent = '生成日报失败，请稍后重试。';
    }
}

function copyReport() {
    const content = document.getElementById('reportContent').textContent;
    navigator.clipboard.writeText(content).then(() => {
        showToast('日报已复制到剪贴板');
    }).catch(() => {
        showToast('复制失败');
    });
}

function handleKeywordSearch(e) {
    state.filters.keyword = e.target.value;
    loadArticles(true);
}

function handleTimeRangeChange(e) {
    state.filters.days = parseInt(e.target.value);
    loadArticles(true);
}

function handleFavoritesOnlyChange(e) {
    state.filters.favoritesOnly = e.target.checked;
    renderArticles();
}

function clearFilters() {
    state.filters = { keyword: '', days: 0, favoritesOnly: false };
    document.getElementById('keywordSearch').value = '';
    document.getElementById('timeRange').value = '0';
    document.getElementById('showFavoritesOnly').checked = false;
    loadArticles();
}

function updateFilterInfo() {
    const info = document.getElementById('filterInfo');
    const parts = [];

    if (state.filters.keyword) {
        parts.push(`关键词: "${state.filters.keyword}"`);
    }
    if (state.filters.days > 0) {
        const dayText = state.filters.days === 1 ? '最近1天' : `最近${state.filters.days}天`;
        parts.push(dayText);
    }
    if (state.filters.favoritesOnly) {
        parts.push('仅收藏');
    }

    if (parts.length > 0) {
        info.style.display = 'flex';
        info.innerHTML = `
            <span>筛选: ${parts.join(' | ')}</span>
            <span>共 ${state.articles.length} 条</span>
        `;
    } else {
        info.style.display = 'none';
    }
}

function updateStatus() {
    const badge = document.getElementById('statusBadge');
    const count = state.feeds.length;
    badge.textContent = `${count} 个订阅源`;
    badge.classList.toggle('active', count > 0);
}

function renderFeeds() {
    const container = document.getElementById('feedsList');
    if (state.feeds.length === 0) {
        container.innerHTML = '<p class="empty-text">暂无订阅源</p>';
        return;
    }

    container.innerHTML = state.feeds.map(feed => `
        <div class="feed-item">
            <div class="feed-item-header">
                <span class="feed-item-name" title="${feed.name}">${feed.name}</span>
                <button class="feed-item-delete" data-url="${feed.url}" title="删除">✕</button>
            </div>
            <div class="feed-item-meta">
                ${feed.article_count || 0} 篇 · ${feed.last_update || '-'}
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.feed-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.getAttribute('data-url');
            handleDeleteFeed(url);
        });
    });
}

function renderArticles() {
    const container = document.getElementById('articlesList');

    let articles = state.articles;

    if (state.filters.favoritesOnly) {
        const favIds = new Set(state.favorites.map(f => f.id));
        articles = articles.filter(a => favIds.has(a.id));
    }

    if (articles.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <p>暂无新闻</p>
            </div>
        `;
        return;
    }

    container.innerHTML = articles.map(article => renderArticleCard(article)).join('');

    container.querySelectorAll('.article-card').forEach(card => {
        const id = card.getAttribute('data-id');

        card.querySelector('.article-title').addEventListener('click', () => {
            markAsRead(id);
        });

        card.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.preventDefault();
            toggleFavorite(id);
        });

        card.querySelector('.share-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showQrCode(article.link);
        });

        card.querySelector('.read-btn').addEventListener('click', (e) => {
            e.preventDefault();
            markAsRead(id);
        });
    });
}

function renderArticleCard(article) {
    const isRead = state.readArticles.has(article.id);
    const isFavorite = state.favorites.some(f => f.id === article.id);
    const sentimentClass = `sentiment-${article.sentiment}`;
    const sentimentText = article.sentiment === 'positive' ? '😊 正面' :
                          article.sentiment === 'negative' ? '😟 负面' : '😐 中性';

    return `
        <article class="article-card ${isRead ? 'read' : ''} ${isFavorite ? 'favorite' : ''}" data-id="${article.id}">
            <div class="article-header">
                <a href="${article.link}" target="_blank" rel="noopener" class="article-title">
                    ${escapeHtml(article.title)}
                </a>
                <div class="article-actions">
                    <button class="article-action-btn favorite-btn ${isFavorite ? 'active' : ''}" title="${isFavorite ? '取消收藏' : '收藏'}">
                        ${isFavorite ? '⭐' : '☆'}
                    </button>
                    <button class="article-action-btn read-btn ${isRead ? 'active' : ''}" title="${isRead ? '标记未读' : '标记已读'}">
                        ${isRead ? '✓' : '○'}
                    </button>
                    <button class="article-action-btn share-btn" title="分享">
                        🔗
                    </button>
                </div>
            </div>
            <div class="article-meta">
                <span class="article-meta-item article-source">${escapeHtml(article.source)}</span>
                <span class="article-meta-item">🕐 ${article.published}</span>
                <span class="article-meta-item sentiment-badge ${sentimentClass}">${sentimentText}</span>
            </div>
            ${article.summary ? `<p class="article-summary">${escapeHtml(article.summary)}</p>` : ''}
        </article>
    `;
}

function markAsRead(id) {
    if (state.readArticles.has(id)) {
        state.readArticles.delete(id);
    } else {
        state.readArticles.add(id);
    }
    saveToStorage();

    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
        card.classList.toggle('read');
        const btn = card.querySelector('.read-btn');
        const isRead = state.readArticles.has(id);
        btn.textContent = isRead ? '✓' : '○';
        btn.classList.toggle('active', isRead);
    }
}

function toggleFavorite(id) {
    const article = state.articles.find(a => a.id === id);
    if (!article) return;

    const index = state.favorites.findIndex(f => f.id === id);
    if (index > -1) {
        state.favorites.splice(index, 1);
        showToast('已取消收藏');
    } else {
        state.favorites.push(article);
        showToast('已添加到收藏');
    }

    saveToStorage();

    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
        card.classList.toggle('favorite');
        const btn = card.querySelector('.favorite-btn');
        const isFav = state.favorites.some(f => f.id === id);
        btn.textContent = isFav ? '⭐' : '☆';
        btn.classList.toggle('active', isFav);
    }
}

async function showQrCode(url) {
    showModal('qrModal');
    document.getElementById('qrImageContainer').innerHTML = '<div class="spinner"></div>';
    document.getElementById('qrUrl').textContent = url;

    try {
        const response = await fetch(`/api/qrcode?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.qrcode) {
            document.getElementById('qrImageContainer').innerHTML = `
                <img src="data:image/png;base64,${data.qrcode}" alt="QR Code">
            `;
        }
    } catch (e) {
        document.getElementById('qrImageContainer').innerHTML = '<p>生成二维码失败</p>';
    }
}

function showModal(id) {
    document.getElementById(id).style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideModal(id) {
    document.getElementById(id).style.display = 'none';
    document.body.style.overflow = '';
}

function showLoadingState() {
    const container = document.getElementById('articlesList');
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>正在加载新闻...</p>
        </div>
    `;
}

function showErrorState() {
    const container = document.getElementById('articlesList');
    container.innerHTML = `
        <div class="loading-state">
            <p>加载失败，请稍后重试</p>
        </div>
    `;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

document.addEventListener('DOMContentLoaded', init);