class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'ai_robot_config';
        this.defaultConfig = {
            customCommands: [],
            voiceEnabled: true,
            language: 'zh-CN',
            continuousMode: true,
            autoSave: true,
            currentEmotion: 'neutral'
        };
    }

    save(config) {
        try {
            const data = JSON.stringify(config);
            localStorage.setItem(this.STORAGE_KEY, data);
            return true;
        } catch (e) {
            console.error('保存配置失败:', e);
            return false;
        }
    }

    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                return { ...this.defaultConfig, ...parsed };
            }
            return { ...this.defaultConfig };
        } catch (e) {
            console.error('加载配置失败:', e);
            return { ...this.defaultConfig };
        }
    }

    reset() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('重置配置失败:', e);
            return false;
        }
    }

    exportConfig() {
        const config = this.load();
        const dataStr = JSON.stringify(config, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `robot-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importConfig(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const config = JSON.parse(e.target.result);
                    this.save(config);
                    resolve(config);
                } catch (err) {
                    reject(new Error('配置文件格式错误'));
                }
            };
            reader.onerror = () => reject(new Error('读取文件失败'));
            reader.readAsText(file);
        });
    }
}

const storageManager = new StorageManager();
