class HistoryManager {
    constructor() {
        this.storageKey = 'photoRepairHistory';
        this.maxItems = 50;
    }

    getAll() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('读取历史记录失败:', error);
            return [];
        }
    }

    async add(record) {
        try {
            const history = this.getAll();
            
            const thumbnailSize = 200;
            const originalThumb = await Tools.resizeImage(record.original, thumbnailSize, thumbnailSize);
            const repairedThumb = await Tools.resizeImage(record.repaired, thumbnailSize, thumbnailSize);

            const newRecord = {
                id: Tools.generateId(),
                timestamp: Date.now(),
                originalThumb,
                repairedThumb,
                settings: record.settings,
                original: record.original,
                repaired: record.repaired
            };

            history.unshift(newRecord);

            if (history.length > this.maxItems) {
                history.splice(this.maxItems);
            }

            localStorage.setItem(this.storageKey, JSON.stringify(history));
            return newRecord;
        } catch (error) {
            console.error('保存历史记录失败:', error);
            return null;
        }
    }

    getById(id) {
        const history = this.getAll();
        return history.find(item => item.id === id) || null;
    }

    delete(id) {
        try {
            const history = this.getAll();
            const filtered = history.filter(item => item.id !== id);
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('删除历史记录失败:', error);
            return false;
        }
    }

    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('清空历史记录失败:', error);
            return false;
        }
    }

    renderHistoryGrid(container, onLoadCallback) {
        const history = this.getAll();
        
        if (history.length === 0) {
            container.innerHTML = '<p class="empty-history-text">暂无修复记录</p>';
            return;
        }

        container.innerHTML = history.map(record => this.createHistoryCard(record, onLoadCallback)).join('');
    }

    createHistoryCard(record, onLoadCallback) {
        const settingsTags = [];
        if (record.settings) {
            if (record.settings.intensity) {
                const intensityText = record.settings.intensity === 'weak' ? '弱' : 
                                      record.settings.intensity === 'medium' ? '中' : '强';
                settingsTags.push(`<span class="setting-tag">强度:${intensityText}</span>`);
            }
            if (record.settings.operations) {
                if (record.settings.operations.denoise) settingsTags.push('<span class="setting-tag">去噪</span>');
                if (record.settings.operations.sharpen) settingsTags.push('<span class="setting-tag">锐化</span>');
                if (record.settings.operations.contrast) settingsTags.push('<span class="setting-tag">对比度</span>');
                if (record.settings.operations.colorize) settingsTags.push('<span class="setting-tag">上色</span>');
                if (record.settings.operations.removeScratches) settingsTags.push('<span class="setting-tag">去划痕</span>');
            }
        }

        return `
            <div class="history-card" data-id="${record.id}">
                <div class="history-card-images">
                    <img src="${record.originalThumb}" alt="原图">
                    <img src="${record.repairedThumb}" alt="修复后">
                </div>
                <div class="history-card-info">
                    <p class="history-card-time">${Tools.formatDate(record.timestamp)}</p>
                    <div class="history-card-settings">
                        ${settingsTags.join('')}
                    </div>
                </div>
                <div class="history-card-actions">
                    <button class="btn btn-secondary btn-small" onclick="window.loadHistoryItem('${record.id}')">
                        加载
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="window.deleteHistoryItem('${record.id}')">
                        删除
                    </button>
                </div>
            </div>
        `;
    }
}

const historyManager = new HistoryManager();
