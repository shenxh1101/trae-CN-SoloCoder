const themes = {
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦆', '🦉', '🦋', '🐝', '🐢', '🐙', '🦀', '🐬', '🐳', '🦈', '🦒', '🦘', '🐘', '🦏', '🦛'],
    fruits: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥕', '🌽', '🥦', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥨', '🧀', '🥚'],
    vehicles: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '✈️', '🚀'],
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐']
};

const difficultyPairs = { 4: 8, 6: 18, 8: 32 };

let gameState = {
    gridSize: 6,
    theme: 'animals',
    mode: 'single',
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 18,
    moves: 0,
    startTime: null,
    timerInterval: null,
    isProcessing: false,
    soundEnabled: true,
    currentPlayer: 1,
    playerScores: [0, 0],
    gameStarted: false,
    hintTimeout: null,
    fireworksAnimId: null
};

let audioContext = null;

function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            return;
        }
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function playTone(frequency, duration, startTime, volume) {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function playSound(type) {
    if (!gameState.soundEnabled || !audioContext) return;
    try {
        initAudio();
        const now = audioContext.currentTime;

        switch (type) {
            case 'flip':
                playTone(880, 0.08, now, 0.2);
                playTone(660, 0.08, now + 0.04, 0.15);
                break;
            case 'match':
                playTone(523, 0.15, now, 0.25);
                playTone(659, 0.15, now + 0.12, 0.25);
                playTone(784, 0.2, now + 0.24, 0.3);
                break;
            case 'mismatch':
                playTone(300, 0.15, now, 0.15);
                playTone(250, 0.2, now + 0.1, 0.12);
                break;
            case 'win': {
                const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
                notes.forEach((freq, i) => {
                    playTone(freq, 0.2, now + i * 0.12, 0.2);
                });
                break;
            }
        }
    } catch (e) {
        // silently fail
    }
}

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateCards() {
    const pairsCount = difficultyPairs[gameState.gridSize];
    const themeSymbols = themes[gameState.theme];
    const selectedSymbols = shuffle(themeSymbols).slice(0, pairsCount);
    const cardPairs = [...selectedSymbols, ...selectedSymbols];
    return shuffle(cardPairs).map((symbol, index) => ({
        id: index,
        symbol: symbol,
        isFlipped: false,
        isMatched: false
    }));
}

function getCardElement(index) {
    return document.querySelector(`.card[data-index="${index}"]`);
}

function renderBoard() {
    const board = document.getElementById('gameBoard');
    const sizeClass = gameState.gridSize === 4 ? 'easy' : gameState.gridSize === 6 ? 'medium' : 'hard';
    board.className = `game-board ${sizeClass}`;
    board.innerHTML = '';

    gameState.cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.index = index;

        if (card.isMatched) {
            cardEl.classList.add('matched');
        } else if (card.isFlipped) {
            cardEl.classList.add('flipped');
        }

        cardEl.innerHTML = `
            <div class="card-inner">
                <div class="card-back"></div>
                <div class="card-front">${card.symbol}</div>
            </div>
        `;

        cardEl.addEventListener('click', (e) => {
            e.preventDefault();
            handleCardClick(index);
        });

        board.appendChild(cardEl);
    });
}

function handleCardClick(index) {
    const card = gameState.cards[index];

    if (gameState.isProcessing) return;
    if (card.isFlipped || card.isMatched) return;

    if (!gameState.gameStarted) {
        startTimer();
        gameState.gameStarted = true;
    }

    playSound('flip');
    card.isFlipped = true;
    gameState.flippedCards.push(index);

    const el = getCardElement(index);
    if (el) el.classList.add('flipped');

    if (gameState.flippedCards.length === 2) {
        gameState.moves++;
        updateStats();
        checkMatch();
    }
}

function checkMatch() {
    gameState.isProcessing = true;
    const [firstIdx, secondIdx] = gameState.flippedCards;
    const firstCard = gameState.cards[firstIdx];
    const secondCard = gameState.cards[secondIdx];

    if (firstCard.symbol === secondCard.symbol) {
        setTimeout(() => {
            playSound('match');
            firstCard.isMatched = true;
            secondCard.isMatched = true;
            firstCard.isFlipped = false;
            secondCard.isFlipped = false;
            gameState.matchedPairs++;

            const el1 = getCardElement(firstIdx);
            const el2 = getCardElement(secondIdx);
            if (el1) {
                el1.classList.remove('flipped');
                el1.classList.add('matched');
            }
            if (el2) {
                el2.classList.remove('flipped');
                el2.classList.add('matched');
            }

            if (gameState.mode === 'dual') {
                gameState.playerScores[gameState.currentPlayer - 1]++;
                updatePlayerScores();
            }

            gameState.flippedCards = [];
            gameState.isProcessing = false;
            updateStats();

            if (gameState.matchedPairs === gameState.totalPairs) {
                endGame();
            }
        }, 400);
    } else {
        playSound('mismatch');
        setTimeout(() => {
            firstCard.isFlipped = false;
            secondCard.isFlipped = false;

            const el1 = getCardElement(firstIdx);
            const el2 = getCardElement(secondIdx);
            if (el1) el1.classList.remove('flipped');
            if (el2) el2.classList.remove('flipped');

            gameState.flippedCards = [];
            gameState.isProcessing = false;

            if (gameState.mode === 'dual') {
                gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
                updateCurrentPlayer();
            }
        }, 1000);
    }
}

function startTimer() {
    gameState.startTime = Date.now();
    gameState.timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

function updateStats() {
    document.getElementById('moves').textContent = gameState.moves;
    document.getElementById('pairs').textContent = gameState.matchedPairs;
    document.getElementById('remaining').textContent = gameState.totalPairs - gameState.matchedPairs;
}

function updatePlayerScores() {
    document.getElementById('player1Score').textContent = gameState.playerScores[0];
    document.getElementById('player2Score').textContent = gameState.playerScores[1];
}

function updateCurrentPlayer() {
    const display = document.getElementById('currentPlayerDisplay');
    const text = document.getElementById('currentPlayerText');
    text.textContent = `当前回合: 玩家${gameState.currentPlayer}`;
    display.className = `current-player active player${gameState.currentPlayer}`;
}

function calculateScore() {
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const baseScore = 1000;
    const movePenalty = gameState.moves * 5;
    const timePenalty = elapsed * 2;
    const bonus = (gameState.totalPairs * 50) - movePenalty - timePenalty;
    return Math.max(0, baseScore + bonus);
}

function saveHighScore(score) {
    const key = `memoryGame_highScore_${gameState.gridSize}_${gameState.theme}`;
    const currentHigh = parseInt(localStorage.getItem(key) || '0');
    if (score > currentHigh) {
        localStorage.setItem(key, score.toString());
        return true;
    }
    return false;
}

function getHighScore() {
    const key = `memoryGame_highScore_${gameState.gridSize}_${gameState.theme}`;
    return parseInt(localStorage.getItem(key) || '0');
}

function endGame() {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
    playSound('win');
    startFireworks();

    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');

    const modal = document.getElementById('victoryModal');
    const victoryTitle = document.getElementById('victoryTitle');
    const victoryStats = document.getElementById('victoryStats');

    if (gameState.mode === 'dual') {
        const s1 = gameState.playerScores[0];
        const s2 = gameState.playerScores[1];
        let winner;
        if (s1 > s2) winner = '玩家1';
        else if (s2 > s1) winner = '玩家2';
        else winner = '平局';

        victoryTitle.textContent = winner === '平局' ? '🤝 平局！' : `🎉 ${winner}获胜！`;
        victoryStats.innerHTML = `
            <p>⏱️ 总用时: ${minutes}:${seconds}</p>
            <p>👆 总步数: ${gameState.moves}</p>
            <p>🎯 玩家1配对: ${s1} 对</p>
            <p>🎯 玩家2配对: ${s2} 对</p>
        `;
    } else {
        const score = calculateScore();
        const isNewRecord = saveHighScore(score);

        victoryTitle.textContent = '🎉 恭喜获胜！';
        victoryStats.innerHTML = `
            <p>⏱️ 用时: ${minutes}:${seconds}</p>
            <p>👆 步数: ${gameState.moves}</p>
            <p>🏆 得分: ${score}</p>
            ${isNewRecord ? '<p style="color: #d63384; font-weight: bold;">🎊 新纪录！</p>' : ''}
        `;

        document.getElementById('highScore').textContent = getHighScore();
    }

    modal.classList.add('show');
}

function shuffleUnmatched() {
    if (gameState.isProcessing) return;

    const unmatchedIndices = [];
    const unmatchedSymbols = [];

    gameState.cards.forEach((card, index) => {
        if (!card.isMatched) {
            unmatchedIndices.push(index);
            unmatchedSymbols.push(card.symbol);
            card.isFlipped = false;
        }
    });

    if (unmatchedIndices.length === 0) return;

    const shuffledSymbols = shuffle(unmatchedSymbols);

    unmatchedIndices.forEach((cardIndex, i) => {
        gameState.cards[cardIndex].symbol = shuffledSymbols[i];
        gameState.cards[cardIndex].isFlipped = false;
    });

    gameState.flippedCards = [];
    gameState.isProcessing = false;
    renderBoard();
}

function showHint() {
    if (gameState.isProcessing) return;

    if (gameState.hintTimeout) {
        clearTimeout(gameState.hintTimeout);
        gameState.hintTimeout = null;
    }

    document.querySelectorAll('.card.hint').forEach(el => el.classList.remove('hint'));

    const unmatchedCards = [];
    gameState.cards.forEach((card, index) => {
        if (!card.isMatched && !card.isFlipped) {
            unmatchedCards.push({ index, symbol: card.symbol });
        }
    });

    if (unmatchedCards.length < 2) return;

    const symbolMap = {};
    let hintPair = null;

    for (const card of unmatchedCards) {
        if (symbolMap[card.symbol] !== undefined) {
            hintPair = [symbolMap[card.symbol], card.index];
            break;
        } else {
            symbolMap[card.symbol] = card.index;
        }
    }

    if (!hintPair) return;

    const el1 = getCardElement(hintPair[0]);
    const el2 = getCardElement(hintPair[1]);
    if (el1) el1.classList.add('hint');
    if (el2) el2.classList.add('hint');

    gameState.hintTimeout = setTimeout(() => {
        if (el1) el1.classList.remove('hint');
        if (el2) el2.classList.remove('hint');
        gameState.hintTimeout = null;
    }, 2000);
}

function startFireworks() {
    const canvas = document.getElementById('fireworksCanvas');
    canvas.classList.add('active');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4', '#7b68ee', '#98fb98'];
    let running = true;

    if (gameState.fireworksAnimId) {
        cancelAnimationFrame(gameState.fireworksAnimId);
    }

    function createFirework(x, y) {
        const particleCount = 60 + Math.floor(Math.random() * 40);
        const color = colors[Math.floor(Math.random() * colors.length)];

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.5;
            const velocity = 1.5 + Math.random() * 4;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color: color,
                alpha: 1,
                life: 50 + Math.random() * 50,
                size: 2 + Math.random() * 2
            });
        }
    }

    function animate() {
        if (!running) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04;
            p.vx *= 0.99;
            p.alpha -= 0.012;
            p.life--;

            if (p.alpha <= 0 || p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (particles.length > 0) {
            gameState.fireworksAnimId = requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.classList.remove('active');
            running = false;
        }
    }

    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            if (!running) return;
            createFirework(
                canvas.width * 0.2 + Math.random() * canvas.width * 0.6,
                canvas.height * 0.15 + Math.random() * canvas.height * 0.4
            );
        }, i * 400);
    }

    animate();
}

function initGame() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    if (gameState.hintTimeout) {
        clearTimeout(gameState.hintTimeout);
        gameState.hintTimeout = null;
    }
    if (gameState.fireworksAnimId) {
        cancelAnimationFrame(gameState.fireworksAnimId);
        gameState.fireworksAnimId = null;
    }

    const fireworksCanvas = document.getElementById('fireworksCanvas');
    fireworksCanvas.classList.remove('active');
    const fCtx = fireworksCanvas.getContext('2d');
    fCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

    gameState.gridSize = parseInt(document.getElementById('difficultySelect').value);
    gameState.theme = document.getElementById('themeSelect').value;
    gameState.mode = document.getElementById('modeSelect').value;
    gameState.totalPairs = difficultyPairs[gameState.gridSize];
    gameState.cards = generateCards();
    gameState.flippedCards = [];
    gameState.matchedPairs = 0;
    gameState.moves = 0;
    gameState.isProcessing = false;
    gameState.gameStarted = false;
    gameState.currentPlayer = 1;
    gameState.playerScores = [0, 0];

    document.getElementById('timer').textContent = '00:00';
    document.getElementById('highScore').textContent = getHighScore();

    const playerStats = document.querySelectorAll('#player1Stat, #player2Stat');
    const currentPlayerDisplay = document.getElementById('currentPlayerDisplay');

    if (gameState.mode === 'dual') {
        playerStats.forEach(el => el.style.display = 'block');
        currentPlayerDisplay.classList.add('active');
        currentPlayerDisplay.classList.add('player1');
        currentPlayerDisplay.classList.remove('player2');
        updatePlayerScores();
        updateCurrentPlayer();
    } else {
        playerStats.forEach(el => el.style.display = 'none');
        currentPlayerDisplay.classList.remove('active');
        currentPlayerDisplay.classList.remove('player1');
        currentPlayerDisplay.classList.remove('player2');
    }

    updateStats();
    renderBoard();
    document.getElementById('victoryModal').classList.remove('show');
}

document.getElementById('themeSelect').addEventListener('change', initGame);
document.getElementById('difficultySelect').addEventListener('change', initGame);
document.getElementById('modeSelect').addEventListener('change', initGame);
document.getElementById('restartBtn').addEventListener('click', initGame);
document.getElementById('playAgainBtn').addEventListener('click', initGame);

document.getElementById('shuffleBtn').addEventListener('click', () => {
    if (gameState.gameStarted && gameState.matchedPairs < gameState.totalPairs) {
        shuffleUnmatched();
    }
});

document.getElementById('hintBtn').addEventListener('click', showHint);

document.getElementById('soundToggle').addEventListener('click', function () {
    gameState.soundEnabled = !gameState.soundEnabled;
    this.textContent = gameState.soundEnabled ? '🔊 音效' : '🔇 静音';
    if (gameState.soundEnabled) {
        initAudio();
    }
});

document.addEventListener('DOMContentLoaded', initGame);