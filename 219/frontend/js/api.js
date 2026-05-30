const API_BASE = 'http://127.0.0.1:5555';

const Api = {
    async colorize(imageFile, warmth = 0, saturation = 1) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('warmth', warmth);
        formData.append('saturation', saturation);

        const resp = await fetch(`${API_BASE}/api/colorize`, {
            method: 'POST',
            body: formData
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }

        return resp.json();
    },

    async colorizeRegion(imageFile, maskFile, warmth = 0, saturation = 1) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('mask', maskFile);
        formData.append('warmth', warmth);
        formData.append('saturation', saturation);

        const resp = await fetch(`${API_BASE}/api/colorize_region`, {
            method: 'POST',
            body: formData
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }

        return resp.json();
    },

    async adjust(imageFile, warmth = 0, saturation = 1) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('warmth', warmth);
        formData.append('saturation', saturation);

        const resp = await fetch(`${API_BASE}/api/adjust`, {
            method: 'POST',
            body: formData
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }

        return resp.json();
    },

    async batchColorize(zipFile, warmth = 0, saturation = 1) {
        const formData = new FormData();
        formData.append('archive', zipFile);
        formData.append('warmth', warmth);
        formData.append('saturation', saturation);

        const resp = await fetch(`${API_BASE}/api/batch_colorize`, {
            method: 'POST',
            body: formData
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }

        return resp.json();
    },

    async getQueueStatus() {
        const resp = await fetch(`${API_BASE}/api/queue_status`);
        if (!resp.ok) throw new Error('Failed to get queue status');
        return resp.json();
    },

    getResultUrl(taskId) {
        return `${API_BASE}/api/result/${taskId}`;
    },

    getBatchResultUrl(batchId) {
        return `${API_BASE}/api/batch_result/${batchId}`;
    },

    async checkHealth() {
        try {
            const resp = await fetch(`${API_BASE}/api/queue_status`, { signal: AbortSignal.timeout(3000) });
            return resp.ok;
        } catch {
            return false;
        }
    }
};
