const StorageManager = {
    KEYS: {
        STATE: 'sokoban_state',
        BEST_STEPS: 'sokoban_best_steps',
        CUSTOM_LEVELS: 'sokoban_custom_levels',
        SETTINGS: 'sokoban_settings'
    },

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    },

    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            return defaultValue;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing from localStorage:', e);
            return false;
        }
    },

    saveGameState(state) {
        return this.save(this.KEYS.STATE, {
            currentLevel: state.currentLevel,
            steps: state.steps,
            map: state.map,
            playerPos: state.playerPos,
            history: state.history.slice(-10)
        });
    },

    loadGameState() {
        return this.load(this.KEYS.STATE, null);
    },

    clearGameState() {
        return this.remove(this.KEYS.STATE);
    },

    getBestSteps(levelId) {
        const bestSteps = this.load(this.KEYS.BEST_STEPS, {});
        return bestSteps[levelId] || null;
    },

    saveBestSteps(levelId, steps) {
        const bestSteps = this.load(this.KEYS.BEST_STEPS, {});
        if (!bestSteps[levelId] || steps < bestSteps[levelId]) {
            bestSteps[levelId] = steps;
            this.save(this.KEYS.BEST_STEPS, bestSteps);
            return true;
        }
        return false;
    },

    getCustomLevels() {
        return this.load(this.KEYS.CUSTOM_LEVELS, []);
    },

    saveCustomLevel(level) {
        const customLevels = this.getCustomLevels();
        const existingIndex = customLevels.findIndex(l => l.id === level.id);
        if (existingIndex >= 0) {
            customLevels[existingIndex] = level;
        } else {
            customLevels.push(level);
        }
        return this.save(this.KEYS.CUSTOM_LEVELS, customLevels);
    },

    deleteCustomLevel(levelId) {
        const customLevels = this.getCustomLevels().filter(l => l.id !== levelId);
        return this.save(this.KEYS.CUSTOM_LEVELS, customLevels);
    },

    saveSetting(key, value) {
        const settings = this.load(this.KEYS.SETTINGS, {});
        settings[key] = value;
        return this.save(this.KEYS.SETTINGS, settings);
    },

    loadSetting(key, defaultValue = null) {
        const settings = this.load(this.KEYS.SETTINGS, {});
        return settings.hasOwnProperty(key) ? settings[key] : defaultValue;
    },

    exportLevels(includeBuiltin = true, includeCustom = true) {
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            levels: []
        };

        if (includeBuiltin) {
            exportData.levels.push(...BUILTIN_LEVELS.map(l => ({ ...l, type: 'builtin' })));
        }

        if (includeCustom) {
            const customLevels = this.getCustomLevels();
            exportData.levels.push(...customLevels.map(l => ({ ...l, type: 'custom' })));
        }

        return exportData;
    },

    downloadJSON(data, filename = 'sokoban-levels.json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importLevels(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.levels || !Array.isArray(data.levels)) {
                        reject(new Error('无效的关卡文件格式'));
                        return;
                    }

                    const imported = [];
                    const errors = [];

                    data.levels.forEach((level, index) => {
                        const validation = validateLevel(level.map);
                        if (!validation.valid) {
                            errors.push(`关卡 ${index + 1}: ${validation.errors.join(', ')}`);
                            return;
                        }

                        if (level.type === 'custom' || !level.type) {
                            const customLevel = {
                                id: level.id || `custom_${Date.now()}_${index}`,
                                name: level.name || `自定义关卡 ${index + 1}`,
                                map: level.map
                            };
                            this.saveCustomLevel(customLevel);
                            imported.push(customLevel);
                        }
                    });

                    resolve({ imported, errors });
                } catch (err) {
                    reject(new Error('JSON解析失败: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    },

    exportAllData() {
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            builtinLevels: BUILTIN_LEVELS,
            customLevels: this.getCustomLevels(),
            bestSteps: this.load(this.KEYS.BEST_STEPS, {}),
            settings: this.load(this.KEYS.SETTINGS, {})
        };
    }
};
