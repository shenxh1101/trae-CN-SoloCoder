class CommandManager {
    constructor() {
        this.builtinCommands = this.initBuiltinCommands();
        this.customCommands = [];
        this.commandQueue = [];
        this.isProcessing = false;
        
        this.onCommandParsedCallback = null;
        this.onQueueEmptyCallback = null;
    }

    initBuiltinCommands() {
        return [
            {
                id: 'turnLeft',
                name: '向左转',
                keywords: ['向左转', '左转', '左拐', '向左', '左边'],
                animation: 'turnLeft',
                duration: 1000,
                emotion: 'happy',
                response: '好的，向左转'
            },
            {
                id: 'turnRight',
                name: '向右转',
                keywords: ['向右转', '右转', '右拐', '向右', '右边'],
                animation: 'turnRight',
                duration: 1000,
                emotion: 'happy',
                response: '好的，向右转'
            },
            {
                id: 'dance',
                name: '跳舞',
                keywords: ['跳舞', '舞起来', '跳个舞', '来段舞蹈'],
                animation: 'dance',
                duration: 3000,
                emotion: 'happy',
                response: '好的，开始跳舞'
            },
            {
                id: 'grow',
                name: '变大',
                keywords: ['变大', '放大', '变大一点', '大一点', '变大点'],
                animation: 'grow',
                duration: 800,
                emotion: 'surprised',
                response: '好的，变大了'
            },
            {
                id: 'shrink',
                name: '变小',
                keywords: ['变小', '缩小', '变小一点', '小一点', '变小点'],
                animation: 'shrink',
                duration: 800,
                emotion: 'sad',
                response: '好的，变小了'
            },
            {
                id: 'rotate',
                name: '旋转',
                keywords: ['旋转', '转圈', '转一圈', '转起来', '360度'],
                animation: 'rotate',
                duration: 2000,
                emotion: 'surprised',
                response: '好的，旋转起来'
            },
            {
                id: 'jump',
                name: '跳跃',
                keywords: ['跳跃', '跳一下', '跳起来', '蹦一下', '跳跳'],
                animation: 'jump',
                duration: 500,
                emotion: 'happy',
                response: '好的，跳一下'
            },
            {
                id: 'wave',
                name: '挥手',
                keywords: ['挥手', '招手', '打招呼', '你好', '嗨', 'hello', 'hi'],
                animation: 'wave',
                duration: 1500,
                emotion: 'happy',
                response: '你好呀！'
            },
            {
                id: 'blink',
                name: '眨眼',
                keywords: ['眨眼', '眨眼睛', '眨眨眼', '眨眼一下'],
                animation: 'blink',
                duration: 300,
                emotion: 'neutral',
                response: '好的'
            },
            {
                id: 'reset',
                name: '重置',
                keywords: ['重置', '复原', '恢复', '回到原位', '初始化'],
                animation: 'reset',
                duration: 500,
                emotion: 'neutral',
                response: '好的，已重置'
            },
            {
                id: 'happy',
                name: '开心',
                keywords: ['开心', '高兴', '快乐', '愉快', '笑一个'],
                animation: 'emotion',
                targetEmotion: 'happy',
                duration: 500,
                emotion: 'happy',
                response: '好的，开心起来了'
            },
            {
                id: 'sad',
                name: '难过',
                keywords: ['难过', '伤心', '不开心', '哭', '悲伤'],
                animation: 'emotion',
                targetEmotion: 'sad',
                duration: 500,
                emotion: 'sad',
                response: '好的，我现在有点难过'
            },
            {
                id: 'surprised',
                name: '惊讶',
                keywords: ['惊讶', '吃惊', '震惊', '哇', '天啊'],
                animation: 'emotion',
                targetEmotion: 'surprised',
                duration: 500,
                emotion: 'surprised',
                response: '哇，好惊讶啊'
            },
            {
                id: 'angry',
                name: '生气',
                keywords: ['生气', '愤怒', '发火', '凶狠', '严肃'],
                animation: 'emotion',
                targetEmotion: 'angry',
                duration: 500,
                emotion: 'angry',
                response: '哼，我生气了'
            },
            {
                id: 'neutral',
                name: '平静',
                keywords: ['平静', '正常', '中立', '恢复表情', '别生气了'],
                animation: 'emotion',
                targetEmotion: 'neutral',
                duration: 500,
                emotion: 'neutral',
                response: '好的，恢复平静'
            }
        ];
    }

    getAllCommands() {
        return [...this.builtinCommands, ...this.customCommands];
    }

    addCustomCommand(command) {
        const newCommand = {
            ...command,
            id: command.id || `custom_${Date.now()}`,
            custom: true
        };
        this.customCommands.push(newCommand);
        return newCommand;
    }

    removeCustomCommand(commandId) {
        const index = this.customCommands.findIndex(c => c.id === commandId);
        if (index > -1) {
            this.customCommands.splice(index, 1);
            return true;
        }
        return false;
    }

    setCustomCommands(commands) {
        this.customCommands = commands || [];
    }

    parseInput(inputText) {
        const results = [];
        const parts = this.splitMultiCommands(inputText);
        
        parts.forEach(part => {
            const parsed = this.parseSingleCommand(part);
            if (parsed) {
                results.push(parsed);
            }
        });
        
        return results;
    }

    splitMultiCommands(text) {
        const separators = /然后|接着|再|之后|随后|，|,|；|;|。|\./;
        return text.split(separators)
            .map(p => p.trim())
            .filter(p => p.length > 0);
    }

    parseSingleCommand(text) {
        const allCommands = this.getAllCommands();
        const lowerText = text.toLowerCase();
        
        let matchedCommand = null;
        let maxMatchScore = 0;
        let bestMatchLength = 0;
        
        const commandNames = allCommands.map(c => c.name.toLowerCase());
        
        for (const cmd of allCommands) {
            for (const keyword of cmd.keywords) {
                const lowerKeyword = keyword.toLowerCase();
                
                if (lowerText === lowerKeyword) {
                    matchedCommand = cmd;
                    maxMatchScore = 100;
                    bestMatchLength = keyword.length;
                    break;
                }
                
                if (lowerText.includes(lowerKeyword)) {
                    const keywordRatio = keyword.length / text.length;
                    const positionBonus = lowerText.startsWith(lowerKeyword) ? 10 : 0;
                    const endPositionBonus = lowerText.endsWith(lowerKeyword) ? 15 : 0;
                    const lengthBonus = keyword.length * 2;
                    
                    const isCommandName = commandNames.includes(lowerKeyword);
                    const commandNameBonus = isCommandName ? 20 : 0;
                    
                    const score = keywordRatio * 50 + 30 + positionBonus + endPositionBonus + lengthBonus + commandNameBonus;
                    
                    if (score > maxMatchScore || (score === maxMatchScore && keyword.length > bestMatchLength)) {
                        maxMatchScore = score;
                        matchedCommand = cmd;
                        bestMatchLength = keyword.length;
                    }
                }
                
                if (lowerKeyword.includes(lowerText) && lowerText.length > 1) {
                    const score = (text.length / keyword.length) * 40 + 20;
                    if (score > maxMatchScore || (score === maxMatchScore && keyword.length > bestMatchLength)) {
                        maxMatchScore = score;
                        matchedCommand = cmd;
                        bestMatchLength = keyword.length;
                    }
                }
            }
            
            if (maxMatchScore === 100) break;
        }
        
        if (!matchedCommand || maxMatchScore < 20) {
            return null;
        }
        
        const params = this.extractParameters(text, matchedCommand);
        
        return {
            command: matchedCommand,
            originalText: text,
            parameters: params,
            matchScore: maxMatchScore
        };
    }

    extractParameters(text, command) {
        const params = {};
        
        const durationMatch = text.match(/(\d+)\s*(秒|秒钟|s|分钟|分|ms|毫秒)/i);
        if (durationMatch) {
            const value = parseInt(durationMatch[1]);
            const unit = durationMatch[2].toLowerCase();
            let duration = value;
            
            if (unit.includes('分钟') || unit.includes('分')) {
                duration = value * 60 * 1000;
            } else if (unit.includes('ms') || unit.includes('毫秒')) {
                duration = value;
            } else {
                duration = value * 1000;
            }
            
            params.duration = duration;
        }
        
        const countMatch = text.match(/(\d+)\s*(次|下|遍|圈)/i);
        if (countMatch) {
            params.count = parseInt(countMatch[1]);
        }
        
        const speedMatch = text.match(/(快|慢|快速|慢速)/);
        if (speedMatch) {
            params.speed = speedMatch[1].includes('快') ? 'fast' : 'slow';
        }
        
        const directionMatch = text.match(/(左|右|前|后|上|下)/);
        if (directionMatch) {
            params.direction = directionMatch[1];
        }
        
        return params;
    }

    async processText(text) {
        const parsedCommands = this.parseInput(text);
        
        if (parsedCommands.length === 0) {
            return { success: false, message: '未识别到有效指令', text };
        }
        
        this.commandQueue.push(...parsedCommands);
        
        if (!this.isProcessing) {
            this.processQueue();
        }
        
        return { 
            success: true, 
            commands: parsedCommands,
            queueLength: this.commandQueue.length,
            text 
        };
    }

    async processQueue() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        while (this.commandQueue.length > 0) {
            const parsed = this.commandQueue.shift();
            
            if (this.onCommandParsedCallback) {
                try {
                    await this.onCommandParsedCallback(parsed);
                } catch (e) {
                    console.error('执行指令出错:', e);
                }
            }
        }
        
        this.isProcessing = false;
        
        if (this.onQueueEmptyCallback) {
            this.onQueueEmptyCallback();
        }
    }

    getIsProcessing() {
        return this.isProcessing;
    }

    clearQueue() {
        this.commandQueue = [];
        this.isProcessing = false;
    }

    onCommandParsed(callback) {
        this.onCommandParsedCallback = callback;
    }

    onQueueEmpty(callback) {
        this.onQueueEmptyCallback = callback;
    }

    getAllAnimationNames() {
        return [
            { value: 'wave', label: '挥手' },
            { value: 'dance', label: '跳舞' },
            { value: 'jump', label: '跳跃' },
            { value: 'rotate', label: '旋转' },
            { value: 'turnLeft', label: '左转' },
            { value: 'turnRight', label: '右转' },
            { value: 'grow', label: '变大' },
            { value: 'shrink', label: '变小' },
            { value: 'blink', label: '眨眼' },
            { value: 'reset', label: '重置' },
            { value: 'emotion', label: '情绪变化' }
        ];
    }
}

const commandManager = new CommandManager();
