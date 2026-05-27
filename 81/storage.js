const Storage = (function() {
    const PREFIX = '2048_';

    const KEYS = {
        GAME_STATE: 'gameState',
        BEST_SCORE: 'bestScore',
        LEADERBOARD: 'leaderboard',
        THEME: 'theme',
        DIFFICULTY: 'difficulty',
        SOUND_ENABLED: 'soundEnabled',
        PREVIEW_ENABLED: 'previewEnabled'
    };

    function getKey(key) {
        return PREFIX + key;
    }

    function saveGame(gameState) {
        try {
            localStorage.setItem(getKey(KEYS.GAME_STATE), JSON.stringify(gameState));
        } catch (e) {
            console.error('Failed to save game:', e);
        }
    }

    function loadGame() {
        try {
            const data = localStorage.getItem(getKey(KEYS.GAME_STATE));
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }

    function clearGame() {
        localStorage.removeItem(getKey(KEYS.GAME_STATE));
    }

    function saveBestScore(score) {
        try {
            localStorage.setItem(getKey(KEYS.BEST_SCORE), score.toString());
        } catch (e) {
            console.error('Failed to save best score:', e);
        }
    }

    function loadBestScore() {
        try {
            const score = localStorage.getItem(getKey(KEYS.BEST_SCORE));
            return score ? parseInt(score, 10) : 0;
        } catch (e) {
            console.error('Failed to load best score:', e);
            return 0;
        }
    }

    function saveLeaderboard(leaderboard) {
        try {
            localStorage.setItem(getKey(KEYS.LEADERBOARD), JSON.stringify(leaderboard));
        } catch (e) {
            console.error('Failed to save leaderboard:', e);
        }
    }

    function loadLeaderboard() {
        try {
            const data = localStorage.getItem(getKey(KEYS.LEADERBOARD));
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load leaderboard:', e);
            return [];
        }
    }

    function addToLeaderboard(score) {
        const leaderboard = loadLeaderboard();
        leaderboard.push({
            score: score,
            date: new Date().toLocaleDateString('zh-CN')
        });
        leaderboard.sort((a, b) => b.score - a.score);
        const top5 = leaderboard.slice(0, 5);
        saveLeaderboard(top5);
        return top5;
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(getKey(KEYS.THEME), theme);
        } catch (e) {
            console.error('Failed to save theme:', e);
        }
    }

    function loadTheme() {
        try {
            return localStorage.getItem(getKey(KEYS.THEME)) || 'light';
        } catch (e) {
            console.error('Failed to load theme:', e);
            return 'light';
        }
    }

    function saveDifficulty(difficulty) {
        try {
            localStorage.setItem(getKey(KEYS.DIFFICULTY), difficulty);
        } catch (e) {
            console.error('Failed to save difficulty:', e);
        }
    }

    function loadDifficulty() {
        try {
            return localStorage.getItem(getKey(KEYS.DIFFICULTY)) || 'normal';
        } catch (e) {
            console.error('Failed to load difficulty:', e);
            return 'normal';
        }
    }

    function saveSoundEnabled(enabled) {
        try {
            localStorage.setItem(getKey(KEYS.SOUND_ENABLED), enabled.toString());
        } catch (e) {
            console.error('Failed to save sound setting:', e);
        }
    }

    function loadSoundEnabled() {
        try {
            const value = localStorage.getItem(getKey(KEYS.SOUND_ENABLED));
            return value === null ? true : value === 'true';
        } catch (e) {
            console.error('Failed to load sound setting:', e);
            return true;
        }
    }

    function savePreviewEnabled(enabled) {
        try {
            localStorage.setItem(getKey(KEYS.PREVIEW_ENABLED), enabled.toString());
        } catch (e) {
            console.error('Failed to save preview setting:', e);
        }
    }

    function loadPreviewEnabled() {
        try {
            const value = localStorage.getItem(getKey(KEYS.PREVIEW_ENABLED));
            return value === null ? false : value === 'true';
        } catch (e) {
            console.error('Failed to load preview setting:', e);
            return false;
        }
    }

    return {
        saveGame,
        loadGame,
        clearGame,
        saveBestScore,
        loadBestScore,
        saveLeaderboard,
        loadLeaderboard,
        addToLeaderboard,
        saveTheme,
        loadTheme,
        saveDifficulty,
        loadDifficulty,
        saveSoundEnabled,
        loadSoundEnabled,
        savePreviewEnabled,
        loadPreviewEnabled
    };
})();
