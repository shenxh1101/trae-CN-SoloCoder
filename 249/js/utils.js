const Utils = {
    EMOTION_CONFIG: {
        happy: { name: '高兴', emoji: '😊', color: '#fbbf24' },
        sad: { name: '悲伤', emoji: '😢', color: '#3b82f6' },
        surprised: { name: '惊讶', emoji: '😮', color: '#f97316' },
        angry: { name: '愤怒', emoji: '😠', color: '#ef4444' },
        fearful: { name: '恐惧', emoji: '😨', color: '#8b5cf6' },
        disgusted: { name: '厌恶', emoji: '😖', color: '#22c55e' },
        neutral: { name: '中性', emoji: '😐', color: '#6b7280' }
    },

    getEmotionInfo(emotionKey) {
        return this.EMOTION_CONFIG[emotionKey] || this.EMOTION_CONFIG.neutral;
    },

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    formatPercent(value) {
        return Math.round(value * 100) + '%';
    },

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    downloadDataUrl(dataUrl, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
    },

    downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    },

    getStoredSettings() {
        try {
            const stored = localStorage.getItem('emotionMirrorSettings');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    },

    saveSettings(settings) {
        try {
            localStorage.setItem('emotionMirrorSettings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    },

    getStoredEmotionHistory() {
        try {
            const stored = localStorage.getItem('emotionMirrorHistory');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },

    saveEmotionHistory(history) {
        try {
            const recent = history.slice(-3600);
            localStorage.setItem('emotionMirrorHistory', JSON.stringify(recent));
        } catch (e) {
            console.warn('Failed to save history:', e);
        }
    },

    clearEmotionHistory() {
        try {
            localStorage.removeItem('emotionMirrorHistory');
        } catch (e) {
            console.warn('Failed to clear history:', e);
        }
    }
};
