(function () {
  'use strict';

  // ===== Config =====
  var DIFFICULTY = {
    easy:   { moleUpMin: 1200, moleUpMax: 1800, spawnMin: 900,  spawnMax: 1400, bombChance: 0.05, goldChance: 0.08 },
    normal: { moleUpMin: 800,  moleUpMax: 1300, spawnMin: 600,  spawnMax: 1000, bombChance: 0.08, goldChance: 0.1  },
    hard:   { moleUpMin: 500,  moleUpMax: 900,  spawnMin: 350,  spawnMax: 700,  bombChance: 0.12, goldChance: 0.12 }
  };

  var GAME_DURATION = 30; // seconds

  // ===== Audio =====
  var audioCtx = null;
  var soundEnabled = true;

  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    return audioCtx;
  }

  function playTone(freq, duration, type, volume) {
    if (!soundEnabled) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function playMoleAppear() {
    if (!soundEnabled) return;
    playTone(400, 0.1, 'sine', 0.15);
    setTimeout(function () { playTone(600, 0.08, 'sine', 0.1); }, 60);
  }

  function playHit() {
    if (!soundEnabled) return;
    playTone(800, 0.15, 'square', 0.2);
    setTimeout(function () { playTone(1200, 0.1, 'square', 0.15); }, 50);
  }

  function playBomb() {
    if (!soundEnabled) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    var bufferSize = ctx.sampleRate * 0.4;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    var noise = ctx.createBufferSource();
    noise.buffer = buffer;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  function playGold() {
    if (!soundEnabled) return;
    playTone(880, 0.1, 'sine', 0.2);
    setTimeout(function () { playTone(1100, 0.1, 'sine', 0.2); }, 80);
    setTimeout(function () { playTone(1320, 0.15, 'sine', 0.2); }, 160);
  }

  function vibrate(ms) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  // ===== Game State =====
  var state = {
    running: false,
    score: 0,
    combo: 0,
    timeLeft: GAME_DURATION,
    difficulty: 'normal',
    holes: [],
    activeMoles: {},
    spawnTimer: null,
    countdownTimer: null,
    currentTheme: 'grass'
  };

  // ===== DOM =====
  var gridEl = document.getElementById('grid');
  var timerEl = document.getElementById('timer');
  var scoreEl = document.getElementById('score');
  var comboEl = document.getElementById('combo');
  var highScoreEl = document.getElementById('highScore');
  var difficultySel = document.getElementById('difficulty');
  var themeSel = document.getElementById('themeSelect');
  var soundToggle = document.getElementById('soundToggle');
  var startOverlay = document.getElementById('startOverlay');
  var endOverlay = document.getElementById('endOverlay');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');
  var finalScoreEl = document.getElementById('finalScore');
  var scoreBarFill = document.getElementById('scoreBarFill');
  var commentEl = document.getElementById('comment');
  var highScoreText = document.getElementById('highScoreText');
  var comboFloatEl = document.getElementById('comboFloat');
  var gameContainer = document.getElementById('gameContainer');

  // ===== Build Grid =====
  function buildGrid() {
    gridEl.innerHTML = '';
    state.holes = [];
    for (var i = 0; i < 9; i++) {
      var hole = document.createElement('div');
      hole.className = 'hole';
      hole.dataset.index = i;

      var mole = document.createElement('div');
      mole.className = 'mole';
      mole.innerHTML = '<div class="mole-body"><div class="mole-eyes"><div class="mole-eye"></div><div class="mole-eye"></div></div><div class="mole-nose"></div><div class="mole-mouth"></div></div>';
      hole.appendChild(mole);

      var bomb = document.createElement('div');
      bomb.className = 'bomb';
      bomb.innerHTML = '<div class="bomb-body"><div class="bomb-fuse"></div><div class="bomb-spark"></div></div>';
      hole.appendChild(bomb);

      state.holes.push({
        el: hole,
        mole: mole,
        bomb: bomb,
        hasMole: false,
        hasBomb: false,
        moleType: 'normal',
        hideTimeout: null
      });

      hole.addEventListener('click', onHoleClick.bind(null, i));
      hole.addEventListener('touchstart', function (idx, e) {
        e.preventDefault();
        onHoleClick(idx);
      }.bind(null, i), { passive: false });

      gridEl.appendChild(hole);
    }
  }

  // ===== Mole Logic =====
  function showMole(index) {
    var hole = state.holes[index];
    if (!hole || hole.hasMole || hole.hasBomb) return;

    var cfg = DIFFICULTY[state.difficulty];
    var rand = Math.random();
    var type = 'normal';

    if (rand < cfg.goldChance) {
      type = 'golden';
    } else if (rand < cfg.goldChance + cfg.bombChance) {
      type = 'bomb';
    }

    if (type === 'bomb') {
      hole.hasBomb = true;
      hole.hasMole = false;
      hole.mole.classList.remove('visible', 'golden', 'hit');
      hole.bomb.className = 'bomb visible';
      playMoleAppear();
    } else {
      hole.hasMole = true;
      hole.hasBomb = false;
      hole.moleType = type;
      hole.bomb.classList.remove('visible');

      if (type === 'golden') {
        hole.mole.className = 'mole visible golden';
      } else {
        hole.mole.className = 'mole visible';
      }
      playMoleAppear();
    }

    var upTime = randRange(cfg.moleUpMin, cfg.moleUpMax);
    hole.hideTimeout = setTimeout(function () {
      hideMole(index);
    }, upTime);
  }

  function hideMole(index) {
    var hole = state.holes[index];
    if (!hole) return;
    hole.hasMole = false;
    hole.hasBomb = false;
    hole.mole.classList.remove('visible', 'golden', 'hit');
    hole.bomb.classList.remove('visible');
    if (hole.hideTimeout) {
      clearTimeout(hole.hideTimeout);
      hole.hideTimeout = null;
    }
  }

  function hideAllMoles() {
    for (var i = 0; i < state.holes.length; i++) {
      hideMole(i);
    }
  }

  function onHoleClick(index) {
    if (!state.running) return;
    var hole = state.holes[index];
    if (!hole) return;

    if (hole.hasMole) {
      hitMole(index);
    } else if (hole.hasBomb) {
      hitBomb(index);
    }
  }

  function hitMole(index) {
    var hole = state.holes[index];
    if (!hole || !hole.hasMole) return;

    var isGold = hole.moleType === 'golden';
    state.combo++;

    var basePoints = isGold ? 20 : 10;
    var comboBonus = Math.floor(state.combo / 3) * 2;
    var points = basePoints + comboBonus;

    state.score += points;

    hole.mole.classList.add('hit');
    vibrate(isGold ? 80 : 50);

    if (isGold) {
      playGold();
      showFloatingText('+' + points, index, '#FFD700');
    } else {
      playHit();
      showFloatingText('+' + points, index, '#fff');
    }

    if (state.combo >= 3) {
      showComboFloat(index, state.combo);
    }

    updateStats();
    flashStat(scoreEl.parentElement);

    setTimeout(function () { hideMole(index); }, 100);
  }

  function hitBomb(index) {
    var hole = state.holes[index];
    if (!hole || !hole.hasBomb) return;

    state.combo = 0;
    state.score = Math.max(0, state.score - 15);

    hole.bomb.classList.add('hit');
    vibrate(150);
    playBomb();
    showFloatingText('-15', index, '#FF4444');

    updateStats();
    flashStat(scoreEl.parentElement);

    setTimeout(function () { hideMole(index); }, 300);
  }

  function showFloatingText(text, index, color) {
    var hole = state.holes[index];
    if (!hole) return;
    var holeRect = hole.el.getBoundingClientRect();
    var gridRect = gridEl.getBoundingClientRect();

    var float = document.createElement('div');
    float.className = 'combo-float';
    float.textContent = text;
    float.style.color = color || '#fff';
    float.style.left = (holeRect.left - gridRect.left + holeRect.width / 2) + 'px';
    float.style.top = (holeRect.top - gridRect.top + holeRect.height / 3) + 'px';
    comboFloatEl.appendChild(float);

    setTimeout(function () { float.remove(); }, 1000);
  }

  function showComboFloat(index, combo) {
    var hole = state.holes[index];
    if (!hole) return;
    var holeRect = hole.el.getBoundingClientRect();
    var gridRect = gridEl.getBoundingClientRect();

    var float = document.createElement('div');
    float.className = 'combo-float';
    float.textContent = '🔥 ' + combo + ' 连击!';
    float.style.color = '#FF6B35';
    float.style.left = (holeRect.left - gridRect.left + holeRect.width / 2) + 'px';
    float.style.top = (holeRect.top - gridRect.top + holeRect.height / 2) + 'px';
    comboFloatEl.appendChild(float);

    setTimeout(function () { float.remove(); }, 1000);
  }

  // ===== Spawning =====
  function scheduleNextSpawn() {
    if (!state.running) return;
    var cfg = DIFFICULTY[state.difficulty];
    var delay = randRange(cfg.spawnMin, cfg.spawnMax);
    state.spawnTimer = setTimeout(function () {
      if (!state.running) return;
      spawnRandomMole();
      scheduleNextSpawn();
    }, delay);
  }

  function spawnRandomMole() {
    var emptyIndices = [];
    for (var i = 0; i < state.holes.length; i++) {
      if (!state.holes[i].hasMole && !state.holes[i].hasBomb) {
        emptyIndices.push(i);
      }
    }
    if (emptyIndices.length === 0) return;

    var multiSpawnChance = 0.2;
    var count = Math.random() < multiSpawnChance ? Math.min(2, emptyIndices.length) : 1;
    var usedIndices = [];

    for (var j = 0; j < count; j++) {
      var available = emptyIndices.filter(function (idx) {
        return usedIndices.indexOf(idx) === -1;
      });
      if (available.length === 0) break;
      var pick = available[Math.floor(Math.random() * available.length)];
      usedIndices.push(pick);
      showMole(pick);
    }
  }

  // ===== Timer =====
  function startCountdown() {
    state.timeLeft = GAME_DURATION;
    timerEl.textContent = state.timeLeft;
    state.countdownTimer = setInterval(function () {
      state.timeLeft--;
      timerEl.textContent = state.timeLeft;
      if (state.timeLeft <= 5) {
        timerEl.parentElement.classList.add('flash');
        setTimeout(function () { timerEl.parentElement.classList.remove('flash'); }, 300);
      }
      if (state.timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  // ===== Stats =====
  function updateStats() {
    scoreEl.textContent = state.score;
    comboEl.textContent = state.combo;
  }

  function flashStat(el) {
    el.classList.add('flash');
    setTimeout(function () { el.classList.remove('flash'); }, 300);
  }

  // ===== Game Flow =====
  function startGame() {
    if (state.running) return;
    state.running = true;
    state.score = 0;
    state.combo = 0;
    state.difficulty = difficultySel.value;
    updateStats();
    startOverlay.classList.add('hidden');
    endOverlay.classList.add('hidden');
    buildGrid();
    scheduleNextSpawn();
    startCountdown();
  }

  function endGame() {
    state.running = false;
    if (state.spawnTimer) { clearTimeout(state.spawnTimer); state.spawnTimer = null; }
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
    hideAllMoles();
    showGameOver();
  }

  function showGameOver() {
    finalScoreEl.textContent = '得分：' + state.score;

    var maxScore = 400;
    var pct = Math.min(100, Math.round((state.score / maxScore) * 100));
    scoreBarFill.style.width = pct + '%';

    var comment = getComment(state.score);
    commentEl.textContent = comment;

    var high = getHighScore();
    if (state.score > high) {
      saveHighScore(state.score);
      highScoreText.textContent = '🎉 新纪录！最高分：' + state.score;
    } else {
      highScoreText.textContent = '最高分：' + high;
    }

    highScoreEl.textContent = getHighScore();
    endOverlay.classList.remove('hidden');
  }

  function getComment(score) {
    if (score >= 300) return '🏆 地鼠克星！太厉害了！';
    if (score >= 200) return '🌟 高手！反应真快！';
    if (score >= 120) return '👍 不错！继续努力！';
    if (score >= 60)  return '😊 还行，多练习会更好！';
    if (score >= 20)  return '💪 继续加油！';
    return '🐢 别灰心，熟能生巧！';
  }

  // ===== High Score =====
  function getHighScore() {
    try {
      var v = localStorage.getItem('whackMoleHighScore');
      return v ? parseInt(v, 10) || 0 : 0;
    } catch (e) { return 0; }
  }

  function saveHighScore(score) {
    try { localStorage.setItem('whackMoleHighScore', score.toString()); } catch (e) {}
  }

  // ===== Helpers =====
  function randRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function applyTheme(theme) {
    state.currentTheme = theme;
    gameContainer.className = 'game-container theme-' + theme;
  }

  // ===== Init =====
  function init() {
    buildGrid();
    highScoreEl.textContent = getHighScore();
    applyTheme('grass');

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    themeSel.addEventListener('change', function () {
      applyTheme(themeSel.value);
    });

    soundToggle.addEventListener('change', function () {
      soundEnabled = soundToggle.checked;
    });

    difficultySel.addEventListener('change', function () {
      state.difficulty = difficultySel.value;
    });

    // resume audio on first user gesture
    document.addEventListener('click', function resumeAudio() {
      var ctx = ensureAudio();
      if (ctx && ctx.state === 'suspended') { ctx.resume(); }
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
