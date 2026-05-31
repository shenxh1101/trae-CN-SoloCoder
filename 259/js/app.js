class App {
    constructor() {
        this.robot = null;
        this.animationController = null;
        this.config = null;
        this.history = [];
        this.voiceEnabled = true;
        
        this.elements = {};
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.loadConfig();
        this.initRobot();
        this.initSpeechManager();
        this.initCommandManager();
        this.bindEvents();
        this.renderCommandsList();
        this.updateStatus('ready');
        
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                console.log('语音列表已加载');
            };
        }
        
        if (!speechManager.isSupported) {
            this.showToast('您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器', 'warning');
        }
    }

    cacheElements() {
        this.elements = {
            micButton: document.getElementById('micButton'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            recognizedText: document.getElementById('recognizedText'),
            voiceFeedbackToggle: document.getElementById('voiceFeedbackToggle'),
            continuousModeToggle: document.getElementById('continuousModeToggle'),
            robotWrapper: document.getElementById('robotWrapper'),
            robotCanvas: document.getElementById('robotCanvas'),
            robotStatus: document.getElementById('robotStatus'),
            robotEmotion: document.getElementById('robotEmotion'),
            addCommandForm: document.getElementById('addCommandForm'),
            cmdName: document.getElementById('cmdName'),
            cmdKeywords: document.getElementById('cmdKeywords'),
            cmdAnimation: document.getElementById('cmdAnimation'),
            cmdResponse: document.getElementById('cmdResponse'),
            commandsList: document.getElementById('commandsList'),
            saveConfigBtn: document.getElementById('saveConfigBtn'),
            loadConfigBtn: document.getElementById('loadConfigBtn'),
            resetConfigBtn: document.getElementById('resetConfigBtn'),
            historyList: document.getElementById('historyList'),
            toast: document.getElementById('toast'),
            actionButtons: document.querySelectorAll('.action-btn'),
            emotionButtons: document.querySelectorAll('.emotion-btn')
        };
    }

    loadConfig() {
        this.config = storageManager.load();
        this.voiceEnabled = this.config.voiceEnabled;
        commandManager.setCustomCommands(this.config.customCommands || []);
        
        if (this.elements.voiceFeedbackToggle) {
            this.elements.voiceFeedbackToggle.checked = this.voiceEnabled;
        }
        if (this.elements.continuousModeToggle) {
            this.elements.continuousModeToggle.checked = this.config.continuousMode;
        }
        
        speechManager.setContinuousMode(this.config.continuousMode);
    }

    saveConfig() {
        this.config.customCommands = commandManager.customCommands;
        this.config.voiceEnabled = this.voiceEnabled;
        this.config.continuousMode = speechManager.continuousMode;
        
        const success = storageManager.save(this.config);
        if (success) {
            this.showToast('配置已保存', 'success');
        } else {
            this.showToast('保存失败', 'error');
        }
    }

    initRobot() {
        this.robot = new Robot('robotCanvas');
        this.animationController = new AnimationController(this.robot, this.elements.robotWrapper, this.elements.robotCanvas);
        this.updateEmotionDisplay();
    }

    initSpeechManager() {
        speechManager.onResult((result) => {
            if (result.isFinal) {
                this.elements.recognizedText.textContent = result.text;
                console.log('识别结果:', result.text);
                this.processCommand(result.text);
            } else {
                this.elements.recognizedText.textContent = result.text + '...';
            }
        });

        speechManager.onError((error) => {
            console.error('语音识别错误:', error);
            this.updateStatus('error');
            this.elements.statusText.textContent = error.message;
            this.showToast(error.message, 'error');
            this.elements.micButton.classList.remove('listening');
        });

        speechManager.onStart(() => {
            console.log('语音识别已启动');
            this.updateStatus('listening');
            this.elements.statusText.textContent = '正在聆听...';
            this.elements.micButton.classList.add('listening');
        });

        speechManager.onEnd(() => {
            if (!speechManager.continuousMode) {
                this.updateStatus('ready');
                this.elements.statusText.textContent = '准备就绪';
                this.elements.micButton.classList.remove('listening');
            }
        });
    }

    initCommandManager() {
        commandManager.onCommandParsed(async (parsed) => {
            await this.executeCommand(parsed);
        });

        commandManager.onQueueEmpty(() => {
            this.elements.robotStatus.textContent = '待机中';
        });
    }

    bindEvents() {
        this.elements.micButton.addEventListener('click', () => {
            speechManager.toggle();
        });

        this.elements.voiceFeedbackToggle.addEventListener('change', (e) => {
            this.voiceEnabled = e.target.checked;
            this.config.voiceEnabled = this.voiceEnabled;
            if (this.config.autoSave) {
                this.saveConfig();
            }
        });

        this.elements.continuousModeToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            speechManager.setContinuousMode(enabled);
            this.config.continuousMode = enabled;
            if (this.config.autoSave) {
                this.saveConfig();
            }
        });

        this.elements.actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                this.processCommand(command);
            });
        });

        this.elements.emotionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const emotion = btn.dataset.emotion;
                this.setEmotion(emotion);
                
                this.elements.emotionButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        this.elements.addCommandForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCustomCommand();
        });

        this.elements.saveConfigBtn.addEventListener('click', () => {
            this.saveConfig();
        });

        this.elements.loadConfigBtn.addEventListener('click', () => {
            this.loadConfig();
            this.renderCommandsList();
            this.showToast('配置已加载', 'success');
        });

        this.elements.resetConfigBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有配置吗？自定义指令将被删除。')) {
                storageManager.reset();
                this.loadConfig();
                this.renderCommandsList();
                this.showToast('配置已重置', 'success');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.ctrlKey) {
                e.preventDefault();
                speechManager.toggle();
            }
        });
    }

    async processCommand(text) {
        this.updateStatus('processing');
        this.elements.statusText.textContent = '正在处理...';
        this.elements.robotStatus.textContent = '处理中...';
        
        const result = await commandManager.processText(text);
        
        if (result.success) {
            this.addToHistory(text);
        } else {
            this.showToast(result.message, 'warning');
            this.updateStatus('ready');
            this.elements.statusText.textContent = '准备就绪';
            this.elements.robotStatus.textContent = '待机中';
            
            if (this.voiceEnabled) {
                speechManager.speak('抱歉，我没有听懂，请再说一遍');
            }
        }
    }

    async executeCommand(parsed) {
        const { command, parameters } = parsed;
        
        this.elements.robotStatus.textContent = command.name;
        
        if (command.emotion) {
            this.robot.setEmotion(command.emotion);
            this.updateEmotionDisplay();
        }
        
        const options = {
            duration: parameters.duration || command.duration,
            emotion: command.emotion,
            targetEmotion: command.targetEmotion
        };
        
        await this.animationController.play(command.animation, options);
        
        if (this.voiceEnabled && command.response) {
            try {
                await speechManager.speak(command.response);
            } catch (e) {
                console.log('TTS语音播放失败:', e);
            }
        }
        
        if (!commandManager.getIsProcessing()) {
            this.elements.robotStatus.textContent = '待机中';
            this.updateStatus('ready');
            this.elements.statusText.textContent = '准备就绪';
        }
    }

    setEmotion(emotion) {
        this.robot.setEmotion(emotion);
        this.updateEmotionDisplay();
        
        const emotionNames = {
            happy: '开心',
            sad: '难过',
            surprised: '惊讶',
            angry: '生气',
            neutral: '平静'
        };
        
        if (this.voiceEnabled) {
            speechManager.speak(`好的，现在我很${emotionNames[emotion]}`);
        }
    }

    updateEmotionDisplay() {
        const emotion = this.robot.getEmotion();
        const emotionNames = {
            happy: '开心',
            sad: '难过',
            surprised: '惊讶',
            angry: '生气',
            neutral: '平静'
        };
        this.elements.robotEmotion.textContent = emotionNames[emotion] || emotion;
    }

    addCustomCommand() {
        const name = this.elements.cmdName.value.trim();
        const keywordsInput = this.elements.cmdKeywords.value.trim();
        const animation = this.elements.cmdAnimation.value;
        const response = this.elements.cmdResponse.value.trim();
        
        if (!name || !keywordsInput || !animation) {
            this.showToast('请填写完整信息', 'warning');
            return;
        }
        
        const keywords = keywordsInput.split(/[,，]/).map(k => k.trim()).filter(k => k);
        
        const command = {
            name,
            keywords,
            animation,
            duration: 1000,
            emotion: 'happy',
            response: response || '好的'
        };
        
        commandManager.addCustomCommand(command);
        this.renderCommandsList();
        this.saveConfig();
        
        this.elements.addCommandForm.reset();
        this.showToast('指令添加成功', 'success');
    }

    removeCustomCommand(commandId) {
        if (commandManager.removeCustomCommand(commandId)) {
            this.renderCommandsList();
            this.saveConfig();
            this.showToast('指令已删除', 'success');
        }
    }

    renderCommandsList() {
        const commands = commandManager.customCommands;
        
        if (commands.length === 0) {
            this.elements.commandsList.innerHTML = '<div class="history-empty">暂无自定义指令</div>';
            return;
        }
        
        this.elements.commandsList.innerHTML = commands.map(cmd => `
            <div class="command-item">
                <div class="command-info">
                    <div class="command-name">${this.escapeHtml(cmd.name)}</div>
                    <div class="command-keywords">关键词: ${cmd.keywords.map(k => this.escapeHtml(k)).join(', ')}</div>
                </div>
                <button class="delete-btn" data-id="${cmd.id}" title="删除">×</button>
            </div>
        `).join('');
        
        this.elements.commandsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeCustomCommand(btn.dataset.id);
            });
        });
    }

    addToHistory(text) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        this.history.unshift({ text, time: timeStr, timestamp: now.getTime() });
        if (this.history.length > 20) {
            this.history.pop();
        }
        
        this.renderHistory();
    }

    renderHistory() {
        if (this.history.length === 0) {
            this.elements.historyList.innerHTML = '<div class="history-empty">暂无指令记录</div>';
            return;
        }
        
        this.elements.historyList.innerHTML = this.history.map(item => `
            <div class="history-item">
                <div class="history-text">${this.escapeHtml(item.text)}</div>
                <div class="history-time">${item.time}</div>
            </div>
        `).join('');
    }

    updateStatus(status) {
        this.elements.statusIndicator.className = 'status-indicator ' + status;
    }

    showToast(message, type = 'info') {
        this.elements.toast.textContent = message;
        this.elements.toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
