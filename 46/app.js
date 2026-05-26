import { CanvasEngine } from './modules/canvas.js';
import { PaletteManager } from './modules/palette.js';
import { ToolManager } from './modules/tools.js';
import { HistoryManager } from './modules/history.js';
import { AnimationController } from './modules/animation.js';
import { FileHandler } from './modules/fileHandler.js';

class PixelArtApp {
    constructor() {
        this.canvasEngine = null;
        this.paletteManager = null;
        this.toolManager = null;
        this.historyManager = null;
        this.animationController = null;
        this.fileHandler = null;
        
        this.animationEnabled = false;
        this.showGrid = true;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.canvasEngine = new CanvasEngine();
        this.paletteManager = new PaletteManager();
        this.animationController = new AnimationController(this.canvasEngine);
        this.historyManager = new HistoryManager();
        this.toolManager = new ToolManager(this.canvasEngine, this.paletteManager);
        this.fileHandler = new FileHandler(this.canvasEngine, this.animationController);
        
        this.toolManager.setOnChangeCallback(() => this.onCanvasChanged());
        this.animationController.setOnFrameChangeCallback(() => this.onFrameChanged());
        
        this.bindGlobalEvents();
        
        this.isLoading = true;
        const hasSavedData = this.loadFromStorage();
        this.isLoading = false;
        
        if (!hasSavedData) {
            this.historyManager.saveState(
                this.animationController.getFrames(),
                this.animationController.getCurrentFrameIndex()
            );
        }
        
        this.updateStatus('就绪');
    }

    bindGlobalEvents() {
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        document.getElementById('btn-clear').addEventListener('click', () => this.clearCanvas());
        document.getElementById('btn-export').addEventListener('click', () => this.exportPNG());
        document.getElementById('file-import').addEventListener('change', (e) => this.importPNG(e));
        document.getElementById('toggle-grid').addEventListener('change', (e) => this.toggleGrid(e.target.checked));
        document.getElementById('toggle-animation').addEventListener('change', (e) => this.toggleAnimation(e.target.checked));
        
        document.getElementById('btn-add-frame').addEventListener('click', () => this.addFrame());
        document.getElementById('btn-remove-frame').addEventListener('click', () => this.removeFrame());
        document.getElementById('btn-play').addEventListener('click', () => this.playAnimation());
        document.getElementById('btn-stop').addEventListener('click', () => this.stopAnimation());
        document.getElementById('fps-slider').addEventListener('input', (e) => this.setFPS(parseInt(e.target.value)));
        
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        window.addEventListener('beforeunload', () => {
            this.animationController.saveCurrentFrameToMemory();
            this.saveToStorage();
        });
    }

    handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    this.undo();
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveToStorage();
                    break;
            }
        }
    }

    onCanvasChanged() {
        this.animationController.saveCurrentFrameToMemory();
        this.historyManager.saveState(
            this.animationController.getFrames(),
            this.animationController.getCurrentFrameIndex()
        );
        this.saveToStorage();
        this.animationController.updateFrameUI();
    }

    onFrameChanged() {
        if (this.isLoading) return;
        this.saveToStorage();
    }

    undo() {
        const state = this.historyManager.undo();
        if (state) {
            this.isLoading = true;
            this.animationController.setFrames(state.frames);
            this.animationController.setCurrentFrame(state.currentFrame);
            this.isLoading = false;
            this.saveToStorage();
            this.updateStatus('已撤销');
        }
    }

    redo() {
        const state = this.historyManager.redo();
        if (state) {
            this.isLoading = true;
            this.animationController.setFrames(state.frames);
            this.animationController.setCurrentFrame(state.currentFrame);
            this.isLoading = false;
            this.saveToStorage();
            this.updateStatus('已重做');
        }
    }

    clearCanvas() {
        if (confirm('确定要清空画布吗？此操作可以撤销。')) {
            this.canvasEngine.clear();
            this.onCanvasChanged();
            this.updateStatus('已清空画布');
        }
    }

    toggleGrid(show) {
        this.showGrid = show;
        this.canvasEngine.toggleGrid(show);
        this.saveToStorage();
        this.updateStatus(show ? '已显示网格' : '已隐藏网格');
    }

    toggleAnimation(enabled) {
        this.animationEnabled = enabled;
        const controls = document.getElementById('animation-controls');
        
        if (enabled) {
            controls.style.display = 'block';
            this.animationController.updateFrameUI();
            this.updateStatus('已启用动画模式');
        } else {
            this.animationController.stop();
            this.toolManager.setAnimationPlaying(false);
            controls.style.display = 'none';
            if (this.animationController.getFrameCount() > 1) {
                if (confirm('关闭动画模式将只保留当前帧，其他帧将丢失。确定吗？')) {
                    const currentFrame = this.animationController.getCurrentFrame();
                    this.isLoading = true;
                    this.animationController.setFrames([currentFrame]);
                    this.animationController.updateFrameUI();
                    this.isLoading = false;
                    this.onCanvasChanged();
                } else {
                    document.getElementById('toggle-animation').checked = true;
                    this.animationEnabled = true;
                    return;
                }
            }
            this.updateStatus('已关闭动画模式');
        }
        
        this.saveToStorage();
    }

    addFrame() {
        if (this.animationController.addFrame()) {
            this.onCanvasChanged();
        }
    }

    removeFrame() {
        if (confirm('确定要删除当前帧吗？')) {
            if (this.animationController.removeFrame()) {
                this.onCanvasChanged();
            }
        }
    }

    playAnimation() {
        this.animationController.play();
        this.toolManager.setAnimationPlaying(true);
    }

    stopAnimation() {
        this.animationController.stop();
        this.toolManager.setAnimationPlaying(false);
    }

    setFPS(fps) {
        this.animationController.setFPS(fps);
        this.saveToStorage();
    }

    exportPNG() {
        if (this.animationEnabled && this.animationController.getFrameCount() > 1) {
            if (confirm('检测到多帧动画，是否导出所有帧？点击"确定"导出所有帧，点击"取消"只导出当前帧。')) {
                this.fileHandler.exportAnimation(10);
                return;
            }
        }
        this.fileHandler.exportPNG(10);
        this.saveToStorage();
    }

    async importPNG(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            await this.fileHandler.importPNG(file);
            this.onCanvasChanged();
        } catch (error) {
            alert(error.message);
            console.error(error);
        }
        
        e.target.value = '';
    }

    saveToStorage() {
        this.fileHandler.saveToLocalStorage({
            currentColor: this.paletteManager.getCurrentColor(),
            currentTool: this.toolManager.getCurrentTool(),
            showGrid: this.showGrid,
            animationEnabled: this.animationEnabled
        });
    }

    loadFromStorage() {
        const data = this.fileHandler.loadFromLocalStorage();
        if (!data) return false;
        
        if (data.frames && data.frames.length > 0) {
            this.animationController.setFrames(data.frames);
            if (data.currentFrame !== undefined) {
                this.animationController.setCurrentFrame(data.currentFrame);
            }
        }
        
        if (data.currentColor) {
            this.paletteManager.selectColor(data.currentColor);
        }
        
        if (data.currentTool) {
            this.toolManager.setTool(data.currentTool);
        }
        
        if (data.showGrid !== undefined) {
            this.showGrid = data.showGrid;
            this.canvasEngine.toggleGrid(this.showGrid);
            document.getElementById('toggle-grid').checked = this.showGrid;
        }
        
        if (data.fps) {
            this.animationController.setFPS(data.fps);
            document.getElementById('fps-slider').value = data.fps;
            document.getElementById('fps-value').textContent = data.fps;
        }
        
        if (data.animationEnabled) {
            this.animationEnabled = true;
            document.getElementById('toggle-animation').checked = true;
            document.getElementById('animation-controls').style.display = 'block';
            this.animationController.updateFrameUI();
        }
        
        this.historyManager.reset(
            this.animationController.getFrames(),
            this.animationController.getCurrentFrameIndex()
        );
        
        this.updateStatus('已恢复上次的作品');
        return true;
    }

    updateStatus(text) {
        const statusEl = document.getElementById('status-text');
        if (statusEl) {
            statusEl.textContent = text;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.pixelArtApp = new PixelArtApp();
});
