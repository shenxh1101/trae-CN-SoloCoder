class SpeechManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = false;
        this.ttsSupported = false;
        this.language = 'zh-CN';
        this.continuousMode = true;
        this.interimResults = true;
        this.manualStop = false;
        
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.onStartCallback = null;
        this.onEndCallback = null;
        
        this.init();
    }

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.isSupported = true;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = this.continuousMode;
            this.recognition.interimResults = this.interimResults;
            this.recognition.lang = this.language;
            
            this.recognition.onresult = (event) => this.handleResult(event);
            this.recognition.onerror = (event) => this.handleError(event);
            this.recognition.onstart = () => this.handleStart();
            this.recognition.onend = () => this.handleEnd();
        }
        
        this.ttsSupported = 'speechSynthesis' in window;
    }

    setLanguage(lang) {
        this.language = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }

    setContinuousMode(enabled) {
        this.continuousMode = enabled;
        if (this.recognition) {
            this.recognition.continuous = enabled;
        }
    }

    start() {
        if (!this.isSupported) {
            this.handleError({ error: 'not-allowed', message: '浏览器不支持语音识别' });
            return false;
        }
        
        if (this.isListening) {
            return true;
        }
        
        this.manualStop = false;
        
        try {
            this.recognition.start();
            return true;
        } catch (e) {
            console.error('启动语音识别失败:', e);
            return false;
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.manualStop = true;
            this.recognition.stop();
            this.isListening = false;
            return true;
        }
        return false;
    }

    toggle() {
        if (this.isListening) {
            return this.stop();
        } else {
            return this.start();
        }
    }

    handleResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript && this.onResultCallback) {
            this.onResultCallback({
                text: finalTranscript.trim(),
                isFinal: true,
                interim: interimTranscript
            });
        } else if (interimTranscript && this.onResultCallback) {
            this.onResultCallback({
                text: interimTranscript.trim(),
                isFinal: false,
                interim: interimTranscript
            });
        }
    }

    handleError(event) {
        let message = '语音识别出错';
        
        switch (event.error) {
            case 'not-allowed':
            case 'service-not-allowed':
                message = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风';
                break;
            case 'no-speech':
                message = '未检测到语音输入';
                break;
            case 'audio-capture':
                message = '无法访问麦克风设备';
                break;
            case 'network':
                message = '网络连接错误，语音识别需要网络连接';
                break;
            case 'aborted':
                message = '语音识别已中止';
                break;
        }
        
        this.isListening = false;
        
        if (this.onErrorCallback) {
            this.onErrorCallback({ error: event.error, message });
        }
    }

    handleStart() {
        this.isListening = true;
        if (this.onStartCallback) {
            this.onStartCallback();
        }
    }

    handleEnd() {
        this.isListening = false;
        if (this.onEndCallback) {
            this.onEndCallback();
        }
        
        if (this.continuousMode && !this.manualStop) {
            setTimeout(() => {
                if (this.continuousMode && !this.isListening) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.log('重新启动语音识别失败:', e);
                    }
                }
            }, 100);
        } else {
            this.manualStop = false;
        }
    }

    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.ttsSupported) {
                reject(new Error('浏览器不支持语音合成'));
                return;
            }
            
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = options.lang || this.language;
            utterance.rate = options.rate || 1;
            utterance.pitch = options.pitch || 1;
            utterance.volume = options.volume || 1;
            
            const voices = window.speechSynthesis.getVoices();
            const chineseVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn') || v.lang.includes('CN'));
            if (chineseVoice) {
                utterance.voice = chineseVoice;
            }
            
            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);
            
            window.speechSynthesis.speak(utterance);
        });
    }

    stopSpeaking() {
        if (this.ttsSupported) {
            window.speechSynthesis.cancel();
        }
    }

    isSpeaking() {
        return this.ttsSupported && window.speechSynthesis.speaking;
    }

    onResult(callback) {
        this.onResultCallback = callback;
    }

    onError(callback) {
        this.onErrorCallback = callback;
    }

    onStart(callback) {
        this.onStartCallback = callback;
    }

    onEnd(callback) {
        this.onEndCallback = callback;
    }
}

const speechManager = new SpeechManager();
