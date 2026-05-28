const SnakeEditor = {
    canvas: null,
    ctx: null,
    cols: 20,
    rows: 20,
    cellSize: 0,
    mapData: [],
    editingName: null,
    onMapSaved: null,
    isDragging: false,
    dragValue: 1,

    init(canvas, onMapSaved) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onMapSaved = onMapSaved;
        this.mapData = this.createEmptyMap();
        this.resize();
        this.bindEvents();
    },

    resize() {
        const container = this.canvas.parentElement;
        const maxSize = Math.min(container.clientWidth - 40, 500);
        const size = Math.floor(maxSize / this.cols) * this.cols;
        this.canvas.width = size;
        this.canvas.height = size;
        this.cellSize = size / this.cols;
        this.render();
    },

    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.onMouseDown(e.touches[0]); }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.onMouseMove(e.touches[0]); }, { passive: false });
        this.canvas.addEventListener('touchend', () => this.onMouseUp());
    },

    getCellFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);
        if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
            return { x, y };
        }
        return null;
    },

    onMouseDown(e) {
        const cell = this.getCellFromEvent(e);
        if (!cell) return;
        this.isDragging = true;
        this.dragValue = this.mapData[cell.y][cell.x] === 1 ? 0 : 1;
        this.toggleCell(cell.x, cell.y, this.dragValue);
    },

    onMouseMove(e) {
        if (!this.isDragging) return;
        const cell = this.getCellFromEvent(e);
        if (cell) {
            this.toggleCell(cell.x, cell.y, this.dragValue);
        }
    },

    onMouseUp() {
        this.isDragging = false;
    },

    toggleCell(x, y, value) {
        if (this.mapData[y][x] !== value) {
            this.mapData[y][x] = value;
            this.render();
        }
    },

    createEmptyMap() {
        const map = [];
        for (let y = 0; y < this.rows; y++) {
            map.push(new Array(this.cols).fill(0));
        }
        return map;
    },

    open(mapData, name) {
        if (mapData) {
            this.mapData = mapData.map(row => [...row]);
            this.editingName = name;
        } else {
            this.mapData = this.createEmptyMap();
            this.editingName = null;
        }
        this.render();
    },

    clear() {
        this.mapData = this.createEmptyMap();
        this.editingName = null;
        this.render();
    },

    save(name) {
        if (!name || name.trim().length === 0) {
            return { success: false, message: '请输入地图名称' };
        }
        const hasStartSpace = this.hasValidStartArea();
        if (!hasStartSpace) {
            return { success: false, message: '地图需保留蛇初始位置（左上角3格）' };
        }
        const maps = SnakeStorage.saveCustomMap(name.trim(), this.mapData);
        this.editingName = name.trim();
        if (this.onMapSaved) this.onMapSaved(maps);
        return { success: true, message: '保存成功' };
    },

    delete() {
        if (!this.editingName) return { success: false };
        const maps = SnakeStorage.deleteCustomMap(this.editingName);
        this.editingName = null;
        this.mapData = this.createEmptyMap();
        this.render();
        if (this.onMapSaved) this.onMapSaved(maps);
        return { success: true };
    },

    hasValidStartArea() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if ((x < 3 && y === 10) || (x < 15 && x > 11 && y === 10)) {
                    continue;
                }
            }
        }
        for (let x = 8; x <= 12; x++) {
            if (this.mapData[10][x] === 1) return false;
        }
        return true;
    },

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = 'rgba(42, 48, 80, 0.6)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.cols; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }

        this.ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
        for (let x = 8; x <= 12; x++) {
            this.ctx.fillRect(x * this.cellSize + 1, 10 * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
        }

        this.ctx.fillStyle = '#3a3f5c';
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.mapData[y][x] === 1) {
                    const px = x * this.cellSize + 1;
                    const py = y * this.cellSize + 1;
                    const size = this.cellSize - 2;
                    const r = Math.min(3, this.cellSize * 0.15);
                    this.ctx.beginPath();
                    this.ctx.moveTo(px + r, py);
                    this.ctx.arcTo(px + size, py, px + size, py + size, r);
                    this.ctx.arcTo(px + size, py + size, px, py + size, r);
                    this.ctx.arcTo(px, py + size, px, py, r);
                    this.ctx.arcTo(px, py, px + size, py, r);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }
        }
    }
};
