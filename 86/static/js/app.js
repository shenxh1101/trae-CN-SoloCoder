const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let currentTool = 'pencil';
let currentColor = '#000000';
let currentThickness = 3;
let isDrawing = false;
let startX, startY;
let showGrid = false;

let history = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

let socket = null;
let isRemoteAction = false;
let textPosition = { x: 0, y: 0 };
let serverHasData = false;
let isSocketConnected = false;

const storageKey = `whiteboard_${window.boardId}`;

function setConnectionStatus(status) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    dot.className = 'status-dot ' + status;
    
    const statusMap = {
        'connecting': '连接中...',
        'connected': '已连接',
        'disconnected': '已断开',
        'error': '连接失败'
    };
    text.textContent = statusMap[status] || status;
}

function initCanvas() {
    const container = document.querySelector('.canvas-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function saveToLocalStorage() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(history.slice(0, historyIndex + 1)));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage() {
    if (serverHasData) {
        console.log('[LocalStorage] Skipping - server has priority');
        return false;
    }
    
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (Array.isArray(data) && data.length > 0) {
                history = data;
                historyIndex = history.length - 1;
                console.log('[LocalStorage] Loaded', history.length, 'actions');
                return true;
            }
        } catch (e) {
            console.error('[LocalStorage] Failed to load:', e);
        }
    }
    console.log('[LocalStorage] No saved data found');
    return false;
}

function addToHistory(action) {
    if (isRemoteAction) return;
    
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    
    history.push(action);
    historyIndex++;
    
    if (history.length > MAX_HISTORY) {
        history = history.slice(-MAX_HISTORY);
        historyIndex = MAX_HISTORY - 1;
        console.log('[History] Reached 20 step limit, removed oldest action');
    }
    
    console.log('[History] Added action:', action.type, '| Total steps:', historyIndex + 1);
    
    saveToLocalStorage();
    emitAction(action);
}

function emitAction(action) {
    if (socket && isSocketConnected) {
        socket.emit('draw', { board_id: window.boardId, action: action });
    }
}

function redrawCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (showGrid) {
        drawGrid();
    }
    
    for (let i = 0; i <= historyIndex; i++) {
        drawAction(history[i]);
    }
}

function drawGrid() {
    const gridSize = 20;
    ctx.save();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawAction(action) {
    ctx.save();
    
    switch (action.type) {
        case 'pencil':
            ctx.strokeStyle = action.color;
            ctx.lineWidth = action.thickness;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            const points = action.points;
            if (points && points.length > 0) {
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();
            }
            break;
            
        case 'eraser':
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = action.thickness;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            const ePoints = action.points;
            if (ePoints && ePoints.length > 0) {
                ctx.moveTo(ePoints[0].x, ePoints[0].y);
                for (let i = 1; i < ePoints.length; i++) {
                    ctx.lineTo(ePoints[i].x, ePoints[i].y);
                }
                ctx.stroke();
            }
            break;
            
        case 'line':
            ctx.strokeStyle = action.color;
            ctx.lineWidth = action.thickness;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(action.x1, action.y1);
            ctx.lineTo(action.x2, action.y2);
            ctx.stroke();
            break;
            
        case 'rectangle':
            ctx.strokeStyle = action.color;
            ctx.lineWidth = action.thickness;
            ctx.strokeRect(action.x, action.y, action.width, action.height);
            break;
            
        case 'circle':
            ctx.strokeStyle = action.color;
            ctx.lineWidth = action.thickness;
            ctx.beginPath();
            ctx.arc(action.cx, action.cy, action.radius, 0, Math.PI * 2);
            ctx.stroke();
            break;
            
        case 'text':
            ctx.fillStyle = action.color;
            ctx.font = `${action.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(action.text, action.x, action.y);
            break;
            
        case 'clear':
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
    }
    
    ctx.restore();
}

let currentPoints = [];

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
    e.preventDefault();
    const pos = getMousePos(e);
    isDrawing = true;
    startX = pos.x;
    startY = pos.y;
    currentPoints = [{ x: pos.x, y: pos.y }];
    
    if (currentTool === 'text') {
        textPosition = { x: pos.x, y: pos.y };
        showTextModal();
        isDrawing = false;
        return;
    }
    
    if (currentTool === 'eyedropper') {
        pickColor(pos.x, pos.y);
        isDrawing = false;
        return;
    }
    
    if (currentTool === 'pencil' || currentTool === 'eraser') {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        if (currentTool === 'pencil') {
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentThickness;
        } else {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = currentThickness;
        }
    }
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    const pos = getMousePos(e);
    
    if (currentTool === 'pencil' || currentTool === 'eraser') {
        currentPoints.push({ x: pos.x, y: pos.y });
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    } else if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
        redrawCanvas();
        drawPreview(pos.x, pos.y);
    } else if (currentTool === 'eyedropper') {
        updateEyedropperTooltip(e, pos.x, pos.y);
    }
}

function drawPreview(x, y) {
    ctx.save();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentThickness;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.7;
    
    if (currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (currentTool === 'rectangle') {
        ctx.beginPath();
        ctx.rect(startX, startY, x - startX, y - startY);
        ctx.stroke();
    } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.restore();
}

function stopDrawing(e) {
    if (!isDrawing) return;
    
    const pos = e.changedTouches ? 
        { x: e.changedTouches[0].clientX - canvas.getBoundingClientRect().left,
          y: e.changedTouches[0].clientY - canvas.getBoundingClientRect().top } :
        getMousePos(e);
    
    isDrawing = false;
    
    if (currentTool === 'pencil' || currentTool === 'eraser') {
        ctx.restore();
    }
    
    let action = null;
    
    if (currentTool === 'pencil' || currentTool === 'eraser') {
        if (currentPoints.length > 1) {
            action = {
                type: currentTool,
                color: currentColor,
                thickness: currentThickness,
                points: currentPoints.slice()
            };
        }
    } else if (currentTool === 'line') {
        action = {
            type: 'line',
            color: currentColor,
            thickness: currentThickness,
            x1: startX, y1: startY,
            x2: pos.x, y2: pos.y
        };
    } else if (currentTool === 'rectangle') {
        action = {
            type: 'rectangle',
            color: currentColor,
            thickness: currentThickness,
            x: startX, y: startY,
            width: pos.x - startX,
            height: pos.y - startY
        };
    } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
        action = {
            type: 'circle',
            color: currentColor,
            thickness: currentThickness,
            cx: startX, cy: startY,
            radius: radius
        };
    }
    
    if (action) {
        addToHistory(action);
        redrawCanvas();
    }
    
    currentPoints = [];
    hideEyedropperTooltip();
}

function pickColor(x, y) {
    try {
        const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        currentColor = hex;
        document.getElementById('colorPicker').value = hex;
        setTool('pencil');
    } catch (e) {
        console.error('Failed to pick color:', e);
    }
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function updateEyedropperTooltip(e, x, y) {
    try {
        const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        
        const tooltip = document.getElementById('eyedropperTooltip');
        document.getElementById('eyedropperColor').style.background = hex;
        document.getElementById('eyedropperHex').textContent = hex;
        
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
        tooltip.classList.remove('hidden');
    } catch (e) {
        console.error('Failed to update eyedropper:', e);
    }
}

function hideEyedropperTooltip() {
    document.getElementById('eyedropperTooltip').classList.add('hidden');
}

function showTextModal() {
    const modal = document.getElementById('textInputModal');
    const input = document.getElementById('textInput');
    modal.classList.remove('hidden');
    input.value = '';
    setTimeout(() => input.focus(), 100);
}

function hideTextModal() {
    document.getElementById('textInputModal').classList.add('hidden');
}

function addText(text) {
    if (!text.trim()) return;
    
    const fontSize = Math.max(currentThickness * 5, 12);
    const action = {
        type: 'text',
        color: currentColor,
        fontSize: fontSize,
        text: text,
        x: textPosition.x,
        y: textPosition.y
    };
    
    addToHistory(action);
    redrawCanvas();
}

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-tool="${tool}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    canvas.className = '';
    if (tool === 'eraser') canvas.classList.add('tool-eraser');
    if (tool === 'text') canvas.classList.add('tool-text');
    if (tool === 'eyedropper') canvas.classList.add('tool-eyedropper');
}

function undo() {
    if (historyIndex >= 0) {
        historyIndex--;
        saveToLocalStorage();
        redrawCanvas();
        console.log('[History] Undo | Remaining steps:', historyIndex + 1);
    } else {
        console.log('[History] Cannot undo, already at beginning');
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        saveToLocalStorage();
        redrawCanvas();
        console.log('[History] Redo | Current step:', historyIndex + 1, '/', history.length);
    } else {
        console.log('[History] Cannot redo, already at latest');
    }
}

function clearCanvas() {
    if (confirm('确定要清空画布吗？此操作可撤销。')) {
        const action = { type: 'clear', timestamp: Date.now() };
        addToHistory(action);
        redrawCanvas();
    }
}

function saveAsPNG() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    for (let i = 0; i <= historyIndex; i++) {
        drawActionOnContext(tempCtx, history[i]);
    }
    
    const link = document.createElement('a');
    link.download = `whiteboard_${window.boardId}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

function drawActionOnContext(c, action) {
    c.save();
    
    switch (action.type) {
        case 'pencil':
            c.strokeStyle = action.color;
            c.lineWidth = action.thickness;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.beginPath();
            const points = action.points;
            if (points && points.length > 0) {
                c.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    c.lineTo(points[i].x, points[i].y);
                }
                c.stroke();
            }
            break;
            
        case 'line':
            c.strokeStyle = action.color;
            c.lineWidth = action.thickness;
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(action.x1, action.y1);
            c.lineTo(action.x2, action.y2);
            c.stroke();
            break;
            
        case 'rectangle':
            c.strokeStyle = action.color;
            c.lineWidth = action.thickness;
            c.strokeRect(action.x, action.y, action.width, action.height);
            break;
            
        case 'circle':
            c.strokeStyle = action.color;
            c.lineWidth = action.thickness;
            c.beginPath();
            c.arc(action.cx, action.cy, action.radius, 0, Math.PI * 2);
            c.stroke();
            break;
            
        case 'text':
            c.fillStyle = action.color;
            c.font = `${action.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            c.textBaseline = 'top';
            c.fillText(action.text, action.x, action.y);
            break;
    }
    
    c.restore();
}

function saveAsSVG() {
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">`;
    svgContent += `<rect width="100%" height="100%" fill="white"/>`;
    
    if (showGrid) {
        const gridSize = 20;
        for (let x = 0; x <= canvas.width; x += gridSize) {
            svgContent += `<line x1="${x}" y1="0" x2="${x}" y2="${canvas.height}" stroke="#e0e0e0" stroke-width="0.5"/>`;
        }
        for (let y = 0; y <= canvas.height; y += gridSize) {
            svgContent += `<line x1="0" y1="${y}" x2="${canvas.width}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5"/>`;
        }
    }
    
    for (let i = 0; i <= historyIndex; i++) {
        svgContent += actionToSVG(history[i]);
    }
    
    svgContent += '</svg>';
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = `whiteboard_${window.boardId}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
}

function actionToSVG(action) {
    switch (action.type) {
        case 'pencil':
            if (!action.points || action.points.length < 2) return '';
            let path = `M ${action.points[0].x} ${action.points[0].y}`;
            for (let i = 1; i < action.points.length; i++) {
                path += ` L ${action.points[i].x} ${action.points[i].y}`;
            }
            return `<path d="${path}" stroke="${action.color}" stroke-width="${action.thickness}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
            
        case 'line':
            return `<line x1="${action.x1}" y1="${action.y1}" x2="${action.x2}" y2="${action.y2}" stroke="${action.color}" stroke-width="${action.thickness}" stroke-linecap="round"/>`;
            
        case 'rectangle':
            return `<rect x="${Math.min(action.x, action.x + action.width)}" y="${Math.min(action.y, action.y + action.height)}" width="${Math.abs(action.width)}" height="${Math.abs(action.height)}" stroke="${action.color}" stroke-width="${action.thickness}" fill="none"/>`;
            
        case 'circle':
            return `<circle cx="${action.cx}" cy="${action.cy}" r="${action.radius}" stroke="${action.color}" stroke-width="${action.thickness}" fill="none"/>`;
            
        case 'text':
            return `<text x="${action.x}" y="${action.y}" fill="${action.color}" font-size="${action.fontSize}" font-family="sans-serif" dominant-baseline="text-before-edge">${escapeHtml(action.text)}</text>`;
            
        default:
            return '';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initWebSocket() {
    setConnectionStatus('connecting');
    
    try {
        socket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });
        
        socket.on('connect', () => {
            isSocketConnected = true;
            setConnectionStatus('connected');
            console.log('[WebSocket] Connected, joining board:', window.boardId);
            socket.emit('join', { board_id: window.boardId });
        });
        
        socket.on('disconnect', () => {
            isSocketConnected = false;
            setConnectionStatus('disconnected');
            console.log('[WebSocket] Disconnected');
        });
        
        socket.on('connect_error', (error) => {
            isSocketConnected = false;
            setConnectionStatus('error');
            console.log('[WebSocket] Connection error:', error);
        });
        
        socket.on('board_state', (data) => {
            console.log('[WebSocket] Received board state, actions count:', data.actions?.length || 0);
            if (data.actions && data.actions.length > 0) {
                serverHasData = true;
                isRemoteAction = true;
                history = data.actions.slice(-MAX_HISTORY);
                historyIndex = history.length - 1;
                saveToLocalStorage();
                redrawCanvas();
                isRemoteAction = false;
                console.log('[WebSocket] Loaded', history.length, 'actions from server');
            } else if (!loadFromLocalStorage()) {
                redrawCanvas();
                console.log('[WebSocket] No server data, starting with empty canvas');
            }
        });
        
        socket.on('draw', (action) => {
            console.log('[WebSocket] Received remote action:', action.type);
            isRemoteAction = true;
            
            if (historyIndex < history.length - 1) {
                history = history.slice(0, historyIndex + 1);
            }
            
            history.push(action);
            historyIndex++;
            
            if (history.length > MAX_HISTORY) {
                history = history.slice(-MAX_HISTORY);
                historyIndex = MAX_HISTORY - 1;
            }
            
            saveToLocalStorage();
            redrawCanvas();
            isRemoteAction = false;
        });
        
        socket.on('clear', () => {
            console.log('[WebSocket] Received remote clear');
            isRemoteAction = true;
            
            const action = { type: 'clear', timestamp: Date.now() };
            if (historyIndex < history.length - 1) {
                history = history.slice(0, historyIndex + 1);
            }
            history.push(action);
            historyIndex++;
            
            if (history.length > MAX_HISTORY) {
                history = history.slice(-MAX_HISTORY);
                historyIndex = MAX_HISTORY - 1;
            }
            
            saveToLocalStorage();
            redrawCanvas();
            isRemoteAction = false;
        });
        
    } catch (e) {
        console.error('WebSocket connection failed:', e);
        setConnectionStatus('error');
    }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);

document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

document.getElementById('colorPicker').addEventListener('input', (e) => {
    currentColor = e.target.value;
});

document.getElementById('thicknessSlider').addEventListener('input', (e) => {
    currentThickness = parseInt(e.target.value);
    document.getElementById('thicknessValue').textContent = currentThickness;
});

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('clearBtn').addEventListener('click', clearCanvas);
document.getElementById('savePngBtn').addEventListener('click', saveAsPNG);
document.getElementById('saveSvgBtn').addEventListener('click', saveAsSVG);

document.getElementById('gridBtn').addEventListener('click', () => {
    showGrid = !showGrid;
    document.getElementById('gridBtn').style.background = showGrid ? '#e3f2fd' : 'transparent';
    redrawCanvas();
});

document.getElementById('textCancel').addEventListener('click', hideTextModal);
document.getElementById('textConfirm').addEventListener('click', () => {
    const text = document.getElementById('textInput').value;
    addText(text);
    hideTextModal();
});
document.getElementById('textInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = document.getElementById('textInput').value;
        addText(text);
        hideTextModal();
    } else if (e.key === 'Escape') {
        hideTextModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
            e.preventDefault();
            undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            redo();
        } else if (e.key === 's') {
            e.preventDefault();
            saveAsPNG();
        }
    }
    if (e.key === 'Escape') {
        hideTextModal();
    }
});

window.addEventListener('resize', () => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    initCanvas();
    ctx.putImageData(imageData, 0, 0);
});

setConnectionStatus('connecting');
initCanvas();
loadFromLocalStorage();
redrawCanvas();
initWebSocket();
