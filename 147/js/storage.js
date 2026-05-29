const Storage = {
    SAVE_KEY: 'dnd_savegame',

    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    },

    saveGame(gameState) {
        try {
            const saveData = JSON.stringify(gameState);
            localStorage.setItem(this.SAVE_KEY, saveData);
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    },

    loadGame() {
        try {
            const saveData = localStorage.getItem(this.SAVE_KEY);
            if (saveData) {
                return JSON.parse(saveData);
            }
            return null;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    },

    clearSave() {
        localStorage.removeItem(this.SAVE_KEY);
    },

    exportSave() {
        const saveData = localStorage.getItem(this.SAVE_KEY);
        if (!saveData) {
            alert('没有可导出的存档！');
            return;
        }

        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dnd_save_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        AudioManager.playItem();
    },

    importSave(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const saveData = JSON.parse(e.target.result);
                if (this.validateSaveData(saveData)) {
                    localStorage.setItem(this.SAVE_KEY, e.target.result);
                    alert('存档导入成功！');
                    AudioManager.playItem();
                    if (GameEngine) {
                        GameEngine.continueGame();
                    }
                } else {
                    alert('无效的存档文件！');
                }
            } catch (err) {
                console.error('Import failed:', err);
                alert('存档文件格式错误！');
            }
        };
        reader.readAsText(file);
        input.value = '';
    },

    validateSaveData(data) {
        return (
            data &&
            typeof data === 'object' &&
            data.player &&
            typeof data.player === 'object' &&
            data.currentScenario &&
            data.currentScene
        );
    }
};
