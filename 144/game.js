const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const canvasWrapper = document.querySelector('.canvas-wrapper');

function resizeCanvas() {
    const rect = canvasWrapper.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const gameState = {
    score: 0,
    highScore: parseInt(localStorage.getItem('monkeyHighScore')) || 0,
    combo: 0,
    timeLeft: 60,
    isPlaying: false,
    isPaused: false,
    soundEnabled: true,
    speedMultiplier: 1,
    monkeyWidth: 80,
    doubleScore: false,
    slowMode: false,
    lastMilestone: 0,
    currentBackground: 0
};

const backgrounds = ['jungle', 'beach', 'city'];

const monkey = {
    x: 0,
    y: 0,
    width: 80,
    height: 70,
    speed: 8,
    moveLeft: false,
    moveRight: false
};

const FRUITS = [
    { emoji: '🍌', name: 'banana', points: 10 },
    { emoji: '🍎', name: 'apple', points: 10 },
    { emoji: '🍊', name: 'orange', points: 10 },
    { emoji: '🍉', name: 'watermelon', points: 10 }
];

const POWERUPS = [
    { emoji: '⭐', name: 'doubleScore', duration: 8000, label: '双倍得分' },
    { emoji: '🐢', name: 'slowDown', duration: 6000, label: '减速模式' },
    { emoji: '📏', name: 'wideCatch', duration: 7000, label: '扩大范围' }
];

const BOMB = { emoji: '💣', name: 'bomb', points: -20 };

let fallingItems = [];
let gameLoopId = null;
let timerInterval = null;
let spawnInterval = null;
let audioContext = null;
let powerupTimers = {};

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
    
    switch(type) {
        case 'fruit':
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(784, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'bomb':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'powerup':
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
            oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'gameOver':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(392, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(349, audioContext.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(330, audioContext.currentTime + 0.4);
            oscillator.frequency.setValueAtTime(262, audioContext.currentTime + 0.6);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.8);
            break;
    }
}

function initMonkey() {
    monkey.x = canvas.width / 2 - monkey.width / 2;
    monkey.y = canvas.height - monkey.height - 10;
}

function spawnItem() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    const rand = Math.random();
    let item;
    
    if (rand < 0.7) {
        const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
        item = { ...fruit, type: 'fruit' };
    } else if (rand < 0.85) {
        item = { ...BOMB, type: 'bomb' };
    } else {
        const powerup = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
        item = { ...powerup, type: 'powerup' };
    }
    
    item.x = Math.random() * (canvas.width - 40);
    item.y = -50;
    item.width = 40;
    item.height = 40;
    item.baseSpeed = 2 + Math.random() * 2;
    
    fallingItems.push(item);
}

function updateItems() {
    const speedMod = gameState.slowMode ? 0.5 : 1;
    
    for (let i = fallingItems.length - 1; i >= 0; i--) {
        const item = fallingItems[i];
        item.y += item.baseSpeed * gameState.speedMultiplier * speedMod;
        
        if (checkCollision(item)) {
            handleCatch(item);
            fallingItems.splice(i, 1);
            continue;
        }
        
        if (item.y > canvas.height) {
            if (item.type === 'fruit') {
                gameState.combo = 0;
                updateUI();
            }
            fallingItems.splice(i, 1);
        }
    }
}

function checkCollision(item) {
    const catchWidth = gameState.monkeyWidth;
    const mLeft = monkey.x + (monkey.width - catchWidth) / 2;
    const mRight = mLeft + catchWidth;
    const mTop = monkey.y;
    const mBottom = monkey.y + monkey.height;
    
    const iLeft = item.x;
    const iRight = item.x + item.width;
    const iTop = item.y;
    const iBottom = item.y + item.height;
    
    return iRight >= mLeft && iLeft <= mRight &&
           iBottom >= mTop && iTop <= mBottom;
}

function handleCatch(item) {
    if (item.type === 'fruit') {
        gameState.combo++;
        const comboBonus = Math.floor(gameState.combo / 3) * 5;
        let points = item.points + comboBonus;
        if (gameState.doubleScore) points *= 2;
        gameState.score += points;
        playSound('fruit');
        checkMilestone();
    } else if (item.type === 'bomb') {
        gameState.combo = 0;
        gameState.score = Math.max(0, gameState.score + item.points);
        playSound('bomb');
    } else if (item.type === 'powerup') {
        activatePowerup(item);
        playSound('powerup');
    }
    
    updateUI();
}

function activatePowerup(powerup) {
    if (powerupTimers[powerup.name]) {
        clearTimeout(powerupTimers[powerup.name]);
        powerupTimers[powerup.name] = null;
    }
    
    const existingBadge = document.getElementById(`powerup-${powerup.name}`);
    if (existingBadge) existingBadge.remove();
    
    const indicator = document.getElementById('powerupIndicator');
    const badge = document.createElement('span');
    badge.className = 'powerup-badge';
    badge.textContent = `${powerup.emoji} ${powerup.label}`;
    badge.id = `powerup-${powerup.name}`;
    indicator.appendChild(badge);
    
    switch(powerup.name) {
        case 'doubleScore':
            gameState.doubleScore = true;
            powerupTimers[powerup.name] = setTimeout(() => {
                gameState.doubleScore = false;
                removePowerupBadge(powerup.name);
                powerupTimers[powerup.name] = null;
            }, powerup.duration);
            break;
        case 'slowDown':
            gameState.slowMode = true;
            powerupTimers[powerup.name] = setTimeout(() => {
                gameState.slowMode = false;
                removePowerupBadge(powerup.name);
                powerupTimers[powerup.name] = null;
            }, powerup.duration);
            break;
        case 'wideCatch':
            gameState.monkeyWidth = 140;
            powerupTimers[powerup.name] = setTimeout(() => {
                gameState.monkeyWidth = 80;
                removePowerupBadge(powerup.name);
                powerupTimers[powerup.name] = null;
            }, powerup.duration);
            break;
    }
}

function removePowerupBadge(name) {
    const badge = document.getElementById(`powerup-${name}`);
    if (badge) badge.remove();
}

function checkMilestone() {
    const currentMilestone = Math.floor(gameState.score / 100);
    if (currentMilestone > gameState.lastMilestone) {
        const milestonesCrossed = currentMilestone - gameState.lastMilestone;
        for (let i = 0; i < milestonesCrossed; i++) {
            setTimeout(() => triggerMilestoneFlash(), i * 450);
        }
        gameState.lastMilestone = currentMilestone;
        gameState.speedMultiplier = 1 + currentMilestone * 0.1;
    }
}

function triggerMilestoneFlash() {
    const flash = document.getElementById('milestoneFlash');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 400);
}

function updateMonkey() {
    if (monkey.moveLeft) {
        monkey.x = Math.max(0, monkey.x - monkey.speed);
    }
    if (monkey.moveRight) {
        monkey.x = Math.min(canvas.width - monkey.width, monkey.x + monkey.speed);
    }
}

function drawMonkey() {
    ctx.save();
    ctx.font = `${monkey.height}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐵', monkey.x + monkey.width / 2, monkey.y + monkey.height / 2);
    
    const catchWidth = gameState.monkeyWidth;
    const catchLeft = monkey.x + (monkey.width - catchWidth) / 2;
    
    ctx.strokeStyle = catchWidth > monkey.width ? 'rgba(147, 51, 234, 0.6)' : 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash(catchWidth > monkey.width ? [5, 5] : []);
    ctx.strokeRect(
        catchLeft + 2,
        monkey.y + 5,
        catchWidth - 4,
        monkey.height - 10
    );
    ctx.restore();
}

function drawItems() {
    ctx.font = '35px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    fallingItems.forEach(item => {
        ctx.fillText(item.emoji, item.x + item.width / 2, item.y + item.height / 2);
    });
}

function drawBackgroundDecorations() {
    const bg = backgrounds[gameState.currentBackground];
    
    ctx.save();
    ctx.font = '30px Arial';
    ctx.globalAlpha = 0.3;
    
    if (bg === 'jungle') {
        ctx.fillText('🌴', 50, 80);
        ctx.fillText('🌿', canvas.width - 60, 100);
        ctx.fillText('🍃', 80, canvas.height - 100);
        ctx.fillText('🌴', canvas.width - 50, canvas.height - 80);
    } else if (bg === 'beach') {
        ctx.fillText('☀️', canvas.width - 80, 60);
        ctx.fillText('🌴', 50, canvas.height - 60);
        ctx.fillText('🐚', canvas.width - 50, canvas.height - 50);
        ctx.font = '20px Arial';
        for (let i = 0; i < 5; i++) {
            ctx.fillText('🌊', 100 + i * 120, canvas.height - 30);
        }
    } else if (bg === 'city') {
        ctx.font = '40px Arial';
        ctx.fillText('🏢', 60, canvas.height - 50);
        ctx.fillText('🏬', canvas.width - 70, canvas.height - 40);
        ctx.font = '25px Arial';
        ctx.fillText('🌙', canvas.width - 60, 50);
        ctx.fillText('⭐', 80, 60);
        ctx.fillText('⭐', canvas.width - 120, 80);
    }
    
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundDecorations();
    drawItems();
    drawMonkey();
}

function gameLoop() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    updateMonkey();
    updateItems();
    draw();
    
    gameLoopId = requestAnimationFrame(gameLoop);
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('highScore').textContent = gameState.highScore;
    document.getElementById('timeLeft').textContent = gameState.timeLeft;
    document.getElementById('combo').textContent = gameState.combo;
    document.getElementById('speedMultiplier').textContent = gameState.speedMultiplier.toFixed(1) + 'x';
    
    const comboEl = document.getElementById('combo');
    if (gameState.combo >= 3) {
        comboEl.style.transform = 'scale(1.2)';
        comboEl.style.color = '#ec4899';
        setTimeout(() => {
            comboEl.style.transform = 'scale(1)';
            comboEl.style.color = '#8b5cf6';
        }, 200);
    }
}

function startGame() {
    if (gameState.isPlaying && !gameState.isPaused) return;
    
    initAudio();
    
    if (!gameState.isPlaying) {
        resetGameState();
    } else {
        gameState.isPaused = false;
    }
    
    endGameIntervals();
    
    gameState.isPlaying = true;
    gameState.isPaused = false;
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('gameOverModal').classList.remove('active');
    document.getElementById('pauseOverlay').classList.remove('active');
    
    timerInterval = setInterval(() => {
        if (!gameState.isPaused) {
            gameState.timeLeft--;
            updateUI();
            
            if (gameState.timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);
    
    spawnInterval = setInterval(spawnItem, 800);
    gameLoop();
}

function pauseGame() {
    if (!gameState.isPlaying) return;
    
    gameState.isPaused = !gameState.isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    const pauseOverlay = document.getElementById('pauseOverlay');
    
    if (gameState.isPaused) {
        pauseBtn.textContent = '▶️ 继续';
        pauseOverlay.classList.add('active');
        cancelAnimationFrame(gameLoopId);
    } else {
        pauseBtn.textContent = '⏸️ 暂停';
        pauseOverlay.classList.remove('active');
        gameLoop();
    }
}

function resetGameState() {
    gameState.score = 0;
    gameState.combo = 0;
    gameState.timeLeft = 60;
    gameState.speedMultiplier = 1;
    gameState.monkeyWidth = 80;
    gameState.doubleScore = false;
    gameState.slowMode = false;
    gameState.lastMilestone = 0;
    fallingItems = [];
    
    Object.keys(powerupTimers).forEach(name => {
        if (powerupTimers[name]) {
            clearTimeout(powerupTimers[name]);
            powerupTimers[name] = null;
        }
    });
    
    document.getElementById('powerupIndicator').innerHTML = '';
    initMonkey();
    updateUI();
}

function resetGame() {
    endGameIntervals();
    resetGameState();
    gameState.isPlaying = false;
    gameState.isPaused = false;
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = '⏸️ 暂停';
    document.getElementById('gameOverModal').classList.remove('active');
    document.getElementById('pauseOverlay').classList.remove('active');
    
    draw();
}

function endGameIntervals() {
    if (timerInterval) clearInterval(timerInterval);
    if (spawnInterval) clearInterval(spawnInterval);
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
}

function endGame() {
    endGameIntervals();
    gameState.isPlaying = false;
    
    const isNewHighScore = gameState.score > gameState.highScore;
    if (isNewHighScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('monkeyHighScore', gameState.highScore);
    }
    
    playSound('gameOver');
    
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('newHighScore').style.display = isNewHighScore ? 'block' : 'none';
    document.getElementById('gameOverModal').classList.add('active');
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    
    updateUI();
}

function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    const btn = document.getElementById('soundBtn');
    btn.textContent = gameState.soundEnabled ? '🔊 音效' : '🔇 音效';
}

function toggleBackground() {
    gameState.currentBackground = (gameState.currentBackground + 1) % backgrounds.length;
    canvasWrapper.className = 'canvas-wrapper ' + backgrounds[gameState.currentBackground];
    if (!gameState.isPlaying) draw();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') monkey.moveLeft = true;
    if (e.key === 'ArrowRight' || e.key === 'd') monkey.moveRight = true;
    if (e.key === ' ') {
        e.preventDefault();
        if (!gameState.isPlaying) startGame();
        else pauseGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') monkey.moveLeft = false;
    if (e.key === 'ArrowRight' || e.key === 'd') monkey.moveRight = false;
});

let touchStartX = 0;
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartX;
    
    if (diff < -10) {
        monkey.moveLeft = true;
        monkey.moveRight = false;
    } else if (diff > 10) {
        monkey.moveRight = true;
        monkey.moveLeft = false;
    }
    
    touchStartX = touchX;
});

canvas.addEventListener('touchend', () => {
    monkey.moveLeft = false;
    monkey.moveRight = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const targetX = mouseX - monkey.width / 2;
    
    if (targetX < monkey.x - 5) {
        monkey.moveLeft = true;
        monkey.moveRight = false;
    } else if (targetX > monkey.x + 5) {
        monkey.moveRight = true;
        monkey.moveLeft = false;
    } else {
        monkey.moveLeft = false;
        monkey.moveRight = false;
    }
});

canvas.addEventListener('mouseleave', () => {
    monkey.moveLeft = false;
    monkey.moveRight = false;
});

function init() {
    initMonkey();
    updateUI();
    draw();
}

init();
