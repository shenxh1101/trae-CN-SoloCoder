class SpeechManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.isEnabled = true;
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
        this.voice = null;
        this.lastSpokenEmotion = null;
        this.speakInterval = 5000;
        this.lastSpeakTime = 0;
        this.emotionMessages = {
            happy: [
                '你看起来很高兴！',
                '笑容很灿烂呢！',
                '今天心情不错呀！'
            ],
            sad: [
                '感觉你有点难过',
                '需要一个拥抱吗？',
                '希望你能快点好起来'
            ],
            surprised: [
                '哇，你很惊讶！',
                '发生什么有趣的事了？',
                '这表情太精彩了！'
            ],
            angry: [
                '深呼吸，放轻松',
                '你看起来有点生气',
                '试着冷静一下'
            ],
            fearful: [
                '别害怕，有我在',
                '你看起来有点紧张',
                '一切都会好的'
            ],
            disgusted: [
                '这表情很有戏啊',
                '看到什么讨厌的东西了？',
                '这个表情很真实！'
            ],
            neutral: [
                '你现在很平静',
                '保持这份宁静',
                '状态很稳定'
            ]
        };
    }

    init() {
        if (!this.synth) {
            console.warn('Speech synthesis not supported');
            return false;
        }

        this.loadVoices();
        
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
        
        return true;
    }

    loadVoices() {
        const voices = this.synth.getVoices();
        const chineseVoice = voices.find(v => v.lang.includes('zh'));
        this.voice = chineseVoice || voices[0];
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.synth.cancel();
        }
    }

    setRate(rate) {
        this.rate = Utils.clamp(rate, 0.5, 2);
    }

    setPitch(pitch) {
        this.pitch = Utils.clamp(pitch, 0.5, 2);
    }

    setVolume(volume) {
        this.volume = Utils.clamp(volume, 0, 1);
    }

    speakEmotion(emotion) {
        if (!this.isEnabled || !this.synth) return;
        
        const now = Date.now();
        if (emotion === this.lastSpokenEmotion && 
            now - this.lastSpeakTime < this.speakInterval) {
            return;
        }
        
        this.lastSpokenEmotion = emotion;
        this.lastSpeakTime = now;
        
        const messages = this.emotionMessages[emotion] || this.emotionMessages.neutral;
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        this.speak(message);
    }

    speak(text) {
        if (!this.isEnabled || !this.synth) return;
        
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voice;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        utterance.volume = this.volume;
        utterance.lang = 'zh-CN';
        
        this.synth.speak(utterance);
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    }
}
