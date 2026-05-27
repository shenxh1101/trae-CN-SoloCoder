const gameState = {
    board: ['', '', '', '', '', '', '', '', ''],
    currentPlayer: 'X',
    gameMode: 'pvp',
    firstPlayer: 'X',
    soundEnabled: true,
    scores: { X: 0, O: 0, draw: 0 },
    history: [],
    moveHistory: [],
    gameOver: false,
    winningLine: null,
    playerSymbol: 'X'
};

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('statusText');
const board = document.getElementById('board');
const undoBtn = document.getElementById('undoBtn');
const resetBtn = document.getElementById('resetBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const gameModeSelect = document.getElementById('gameMode');
const firstPlayerSelect = document.getElementById('firstPlayer');
const soundEnabledCheckbox = document.getElementById('soundEnabled');
const themeBtn = document.getElementById('themeBtn');
const winModal = document.getElementById('winModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const historyList = document.getElementById('historyList');
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const scoreDraw = document.getElementById('scoreDraw');

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
    
    switch (type) {
        case 'place':
            oscillator.frequency.value = 440;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'win':
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.15);
                osc.start(audioContext.currentTime + i * 0.1);
                osc.stop(audioContext.currentTime + i * 0.1 + 0.15);
            });
            break;
        case 'draw':
            oscillator.frequency.value = 330;
            oscillator.type = 'triangle';
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
    }
}

function checkWinner(boardState) {
    for (const combination of WINNING_COMBINATIONS) {
        const [a, b, c] = combination;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            return { winner: boardState[a], line: combination };
        }
    }
    return null;
}

function checkDraw(boardState) {
    return boardState.every(cell => cell !== '');
}

function highlightWinningLine(line) {
    line.forEach(index => {
        cells[index].classList.add('winner');
    });
}

function updateStatus() {
    if (gameState.gameOver) return;
    
    if (gameState.gameMode.startsWith('pve')) {
        if (gameState.currentPlayer === gameState.playerSymbol) {
            statusText.textContent = `你的回合 (${gameState.currentPlayer})`;
        } else {
            statusText.textContent = '电脑思考中...';
        }
    } else {
        statusText.textContent = `${gameState.currentPlayer} 的回合`;
    }
}

function updateScoreboard() {
    scoreX.textContent = gameState.scores.X;
    scoreO.textContent = gameState.scores.O;
    scoreDraw.textContent = gameState.scores.draw;
}

function updateHistory() {
    if (gameState.history.length === 0) {
        historyList.innerHTML = '<p class="empty-history">暂无记录</p>';
        return;
    }
    
    historyList.innerHTML = gameState.history.map((item, index) => {
        const gameNum = gameState.history.length - index;
        let resultText, resultClass;
        
        if (item.result === 'draw') {
            resultText = '平局';
            resultClass = 'draw';
        } else {
            resultText = `${item.result} 获胜`;
            resultClass = item.result;
        }
        
        return `
            <div class="history-item ${resultClass}">
                <span>第 ${gameNum} 局</span>
                <span class="result-win">${resultText}</span>
            </div>
        `;
    }).join('');
}

function addToHistory(result) {
    gameState.history.unshift({ result, date: new Date() });
    if (gameState.history.length > 5) {
        gameState.history.pop();
    }
    updateHistory();
}

function showModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    winModal.classList.remove('hidden');
}

function hideModal() {
    winModal.classList.add('hidden');
}

function handleGameEnd(result, line = null) {
    gameState.gameOver = true;
    
    if (result === 'draw') {
        gameState.scores.draw++;
        statusText.textContent = '平局！';
        playSound('draw');
        addToHistory('draw');
        setTimeout(() => showModal('平局！', '这局棋是平局！'), 300);
    } else {
        gameState.scores[result]++;
        if (line) {
            highlightWinningLine(line);
        }
        statusText.textContent = `${result} 获胜！`;
        playSound('win');
        addToHistory(result);
        setTimeout(() => showModal('游戏结束', `${result} 获胜了！`), 300);
    }
    
    updateScoreboard();
    undoBtn.disabled = true;
}

function makeMove(index) {
    if (gameState.board[index] !== '' || gameState.gameOver) return false;
    
    gameState.moveHistory.push({
        board: [...gameState.board],
        currentPlayer: gameState.currentPlayer
    });
    
    gameState.board[index] = gameState.currentPlayer;
    cells[index].textContent = gameState.currentPlayer;
    cells[index].classList.add('taken', gameState.currentPlayer);
    
    playSound('place');
    
    undoBtn.disabled = false;
    
    const winResult = checkWinner(gameState.board);
    if (winResult) {
        gameState.winningLine = winResult.line;
        handleGameEnd(winResult.winner, winResult.line);
        return true;
    }
    
    if (checkDraw(gameState.board)) {
        handleGameEnd('draw');
        return true;
    }
    
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    updateStatus();
    
    return true;
}

function handleCellClick(e) {
    const index = parseInt(e.target.dataset.index);
    
    if (gameState.gameMode.startsWith('pve')) {
        if (gameState.currentPlayer !== gameState.playerSymbol || gameState.gameOver) {
            return;
        }
    }
    
    if (makeMove(index)) {
        if (gameState.gameMode.startsWith('pve') && !gameState.gameOver) {
            setTimeout(() => makeAIMove(), 500);
        }
    }
}

function getEmptyCells(boardState) {
    return boardState.map((cell, index) => cell === '' ? index : null).filter(i => i !== null);
}

function getRandomMove(boardState) {
    const emptyCells = getEmptyCells(boardState);
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function findWinningMove(boardState, player) {
    const emptyCells = getEmptyCells(boardState);
    for (const index of emptyCells) {
        const testBoard = [...boardState];
        testBoard[index] = player;
        if (checkWinner(testBoard)) {
            return index;
        }
    }
    return null;
}

function minimax(boardState, depth, isMaximizing, aiPlayer, humanPlayer) {
    const result = checkWinner(boardState);
    
    if (result) {
        return result.winner === aiPlayer ? 10 - depth : depth - 10;
    }
    
    if (checkDraw(boardState)) {
        return 0;
    }
    
    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === '') {
                boardState[i] = aiPlayer;
                const score = minimax(boardState, depth + 1, false, aiPlayer, humanPlayer);
                boardState[i] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === '') {
                boardState[i] = humanPlayer;
                const score = minimax(boardState, depth + 1, true, aiPlayer, humanPlayer);
                boardState[i] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function getMediumMove(boardState, aiPlayer) {
    const humanPlayer = aiPlayer === 'X' ? 'O' : 'X';
    let bestScore = -Infinity;
    let bestMove = null;
    
    for (let i = 0; i < 9; i++) {
        if (boardState[i] === '') {
            boardState[i] = aiPlayer;
            const score = minimax(boardState, 0, false, aiPlayer, humanPlayer);
            boardState[i] = '';
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    
    return bestMove;
}

function makeAIMove() {
    if (gameState.gameOver) return;
    
    const aiPlayer = gameState.currentPlayer;
    let move;
    
    if (gameState.gameMode === 'pve-easy') {
        move = getRandomMove(gameState.board);
    } else {
        move = getMediumMove(gameState.board, aiPlayer);
    }
    
    if (move !== null) {
        makeMove(move);
    }
}

function undoMove() {
    if (gameState.moveHistory.length === 0 || gameState.gameOver) return;
    
    let previousState = gameState.moveHistory.pop();
    
    if (gameState.gameMode.startsWith('pve') && gameState.moveHistory.length > 0) {
        previousState = gameState.moveHistory.pop();
    }
    
    gameState.board = previousState.board;
    gameState.currentPlayer = previousState.currentPlayer;
    
    cells.forEach((cell, index) => {
        cell.textContent = gameState.board[index];
        cell.classList.remove('taken', 'X', 'O', 'winner');
    });
    
    undoBtn.disabled = gameState.moveHistory.length === 0;
    updateStatus();
}

function resetGame() {
    gameState.board = ['', '', '', '', '', '', '', '', ''];
    gameState.currentPlayer = gameState.firstPlayer;
    gameState.moveHistory = [];
    gameState.gameOver = false;
    gameState.winningLine = null;
    
    if (gameState.gameMode.startsWith('pve')) {
        gameState.playerSymbol = gameState.firstPlayer;
    }
    
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'X', 'O', 'winner');
    });
    
    undoBtn.disabled = true;
    hideModal();
    updateStatus();
    
    if (gameState.gameMode.startsWith('pve') && gameState.currentPlayer !== gameState.playerSymbol) {
        setTimeout(() => makeAIMove(), 500);
    }
}

function resetScores() {
    gameState.scores = { X: 0, O: 0, draw: 0 };
    gameState.history = [];
    updateScoreboard();
    updateHistory();
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('theme-classic')) {
        body.classList.remove('theme-classic');
        body.classList.add('theme-dark');
        localStorage.setItem('ttt-theme', 'dark');
    } else {
        body.classList.remove('theme-dark');
        body.classList.add('theme-classic');
        localStorage.setItem('ttt-theme', 'classic');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('ttt-theme');
    if (savedTheme === 'dark') {
        document.body.classList.remove('theme-classic');
        document.body.classList.add('theme-dark');
    }
}

function addTouchListener(element, handler) {
    element.addEventListener('touchend', (e) => {
        e.preventDefault();
        handler(e);
    });
}

function initEventListeners() {
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
        addTouchListener(cell, handleCellClick);
    });
    
    undoBtn.addEventListener('click', undoMove);
    addTouchListener(undoBtn, undoMove);
    
    resetBtn.addEventListener('click', resetGame);
    addTouchListener(resetBtn, resetGame);
    
    resetScoreBtn.addEventListener('click', resetScores);
    addTouchListener(resetScoreBtn, resetScores);
    
    themeBtn.addEventListener('click', toggleTheme);
    addTouchListener(themeBtn, toggleTheme);
    
    modalCloseBtn.addEventListener('click', resetGame);
    addTouchListener(modalCloseBtn, resetGame);
    
    gameModeSelect.addEventListener('change', (e) => {
        gameState.gameMode = e.target.value;
        resetGame();
    });
    
    firstPlayerSelect.addEventListener('change', (e) => {
        gameState.firstPlayer = e.target.value;
        resetGame();
    });
    
    soundEnabledCheckbox.addEventListener('change', (e) => {
        gameState.soundEnabled = e.target.checked;
    });
    
    winModal.addEventListener('click', (e) => {
        if (e.target === winModal) {
            resetGame();
        }
    });
}

function init() {
    loadTheme();
    initEventListeners();
    updateScoreboard();
    updateHistory();
    updateStatus();
}

window.playSound = playSound;
window.initAudio = initAudio;
window.minimax = minimax;
window.gameState = gameState;

init();
