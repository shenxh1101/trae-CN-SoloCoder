const themes = {
    animals: ['🐶', '🐱', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🐰', '🦊', '🐻', '🐷', '🐮', '🐔', '🐧', '🐦', '🦋', '🐢'],
    fruits: ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🍌', '🥝', '🍍', '🥭', '🍐', '🍉', '🫐', '🍈', '🥥', '🍅', '🥑'],
    emojis: ['😀', '😂', '🥰', '😎', '🤔', '😴', '🥳', '😱', '🤩', '😇', '🤠', '👻', '👽', '🤖', '💀', '🎃', '🦄', '🐲']
};

const difficultySettings = {
    easy: { rows: 4, cols: 4, pairs: 8 },
    medium: { rows: 4, cols: 6, pairs: 12 },
    hard: { rows: 6, cols: 6, pairs: 18 }
};

let gameState = {
    currentTheme: 'animals',
    currentDifficulty: 'easy',
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 8,
    moves: 0,
    timer: null,
    seconds: 0,
    isProcessing: false,
    soundEnabled: true,
    audioContext: null
};

const gameBoard = document.getElementById('game-board');
const movesDisplay = document.getElementById('moves');
const timerDisplay = document.getElementById('timer');
const matchedDisplay = document.getElementById('matched');
const remainingDisplay = document.getElementById('remaining');
const bestRecordDisplay = document.getElementById('best-record');
const difficultySelect = document.getElementById('difficulty');
const themeSelect = document.getElementById('theme');
const soundToggle = document.getElementById('sound-toggle');
const resetBtn = document.getElementById('reset-btn');
const winModal = document.getElementById('win-modal');
const winStats = document.getElementById('win-stats');
const newRecordText = document.getElementById('new-record');
const playAgainBtn = document.getElementById('play-again');

function initAudio() {
    if (!gameState.audioContext) {
        try {
            gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            gameState.soundEnabled = false;
        }
    }
    if (gameState.audioContext && gameState.audioContext.state === 'suspended') {
        gameState.audioContext.resume();
    }
}

function playSound(type) {
    if (!gameState.soundEnabled) return;
    
    initAudio();
    if (!gameState.audioContext) return;
    
    const ctx = gameState.audioContext;
    
    try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        switch(type) {
            case 'flip':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.1);
                break;
            case 'match':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523, ctx.currentTime);
                oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
                break;
            case 'noMatch':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(200, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.2);
                break;
            case 'win':
                const notes = [523, 659, 784, 1047];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
                    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
                    osc.start(ctx.currentTime + i * 0.15);
                    osc.stop(ctx.currentTime + i * 0.15 + 0.3);
                });
                break;
        }
    } catch (e) {
        console.warn('Audio playback error:', e);
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function createCards() {
    const settings = difficultySettings[gameState.currentDifficulty];
    gameState.totalPairs = settings.pairs;
    
    const icons = themes[gameState.currentTheme];
    const selectedIcons = shuffleArray(icons).slice(0, settings.pairs);
    const cardPairs = [...selectedIcons, ...selectedIcons];
    gameState.cards = shuffleArray(cardPairs);
}

function renderBoard() {
    const settings = difficultySettings[gameState.currentDifficulty];
    gameBoard.className = `game-board ${gameState.currentDifficulty}`;
    gameBoard.innerHTML = '';
    
    gameState.cards.forEach((icon, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = index;
        card.dataset.icon = icon;
        
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">?</div>
                <div class="card-back">${icon}</div>
            </div>
        `;
        
        card.addEventListener('click', () => handleCardClick(card));
        gameBoard.appendChild(card);
    });
}

function handleCardClick(card) {
    if (gameState.isProcessing || 
        card.classList.contains('flipped') || 
        card.classList.contains('matched')) {
        return;
    }
    
    if (!gameState.timer) {
        startTimer();
    }
    
    playSound('flip');
    card.classList.add('flipped');
    gameState.flippedCards.push(card);
    
    if (gameState.flippedCards.length === 2) {
        gameState.moves++;
        movesDisplay.textContent = gameState.moves;
        checkMatch();
    }
}

function checkMatch() {
    gameState.isProcessing = true;
    const [card1, card2] = gameState.flippedCards;
    
    if (card1.dataset.icon === card2.dataset.icon) {
        setTimeout(() => {
            playSound('match');
            card1.classList.add('matched');
            card2.classList.add('matched');
            card1.classList.add('highlight');
            card2.classList.add('highlight');
            
            setTimeout(() => {
                card1.classList.remove('highlight');
                card2.classList.remove('highlight');
            }, 2000);
            
            gameState.matchedPairs++;
            matchedDisplay.textContent = gameState.matchedPairs;
            remainingDisplay.textContent = gameState.totalPairs - gameState.matchedPairs;
            
            gameState.flippedCards = [];
            gameState.isProcessing = false;
            
            if (gameState.matchedPairs === gameState.totalPairs) {
                endGame();
            }
        }, 300);
    } else {
        setTimeout(() => {
            playSound('noMatch');
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            gameState.flippedCards = [];
            gameState.isProcessing = false;
        }, 1000);
    }
}

function startTimer() {
    gameState.timer = setInterval(() => {
        gameState.seconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameState.seconds / 60);
    const secs = gameState.seconds % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getBestRecords() {
    const records = localStorage.getItem('memoryGameRecords');
    return records ? JSON.parse(records) : {};
}

function saveBestRecord(difficulty, moves, time) {
    const records = getBestRecords();
    let isNewRecord = false;
    
    if (!records[difficulty]) {
        records[difficulty] = { moves: moves, time: time };
        isNewRecord = true;
    } else {
        if (moves < records[difficulty].moves) {
            records[difficulty].moves = moves;
            isNewRecord = true;
        }
        if (time < records[difficulty].time) {
            records[difficulty].time = time;
            isNewRecord = true;
        }
    }
    
    localStorage.setItem('memoryGameRecords', JSON.stringify(records));
    return isNewRecord;
}

function updateBestRecordDisplay() {
    const records = getBestRecords();
    const currentRecord = records[gameState.currentDifficulty];
    
    if (currentRecord) {
        bestRecordDisplay.textContent = `点击: ${currentRecord.moves} | 时间: ${formatTime(currentRecord.time)}`;
    } else {
        bestRecordDisplay.textContent = '点击: - | 时间: -';
    }
}

function endGame() {
    stopTimer();
    playSound('win');
    
    const isNewRecord = saveBestRecord(gameState.currentDifficulty, gameState.moves, gameState.seconds);
    
    winStats.textContent = `用时 ${formatTime(gameState.seconds)}，共点击 ${gameState.moves} 次`;
    
    if (isNewRecord) {
        newRecordText.classList.remove('hidden');
    } else {
        newRecordText.classList.add('hidden');
    }
    
    setTimeout(() => {
        winModal.classList.remove('hidden');
        updateBestRecordDisplay();
    }, 500);
}

function shuffleAnimation() {
    const cards = gameBoard.querySelectorAll('.card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('shuffling');
            setTimeout(() => card.classList.remove('shuffling'), 400);
        }, index * 50);
    });
}

function resetGame() {
    stopTimer();
    gameState.matchedPairs = 0;
    gameState.moves = 0;
    gameState.seconds = 0;
    gameState.flippedCards = [];
    gameState.isProcessing = false;
    
    movesDisplay.textContent = '0';
    timerDisplay.textContent = '00:00';
    matchedDisplay.textContent = '0';
    
    createCards();
    renderBoard();
    
    const settings = difficultySettings[gameState.currentDifficulty];
    remainingDisplay.textContent = settings.pairs;
    
    winModal.classList.add('hidden');
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            shuffleAnimation();
        });
    });
}

difficultySelect.addEventListener('change', (e) => {
    gameState.currentDifficulty = e.target.value;
    updateBestRecordDisplay();
    resetGame();
});

themeSelect.addEventListener('change', (e) => {
    gameState.currentTheme = e.target.value;
    resetGame();
});

soundToggle.addEventListener('change', (e) => {
    gameState.soundEnabled = e.target.checked;
});

resetBtn.addEventListener('click', resetGame);
playAgainBtn.addEventListener('click', resetGame);

updateBestRecordDisplay();
resetGame();
