class EmotionReporter {
    constructor() {
        this.emotionHistory = [];
        this.maxHistory = 3600;
        this.startTime = null;
        this.saveThrottled = Utils.throttle(() => {
            Utils.saveEmotionHistory(this.emotionHistory);
        }, 3000);
        this.pendingSave = false;
    }

    startSession() {
        this.startTime = Date.now();
        this.emotionHistory = Utils.getStoredEmotionHistory() || [];
    }

    addEmotionData(emotionData) {
        if (!emotionData) return;
        
        this.emotionHistory.push({
            timestamp: emotionData.timestamp || Date.now(),
            emotions: emotionData.emotions,
            dominant: emotionData.dominant,
            confidence: emotionData.confidence
        });

        if (this.emotionHistory.length > this.maxHistory) {
            this.emotionHistory = this.emotionHistory.slice(-this.maxHistory);
        }

        if (this.emotionHistory.length <= 5) {
            Utils.saveEmotionHistory(this.emotionHistory);
        } else {
            this.saveThrottled();
        }
    }

    getHistory() {
        return this.emotionHistory;
    }

    clearHistory() {
        this.emotionHistory = [];
        this.startTime = Date.now();
        Utils.clearEmotionHistory();
    }

    getStatistics() {
        if (this.emotionHistory.length === 0) {
            return null;
        }

        const emotionCounts = {};
        let totalConfidence = 0;
        let validFrames = 0;

        this.emotionHistory.forEach(data => {
            const emotion = data.dominant || 'neutral';
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            
            if (data.confidence > 0.4) {
                totalConfidence += data.confidence;
                validFrames++;
            }
        });

        const total = this.emotionHistory.length;
        const emotionPercentages = {};
        
        Object.keys(Utils.EMOTION_CONFIG).forEach(emotion => {
            const count = emotionCounts[emotion] || 0;
            emotionPercentages[emotion] = count / total;
        });

        let dominantEmotion = 'neutral';
        let maxCount = 0;
        
        Object.entries(emotionCounts).forEach(([emotion, count]) => {
            if (count > maxCount) {
                maxCount = count;
                dominantEmotion = emotion;
            }
        });

        const duration = (Date.now() - (this.startTime || this.emotionHistory[0]?.timestamp)) / 1000;

        return {
            duration,
            totalFrames: total,
            validFrames,
            dominantEmotion,
            averageConfidence: validFrames > 0 ? totalConfidence / validFrames : 0,
            emotionCounts,
            emotionPercentages
        };
    }

    drawChart(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 50;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        console.log(`📈 绘制折线图 - canvas: ${width}x${height}, 历史数据: ${this.emotionHistory.length} 条`);

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);

        if (this.emotionHistory.length < 2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = 'bold 16px Noto Sans SC';
            ctx.textAlign = 'center';
            ctx.fillText('情绪数据采集进行中...', width / 2, height / 2 - 20);
            ctx.font = '13px Noto Sans SC';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillText('请继续使用表情镜，系统会自动记录您的情绪变化', width / 2, height / 2 + 10);
            ctx.font = '12px Noto Sans SC';
            ctx.fillText(`当前已采集：${this.emotionHistory.length} 条数据`, width / 2, height / 2 + 35);
            return;
        }

        this.drawGrid(ctx, padding, chartWidth, chartHeight, width, height);

        const sampleData = this.sampleData(100);
        const emotions = Object.keys(Utils.EMOTION_CONFIG);
        
        console.log(`📊 绘制采样数据: ${sampleData.length} 个点, 7条情绪曲线`);
        
        emotions.forEach(emotion => {
            this.drawEmotionLine(ctx, emotion, sampleData, padding, chartWidth, chartHeight);
        });

        this.drawLegend(ctx, width - 90, padding);
    }

    drawGrid(ctx, padding, chartWidth, chartHeight, width, height) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px Noto Sans SC';
        ctx.textAlign = 'right';
        
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            const value = 100 - i * 20;
            ctx.fillText(value + '%', padding - 5, y + 4);
        }
        
        if (this.emotionHistory.length >= 2) {
            const startTime = this.emotionHistory[0].timestamp;
            const endTime = this.emotionHistory[this.emotionHistory.length - 1].timestamp;
            const durationSec = Math.max(1, (endTime - startTime) / 1000);
            
            ctx.textAlign = 'center';
            const tickStep = Math.max(1, Math.ceil(durationSec / 8));
            for (let s = 0; s <= durationSec; s += tickStep) {
                const x = padding + (s / durationSec) * chartWidth;
                ctx.fillText(Utils.formatTime(s), x, height - 8);
            }
        }
    }

    sampleData(count) {
        if (this.emotionHistory.length <= count) {
            return this.emotionHistory;
        }

        const sampled = [];
        const step = Math.floor(this.emotionHistory.length / count);
        
        for (let i = 0; i < this.emotionHistory.length; i += step) {
            sampled.push(this.emotionHistory[i]);
        }
        
        return sampled;
    }

    drawEmotionLine(ctx, emotion, data, padding, chartWidth, chartHeight) {
        if (data.length < 2) return;

        const config = Utils.getEmotionInfo(emotion);
        
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        
        const startTime = data[0].timestamp;
        const endTime = data[data.length - 1].timestamp;
        const timeRange = Math.max(1, endTime - startTime);
        
        data.forEach((point, index) => {
            const x = padding + ((point.timestamp - startTime) / timeRange) * chartWidth;
            const value = point.emotions?.[emotion] || 0;
            const y = padding + (1 - value) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }

    drawLegend(ctx, x, startY) {
        const emotions = Object.keys(Utils.EMOTION_CONFIG);
        
        emotions.forEach((emotion, index) => {
            const config = Utils.getEmotionInfo(emotion);
            const y = startY + index * 18;
            
            ctx.fillStyle = config.color;
            ctx.fillRect(x, y, 10, 3);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '11px Noto Sans SC';
            ctx.textAlign = 'left';
            ctx.fillText(config.name, x + 15, y + 5);
        });
    }

    renderBreakdown(container, stats) {
        if (!stats) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center;">暂无数据</p>';
            return;
        }

        const emotions = Object.keys(Utils.EMOTION_CONFIG).sort((a, b) => 
            (stats.emotionPercentages[b] || 0) - (stats.emotionPercentages[a] || 0)
        );

        container.innerHTML = emotions.map(emotion => {
            const config = Utils.getEmotionInfo(emotion);
            const percentage = stats.emotionPercentages[emotion] || 0;
            const width = percentage * 100;
            
            return `
                <div class="breakdown-item">
                    <span class="breakdown-emoji">${config.emoji}</span>
                    <div class="breakdown-bar">
                        <div class="breakdown-fill" style="width: ${width}%; background: ${config.color};"></div>
                    </div>
                    <span class="breakdown-percent">${(width).toFixed(1)}%</span>
                </div>
            `;
        }).join('');
    }

    exportReport() {
        const stats = this.getStatistics();
        if (!stats) {
            return null;
        }

        return {
            exportTime: new Date().toISOString(),
            statistics: {
                duration: stats.duration,
                totalFrames: stats.totalFrames,
                validFrames: stats.validFrames,
                dominantEmotion: stats.dominantEmotion,
                dominantEmotionName: Utils.getEmotionInfo(stats.dominantEmotion).name,
                averageConfidence: stats.averageConfidence
            },
            emotionBreakdown: Object.keys(stats.emotionPercentages).map(emotion => ({
                emotion,
                name: Utils.getEmotionInfo(emotion).name,
                percentage: stats.emotionPercentages[emotion],
                count: stats.emotionCounts[emotion] || 0
            })),
            history: this.emotionHistory
        };
    }
}
