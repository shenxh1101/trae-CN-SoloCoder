const SnakeRenderer = {
    canvas: null,
    ctx: null,
    cols: 20,
    rows: 20,
    cellSize: 0,
    animationTime: 0,

    SNAKE1_HEAD: [0, 255, 136],
    SNAKE1_TAIL: [0, 255, 136, 0.25],
    SNAKE2_HEAD: [0, 170, 255],
    SNAKE2_TAIL: [0, 170, 255, 0.25],
    FOOD_COLOR: '#ff3366',
    WALL_COLOR: '#3a3f5c',
    GRID_COLOR: 'rgba(42, 48, 80, 0.4)',

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
    },

    resize() {
        const container = this.canvas.parentElement;
        const maxSize = Math.min(container.clientWidth, container.clientHeight);
        const size = Math.max(Math.floor(maxSize / this.cols) * this.cols, this.cols * 10);
        this.canvas.width = size;
        this.canvas.height = size;
        this.cellSize = size / this.cols;
    },

    lerpColor(head, tail, t) {
        const r = Math.round(head[0] + (tail[0] - head[0]) * t);
        const g = Math.round(head[1] + (tail[1] - head[1]) * t);
        const b = Math.round(head[2] + (tail[2] - head[2]) * t);
        const a = tail[3] !== undefined ? (1 + (tail[3] - 1) * t) : 1;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    },

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    },

    drawGrid() {
        this.ctx.strokeStyle = this.GRID_COLOR;
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
    },

    drawWalls(mapData) {
        this.ctx.fillStyle = this.WALL_COLOR;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (mapData[y] && mapData[y][x] === 1) {
                    const px = x * this.cellSize + 1;
                    const py = y * this.cellSize + 1;
                    const size = this.cellSize - 2;
                    this.roundRect(this.ctx, px, py, size, size, Math.min(3, this.cellSize * 0.15));
                    this.ctx.fill();
                }
            }
        }
    },

    drawSnake(snake, isSecondSnake) {
        if (!snake || !snake.alive || !snake.body || snake.body.length === 0) return;
        const head = isSecondSnake ? this.SNAKE2_HEAD : this.SNAKE1_HEAD;
        const tail = isSecondSnake ? this.SNAKE2_TAIL : this.SNAKE1_TAIL;
        const len = snake.body.length;

        for (let i = len - 1; i >= 0; i--) {
            const seg = snake.body[i];
            const t = len === 1 ? 0 : (i / (len - 1));
            const color = this.lerpColor(head, tail, t);
            const px = seg.x * this.cellSize + 2;
            const py = seg.y * this.cellSize + 2;
            const size = this.cellSize - 4;
            const radius = Math.min(4, this.cellSize * 0.2);

            this.ctx.fillStyle = color;
            this.roundRect(this.ctx, px, py, size, size, radius);
            this.ctx.fill();

            if (i === 0) {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = Math.max(8, this.cellSize * 0.3);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;

                this.drawEyes(seg, snake.direction, isSecondSnake);
            }
        }
    },

    drawEyes(head, dir, isSecondSnake) {
        const cx = head.x * this.cellSize + this.cellSize / 2;
        const cy = head.y * this.cellSize + this.cellSize / 2;
        const offset = this.cellSize * 0.18;
        const eyeSize = Math.max(1.5, this.cellSize * 0.08);

        let ex1, ey1, ex2, ey2;
        if (dir.x === 1) {
            ex1 = cx + offset; ey1 = cy - offset;
            ex2 = cx + offset; ey2 = cy + offset;
        } else if (dir.x === -1) {
            ex1 = cx - offset; ey1 = cy - offset;
            ex2 = cx - offset; ey2 = cy + offset;
        } else if (dir.y === 1) {
            ex1 = cx - offset; ey1 = cy + offset;
            ex2 = cx + offset; ey2 = cy + offset;
        } else {
            ex1 = cx - offset; ey1 = cy - offset;
            ex2 = cx + offset; ey2 = cy - offset;
        }

        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
        this.ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(ex1 + dir.x * eyeSize * 0.3, ey1 + dir.y * eyeSize * 0.3, eyeSize * 0.5, 0, Math.PI * 2);
        this.ctx.arc(ex2 + dir.x * eyeSize * 0.3, ey2 + dir.y * eyeSize * 0.3, eyeSize * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
    },

    drawFood(food, nextFood) {
        const pulse = 1 + Math.sin(this.animationTime * 0.01) * 0.15;
        const cx = food.x * this.cellSize + this.cellSize / 2;
        const cy = food.y * this.cellSize + this.cellSize / 2;
        const r = (this.cellSize * 0.32) * pulse;

        this.ctx.fillStyle = this.FOOD_COLOR;
        this.ctx.shadowColor = this.FOOD_COLOR;
        this.ctx.shadowBlur = Math.max(10, this.cellSize * 0.4);
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        if (nextFood) {
            const ncx = nextFood.x * this.cellSize + this.cellSize / 2;
            const ncy = nextFood.y * this.cellSize + this.cellSize / 2;
            const nr = this.cellSize * 0.25;
            this.ctx.fillStyle = 'rgba(255, 51, 102, 0.25)';
            this.ctx.beginPath();
            this.ctx.arc(ncx, ncy, nr, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 51, 102, 0.4)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([3, 3]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    },

    drawPauseOverlay() {
        this.ctx.fillStyle = 'rgba(10, 14, 26, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    render(gameState) {
        this.animationTime++;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawWalls(gameState.mapData);
        if (gameState.nextFood && gameState.showHint) {
            this.drawFood(gameState.food, gameState.nextFood);
        } else {
            this.drawFood(gameState.food, null);
        }
        this.drawSnake(gameState.snake1, false);
        if (gameState.snake2) {
            this.drawSnake(gameState.snake2, true);
        }
        if (gameState.isPaused && !gameState.isGameOver) {
            this.drawPauseOverlay();
        }
    }
};
