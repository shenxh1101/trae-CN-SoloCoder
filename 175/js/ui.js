class UIManager {
  constructor() {
    this.currentTheme = 'life';
    this.currentDifficulty = 'easy';
    this.isSoundEnabled = true;
    this.confettiInterval = null;
  }

  init() {
    this.bindEvents();
    this.showMainMenu();
  }

  bindEvents() {
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const theme = e.currentTarget.dataset.theme;
        this.selectTheme(theme);
      });
    });

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const difficulty = e.currentTarget.dataset.difficulty;
        this.selectDifficulty(difficulty);
      });
    });

    document.getElementById('startGameBtn').addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('showLeaderboardBtn').addEventListener('click', () => {
      this.showLeaderboard();
    });

    document.getElementById('backToMenuBtn').addEventListener('click', () => {
      this.showMainMenu();
    });

    document.getElementById('shuffleBtn').addEventListener('click', () => {
      this.shuffleCards();
    });

    document.getElementById('hintBtn').addEventListener('click', () => {
      this.showHint();
    });

    document.getElementById('soundBtn').addEventListener('click', () => {
      this.toggleSound();
    });

    document.getElementById('exitGameBtn').addEventListener('click', () => {
      game.destroy();
      this.showMainMenu();
    });

    document.getElementById('playAgainBtn').addEventListener('click', () => {
      this.hideVictoryModal();
      this.startGame();
    });

    document.getElementById('backToMenuFromVictory').addEventListener('click', () => {
      this.hideVictoryModal();
      this.showMainMenu();
    });

    document.getElementById('saveScoreBtn').addEventListener('click', () => {
      this.saveScore();
    });

    document.getElementById('backFromLeaderboardBtn').addEventListener('click', () => {
      this.hideLeaderboard();
    });

    document.getElementById('leaderboardThemeSelect').addEventListener('change', (e) => {
      this.updateLeaderboardDisplay(e.target.value, this.currentDifficulty);
    });

    document.getElementById('leaderboardDifficultySelect').addEventListener('change', (e) => {
      this.updateLeaderboardDisplay(this.currentTheme, e.target.value);
    });
  }

  selectTheme(theme) {
    this.currentTheme = theme;
    document.querySelectorAll('.theme-card').forEach(card => {
      card.classList.remove('selected');
    });
    document.querySelector(`.theme-card[data-theme="${theme}"]`).classList.add('selected');
  }

  selectDifficulty(difficulty) {
    this.currentDifficulty = difficulty;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    document.querySelector(`.difficulty-btn[data-difficulty="${difficulty}"]`).classList.add('selected');
  }

  showMainMenu() {
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('victoryModal').classList.add('hidden');
    document.getElementById('leaderboardModal').classList.add('hidden');
  }

  startGame() {
    const { cards, rows, cols } = game.initGame(this.currentTheme, this.currentDifficulty);
    
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');

    const themeInfo = GAME_DATA.config.themes[this.currentTheme];
    document.getElementById('currentTheme').textContent = themeInfo.name;
    document.getElementById('currentTheme').style.color = themeInfo.color;

    this.renderCards(cards, rows, cols);
    this.updateStats();
  }

  renderCards(cards, rows, cols) {
    const grid = document.getElementById('cardGrid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    cards.forEach((card, index) => {
      const cardElement = document.createElement('div');
      cardElement.className = 'card-container';
      cardElement.dataset.index = index;

      cardElement.innerHTML = `
        <div class="card ${card.isMatched ? 'matched' : ''}">
          <div class="card-front"></div>
          <div class="card-back">
            <span class="card-emoji">${card.content.emoji}</span>
            <span class="card-text">${card.content.text}</span>
          </div>
        </div>
      `;

      cardElement.addEventListener('click', () => {
        this.handleCardClick(index);
      });

      grid.appendChild(cardElement);
    });
  }

  handleCardClick(index) {
    const result = game.flipCard(index);
    
    if (!result) return;

    if (result.isMatch === null) {
      this.updateCardDisplay(index);
    } else {
      this.updateCardDisplay(result.firstIndex);
      this.updateCardDisplay(result.secondIndex);

      game.processMatchResult(result, (matchResult) => {
        this.handleMatchComplete(matchResult);
      });
    }
  }

  updateCardDisplay(index) {
    const card = game.state.cards[index];
    const cardElement = document.querySelector(`.card-container[data-index="${index}"] .card`);
    
    if (cardElement) {
      if (card.isFlipped || card.isMatched) {
        cardElement.classList.add('flipped');
      } else {
        cardElement.classList.remove('flipped');
      }
      
      if (card.isMatched) {
        cardElement.classList.add('matched');
      }
    }
  }

  handleMatchComplete(matchResult) {
    const { isMatch, firstIndex, secondIndex, explanation, matchedPairs, totalPairs, attempts } = matchResult;

    if (isMatch) {
      document.querySelector(`.card-container[data-index="${firstIndex}"] .card`).classList.add('matched-glow');
      document.querySelector(`.card-container[data-index="${secondIndex}"] .card`).classList.add('matched-glow');
      
      this.showExplanation(explanation);
    } else {
      setTimeout(() => {
        this.updateCardDisplay(firstIndex);
        this.updateCardDisplay(secondIndex);
      }, 100);
    }

    this.updateStats();
  }

  showExplanation(explanation) {
    const explanationEl = document.getElementById('explanationText');
    explanationEl.textContent = explanation;
    explanationEl.parentElement.classList.add('show');
    
    setTimeout(() => {
      explanationEl.parentElement.classList.remove('show');
    }, 3000);
  }

  updateStats() {
    const stats = game.getStats();
    document.getElementById('matchedCount').textContent = `${stats.matchedPairs}/${stats.totalPairs}`;
    document.getElementById('attemptsCount').textContent = stats.attempts;
  }

  updateTimer(time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    document.getElementById('timerDisplay').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  shuffleCards() {
    const cards = game.shuffleUnmatched();
    const config = GAME_DATA.config.difficulties[this.currentDifficulty];
    this.renderCards(cards, config.rows, config.cols);
    this.updateStats();
  }

  showHint() {
    if (game.state.isProcessing) return;
    
    const hintIndices = game.getHint();
    if (hintIndices.length !== 2) {
      return;
    }
    
    game.state.isProcessing = true;
    
    hintIndices.forEach(index => {
      const cardContainer = document.querySelector(`.card-container[data-index="${index}"]`);
      if (cardContainer) {
        const card = cardContainer.querySelector('.card');
        if (card) {
          card.classList.add('hint-pulse');
          cardContainer.style.transform = 'scale(1.05)';
          cardContainer.style.transition = 'transform 0.3s ease';
        }
      }
    });
    
    setTimeout(() => {
      hintIndices.forEach(index => {
        const cardContainer = document.querySelector(`.card-container[data-index="${index}"]`);
        if (cardContainer) {
          const card = cardContainer.querySelector('.card');
          if (card) {
            card.classList.remove('hint-pulse');
          }
          cardContainer.style.transform = '';
        }
      });
      game.state.isProcessing = false;
    }, 3000);
  }

  toggleSound() {
    this.isSoundEnabled = audioManager.toggle();
    const btn = document.getElementById('soundBtn');
    btn.textContent = this.isSoundEnabled ? '🔊' : '🔇';
  }

  showVictory(data) {
    const { time, score, attempts, funFact } = data;
    
    document.getElementById('finalTime').textContent = this.formatTime(time);
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalAttempts').textContent = attempts;
    document.getElementById('funFactText').textContent = funFact;
    document.getElementById('victoryModal').classList.remove('hidden');

    this.createConfetti();
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  }

  createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3'];
    const container = document.getElementById('victoryModal');
    
    if (this.confettiInterval) {
      clearInterval(this.confettiInterval);
    }

    this.confettiInterval = setInterval(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDuration = (Math.random() * 2 + 1) + 's';
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      container.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 3000);
    }, 50);

    setTimeout(() => {
      if (this.confettiInterval) {
        clearInterval(this.confettiInterval);
      }
    }, 3000);
  }

  hideVictoryModal() {
    document.getElementById('victoryModal').classList.add('hidden');
    document.querySelectorAll('.confetti').forEach(c => c.remove());
  }

  saveScore() {
    const playerName = document.getElementById('playerName').value || '匿名玩家';
    const time = game.state.elapsedTime;
    const score = game.calculateScore();
    
    const rank = storageManager.addScore(
      this.currentTheme, this.currentDifficulty, playerName, time, score
    );

    if (rank <= 5) {
      alert(`恭喜！您获得了第 ${rank} 名！`);
    } else {
      alert('成绩已保存！');
    }
  }

  showLeaderboard() {
    document.getElementById('leaderboardModal').classList.remove('hidden');
    document.getElementById('leaderboardThemeSelect').value = this.currentTheme;
    document.getElementById('leaderboardDifficultySelect').value = this.currentDifficulty;
    this.updateLeaderboardDisplay(this.currentTheme, this.currentDifficulty);
  }

  hideLeaderboard() {
    document.getElementById('leaderboardModal').classList.add('hidden');
  }

  updateLeaderboardDisplay(theme, difficulty) {
    const scores = storageManager.getTopScores(theme, difficulty);
    const list = document.getElementById('leaderboardList');
    
    if (scores.length === 0) {
      list.innerHTML = '<div class="no-records">暂无记录</div>';
      return;
    }

    list.innerHTML = scores.map((entry, index) => `
      <div class="leaderboard-item">
        <span class="rank">${index + 1}</span>
        <span class="name">${entry.name}</span>
        <span class="time">${this.formatTime(entry.time)}</span>
        <span class="score">${entry.score}分</span>
      </div>
    `).join('');
  }
}

const uiManager = new UIManager();

document.addEventListener('DOMContentLoaded', () => {
  uiManager.init();
});
