const adminState = {
    sessions: [],
    currentSessionId: null
};

const adminElements = {
    sessionList: document.getElementById('session-list'),
    timelineContainer: document.getElementById('timeline-container'),
    detailTitle: document.getElementById('detail-title'),
    detailMeta: document.getElementById('detail-meta'),
    totalSessions: document.getElementById('total-sessions'),
    totalMessages: document.getElementById('total-messages'),
    exportSelect: document.getElementById('export-select')
};

function formatDateTime(isoString) {
    if (!isoString) return '-';
    try {
        const dt = new Date(isoString);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        const h = String(dt.getHours()).padStart(2, '0');
        const min = String(dt.getMinutes()).padStart(2, '0');
        const s = String(dt.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${min}:${s}`;
    } catch (e) {
        return isoString;
    }
}

function formatDateOnly(isoString) {
    if (!isoString) return '-';
    try {
        const dt = new Date(isoString);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    } catch (e) {
        return '-';
    }
}

function formatTime(isoString) {
    if (!isoString) return '-';
    try {
        const dt = new Date(isoString);
        const h = String(dt.getHours()).padStart(2, '0');
        const m = String(dt.getMinutes()).padStart(2, '0');
        const s = String(dt.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    } catch (e) {
        return isoString;
    }
}

async function loadSessions() {
    try {
        const response = await fetch('/api/sessions');
        const data = await response.json();

        if (data.sessions) {
            adminState.sessions = data.sessions;
            renderSessionList();
            updateStats();
            updateExportSelect();
        }
    } catch (error) {
        console.error('加载会话列表失败:', error);
        adminElements.sessionList.innerHTML = `
            <div class="no-sessions">
                <div class="no-sessions-icon">⚠️</div>
                <p>加载失败，请稍后重试</p>
            </div>
        `;
    }
}

function updateStats() {
    const totalSessions = adminState.sessions.length;
    const totalMessages = adminState.sessions.reduce((sum, s) => sum + s.message_count, 0);

    animateNumber(adminElements.totalSessions, totalSessions);
    animateNumber(adminElements.totalMessages, totalMessages);
}

function animateNumber(element, target) {
    const current = parseInt(element.textContent) || 0;
    if (current === target) return;
    const duration = 500;
    const steps = 20;
    const increment = (target - current) / steps;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        element.textContent = Math.round(current + increment * step);
        if (step >= steps) {
            element.textContent = target;
            clearInterval(timer);
        }
    }, duration / steps);
}

function updateExportSelect() {
    const currentValue = adminElements.exportSelect.value;
    adminElements.exportSelect.innerHTML = '<option value="all">导出全部会话</option>';

    adminState.sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.session_id;
        option.textContent = `${session.session_id.substring(0, 8)}... (${session.message_count}条消息)`;
        adminElements.exportSelect.appendChild(option);
    });

    if (adminState.sessions.some(s => s.session_id === currentValue)) {
        adminElements.exportSelect.value = currentValue;
    }
}

function renderSessionList() {
    if (adminState.sessions.length === 0) {
        adminElements.sessionList.innerHTML = `
            <div class="no-sessions">
                <div class="no-sessions-icon">💬</div>
                <p>还没有会话记录<br>去聊天页面开始对话吧</p>
            </div>
        `;
        return;
    }

    adminElements.sessionList.innerHTML = '';
    adminState.sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'session-item';
        if (session.session_id === adminState.currentSessionId) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="session-id">${session.session_id.substring(0, 8)}...</div>
            <div class="session-meta">
                <span>${session.message_count} 条消息</span>
                <span>${formatDateOnly(session.created_at)}</span>
            </div>
            <span class="personality-badge">${session.personality}模式</span>
        `;

        item.addEventListener('click', () => {
            adminState.currentSessionId = session.session_id;
            loadSessionDetail(session.session_id);
            renderSessionList();
        });

        adminElements.sessionList.appendChild(item);
    });
}

async function loadSessionDetail(sessionId) {
    try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        const data = await response.json();

        if (response.ok) {
            renderSessionDetail(data);
        } else {
            throw new Error(data.error || '加载失败');
        }
    } catch (error) {
        console.error('加载会话详情失败:', error);
        adminElements.timelineContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <p>加载失败：${error.message}</p>
            </div>
        `;
    }
}

function renderSessionDetail(session) {
    adminElements.detailTitle.textContent = `会话 ${session.session_id.substring(0, 8)}...`;
    adminElements.detailMeta.innerHTML = `
        <span class="meta-item">
            <span>📅</span>
            创建于 ${formatDateTime(session.created_at)}
        </span>
        <span class="meta-item">
            <span>🤖</span>
            ${session.personality_name}模式
        </span>
        <span class="meta-item">
            <span>💬</span>
            ${session.messages.length} 条消息
        </span>
        <span class="meta-item">
            <span>🔄</span>
            ${session.round_count || 0} 轮对话
        </span>
    `;

    if (session.messages.length === 0) {
        adminElements.timelineContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>该会话暂无消息记录</p>
            </div>
        `;
        return;
    }

    let html = '<div class="timeline">';
    session.messages.forEach(msg => {
        const emotionHtml = msg.emotion && msg.emotion !== 'None' && msg.role === 'user' ? `
            <span class="timeline-emotion ${msg.emotion}">
                ${msg.emotion === 'positive' ? '😊 积极' : msg.emotion === 'negative' ? '😢 消极' : '😐 中性'}
            </span>
        ` : '';

        html += `
            <div class="timeline-item ${msg.role}">
                <div class="timeline-dot ${msg.role}">
                    ${msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div class="timeline-card">
                    <div class="timeline-header">
                        <span class="timeline-role ${msg.role}">
                            ${msg.role === 'user' ? '用户' : '机器人'}
                        </span>
                        <span class="timeline-time">${formatTime(msg.timestamp)}</span>
                    </div>
                    <div class="timeline-content">${escapeHtml(msg.content)}</div>
                    ${emotionHtml}
                </div>
            </div>
        `;
    });
    html += '</div>';

    adminElements.timelineContainer.innerHTML = html;
    adminElements.timelineContainer.scrollTop = adminElements.timelineContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function exportCSV() {
    const sessionId = adminElements.exportSelect.value;
    const url = `/api/export-csv?session_id=${sessionId}`;
    window.location.href = url;
}

document.addEventListener('DOMContentLoaded', () => {
    loadSessions();

    setInterval(() => {
        loadSessions();
        if (adminState.currentSessionId) {
            loadSessionDetail(adminState.currentSessionId);
        }
    }, 5000);
});
