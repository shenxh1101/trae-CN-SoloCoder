const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_LENGTH = 3;
const BASE_INTERVAL = 150;
const MIN_INTERVAL = 60;
const SPEED_INCREMENT = 5;
const BOOST_DURATION = 5000;
const OBSTACLE_COUNT = 3;
const OBSTACLE_CHANGE_INTERVAL = 10000;
const SPECIAL_FOOD_CHANCE = 0.25;

const COLORS = {
  snake1: { head: '#00ffc8', body: '#00cc99', tail: '#006655' },
  snake2: { head: '#66ccff', body: '#4488cc', tail: '#224466' },
  normalFood: '#ffcc00',
  specialFood: '#ff66cc',
  obstacle: '#ff4466',
  grid: '#1a1a2e',
  gridLine: '#00ffc815'
};

const gameState = {
  canvas: null,
  ctx: null,
  snakes: [],
  foods: [],
  obstacles: [],
  mode: 'single',
  wallMode: 'dead',
  score: 0,
  highScore: 0,
  lives: 3,
  running: false,
  paused: false,
  gameOver: false,
  lastTime: 0,
  accumulator: 0,
  speedLevel: 1,
  obstacleTimer: 0,
  specialFoodSpawned: false,
  specialFoodTimer: 0,
  renderTime: 0,
  keys: {},
};

class Snake {
  constructor(id, startX, startY, colorSet, controls) {
    this.id = id;
    this.body = [];
    this.colorSet = colorSet;
    this.controls = controls;
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.boosted = false;
    this.boostTimer = 0;
    this.alive = true;
    this.moveTimer = 0;

    for (let i = 0; i < INITIAL_LENGTH; i++) {
      this.body.push({ x: startX - i, y: startY });
    }
  }

  head() {
    return this.body[0];
  }

  setDirection(dx, dy) {
    if (this.direction.x === -dx && this.direction.y === -dy) return;
    if (this.direction.x === dx && this.direction.y === dy) return;
    this.nextDirection = { x: dx, y: dy };
  }

  move(grow) {
    this.direction = this.nextDirection;

    let head = {
      x: this.head().x + this.direction.x,
      y: this.head().y + this.direction.y
    };

    if (gameState.wallMode === 'wrap') {
      head.x = (head.x + GRID_SIZE) % GRID_SIZE;
      head.y = (head.y + GRID_SIZE) % GRID_SIZE;
    }

    this.body.unshift(head);
    if (!grow) {
      this.body.pop();
    }
  }

  checkSelfCollision(pos) {
    const headPos = pos || this.head();
    for (let i = 1; i < this.body.length; i++) {
      if (this.body[i].x === headPos.x && this.body[i].y === headPos.y) {
        return true;
      }
    }
    return false;
  }

  checkWallCollision() {
    if (gameState.wallMode === 'dead') {
      const head = this.head();
      return head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
    }
    return false;
  }

  checkSnakeCollision(pos, otherSnake) {
    const headPos = pos || this.head();
    for (let i = 0; i < otherSnake.body.length; i++) {
      if (otherSnake.body[i].x === headPos.x && otherSnake.body[i].y === headPos.y) {
        return true;
      }
    }
    return false;
  }

  activateBoost() {
    this.boosted = true;
    this.boostTimer = BOOST_DURATION;
  }

  updateBoost(dt) {
    if (this.boosted) {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) {
        this.boosted = false;
        this.boostTimer = 0;
      }
    }
  }

  getColor(t, isBoosted) {
    const alpha = isBoosted ? 1 : 0.9;
    const head = this.colorSet.head;
    const body = this.colorSet.body;
    const tail = this.colorSet.tail;

    if (t < 0.5) {
      return lerpColor(body, head, t * 2);
    } else {
      return lerpColor(tail, body, (t - 0.5) * 2);
    }
  }
}

function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function init() {
  gameState.canvas = document.getElementById('gameCanvas');
  gameState.ctx = gameState.canvas.getContext('2d');

  loadHighScore();
  setupEventListeners();
  updateScoreDisplay();
  drawInitialGrid();
}

function setupEventListeners() {
  document.addEventListener('keydown', (e) => {
    handleKeyDown(e);
    gameState.keys[e.key] = true;
  });

  document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
  });

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('retryBtn').addEventListener('click', restartGame);
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('restartBtn').addEventListener('click', restartGame);

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.mode = btn.dataset.mode;
    });
  });

  document.querySelectorAll('[data-wall]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-wall]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.wallMode = btn.dataset.wall;
    });
  });

  document.querySelectorAll('[data-sound]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-sound]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      soundManager.setEnabled(btn.dataset.sound === 'on');
    });
  });
}

function handleKeyDown(e) {
  const key = e.key.toLowerCase();

  if (e.code === 'Space') {
    e.preventDefault();
    if (gameState.running && !gameState.gameOver) {
      togglePause();
    }
    return;
  }

  if (!gameState.running || gameState.paused || gameState.gameOver) return;

  if (gameState.snakes[0] && gameState.snakes[0].alive) {
    switch (key) {
      case 'w': gameState.snakes[0].setDirection(0, -1); break;
      case 's': gameState.snakes[0].setDirection(0, 1); break;
      case 'a': gameState.snakes[0].setDirection(-1, 0); break;
      case 'd': gameState.snakes[0].setDirection(1, 0); break;
    }
  }

  if (gameState.mode === 'dual' && gameState.snakes[1] && gameState.snakes[1].alive) {
    switch (e.key) {
      case 'ArrowUp': gameState.snakes[1].setDirection(0, -1); break;
      case 'ArrowDown': gameState.snakes[1].setDirection(0, 1); break;
      case 'ArrowLeft': gameState.snakes[1].setDirection(-1, 0); break;
      case 'ArrowRight': gameState.snakes[1].setDirection(1, 0); break;
    }
  }
}

function startGame() {
  soundManager.init();
  soundManager.resume();

  gameState.score = 0;
  gameState.lives = 3;
  gameState.speedLevel = 1;
  gameState.running = true;
  gameState.paused = false;
  gameState.gameOver = false;
  gameState.obstacleTimer = 0;
  gameState.specialFoodSpawned = false;
  gameState.specialFoodTimer = 0;
  gameState.renderTime = 0;
  gameState.foods = [];

  createSnakes();
  createObstacles();
  spawnFood(false);
  trySpawnSpecialFood();

  document.getElementById('startScreen').classList.remove('active');
  document.getElementById('gameOverOverlay').classList.remove('active');
  document.getElementById('pauseOverlay').classList.remove('active');

  updateScoreDisplay();
  gameState.lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function createSnakes() {
  gameState.snakes = [];

  const snake1 = new Snake(1, 5, 10, COLORS.snake1, 'wasd');
  gameState.snakes.push(snake1);

  if (gameState.mode === 'dual') {
    const snake2 = new Snake(2, 14, 10, COLORS.snake2, 'arrows');
    gameState.snakes.push(snake2);
  }
}

function createObstacles() {
  gameState.obstacles = [];
  for (let i = 0; i < OBSTACLE_COUNT; i++) {
    spawnObstacle();
  }
}

function spawnObstacle() {
  const occupied = new Set();

  gameState.snakes.forEach(snake => {
    snake.body.forEach(seg => {
      occupied.add(`${seg.x},${seg.y}`);
    });
  });

  gameState.obstacles.forEach(obs => {
    occupied.add(`${obs.x},${obs.y}`);
  });

  gameState.foods.forEach(food => {
    occupied.add(`${food.position.x},${food.position.y}`);
  });

  let attempts = 0;
  while (attempts < 100) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    if (!occupied.has(`${x},${y}`)) {
      gameState.obstacles.push({ x, y });
      return;
    }
    attempts++;
  }
}

function updateObstaclePositions() {
  gameState.obstacles = [];
  for (let i = 0; i < OBSTACLE_COUNT; i++) {
    spawnObstacle();
  }
}

function spawnFood(isSpecial) {
  const occupied = new Set();

  gameState.snakes.forEach(snake => {
    snake.body.forEach(seg => {
      occupied.add(`${seg.x},${seg.y}`);
    });
  });

  gameState.obstacles.forEach(obs => {
    occupied.add(`${obs.x},${obs.y}`);
  });

  gameState.foods.forEach(food => {
    occupied.add(`${food.position.x},${food.position.y}`);
  });

  let attempts = 0;
  while (attempts < 200) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    if (!occupied.has(`${x},${y}`)) {
      gameState.foods.push({
        position: { x, y },
        type: isSpecial ? 'special' : 'normal'
      });
      return;
    }
    attempts++;
  }
}

function trySpawnSpecialFood() {
  if (Math.random() < SPECIAL_FOOD_CHANCE) {
    spawnFood(true);
    gameState.specialFoodSpawned = true;
  }
}

function removeFood(index) {
  gameState.foods.splice(index, 1);
}

function getBaseInterval() {
  let interval = BASE_INTERVAL - (gameState.speedLevel - 1) * SPEED_INCREMENT;
  return Math.max(MIN_INTERVAL, interval);
}

function getSnakeInterval(snake) {
  let interval = getBaseInterval();
  if (snake.boosted) {
    interval = interval * 0.5;
  }
  return interval;
}

function gameLoop(timestamp) {
  if (!gameState.running) return;
  if (gameState.gameOver) return;

  if (gameState.paused) {
    gameState.lastTime = timestamp;
    requestAnimationFrame(gameLoop);
    return;
  }

  const dt = timestamp - gameState.lastTime;
  gameState.lastTime = timestamp;
  gameState.obstacleTimer += dt;
  gameState.specialFoodTimer += dt;

  gameState.snakes.forEach(snake => {
    snake.updateBoost(dt);
    if (snake.alive) {
      snake.moveTimer += dt;
    }
  });

  if (gameState.obstacleTimer >= OBSTACLE_CHANGE_INTERVAL) {
    gameState.obstacleTimer = 0;
    updateObstaclePositions();
  }

  let needsUpdate = true;
  while (needsUpdate) {
    needsUpdate = false;
    gameState.snakes.forEach(snake => {
      if (snake.alive && snake.moveTimer >= getSnakeInterval(snake)) {
        snake.moveTimer -= getSnakeInterval(snake);
        updateSnake(snake);
        needsUpdate = true;
      }
    });
  }

  checkGameOver();
  gameState.renderTime += dt;
  render();
  updateBoostDisplay();
  requestAnimationFrame(gameLoop);
}

function updateSnake(snake) {
  if (!snake.alive) return;

  const head = snake.head();
  const newHead = {
    x: head.x + snake.direction.x,
    y: head.y + snake.direction.y
  };

  if (gameState.wallMode === 'dead') {
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      snakeDies(snake);
      return;
    }
  } else {
    newHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE;
    newHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE;
  }

  for (let i = 1; i < snake.body.length; i++) {
    if (snake.body[i].x === newHead.x && snake.body[i].y === newHead.y) {
      snakeDies(snake);
      return;
    }
  }

  for (const obs of gameState.obstacles) {
    if (newHead.x === obs.x && newHead.y === obs.y) {
      snakeDies(snake);
      return;
    }
  }

  for (const other of gameState.snakes) {
    if (other.id === snake.id || !other.alive) continue;
    for (let i = 0; i < other.body.length; i++) {
      if (newHead.x === other.body[i].x && newHead.y === other.body[i].y) {
        snakeDies(snake);
        return;
      }
    }
  }

  for (const other of gameState.snakes) {
    if (other.id === snake.id || !other.alive) continue;
    const otherHead = other.body[0];
    if (newHead.x === otherHead.x && newHead.y === otherHead.y) {
      snakeDies(snake);
      snakeDies(other);
      return;
    }
  }

  let grew = false;

  for (let i = gameState.foods.length - 1; i >= 0; i--) {
    const food = gameState.foods[i];
    if (newHead.x === food.position.x && newHead.y === food.position.y) {
      if (food.type === 'normal') {
        grew = true;
        gameState.score += 10;
        soundManager.playEat();
        updateSpeedLevel();
        updateScoreDisplay();
      } else {
        snake.activateBoost();
        soundManager.playSpecialEat();
        gameState.specialFoodSpawned = false;
      }
      removeFood(i);
      break;
    }
  }

  snake.body.unshift(newHead);
  snake.direction = snake.nextDirection;
  if (!grew) {
    snake.body.pop();
  }

  const hasNormalFood = gameState.foods.some(f => f.type === 'normal');
  if (!hasNormalFood) {
    spawnFood(false);
  }

  if (!gameState.specialFoodSpawned && gameState.specialFoodTimer >= 8000) {
    if (Math.random() < SPECIAL_FOOD_CHANCE) {
      spawnFood(true);
      gameState.specialFoodSpawned = true;
    }
    gameState.specialFoodTimer = 0;
  }
}

function snakeDies(snake) {
  if (!snake.alive) return;
  snake.alive = false;
  soundManager.playDeath();

  if (gameState.mode === 'single') {
    gameState.lives--;
    updateScoreDisplay();
  }
}

function checkGameOver() {
  const aliveCount = gameState.snakes.filter(s => s.alive).length;

  if (gameState.mode === 'single') {
    const snake = gameState.snakes[0];
    if (!snake.alive) {
      if (gameState.lives <= 0) {
        endGame();
      } else {
        setTimeout(() => {
          if (gameState.running && !gameState.gameOver) {
            respawnSnake(snake);
          }
        }, 500);
      }
    }
  } else {
    if (aliveCount <= 1) {
      endGameDual();
    }
  }
}

function respawnSnake(snake) {
  const startX = snake.id === 1 ? 5 : 14;
  const startY = 10;

  snake.body = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    snake.body.push({ x: startX - i, y: startY });
  }
  snake.direction = { x: 1, y: 0 };
  snake.nextDirection = { x: 1, y: 0 };
  snake.boosted = false;
  snake.boostTimer = 0;
  snake.moveTimer = 0;
  snake.alive = true;
}

function updateSpeedLevel() {
  const newLevel = Math.floor(gameState.score / 50) + 1;
  if (newLevel !== gameState.speedLevel) {
    gameState.speedLevel = newLevel;
    document.getElementById('speedLevel').textContent = gameState.speedLevel;
  }
}

function endGame() {
  gameState.running = false;
  gameState.gameOver = true;

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    saveHighScore();
    document.getElementById('newRecord').style.display = 'block';
  } else {
    document.getElementById('newRecord').style.display = 'none';
  }

  document.getElementById('finalScore').textContent = gameState.score;
  document.getElementById('gameOverTitle').textContent = '游戏结束';
  document.getElementById('gameOverOverlay').classList.add('active');
}

function endGameDual() {
  gameState.running = false;
  gameState.gameOver = true;

  const winner = gameState.snakes.find(s => s.alive);
  const winnerName = winner ? `玩家${winner.id} 获胜！` : '平局！';

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    saveHighScore();
    document.getElementById('newRecord').style.display = 'block';
  } else {
    document.getElementById('newRecord').style.display = 'none';
  }

  document.getElementById('finalScore').textContent = gameState.score;
  document.getElementById('gameOverTitle').textContent = winnerName;
  document.getElementById('gameOverOverlay').classList.add('active');
}

function restartGame() {
  startGame();
}

function togglePause() {
  if (!gameState.running || gameState.gameOver) return;

  gameState.paused = !gameState.paused;
  const overlay = document.getElementById('pauseOverlay');

  if (gameState.paused) {
    overlay.classList.add('active');
    document.getElementById('pauseBtn').textContent = '继续';
  } else {
    overlay.classList.remove('active');
    document.getElementById('pauseBtn').textContent = '暂停';
    gameState.lastTime = performance.now();
  }
}

function updateScoreDisplay() {
  document.getElementById('currentScore').textContent = gameState.score;
  document.getElementById('highScore').textContent = gameState.highScore;
  document.getElementById('lives').textContent = gameState.lives;
  document.getElementById('speedLevel').textContent = gameState.speedLevel;
}

function updateBoostDisplay() {
  const indicator = document.getElementById('boostIndicator');
  const anyBoosted = gameState.snakes.some(s => s.boosted);

  if (anyBoosted) {
    indicator.classList.add('active');
    const boostedSnake = gameState.snakes.find(s => s.boosted);
    if (boostedSnake) {
      document.getElementById('boostTimer').textContent = (boostedSnake.boostTimer / 1000).toFixed(1) + 's';
    }
  } else {
    indicator.classList.remove('active');
  }
}

function loadHighScore() {
  const saved = localStorage.getItem('neonSnakeHighScore');
  gameState.highScore = saved ? parseInt(saved, 10) : 0;
}

function saveHighScore() {
  localStorage.setItem('neonSnakeHighScore', gameState.highScore.toString());
}

function render() {
  const ctx = gameState.ctx;

  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  drawGrid();

  gameState.obstacles.forEach(obs => {
    drawCell(obs.x, obs.y, COLORS.obstacle, true);
  });

  gameState.foods.forEach(food => {
    const color = food.type === 'special' ? COLORS.specialFood : COLORS.normalFood;
    drawFood(food.position.x, food.position.y, color, food.type === 'special');
  });

  gameState.snakes.forEach(snake => {
    if (!snake.alive) return;
    drawSnake(snake);
  });
}

function drawGrid() {
  const ctx = gameState.ctx;
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;

  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
    ctx.stroke();
  }
}

function drawCell(x, y, color, glow = false) {
  const ctx = gameState.ctx;
  const px = x * CELL_SIZE;
  const py = y * CELL_SIZE;

  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }

  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

  ctx.shadowBlur = 0;
}

function drawFood(x, y, color, isSpecial) {
  const ctx = gameState.ctx;
  const cx = x * CELL_SIZE + CELL_SIZE / 2;
  const cy = y * CELL_SIZE + CELL_SIZE / 2;
  const radius = isSpecial ? CELL_SIZE / 2 - 2 : CELL_SIZE / 2 - 4;

  ctx.shadowColor = color;
  ctx.shadowBlur = 15;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  if (isSpecial) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, radius / 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

function drawSnake(snake) {
  const ctx = gameState.ctx;
  const bodyLen = snake.body.length;
  const isBoosted = snake.boosted;
  const pulse = isBoosted ? (Math.sin(gameState.renderTime * 0.02) + 1) * 0.5 : 0;

  if (isBoosted && bodyLen > 1) {
    for (let i = 1; i < Math.min(bodyLen, 5); i++) {
      const seg = snake.body[i];
      const px = seg.x * CELL_SIZE;
      const py = seg.y * CELL_SIZE;
      const alpha = (1 - i / 5) * 0.4 * pulse;
      ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
      roundRect(ctx, px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2, 3);
    }
  }

  for (let i = bodyLen - 1; i >= 0; i--) {
    const seg = snake.body[i];
    const t = i / (bodyLen - 1 || 1);
    const color = snake.getColor(t, isBoosted);
    const px = seg.x * CELL_SIZE;
    const py = seg.y * CELL_SIZE;

    if (i === 0) {
      if (isBoosted) {
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 25 + pulse * 15;
      } else {
        ctx.shadowColor = snake.colorSet.head;
        ctx.shadowBlur = 12;
      }
    } else if (isBoosted) {
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowBlur = 0;
    }

    if (isBoosted) {
      ctx.fillStyle = `rgba(255, 204, 0, ${0.1 * pulse})`;
      roundRect(ctx, px - 1, py - 1, CELL_SIZE, CELL_SIZE, 5);
    }

    ctx.fillStyle = color;
    const radius = i === 0 ? 4 : 2;
    roundRect(ctx, px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2, radius);

    if (i === 0) {
      drawEyes(snake, px, py);
      if (isBoosted) {
        drawBoostEffect(ctx, px, py, pulse);
      }
    }
  }

  ctx.shadowBlur = 0;
}

function drawBoostEffect(ctx, px, py, pulse) {
  const cx = px + CELL_SIZE / 2;
  const cy = py + CELL_SIZE / 2;

  ctx.strokeStyle = `rgba(255, 204, 0, ${0.6 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL_SIZE / 2 + 4 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + pulse * 0.3})`;
  const sparkPositions = [
    [0, -12], [8, -6], [12, 2], [6, 10], [-4, 12], [-10, 6], [-12, -2], [-6, -10]
  ];
  sparkPositions.forEach(([ox, oy], idx) => {
    if ((idx + Math.floor(gameState.renderTime / 50)) % 2 === 0) {
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawEyes(snake, px, py) {
  const ctx = gameState.ctx;
  const eyeSize = 3;
  const eyeOffset = 5;

  ctx.fillStyle = '#0a0a12';

  const dir = snake.direction;
  if (dir.x === 1) {
    ctx.fillRect(px + CELL_SIZE - eyeOffset - eyeSize, py + 4, eyeSize, eyeSize);
    ctx.fillRect(px + CELL_SIZE - eyeOffset - eyeSize, py + CELL_SIZE - 7, eyeSize, eyeSize);
  } else if (dir.x === -1) {
    ctx.fillRect(px + eyeOffset, py + 4, eyeSize, eyeSize);
    ctx.fillRect(px + eyeOffset, py + CELL_SIZE - 7, eyeSize, eyeSize);
  } else if (dir.y === -1) {
    ctx.fillRect(px + 4, py + eyeOffset, eyeSize, eyeSize);
    ctx.fillRect(px + CELL_SIZE - 7, py + eyeOffset, eyeSize, eyeSize);
  } else {
    ctx.fillRect(px + 4, py + CELL_SIZE - eyeOffset - eyeSize, eyeSize, eyeSize);
    ctx.fillRect(px + CELL_SIZE - 7, py + CELL_SIZE - eyeOffset - eyeSize, eyeSize, eyeSize);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function drawInitialGrid() {
  render();
}

document.addEventListener('DOMContentLoaded', init);