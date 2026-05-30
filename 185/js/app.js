const App = (() => {
  let currentTheme = 'animals';
  let currentDifficulty = 'easy';
  let currentMode = 'casual';

  function init() {
    setupThemeCards();
    setupDifficultyButtons();
    setupModeToggle();
    setupStartButton();
    setupHintButton();
    setupSoundToggle();
    setupModalButtons();
    setupNewGameButton();
    setupBackButton();
    setupLeaderboardButton();
  }

  function setupThemeCards() {
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        currentTheme = card.dataset.theme;
      });
    });
  }

  function setupDifficultyButtons() {
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentDifficulty = btn.dataset.difficulty;
      });
    });
  }

  function setupModeToggle() {
    const toggle = document.getElementById('mode-toggle');
    const modeLabel = document.getElementById('mode-label');
    toggle.addEventListener('change', () => {
      currentMode = toggle.checked ? 'timed' : 'casual';
      modeLabel.textContent = toggle.checked ? '计时模式' : '休闲模式';
    });
  }

  function setupStartButton() {
    document.getElementById('start-btn').addEventListener('click', () => {
      Game.setConfig(currentTheme, currentDifficulty, currentMode);
      Game.start();
      showPage('game-page');
    });
  }

  function setupHintButton() {
    document.getElementById('hint-btn').addEventListener('click', () => {
      Game.useHint();
    });
  }

  function setupSoundToggle() {
    const btn = document.getElementById('sound-toggle');
    btn.addEventListener('click', () => {
      const enabled = AudioManager.toggle();
      btn.textContent = enabled ? '🔊' : '🔇';
      btn.classList.toggle('muted', !enabled);
    });
  }

  function setupModalButtons() {
    document.getElementById('modal-restart').addEventListener('click', () => {
      document.getElementById('game-over-modal').classList.add('hidden');
      Game.setConfig(currentTheme, currentDifficulty, currentMode);
      Game.start();
    });

    document.getElementById('modal-home').addEventListener('click', () => {
      document.getElementById('game-over-modal').classList.add('hidden');
      Game.reset();
      showPage('home-page');
    });
  }

  function setupNewGameButton() {
    document.getElementById('new-game-btn').addEventListener('click', () => {
      Game.setConfig(currentTheme, currentDifficulty, currentMode);
      Game.start();
    });
  }

  function setupBackButton() {
    document.getElementById('back-btn').addEventListener('click', () => {
      Game.reset();
      showPage('home-page');
    });
  }

  function setupLeaderboardButton() {
    document.getElementById('leaderboard-btn').addEventListener('click', () => {
      renderLeaderboard();
      document.getElementById('leaderboard-modal').classList.remove('hidden');
    });

    document.getElementById('lb-close').addEventListener('click', () => {
      document.getElementById('leaderboard-modal').classList.add('hidden');
    });
  }

  function renderLeaderboard() {
    const select = document.getElementById('lb-theme');
    const diffSelect = document.getElementById('lb-diff');
    const modeSelect = document.getElementById('lb-mode');
    const tbody = document.getElementById('lb-body');

    const filterAndRender = () => {
      const records = Leaderboard.getRecords(select.value, diffSelect.value, modeSelect.value);
      tbody.innerHTML = '';
      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px;">暂无记录</td></tr>';
        return;
      }
      records.forEach((r, i) => {
        const tr = document.createElement('tr');
        const mins = Math.floor(r.time / 60);
        const secs = r.time % 60;
        tr.innerHTML = `<td>${i + 1}</td><td>${r.score}</td><td>${mins}分${secs}秒</td><td>${r.date}</td>`;
        tbody.appendChild(tr);
      });
    };

    select.onchange = filterAndRender;
    diffSelect.onchange = filterAndRender;
    modeSelect.onchange = filterAndRender;
    filterAndRender();
  }

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
