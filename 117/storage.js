const SnakeStorage = {
    HIGHSCORE_KEY: 'snake_highscore',
    CUSTOM_MAPS_KEY: 'snake_custom_maps',

    getHighScores() {
        try {
            const data = localStorage.getItem(this.HIGHSCORE_KEY);
            if (data) return JSON.parse(data);
        } catch (e) {}
        return { single: 0, dual: 0 };
    },

    saveHighScore(mode, score) {
        const scores = this.getHighScores();
        if (mode === 'single' && score > scores.single) {
            scores.single = score;
        } else if (mode === 'dual' && score > scores.dual) {
            scores.dual = score;
        }
        try {
            localStorage.setItem(this.HIGHSCORE_KEY, JSON.stringify(scores));
        } catch (e) {}
        return scores;
    },

    getCustomMaps() {
        try {
            const data = localStorage.getItem(this.CUSTOM_MAPS_KEY);
            if (data) return JSON.parse(data);
        } catch (e) {}
        return [];
    },

    saveCustomMap(name, mapData) {
        const maps = this.getCustomMaps();
        const existing = maps.findIndex(m => m.name === name);
        if (existing >= 0) {
            maps[existing].data = mapData;
        } else {
            maps.push({ name, data: mapData });
        }
        try {
            localStorage.setItem(this.CUSTOM_MAPS_KEY, JSON.stringify(maps));
        } catch (e) {}
        return maps;
    },

    deleteCustomMap(name) {
        let maps = this.getCustomMaps();
        maps = maps.filter(m => m.name !== name);
        try {
            localStorage.setItem(this.CUSTOM_MAPS_KEY, JSON.stringify(maps));
        } catch (e) {}
        return maps;
    }
};
