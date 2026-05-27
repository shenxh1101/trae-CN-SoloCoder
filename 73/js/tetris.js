const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const PREVIEW_BLOCK_SIZE = 18;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

const COLORS = {
  I: '#00f0f0', O: '#f0f000', T: '#a000f0',
  S: '#00f000', Z: '#f00000', J: '#0000f0', L: '#f0a000'
};

const SHAPE_NAMES = Object.keys(SHAPES);

const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');

const previewCanvases = [
  document.getElementById('next1'),
  document.getElementById('next2'),
  document.getElementById('next3')
];
const previewCtxs = previewCanvases.map(c => c.getContext('2d'));

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');

const pauseOverlay = document.getElementById('pauseOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const resumeOverlay = document.getElementById('resumeOverlay');
const finalScoreEl = document.getElementById('finalScore');

const themeToggleBtn = document.getElementById('themeToggle');
const soundToggleBtn = document.getElementById('soundToggle');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const loadGameBtn = document.getElementById('loadGameBtn');
const newGameBtn = document.getElementById('newGameBtn');

let gameState = {
  board: [],
  currentPiece: null,
  nextQueue: [],
  score: 0,
  highScore: 0,
  level: 1,
  lines: 0,
  isPaused: false,
  isGameOver: false,
  soundEnabled: true,
  theme: 'dark',
  dropCounter: 0,
  dropInterval: 1000,
  lastTime: 0
};

let audioContext = null;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!gameState.soundEnabled) return;
  initAudio();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const sounds = {
    move: { freq: 200, duration: 0.05, type: 'sine' },
    rotate: { freq: 300, duration: 0.08, type: 'sine' },
    drop: { freq: 150, duration: 0.1, type: 'triangle' },
    clear: { freq: 500, duration: 0.2, type: 'square' },
    gameOver: { freq: 100, duration: 0.5, type: 'sawtooth' },
    levelUp: { freq: 600, duration: 0.3, type: 'sine' }
  };

  const sound = sounds[type] || sounds.move;
  oscillator.type = sound.type;
  oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
  
  if (type === 'clear') {
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + sound.duration);
  }
  if (type === 'gameOver') {
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + sound.duration);
  }

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + sound.duration);
}

function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function createPiece(type) {
  const shape = SHAPES[type].map(row => [...row]);
  return {
    type,
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0
  };
}

function randomPiece() {
  return createPiece(SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)]);
}

function initQueue() {
  gameState.nextQueue = [randomPiece(), randomPiece(), randomPiece()];
}

function getNextPiece() {
  const piece = gameState.nextQueue.shift();
  gameState.nextQueue.push(randomPiece());
  return piece;
}

function collides(piece, board, offsetX = 0, offsetY = 0) {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const newX = piece.x + x + offsetX;
        const newY = piece.y + y + offsetY;
        if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
        if (newY >= 0 && board[newY][newX]) return true;
      }
    }
  }
  return false;
}

function rotate(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      rotated[x][rows - 1 - y] = shape[y][x];
    }
  }
  return rotated;
}

function merge(piece, board) {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardY = piece.y + y;
        const boardX = piece.x + x;
        if (boardY >= 0) {
          board[boardY][boardX] = piece.type;
        }
      }
    }
  }
}

function clearLines() {
  let linesCleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (gameState.board[y].every(cell => cell !== 0)) {
      gameState.board.splice(y, 1);
      gameState.board.unshift(Array(COLS).fill(0));
      linesCleared++;
      y++;
    }
  }
  if (linesCleared > 0) {
    const points = [0, 100, 300, 500, 800];
    gameState.score += points[linesCleared] * gameState.level;
    gameState.lines += linesCleared;
    
    const newLevel = Math.floor(gameState.lines / 10) + 1;
    if (newLevel > gameState.level) {
      gameState.level = newLevel;
      gameState.dropInterval = Math.max(100, 1000 - (gameState.level - 1) * 80);
      playSound('levelUp');
    }
    
    playSound('clear');
    updateUI();
    saveGame();
  }
  return linesCleared;
}

function getGhostPosition() {
  let ghostY = gameState.currentPiece.y;
  while (!collides(gameState.currentPiece, gameState.board, 0, ghostY - gameState.currentPiece.y + 1)) {
    ghostY++;
  }
  return ghostY;
}

function drawBlock(ctx, x, y, color, size = BLOCK_SIZE, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size, size);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(x * size, y * size, size, 3);
  ctx.fillRect(x * size, y * size, 3, size);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(x * size + size - 3, y * size, 3, size);
  ctx.fillRect(x * size, y * size + size - 3, size, 3);
  
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x * size, y * size, size, size);
  ctx.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-line');
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE, 0);
    ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK_SIZE);
    ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
    ctx.stroke();
  }
}

function drawBoard() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (gameState.board[y][x]) {
        drawBlock(ctx, x, y, COLORS[gameState.board[y][x]]);
      }
    }
  }
}

function drawGhost() {
  if (!gameState.currentPiece) return;
  const ghostY = getGhostPosition();
  for (let y = 0; y < gameState.currentPiece.shape.length; y++) {
    for (let x = 0; x < gameState.currentPiece.shape[y].length; x++) {
      if (gameState.currentPiece.shape[y][x]) {
        const drawY = ghostY + y;
        if (drawY >= 0) {
          drawBlock(ctx, gameState.currentPiece.x + x, drawY, COLORS[gameState.currentPiece.type], BLOCK_SIZE, 0.3);
        }
      }
    }
  }
}

function drawPiece() {
  if (!gameState.currentPiece) return;
  for (let y = 0; y < gameState.currentPiece.shape.length; y++) {
    for (let x = 0; x < gameState.currentPiece.shape[y].length; x++) {
      if (gameState.currentPiece.shape[y][x]) {
        const drawY = gameState.currentPiece.y + y;
        if (drawY >= 0) {
          drawBlock(ctx, gameState.currentPiece.x + x, drawY, COLORS[gameState.currentPiece.type]);
        }
      }
    }
  }
}

function drawPreview() {
  previewCtxs.forEach((ctx, index) => {
    ctx.clearRect(0, 0, previewCanvases[index].width, previewCanvases[index].height);
    const piece = gameState.nextQueue[index];
    if (!piece) return;
    
    const offsetX = (previewCanvases[index].width - piece.shape[0].length * PREVIEW_BLOCK_SIZE) / 2;
    const offsetY = (previewCanvases[index].height - piece.shape.length * PREVIEW_BLOCK_SIZE) / 2;
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = COLORS[piece.type];
          ctx.fillRect(
            offsetX + x * PREVIEW_BLOCK_SIZE,
            offsetY + y * PREVIEW_BLOCK_SIZE,
            PREVIEW_BLOCK_SIZE,
            PREVIEW_BLOCK_SIZE
          );
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(offsetX + x * PREVIEW_BLOCK_SIZE, offsetY + y * PREVIEW_BLOCK_SIZE, PREVIEW_BLOCK_SIZE, 2);
          ctx.fillRect(offsetX + x * PREVIEW_BLOCK_SIZE, offsetY + y * PREVIEW_BLOCK_SIZE, 2, PREVIEW_BLOCK_SIZE);
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(offsetX + x * PREVIEW_BLOCK_SIZE + PREVIEW_BLOCK_SIZE - 2, offsetY + y * PREVIEW_BLOCK_SIZE, 2, PREVIEW_BLOCK_SIZE);
          ctx.fillRect(offsetX + x * PREVIEW_BLOCK_SIZE, offsetY + y * PREVIEW_BLOCK_SIZE + PREVIEW_BLOCK_SIZE - 2, PREVIEW_BLOCK_SIZE, 2);
        }
      }
    }
  });
}

function draw() {
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  drawGrid();
  drawBoard();
  drawGhost();
  drawPiece();
  drawPreview();
}

function moveLeft() {
  if (!collides(gameState.currentPiece, gameState.board, -1, 0)) {
    gameState.currentPiece.x--;
    playSound('move');
  }
}

function moveRight() {
  if (!collides(gameState.currentPiece, gameState.board, 1, 0)) {
    gameState.currentPiece.x++;
    playSound('move');
  }
}

function moveDown() {
  if (!collides(gameState.currentPiece, gameState.board, 0, 1)) {
    gameState.currentPiece.y++;
    return true;
  }
  return false;
}

function rotatePiece() {
  const rotated = rotate(gameState.currentPiece.shape);
  const original = gameState.currentPiece.shape;
  gameState.currentPiece.shape = rotated;
  
  const kicks = [0, -1, 1, -2, 2];
  let valid = false;
  for (const kick of kicks) {
    if (!collides(gameState.currentPiece, gameState.board, kick, 0)) {
      gameState.currentPiece.x += kick;
      valid = true;
      break;
    }
  }
  
  if (!valid) {
    gameState.currentPiece.shape = original;
  } else {
    playSound('rotate');
  }
}

function hardDrop() {
  while (moveDown()) {}
  lockPiece();
  playSound('drop');
}

function lockPiece() {
  merge(gameState.currentPiece, gameState.board);
  clearLines();
  spawnPiece();
}

function spawnPiece() {
  gameState.currentPiece = getNextPiece();
  if (collides(gameState.currentPiece, gameState.board)) {
    gameOver();
  }
  updateUI();
  saveGame();
}

function gameOver() {
  gameState.isGameOver = true;
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem('tetris_highScore', gameState.highScore);
  }
  finalScoreEl.textContent = gameState.score;
  gameOverOverlay.classList.remove('hidden');
  playSound('gameOver');
  localStorage.removeItem('tetris_save');
}

function updateUI() {
  scoreEl.textContent = gameState.score;
  highScoreEl.textContent = gameState.highScore;
  levelEl.textContent = gameState.level;
  linesEl.textContent = gameState.lines;
}

function saveGame() {
  if (gameState.isGameOver || gameState.isPaused) return;
  const save = {
    board: gameState.board,
    currentPiece: gameState.currentPiece,
    nextQueue: gameState.nextQueue,
    score: gameState.score,
    level: gameState.level,
    lines: gameState.lines
  };
  localStorage.setItem('tetris_save', JSON.stringify(save));
}

function loadGame() {
  const save = localStorage.getItem('tetris_save');
  if (save) {
    const data = JSON.parse(save);
    gameState.board = data.board;
    gameState.currentPiece = data.currentPiece;
    gameState.nextQueue = data.nextQueue;
    gameState.score = data.score;
    gameState.level = data.level;
    gameState.lines = data.lines;
    gameState.dropInterval = Math.max(100, 1000 - (gameState.level - 1) * 80);
    updateUI();
    return true;
  }
  return false;
}

function togglePause() {
  if (gameState.isGameOver) return;
  gameState.isPaused = !gameState.isPaused;
  pauseOverlay.classList.toggle('hidden', !gameState.isPaused);
  pauseBtn.textContent = gameState.isPaused ? '▶ 继续' : '⏸ 暂停';
  if (!gameState.isPaused) {
    gameState.lastTime = performance.now();
  }
}

function resetGame() {
  gameState.board = createBoard();
  gameState.score = 0;
  gameState.level = 1;
  gameState.lines = 0;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  gameState.dropCounter = 0;
  gameState.dropInterval = 1000;
  gameState.lastTime = performance.now();
  initQueue();
  spawnPiece();
  pauseOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  resumeOverlay.classList.add('hidden');
  pauseBtn.textContent = '⏸ 暂停';
  updateUI();
  localStorage.removeItem('tetris_save');
}

function update(time = 0) {
  if (gameState.isGameOver || gameState.isPaused) {
    gameState.lastTime = time;
    requestAnimationFrame(update);
    return;
  }

  const deltaTime = time - gameState.lastTime;
  gameState.lastTime = time;
  gameState.dropCounter += deltaTime;

  if (gameState.dropCounter > gameState.dropInterval) {
    if (!moveDown()) {
      lockPiece();
    }
    gameState.dropCounter = 0;
  }

  draw();
  requestAnimationFrame(update);
}

function toggleTheme() {
  gameState.theme = gameState.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', gameState.theme);
  themeToggleBtn.textContent = gameState.theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('tetris_theme', gameState.theme);
}

function updateSoundUI() {
  const icon = gameState.soundEnabled ? '🔊' : '🔇';
  const text = gameState.soundEnabled ? '音效: 开启' : '音效: 关闭';
  soundToggleBtn.textContent = icon;
  
  const soundToggleMain = document.getElementById('soundToggleMain');
  if (soundToggleMain) {
    soundToggleMain.querySelector('.sound-icon').textContent = icon;
    soundToggleMain.querySelector('.sound-text').textContent = text;
    soundToggleMain.classList.toggle('sound-off', !gameState.soundEnabled);
  }
}

function toggleSound() {
  gameState.soundEnabled = !gameState.soundEnabled;
  updateSoundUI();
  localStorage.setItem('tetris_sound', gameState.soundEnabled);
  if (gameState.soundEnabled) {
    playSound('move');
  }
}

function init() {
  const savedTheme = localStorage.getItem('tetris_theme');
  if (savedTheme) {
    gameState.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', gameState.theme);
    themeToggleBtn.textContent = gameState.theme === 'dark' ? '🌙' : '☀️';
  }

  const savedSound = localStorage.getItem('tetris_sound');
  if (savedSound !== null) {
    gameState.soundEnabled = savedSound === 'true';
  }
  updateSoundUI();

  gameState.highScore = parseInt(localStorage.getItem('tetris_highScore')) || 0;

  gameState.board = createBoard();
  initQueue();
  
  const hasSave = localStorage.getItem('tetris_save');
  if (hasSave) {
    resumeOverlay.classList.remove('hidden');
    loadGameBtn.onclick = () => {
      loadGame();
      resumeOverlay.classList.add('hidden');
      gameState.lastTime = performance.now();
      update();
    };
    newGameBtn.onclick = () => {
      resetGame();
      gameState.lastTime = performance.now();
      update();
    };
  } else {
    spawnPiece();
    gameState.lastTime = performance.now();
    update();
  }

  document.addEventListener('keydown', (e) => {
    if (gameState.isGameOver) return;
    
    if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }
    
    if (gameState.isPaused) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moveLeft();
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveRight();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (moveDown()) {
          gameState.score += 1;
          updateUI();
        }
        gameState.dropCounter = 0;
        break;
      case 'ArrowUp':
        e.preventDefault();
        rotatePiece();
        break;
      case ' ':
        e.preventDefault();
        hardDrop();
        break;
    }
  });

  themeToggleBtn.addEventListener('click', toggleTheme);
  soundToggleBtn.addEventListener('click', toggleSound);
  const soundToggleMain = document.getElementById('soundToggleMain');
  if (soundToggleMain) {
    soundToggleMain.addEventListener('click', toggleSound);
  }
  pauseBtn.addEventListener('click', togglePause);
  resetBtn.addEventListener('click', resetGame);
  resumeBtn.addEventListener('click', togglePause);
  restartBtn.addEventListener('click', resetGame);

  let touchInterval = null;
  
  function setupTouchButton(id, action, repeatDelay = 150) {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    let repeatInterval = null;
    
    const startAction = (e) => {
      e.preventDefault();
      btn.classList.add('active');
      if (gameState.isPaused || gameState.isGameOver) return;
      action();
      repeatInterval = setInterval(() => {
        if (!gameState.isPaused && !gameState.isGameOver) {
          action();
        }
      }, repeatDelay);
    };
    
    const stopAction = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      if (repeatInterval) {
        clearInterval(repeatInterval);
        repeatInterval = null;
      }
    };
    
    btn.addEventListener('touchstart', startAction, { passive: false });
    btn.addEventListener('touchend', stopAction, { passive: false });
    btn.addEventListener('touchcancel', stopAction, { passive: false });
    btn.addEventListener('mousedown', startAction);
    btn.addEventListener('mouseup', stopAction);
    btn.addEventListener('mouseleave', stopAction);
  }
  
  setupTouchButton('btnLeft', moveLeft, 120);
  setupTouchButton('btnRight', moveRight, 120);
  setupTouchButton('btnDown', () => {
    if (moveDown()) {
      gameState.score += 1;
      updateUI();
    }
    gameState.dropCounter = 0;
  }, 80);
  setupTouchButton('btnRotate', rotatePiece, 300);
  setupTouchButton('btnHardDrop', hardDrop, 500);

  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener('touchend', (e) => {
    if (gameState.isPaused || gameState.isGameOver) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    const minSwipe = 30;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > minSwipe) moveRight();
      else if (dx < -minSwipe) moveLeft();
    } else {
      if (dy > minSwipe) hardDrop();
      else if (dy < -minSwipe) rotatePiece();
    }
  });

  updateUI();
}

init();
