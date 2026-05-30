const History = {
    STORAGE_KEY: 'colorization_history',
    MAX_ITEMS: 50,

    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    save(entry) {
        const items = this.getAll();
        items.unshift(entry);
        if (items.length > this.MAX_ITEMS) {
            items.length = this.MAX_ITEMS;
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    },

    remove(id) {
        const items = this.getAll().filter(i => i.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    },

    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    exportData() {
        const data = this.getAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `colorization_history_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (Array.isArray(data)) {
                        const existing = this.getAll();
                        const existingIds = new Set(existing.map(i => i.id));
                        const newItems = data.filter(i => !existingIds.has(i.id));
                        const merged = [...newItems, ...existing];
                        if (merged.length > this.MAX_ITEMS) merged.length = this.MAX_ITEMS;
                        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
                        resolve(merged);
                    } else {
                        reject(new Error('Invalid format'));
                    }
                } catch {
                    reject(new Error('Parse error'));
                }
            };
            reader.readAsText(file);
        });
    },

    async createEntry(originalDataUrl, colorizedDataUrl, params) {
        const [originalThumb, colorizedThumb] = await Promise.all([
            this._createThumbnail(originalDataUrl, 96),
            this._createThumbnail(colorizedDataUrl, 96)
        ]);
        return {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            timestamp: Date.now(),
            originalThumb,
            colorizedThumb,
            originalDataUrl,
            colorizedDataUrl,
            params: {
                warmth: params.warmth || 0,
                saturation: params.saturation || 1
            }
        };
    },

    _createThumbnail(dataUrl, size) {
        return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(size / img.width, size / img.height);
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                try {
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                } catch {
                    resolve('');
                }
            };
            img.onerror = () => resolve('');
            img.src = dataUrl;
        });
    },

    renderList(container, onSelect, onDelete) {
        const items = this.getAll();
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<p class="empty-hint">暂无着色历史</p>';
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <img class="history-thumb" src="${item.colorizedThumb || item.originalThumb || ''}" alt="">
                <div class="history-info">
                    <p>${new Date(item.timestamp).toLocaleString('zh-CN')}</p>
                    <p>暖色: ${item.params.warmth} | 饱和度: ${Math.round(item.params.saturation * 100)}%</p>
                </div>
                <div class="history-actions">
                    <button class="btn btn-icon btn-delete" title="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                </div>
            `;

            div.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(item.id);
                if (onDelete) onDelete(item.id);
                this.renderList(container, onSelect, onDelete);
            });

            div.addEventListener('click', () => {
                if (onSelect) onSelect(item);
            });

            container.appendChild(div);
        });
    }
};
