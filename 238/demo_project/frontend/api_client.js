class APIClient {
    constructor(baseUrl, apiKey) {
        this.metrics = { requests: 0, errors: 0 };
        this._baseUrl = baseUrl;
        this._apiKey = apiKey;
        this._retries = 3;
        this._timeout = 30000;
        this._headers = {};
    }

    async makeRequest(endpoint, method, data, options) {
        const cache = {};
        const config = {
            method: method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._apiKey}`,
                ...options?.headers
            },
            ...options
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        const url = `${this._baseUrl}/${endpoint.replace(/^\//, '')}`;

        for (let attempt = 0; attempt < this._retries; attempt++) {
            try {
                const response = await fetch(url, config);
                if (response.ok) {
                    const responseData = await response.json();
                    this.metrics.requests++;
                    if (options?.cache) {
                        cache[endpoint] = { data: responseData, timestamp: Date.now() };
                    }
                    return responseData;
                }
                throw new Error(`HTTP ${response.status}`);
            } catch (err) {
                this.metrics.errors++;
                if (attempt === this._retries - 1) {
                    throw err;
                }
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
        }
    }

    async get(endpoint, options) {
        return this.makeRequest(endpoint, 'GET', null, options);
    }

    async post(endpoint, data, options) {
        return this.makeRequest(endpoint, 'POST', data, options);
    }

    async put(endpoint, data, options) {
        return this.makeRequest(endpoint, 'PUT', data, options);
    }

    async delete(endpoint, options) {
        return this.makeRequest(endpoint, 'DELETE', null, options);
    }
}
