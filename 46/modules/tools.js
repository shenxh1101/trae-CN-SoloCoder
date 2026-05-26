export class ToolManager {
    constructor(canvasEngine, paletteManager) {
        this.canvasEngine = canvasEngine;
        this.paletteManager = paletteManager;
        this.currentTool = 'pencil';
        this.isDrawing = false;
        this.lastPixel = null;
        this.hasChanged = false;
        this.isAnimationPlaying = false;
        this.onChangeCallback = null;
        
        this.canvasContainer = document.getElementById('canvas-container');
        
        this.init();
    }

    init() {
        this.bindToolButtons();
        this.bindCanvasEvents();
        this.bindKeyboardShortcuts();
        this.updateCursor();
    }

    setOnChangeCallback(callback) {
        this.onChangeCallback = callback;
    }

    bindToolButtons() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.setTool(tool);
            });
        });
    }

    bindCanvasEvents() {
        const canvas = this.canvasEngine.pixelCanvas;
        
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        canvas.addEventListener('mouseenter', (e) => this.handleMouseEnter(e));
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key.toLowerCase()) {
                case 'p':
                    this.setTool('pencil');
                    break;
                case 'e':
                    this.setTool('eraser');
                    break;
                case 'i':
                    this.setTool('eyedropper');
                    break;
                case 'f':
                    this.setTool('fillbucket');
                    break;
            }
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            if (btn.dataset.tool === tool) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        this.updateCursor();
        this.updateStatus(`当前工具: ${this.getToolName(tool)}`);
    }

    getToolName(tool) {
        const names = {
            'pencil': '铅笔',
            'eraser': '橡皮擦',
            'eyedropper': '取色器',
            'fillbucket': '填充桶'
        };
        return names[tool] || tool;
    }

    updateCursor() {
        if (!this.canvasContainer) return;
        
        this.canvasContainer.classList.remove(
            'pencil-cursor',
            'eraser-cursor',
            'eyedropper-cursor',
            'fillbucket-cursor'
        );
        
        this.canvasContainer.classList.add(`${this.currentTool}-cursor`);
    }

    handleMouseDown(e) {
        if (this.isAnimationPlaying) return;
        
        const { x, y } = this.canvasEngine.getCanvasCoordinates(e.clientX, e.clientY);
        
        if (x < 0 || x >= 32 || y < 0 || y >= 32) return;
        
        this.isDrawing = true;
        this.hasChanged = false;
        this.lastPixel = { x, y };
        
        const changed = this.applyTool(x, y, true);
        if (changed) {
            this.hasChanged = true;
        }
        
        e.preventDefault();
    }

    handleMouseMove(e) {
        const { x, y } = this.canvasEngine.getCanvasCoordinates(e.clientX, e.clientY);
        
        this.canvasEngine.updateMagnifier(e.clientX, e.clientY);
        
        if (this.isDrawing && !this.isAnimationPlaying) {
            if (this.lastPixel && (this.lastPixel.x !== x || this.lastPixel.y !== y)) {
                if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
                    const changed = this.drawLine(this.lastPixel.x, this.lastPixel.y, x, y);
                    if (changed) {
                        this.hasChanged = true;
                    }
                } else if (this.currentTool === 'fillbucket') {
                } else {
                    const changed = this.applyTool(x, y, false);
                    if (changed) {
                        this.hasChanged = true;
                    }
                }
                this.lastPixel = { x, y };
            }
        }
    }

    handleMouseUp(e) {
        if (this.isDrawing && this.hasChanged && this.onChangeCallback) {
            this.onChangeCallback();
        }
        this.isDrawing = false;
        this.lastPixel = null;
        this.hasChanged = false;
    }

    handleMouseLeave(e) {
        const magnifier = document.getElementById('magnifier');
        if (magnifier) {
            magnifier.classList.remove('visible');
        }
        if (this.isDrawing && this.hasChanged && this.onChangeCallback) {
            this.onChangeCallback();
        }
        this.isDrawing = false;
        this.lastPixel = null;
        this.hasChanged = false;
    }

    handleMouseEnter(e) {
        const magnifier = document.getElementById('magnifier');
        if (magnifier) {
            magnifier.classList.add('visible');
        }
    }

    applyTool(x, y, isStart) {
        switch (this.currentTool) {
            case 'pencil':
                return this.usePencil(x, y);
            case 'eraser':
                return this.useEraser(x, y);
            case 'eyedropper':
                this.useEyedropper(x, y);
                return false;
            case 'fillbucket':
                if (isStart) {
                    return this.useFillBucket(x, y);
                }
                return false;
            default:
                return false;
        }
    }

    usePencil(x, y) {
        const color = this.paletteManager.getCurrentColor();
        const changed = this.canvasEngine.setPixel(x, y, color);
        return changed;
    }

    useEraser(x, y) {
        const color = this.paletteManager.getBackgroundColor();
        const changed = this.canvasEngine.setPixel(x, y, color);
        return changed;
    }

    useEyedropper(x, y) {
        const color = this.canvasEngine.getPixel(x, y);
        if (color) {
            this.paletteManager.setColorFromPixel(color);
            this.updateStatus(`已取色: ${color}`);
        }
        return false;
    }

    useFillBucket(x, y) {
        const color = this.paletteManager.getCurrentColor();
        const changed = this.canvasEngine.floodFill(x, y, color);
        return changed;
    }

    drawLine(x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let hasChanged = false;
        
        let x = x0;
        let y = y0;
        
        while (true) {
            if (this.currentTool === 'pencil') {
                if (this.usePencil(x, y)) {
                    hasChanged = true;
                }
            } else if (this.currentTool === 'eraser') {
                if (this.useEraser(x, y)) {
                    hasChanged = true;
                }
            }
            
            if (x === x1 && y === y1) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return hasChanged;
    }

    updateStatus(text) {
        const statusEl = document.getElementById('status-text');
        if (statusEl) {
            statusEl.textContent = text;
        }
    }

    getCurrentTool() {
        return this.currentTool;
    }

    setAnimationPlaying(playing) {
        this.isAnimationPlaying = playing;
    }
}
