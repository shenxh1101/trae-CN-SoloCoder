const Game = (() => {
  let state = {
    theme: 'animals',
    difficulty: 'easy',
    mode: 'casual',
    grid: null,
    placedWords: [],
    foundWords: [],
    score: 0,
    hintsUsed: 0,
    timerSeconds: 0,
    timerInterval: null,
    isRunning: false,
    selectedCells: []
  };

  function reset() {
    clearInterval(state.timerInterval);
    state = {
      theme: state.theme,
      difficulty: state.difficulty,
      mode: state.mode,
      grid: null,
      placedWords: [],
      foundWords: [],
      score: 0,
      hintsUsed: 0,
      timerSeconds: 0,
      timerInterval: null,
      isRunning: false,
      selectedCells: []
    };
  }

  function setConfig(theme, difficulty, mode) {
    state.theme = theme;
    state.difficulty = difficulty;
    state.mode = mode;
  }

  function start() {
    reset();
    const result = GridManager.generateGrid(state.theme, state.difficulty);
    state.grid = result.grid;
    state.placedWords = result.placedWords;
    state.isRunning = true;
    state.timerSeconds = 0;

    if (state.mode === 'timed') {
      state.timerSeconds = TIMED_MODE_SECONDS;
    }

    startTimer();
    render();
  }

  function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      if (!state.isRunning) return;

      if (state.mode === 'timed') {
        state.timerSeconds--;
        if (state.timerSeconds <= 0) {
          state.timerSeconds = 0;
          gameOver(false);
          return;
        }
      } else {
        state.timerSeconds++;
      }
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    const el = document.getElementById('timer');
    if (!el) return;
    const mins = Math.floor(Math.abs(state.timerSeconds) / 60);
    const secs = Math.abs(state.timerSeconds) % 60;
    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (state.mode === 'timed' && state.timerSeconds <= 30) {
      el.classList.add('timer-warning');
    } else {
      el.classList.remove('timer-warning');
    }
  }

  function handleSelectionChange(cells) {
    state.selectedCells = cells;
    highlightCells(cells, 'selecting');
  }

  function handleSelectionEnd(cells) {
    clearHighlight('selecting');

    if (cells.length < 2) return;

    const word = cells.map(c => state.grid[c.row][c.col]).join('');
    const reversedWord = word.split('').reverse().join('');

    let matchedWord = null;
    for (const pw of state.placedWords) {
      if (state.foundWords.includes(pw.word)) continue;
      if (pw.word !== word && pw.word !== reversedWord) continue;
      if (cells.length !== pw.positions.length) continue;

      const forwardMatch = cells.every((c, i) =>
        c.row === pw.positions[i].row && c.col === pw.positions[i].col
      );
      const reverseMatch = [...cells].reverse().every((c, i) =>
        c.row === pw.positions[i].row && c.col === pw.positions[i].col
      );

      if (forwardMatch || reverseMatch) {
        matchedWord = pw;
        break;
      }
    }

    if (matchedWord) {
      foundWord(matchedWord);
    } else {
      state.score = Math.max(0, state.score + SCORING.wrong);
      AudioManager.playWrong();
      updateScoreDisplay();
      flashCells(cells, 'wrong');
    }
  }

  function foundWord(pw) {
    state.foundWords.push(pw.word);
    state.score += SCORING.correct + (pw.word.length - 3) * 20;
    AudioManager.playCorrect();
    highlightCells(pw.positions, 'found');
    markWordFound(pw.word);
    updateScoreDisplay();

    if (state.foundWords.length === state.placedWords.length) {
      gameOver(true);
    }
  }

  function gameOver(won) {
    state.isRunning = false;
    clearInterval(state.timerInterval);

    if (won) {
      AudioManager.playVictory();
    }

    showGameOverModal(won);
  }

  function useHint() {
    if (!state.isRunning) return;

    const unfound = state.placedWords.filter(pw => !state.foundWords.includes(pw.word));
    if (unfound.length === 0) return;

    state.score = Math.max(0, state.score + SCORING.hint);
    state.hintsUsed++;
    updateScoreDisplay();

    const target = unfound[Math.floor(Math.random() * unfound.length)];
    const firstPos = target.positions[0];
    const cell = document.querySelector(`.grid-cell[data-row="${firstPos.row}"][data-col="${firstPos.col}"]`);
    if (cell) {
      cell.classList.add('hint-flash');
      setTimeout(() => cell.classList.remove('hint-flash'), 2000);
    }
    AudioManager.playHint();
  }

  function render() {
    renderGrid();
    renderWordList();
    updateScoreDisplay();
    updateTimerDisplay();
  }

  function renderGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.textContent = state.grid[r][c];
        container.appendChild(cell);
      }
    }

    InteractionManager.destroy();
    InteractionManager.init(container, handleSelectionChange, handleSelectionEnd);
  }

  function renderWordList() {
    const list = document.getElementById('word-list');
    list.innerHTML = '';
    state.placedWords.forEach(pw => {
      const li = document.createElement('li');
      li.className = 'word-item';
      li.textContent = pw.word;
      li.dataset.word = pw.word;
      if (state.foundWords.includes(pw.word)) {
        li.classList.add('found');
      }
      list.appendChild(li);
    });
  }

  function highlightCells(cells, className) {
    clearHighlight(className);
    cells.forEach(c => {
      const cell = document.querySelector(`.grid-cell[data-row="${c.row}"][data-col="${c.col}"]`);
      if (cell) cell.classList.add(className);
    });
  }

  function clearHighlight(className) {
    document.querySelectorAll(`.grid-cell.${className}`).forEach(el => el.classList.remove(className));
  }

  function flashCells(cells, className) {
    cells.forEach(c => {
      const cell = document.querySelector(`.grid-cell[data-row="${c.row}"][data-col="${c.col}"]`);
      if (cell) {
        cell.classList.add(className);
        setTimeout(() => cell.classList.remove(className), 500);
      }
    });
  }

  function markWordFound(word) {
    const item = document.querySelector(`.word-item[data-word="${word}"]`);
    if (item) item.classList.add('found');
  }

  function updateScoreDisplay() {
    const el = document.getElementById('score');
    if (el) el.textContent = state.score;
  }

  function showGameOverModal(won) {
    const modal = document.getElementById('game-over-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalTime = document.getElementById('modal-time');
    const modalScore = document.getElementById('modal-score');
    const modalHints = document.getElementById('modal-hints');

    modalTitle.textContent = won ? '🎉 恭喜通关！' : '⏰ 时间到！';
    const elapsed = state.mode === 'timed'
      ? TIMED_MODE_SECONDS - state.timerSeconds
      : state.timerSeconds;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    modalTime.textContent = `${mins}分${secs}秒`;
    modalScore.textContent = state.score;
    modalHints.textContent = state.hintsUsed;

    if (won) {
      Leaderboard.addRecord({
        theme: state.theme,
        difficulty: state.difficulty,
        mode: state.mode,
        time: elapsed,
        score: state.score,
        date: new Date().toISOString().split('T')[0]
      });
    }

    modal.classList.remove('hidden');
  }

  function getState() {
    return state;
  }

  return { setConfig, start, useHint, getState, reset };
})();
