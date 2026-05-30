const state = {
    sessionId: SESSION_ID,
    isRecording: false,
    recognition: null,
    roundCount: 0,
    finalTranscript: ''
};

const elements = {
    messagesContainer: document.getElementById('messages-container'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    voiceBtn: document.getElementById('voice-btn'),
    voiceStatus: document.getElementById('voice-status'),
    personalitySelect: document.getElementById('personality-select'),
    currentPersonality: document.getElementById('current-personality'),
    suggestionsContainer: document.getElementById('suggestions-container'),
    suggestionsList: document.getElementById('suggestions-list'),
    uploadArea: document.getElementById('upload-area'),
    qaFile: document.getElementById('qa-file'),
    uploadStatus: document.getElementById('upload-status'),
    sessionIdDisplay: document.getElementById('session-id'),
    roundCountDisplay: document.getElementById('round-count'),
    currentEmotionDisplay: document.getElementById('current-emotion')
};

function init() {
    setupEventListeners();
    loadPersonality();
    setupSpeechRecognition();
    elements.sessionIdDisplay.textContent = state.sessionId.substring(0, 8) + '...';
}

function setupEventListeners() {
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    elements.messageInput.addEventListener('input', autoResizeTextarea);
    elements.voiceBtn.addEventListener('click', toggleVoiceRecording);
    elements.voiceStatus.addEventListener('click', stopVoiceRecording);
    elements.personalitySelect.addEventListener('change', changePersonality);

    elements.qaFile.addEventListener('change', handleFileUpload);

    elements.uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            elements.qaFile.click();
        }
    });
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });
    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            elements.qaFile.files = e.dataTransfer.files;
            handleFileUpload({ target: { files: e.dataTransfer.files } });
        }
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            if (sidebarOverlay) {
                sidebarOverlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
            }
        });
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.style.display = 'none';
        });
    }
}

function autoResizeTextarea() {
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 150) + 'px';
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function addMessage(role, content, emotion = null, animate = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}-message`;
    if (!animate) {
        msgDiv.style.animation = 'none';
    }

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const formattedContent = content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    if (emotion && role === 'user') {
        const emotionBadge = document.createElement('span');
        emotionBadge.className = `emotion-badge emotion-${emotion}`;
        const emotionText = emotion === 'positive' ? '😊 积极' : emotion === 'negative' ? '😢 消极' : '😐 中性';
        emotionBadge.textContent = emotionText;
        contentDiv.innerHTML = `<p>${formattedContent}</p>`;
        contentDiv.querySelector('p').appendChild(emotionBadge);
    } else {
        contentDiv.innerHTML = `<p>${formattedContent}</p>`;
    }

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(contentDiv);
    elements.messagesContainer.appendChild(msgDiv);
    scrollToBottom();
}

function addProactiveTopic(topic) {
    const topicDiv = document.createElement('div');
    topicDiv.className = 'message bot-message proactive-message';
    topicDiv.innerHTML = `
        <div class="message-avatar">💡</div>
        <div class="message-content proactive-content">
            <p>${topic}</p>
        </div>
    `;
    elements.messagesContainer.appendChild(topicDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot-message typing-message';
    msgDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    msgDiv.id = 'typing-indicator';
    elements.messagesContainer.appendChild(msgDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function showSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        elements.suggestionsContainer.style.display = 'none';
        return;
    }

    elements.suggestionsList.innerHTML = '';
    suggestions.forEach(suggestion => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-btn';
        btn.textContent = suggestion;
        btn.addEventListener('click', () => {
            elements.messageInput.value = suggestion;
            sendMessage();
        });
        elements.suggestionsList.appendChild(btn);
    });
    elements.suggestionsContainer.style.display = 'block';
}

async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    elements.suggestionsContainer.style.display = 'none';
    elements.sendBtn.disabled = true;

    showTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: state.sessionId,
                message: message
            })
        });

        const data = await response.json();

        if (response.ok) {
            removeTypingIndicator();
            addMessage('bot', data.reply);

            if (data.emotion) {
                const emotionText = data.emotion === 'positive' ? '😊 积极' :
                                   data.emotion === 'negative' ? '😢 消极' : '😐 中性';
                elements.currentEmotionDisplay.textContent = emotionText;
            }

            if (data.round_count !== undefined) {
                state.roundCount = data.round_count;
                elements.roundCountDisplay.textContent = state.roundCount;
            }

            if (data.suggestions && data.suggestions.length > 0) {
                showSuggestions(data.suggestions);
            }

            if (data.proactive_topic) {
                addProactiveTopic(data.proactive_topic);
            }
        } else {
            throw new Error(data.error || '发送失败');
        }
    } catch (error) {
        removeTypingIndicator();
        console.error('发送消息错误:', error);
        addMessage('bot', '抱歉，我遇到了一点小问题，请稍后再试～');
    } finally {
        elements.sendBtn.disabled = false;
        elements.messageInput.focus();
    }
}

async function loadPersonality() {
    try {
        const response = await fetch('/api/personality');
        const data = await response.json();
        if (data.personality) {
            elements.personalitySelect.value = data.personality;
            elements.currentPersonality.textContent = data.name;
        }
    } catch (error) {
        console.error('加载性格设置失败:', error);
    }
}

async function changePersonality() {
    const personality = elements.personalitySelect.value;
    try {
        const response = await fetch('/api/personality', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: state.sessionId,
                personality: personality
            })
        });

        const data = await response.json();
        if (data.success) {
            elements.currentPersonality.textContent = data.name;
            elements.uploadStatus.className = 'upload-status success';
            elements.uploadStatus.textContent = `性格已切换为「${data.name}」`;
            setTimeout(() => {
                elements.uploadStatus.textContent = '';
                elements.uploadStatus.className = 'upload-status';
            }, 3000);
        }
    } catch (error) {
        console.error('切换性格失败:', error);
    }
}

function setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        elements.voiceBtn.style.opacity = '0.5';
        elements.voiceBtn.title = '您的浏览器不支持语音识别';
        elements.voiceBtn.style.cursor = 'not-allowed';
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = true;
    state.recognition.lang = 'zh-CN';
    state.recognition.maxAlternatives = 1;

    state.recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                state.finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        elements.messageInput.value = state.finalTranscript + interimTranscript;
        autoResizeTextarea();
    };

    state.recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        if (event.error === 'not-allowed') {
            showNotification('请允许浏览器使用麦克风权限', 'error');
        } else if (event.error === 'no-speech') {
            showNotification('没有检测到语音，请重试', 'error');
        } else if (event.error !== 'aborted') {
            showNotification('语音识别出错: ' + event.error, 'error');
        }
        stopVoiceRecording();
    };

    state.recognition.onend = () => {
        if (state.isRecording) {
            try {
                state.recognition.start();
            } catch (e) {
                stopVoiceRecording();
            }
        } else {
            if (elements.messageInput.value.trim()) {
                sendMessage();
            }
        }
    };
}

function toggleVoiceRecording() {
    if (state.isRecording) {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
}

function startVoiceRecording() {
    if (!state.recognition) return;
    state.isRecording = true;
    state.finalTranscript = '';
    elements.messageInput.value = '';
    try {
        state.recognition.start();
    } catch (e) {
        console.error('启动语音识别失败:', e);
        state.isRecording = false;
        return;
    }
    elements.voiceBtn.classList.add('recording');
    elements.voiceStatus.style.display = 'block';
}

function stopVoiceRecording() {
    if (!state.recognition) return;
    state.isRecording = false;
    try {
        state.recognition.stop();
    } catch (e) {
        // ignore
    }
    elements.voiceBtn.classList.remove('recording');
    elements.voiceStatus.style.display = 'none';
}

function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.className = `upload-status ${type === 'error' ? 'error' : 'success'}`;
    notif.style.position = 'fixed';
    notif.style.top = '20px';
    notif.style.right = '20px';
    notif.style.padding = '12px 20px';
    notif.style.borderRadius = '12px';
    notif.style.zIndex = '9999';
    notif.style.background = type === 'error' ? '#fef2f2' : '#f0fdf4';
    notif.style.color = type === 'error' ? '#dc2626' : '#166534';
    notif.style.border = `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`;
    notif.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.transition = 'opacity 0.3s ease';
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
        elements.uploadStatus.className = 'upload-status error';
        elements.uploadStatus.textContent = '请上传 JSON 格式的文件';
        setTimeout(() => {
            elements.uploadStatus.textContent = '';
            elements.uploadStatus.className = 'upload-status';
        }, 3000);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    elements.uploadStatus.className = 'upload-status';
    elements.uploadStatus.textContent = '正在上传...';

    try {
        const response = await fetch('/api/upload-qa', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            elements.uploadStatus.className = 'upload-status success';
            elements.uploadStatus.textContent = `✅ 成功添加 ${data.count} 条问答对！`;
        } else {
            throw new Error(data.error || '上传失败');
        }
    } catch (error) {
        console.error('上传失败:', error);
        elements.uploadStatus.className = 'upload-status error';
        elements.uploadStatus.textContent = '上传失败: ' + error.message;
    }

    setTimeout(() => {
        elements.uploadStatus.textContent = '';
        elements.uploadStatus.className = 'upload-status';
    }, 5000);

    event.target.value = '';
}

document.addEventListener('DOMContentLoaded', init);
