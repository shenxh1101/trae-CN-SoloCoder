const GRID_SIZE = 32;
const PIXEL_SIZE = 16;
const CANVAS_SIZE = GRID_SIZE * PIXEL_SIZE;

export class CanvasEngine {
    constructor() {
        this.pixelCanvas = document.getElementById('pixel-canvas');
        this.gridCanvas = document.getElementById('grid-canvas');
        this.pixelCtx = this.pixelCanvas.getContext('2d');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.magnifierCanvas = document.getElementById('magnifier-canvas');
        this.magnifierCtx = this.magnifierCanvas.getContext('2d');
        
        this.gridData = this.createEmptyFrame();
        this.showGrid = true;
        this.isDrawing = false;
        this.lastPixel = null;
        
        this.init();
    }

    createEmptyFrame() {
        const frame = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            frame[y] = [];
            for (let x = 0; x < GRID_SIZE; x++) {
                frame[y][x] = '#FFFFFF';
            }
        }
        return frame;
    }

    init() {
        this.pixelCanvas.width = CANVAS_SIZE;
        this.pixelCanvas.height = CANVAS_SIZE;
        this.gridCanvas.width = CANVAS_SIZE;
        this.gridCanvas.height = CANVAS_SIZE;
        
        this.clear();
        this.renderGrid();
    }

    getGridData() {
        return this.gridData.map(row => [...row]);
    }

    setGridData(data) {
        this.gridData = data.map(row => [...row]);
        this.render();
    }

    getPixel(x, y) {
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
            return null;
        }
        return this.gridData[y][x];
    }

    setPixel(x, y, color) {
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
            return false;
        }
        if (this.gridData[y][x] === color) {
            return false;
        }
        this.gridData[y][x] = color;
        this.renderPixel(x, y);
        return true;
    }

    renderPixel(x, y) {
        const color = this.gridData[y][x];
        this.pixelCtx.fillStyle = color;
        this.pixelCtx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    }

    render() {
        this.pixelCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                this.pixelCtx.fillStyle = this.gridData[y][x];
                this.pixelCtx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
    }

    renderGrid() {
        this.gridCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        if (!this.showGrid) return;
        
        this.gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        this.gridCtx.lineWidth = 1;
        
        for (let i = 0; i <= GRID_SIZE; i++) {
            const pos = i * PIXEL_SIZE - 0.5;
            
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(pos, 0);
            this.gridCtx.lineTo(pos, CANVAS_SIZE);
            this.gridCtx.stroke();
            
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, pos);
            this.gridCtx.lineTo(CANVAS_SIZE, pos);
            this.gridCtx.stroke();
        }
        
        this.gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        this.gridCtx.lineWidth = 2;
        this.gridCtx.strokeRect(-1, -1, CANVAS_SIZE + 2, CANVAS_SIZE + 2);
    }

    toggleGrid(show) {
        this.showGrid = show;
        this.renderGrid();
    }

    clear() {
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                this.gridData[y][x] = '#FFFFFF';
            }
        }
        this.render();
    }

    getCanvasCoordinates(clientX, clientY) {
        const rect = this.pixelCanvas.getBoundingClientRect();
        const scaleX = this.pixelCanvas.width / rect.width;
        const scaleY = this.pixelCanvas.height / rect.height;
        
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        
        const pixelX = Math.floor(canvasX / PIXEL_SIZE);
        const pixelY = Math.floor(canvasY / PIXEL_SIZE);
        
        return { x: pixelX, y: pixelY };
    }

    updateMagnifier(mouseX, mouseY) {
        const { x: centerX, y: centerY } = this.getCanvasCoordinates(mouseX, mouseY);
        const magnifierSize = 128;
        const viewSize = 8;
        const scale = magnifierSize / viewSize;
        
        this.magnifierCtx.clearRect(0, 0, magnifierSize, magnifierSize);
        this.magnifierCtx.fillStyle = '#CCCCCC';
        this.magnifierCtx.fillRect(0, 0, magnifierSize, magnifierSize);
        
        const halfView = Math.floor(viewSize / 2);
        
        for (let dy = 0; dy < viewSize; dy++) {
            for (let dx = 0; dx < viewSize; dx++) {
                const px = centerX - halfView + dx;
                const py = centerY - halfView + dy;
                
                const color = this.getPixel(px, py) || '#CCCCCC';
                
                this.magnifierCtx.fillStyle = color;
                this.magnifierCtx.fillRect(dx * scale, dy * scale, scale, scale);
                
                this.magnifierCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                this.magnifierCtx.lineWidth = 1;
                this.magnifierCtx.strokeRect(dx * scale, dy * scale, scale, scale);
            }
        }
        
        const centerPos = halfView * scale;
        this.magnifierCtx.strokeStyle = '#FF0000';
        this.magnifierCtx.lineWidth = 2;
        this.magnifierCtx.strokeRect(centerPos, centerPos, scale, scale);
        
        const coordDisplay = document.getElementById('magnifier-coord');
        if (coordDisplay) {
            coordDisplay.textContent = `X: ${centerX}, Y: ${centerY}`;
        }
    }

    floodFill(startX, startY, fillColor) {
        const targetColor = this.getPixel(startX, startY);
        
        if (targetColor === null || targetColor === fillColor) {
            return false;
        }
        
        const queue = [{ x: startX, y: startY }];
        const visited = new Set();
        const key = (x, y) => `${x},${y}`;
        
        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const k = key(x, y);
            
            if (visited.has(k)) continue;
            if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
            if (this.gridData[y][x] !== targetColor) continue;
            
            visited.add(k);
            this.gridData[y][x] = fillColor;
            
            queue.push({ x: x + 1, y });
            queue.push({ x: x - 1, y });
            queue.push({ x, y: y + 1 });
            queue.push({ x, y: y - 1 });
        }
        
        this.render();
        return true;
    }

    exportScaled(scale = 10) {
        const exportCanvas = document.createElement('canvas');
        const exportSize = GRID_SIZE * scale;
        exportCanvas.width = exportSize;
        exportCanvas.height = exportSize;
        const ctx = exportCanvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                ctx.fillStyle = this.gridData[y][x];
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
        
        return exportCanvas;
    }

    importFromImageData(imageData) {
        const { width, height, data } = imageData;
        const scaleX = width / GRID_SIZE;
        const scaleY = height / GRID_SIZE;
        
        for (let dy = 0; dy < GRID_SIZE; dy++) {
            for (let dx = 0; dx < GRID_SIZE; dx++) {
                const sx = Math.floor(dx * scaleX);
                const sy = Math.floor(dy * scaleY);
                const idx = (sy * width + sx) * 4;
                
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                
                if (a < 128) {
                    this.gridData[dy][dx] = '#FFFFFF';
                } else {
                    const hex = '#' + 
                        r.toString(16).padStart(2, '0') +
                        g.toString(16).padStart(2, '0') +
                        b.toString(16).padStart(2, '0');
                    this.gridData[dy][dx] = hex.toUpperCase();
                }
            }
        }
        
        this.render();
    }

    drawFrameToCanvas(frameData, canvas, scale = 1) {
        const ctx = canvas.getContext('2d');
        const size = GRID_SIZE * scale;
        canvas.width = size;
        canvas.height = size;
        
        ctx.clearRect(0, 0, size, size);
        ctx.imageSmoothingEnabled = false;
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                ctx.fillStyle = frameData[y][x];
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }
}
