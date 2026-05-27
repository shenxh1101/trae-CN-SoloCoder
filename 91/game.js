(function () {
  'use strict';

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (typeof r === 'number') r = [r, r, r, r];
      this.beginPath();
      this.moveTo(x + r[0], y);
      this.lineTo(x + w - r[1], y);
      this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
      this.lineTo(x + w, y + h - r[2]);
      this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
      this.lineTo(x + r[3], y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
      this.lineTo(x, y + r[0]);
      this.quadraticCurveTo(x, y, x + r[0], y);
      this.closePath();
      return this;
    };
  }

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const COLORS = {
    bgTop: '#0a0a1a',
    bgBottom: '#1a1a3a',
    paddle: '#4a9eff',
    paddleGlow: '#8ab4ff',
    ball: '#ffffff',
    ballGlow: '#ffcc00',
    brickNormal: ['#ff4444', '#ff8844', '#ffdd44', '#44dd44', '#4488ff', '#aa44ff'],
    brickSilver: '#c0c0c0',
    brickSilverDark: '#808080',
    brickGold: '#ffd700',
    brickGoldDark: '#b8860b',
    brickBomb: '#ff0044',
    brickBombDark: '#aa0022'
  };

  const POWERUP_TYPES = [
    { key: 'extend', name: '挡板加长', color: '#44dd44', symbol: '↔' },
    { key: 'shrink', name: '挡板缩短', color: '#ff8844', symbol: '↕' },
    { key: 'multiball', name: '多球', color: '#44aaff', symbol: '●●' },
    { key: 'slow', name: '慢速球', color: '#aaaaaa', symbol: '🐢' },
    { key: 'laser', name: '激光', color: '#ff44aa', symbol: '⚡' }
  ];

  function generateBrickColors(rows) {
    var colors = [];
    for (var r = 0; r < rows; r++) {
      colors.push(COLORS.brickNormal[r % COLORS.brickNormal.length]);
    }
    return colors;
  }

  function createLevel(levelNum) {
    var rows = Math.min(4 + Math.floor(levelNum / 2), 8);
    var cols = 10;
    var brickW = 68;
    var brickH = 24;
    var padding = 6;
    var offsetX = (W - (cols * (brickW + padding) - padding)) / 2;
    var offsetY = 60;
    var colors = generateBrickColors(rows);
    var bricks = [];

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var type = 1;
        var rand = Math.random();
        if (rand < 0.08 && levelNum > 1) type = 7;
        else if (rand < 0.14 && levelNum > 1) type = 8;
        else if (rand < 0.18 && levelNum > 2) type = 9;
        else type = 1 + (r % 6);

        bricks.push({
          x: offsetX + c * (brickW + padding),
          y: offsetY + r * (brickH + padding),
          w: brickW,
          h: brickH,
          type: type,
          hits: type === 7 ? 2 : 1,
          color: type <= 6 ? colors[r] : null
        });
      }
    }
    return bricks;
  }

  var SoundMgr = {
    enabled: true,
    ctx: null,
    init: function () {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { this.ctx = null; }
    },
    play: function (freq, duration, type, volume) {
      if (!this.enabled || !this.ctx) return;
      try {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume || 0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    },
    hit: function () { this.play(600 + Math.random() * 200, 0.08, 'square', 0.1); },
    silver: function () { this.play(300, 0.12, 'sawtooth', 0.12); },
    powerup: function () {
      var self = this;
      [523, 659, 784].forEach(function (f, i) {
        setTimeout(function () { self.play(f, 0.1, 'triangle', 0.15); }, i * 80);
      });
    },
    bomb: function () { this.play(80, 0.3, 'sawtooth', 0.2); },
    levelClear: function () {
      var self = this;
      [523, 659, 784, 1047].forEach(function (f, i) {
        setTimeout(function () { self.play(f, 0.15, 'triangle', 0.18); }, i * 100);
      });
    },
    gameOver: function () {
      var self = this;
      [400, 350, 300, 200].forEach(function (f, i) {
        setTimeout(function () { self.play(f, 0.2, 'sawtooth', 0.15); }, i * 120);
      });
    },
    laser: function () { this.play(1200, 0.05, 'square', 0.08); },
    lifeLost: function () { this.play(150, 0.4, 'sawtooth', 0.15); }
  };

  var Particle = function (x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6 - 2;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.02;
    this.size = 2 + Math.random() * 3;
    this.color = color;
  };
  Particle.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= this.decay;
  };
  Particle.prototype.draw = function (c) {
    c.globalAlpha = Math.max(0, this.life);
    c.fillStyle = this.color;
    c.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    c.globalAlpha = 1;
  };

  var Paddle = function () {
    this.w = 110;
    this.h = 14;
    this.x = W / 2 - this.w / 2;
    this.y = H - 40;
    this.speed = 8;
    this.baseW = 110;
    this.hasLaser = false;
    this.laserCooldown = 0;
    this.lasers = [];
    this.targetX = this.x;
  };
  Paddle.prototype.reset = function () {
    this.w = this.baseW;
    this.x = W / 2 - this.w / 2;
    this.targetX = this.x;
    this.hasLaser = false;
    this.lasers = [];
    this.laserCooldown = 0;
  };
  Paddle.prototype.update = function () {
    var diff = this.targetX - this.x;
    this.x += diff * 0.3;
    this.x = Math.max(0, Math.min(W - this.w, this.x));
    if (this.laserCooldown > 0) this.laserCooldown--;
    for (var i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].y -= 10;
      if (this.lasers[i].y < -10) this.lasers.splice(i, 1);
    }
  };
  Paddle.prototype.draw = function (c) {
    c.shadowBlur = 15;
    c.shadowColor = COLORS.paddleGlow;
    var grad = c.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
    grad.addColorStop(0, COLORS.paddleGlow);
    grad.addColorStop(1, COLORS.paddle);
    c.fillStyle = grad;
    this.roundRect(c, this.x, this.y, this.w, this.h, 6);
    c.shadowBlur = 0;

    if (this.hasLaser) {
      c.fillStyle = '#ff44aa';
      c.fillRect(this.x + 8, this.y - 4, 6, 4);
      c.fillRect(this.x + this.w - 14, this.y - 4, 6, 4);
    }
    for (var i = 0; i < this.lasers.length; i++) {
      c.fillStyle = '#ff88ff';
      c.shadowBlur = 8;
      c.shadowColor = '#ff44aa';
      c.fillRect(this.lasers[i].x - 2, this.lasers[i].y, 4, 12);
      c.shadowBlur = 0;
    }
  };
  Paddle.prototype.roundRect = function (c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
    c.fill();
  };
  Paddle.prototype.shootLaser = function () {
    if (this.hasLaser && this.laserCooldown === 0) {
      this.lasers.push({ x: this.x + 11, y: this.y });
      this.lasers.push({ x: this.x + this.w - 11, y: this.y });
      this.laserCooldown = 25;
      SoundMgr.laser();
    }
  };

  var Ball = function (x, y) {
    this.x = x;
    this.y = y;
    this.r = 8;
    this.vx = 0;
    this.vy = 0;
    this.speed = 5;
    this.stuck = true;
    this.slowFactor = 1;
  };
  Ball.prototype.launch = function () {
    if (this.stuck) {
      this.stuck = false;
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
    }
  };
  Ball.prototype.reset = function (paddle) {
    this.stuck = true;
    this.x = paddle.x + paddle.w / 2;
    this.y = paddle.y - this.r - 2;
    this.vx = 0;
    this.vy = 0;
  };
  Ball.prototype.update = function (paddle) {
    if (this.stuck) {
      this.x = paddle.x + paddle.w / 2;
      this.y = paddle.y - this.r - 2;
      return;
    }
    this.x += this.vx * this.slowFactor;
    this.y += this.vy * this.slowFactor;

    if (this.x - this.r < 0) { this.x = this.r; this.vx = Math.abs(this.vx); }
    if (this.x + this.r > W) { this.x = W - this.r; this.vx = -Math.abs(this.vx); }
    if (this.y - this.r < 0) { this.y = this.r; this.vy = Math.abs(this.vy); }
  };
  Ball.prototype.draw = function (c) {
    c.shadowBlur = 12;
    c.shadowColor = COLORS.ballGlow;
    var grad = c.createRadialGradient(this.x - 2, this.y - 2, 0, this.x, this.y, this.r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, COLORS.ballGlow);
    grad.addColorStop(1, '#ff8800');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
  };

  var PowerUp = function (x, y, type) {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 20;
    this.vy = 2.5;
    this.type = type;
    this.alpha = 1;
    this.pulse = 0;
  };
  PowerUp.prototype.update = function () {
    this.y += this.vy;
    this.pulse += 0.1;
  };
  PowerUp.prototype.draw = function (c) {
    var scale = 1 + Math.sin(this.pulse) * 0.1;
    c.save();
    c.translate(this.x, this.y);
    c.scale(scale, scale);
    c.shadowBlur = 10;
    c.shadowColor = this.type.color;
    c.fillStyle = this.type.color;
    c.beginPath();
    c.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, 4);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.font = 'bold 12px Arial';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(this.type.symbol, 0, 1);
    c.restore();
  };

  var Brick = function (data) {
    this.x = data.x;
    this.y = data.y;
    this.w = data.w;
    this.h = data.h;
    this.type = data.type;
    this.hits = data.hits;
    this.color = data.color;
    this.alive = true;
    this.shake = 0;
  };
  Brick.prototype.getColor = function () {
    if (this.type <= 6) return this.color;
    if (this.type === 7) return this.hits > 1 ? COLORS.brickSilver : COLORS.brickSilverDark;
    if (this.type === 8) return COLORS.brickGold;
    if (this.type === 9) return COLORS.brickBomb;
    return '#fff';
  };
  Brick.prototype.getBorderColor = function () {
    if (this.type === 7) return COLORS.brickSilverDark;
    if (this.type === 8) return COLORS.brickGoldDark;
    if (this.type === 9) return COLORS.brickBombDark;
    return null;
  };
  Brick.prototype.draw = function (c) {
    var sx = this.shake > 0 ? (Math.random() - 0.5) * 3 : 0;
    if (this.shake > 0) this.shake--;
    c.save();
    c.translate(sx, 0);
    var col = this.getColor();
    var border = this.getBorderColor();

    if (this.type === 7 || this.type === 8) {
      var grad = c.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
      grad.addColorStop(0, col);
      grad.addColorStop(1, border || col);
      c.fillStyle = grad;
    } else if (this.type === 9) {
      c.fillStyle = col;
    } else {
      var g2 = c.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
      g2.addColorStop(0, this.lighten(col, 30));
      g2.addColorStop(1, col);
      c.fillStyle = g2;
    }

    c.fillRect(this.x, this.y, this.w, this.h);

    if (border) {
      c.strokeStyle = border;
      c.lineWidth = 2;
      c.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2);
    }

    if (this.type === 7) {
      c.fillStyle = '#fff';
      c.font = 'bold 10px Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(this.hits, this.x + this.w / 2, this.y + this.h / 2);
    } else if (this.type === 8) {
      c.fillStyle = '#fff';
      c.font = 'bold 12px Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('★', this.x + this.w / 2, this.y + this.h / 2 + 1);
    } else if (this.type === 9) {
      c.fillStyle = '#fff';
      c.font = 'bold 14px Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('💣', this.x + this.w / 2, this.y + this.h / 2 + 1);
    }
    c.restore();
  };
  Brick.prototype.lighten = function (hex, amt) {
    var num = parseInt(hex.slice(1), 16);
    var r = Math.min(255, (num >> 16) + amt);
    var g = Math.min(255, ((num >> 8) & 0xff) + amt);
    var b = Math.min(255, (num & 0xff) + amt);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };

  var Game = {
    paddle: null,
    balls: [],
    bricks: [],
    powerups: [],
    particles: [],
    score: 0,
    level: 1,
    lives: 3,
    highScore: 0,
    state: 'menu',
    nextPowerup: null,
    keys: {},
    mouseX: W / 2,
    useMouse: false,
    paused: false,

    init: function () {
      this.paddle = new Paddle();
      this.highScore = parseInt(localStorage.getItem('breakout_highscore') || '0', 10);
      this.updateHUD();
      this.bindEvents();
      this.nextPowerup = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      this.updatePowerupPreview();
      this.startLevel(1);
      this.state = 'playing';
      SoundMgr.init();
      this.loop();
    },

    startLevel: function (num) {
      this.level = num;
      this.bricks = createLevel(num).map(function (d) { return new Brick(d); });
      this.paddle.reset();
      this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 10)];
      var baseSpeed = 5 + (num - 1) * 0.3;
      this.balls[0].speed = baseSpeed;
      this.powerups = [];
      this.particles = [];
      this.paused = false;
      this.updateHUD();
    },

    bindEvents: function () {
      var self = this;
      document.addEventListener('keydown', function (e) {
        self.keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          if (self.state === 'playing') {
            self.balls.forEach(function (b) { b.launch(); });
          } else if (self.state === 'paused') {
            self.resume();
          }
        }
        if (e.key.toLowerCase() === 'p' && (self.state === 'playing' || self.state === 'paused')) {
          self.togglePause();
        }
        if (e.key.toLowerCase() === 'l' && self.state === 'playing') {
          self.paddle.shootLaser();
        }
      });
      document.addEventListener('keyup', function (e) { self.keys[e.key.toLowerCase()] = false; });

      canvas.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        self.mouseX = (e.clientX - rect.left) * (W / rect.width);
        self.useMouse = true;
      });
      canvas.addEventListener('click', function () {
        if (self.state === 'playing') {
          self.balls.forEach(function (b) { b.launch(); });
        }
      });

      document.getElementById('btn-pause').addEventListener('click', function () {
        if (self.state === 'playing') self.pause();
        else if (self.state === 'paused') self.resume();
      });
      document.getElementById('btn-resume').addEventListener('click', function () { self.resume(); });
      document.getElementById('btn-restart').addEventListener('click', function () { self.restart(); });
      document.getElementById('btn-gameover-restart').addEventListener('click', function () { self.restart(); });
      document.getElementById('btn-next-level').addEventListener('click', function () { self.nextLevel(); });
      document.getElementById('btn-sound').addEventListener('click', function () {
        SoundMgr.enabled = !SoundMgr.enabled;
        this.textContent = SoundMgr.enabled ? '🔊 音效' : '🔇 音效';
      });
      document.getElementById('btn-editor').addEventListener('click', function () { self.openEditor(); });
      document.getElementById('btn-close-editor').addEventListener('click', function () { self.closeEditor(); });
    },

    updateHUD: function () {
      document.getElementById('score').textContent = this.score;
      document.getElementById('level').textContent = this.level;
      var hearts = '';
      for (var i = 0; i < this.lives; i++) hearts += '❤';
      for (var j = this.lives; j < 3; j++) hearts += '♡';
      document.getElementById('lives').textContent = hearts || '—';
      document.getElementById('highscore').textContent = this.highScore;
    },

    updatePowerupPreview: function () {
      var el = document.getElementById('powerup-preview');
      if (this.nextPowerup) {
        el.textContent = this.nextPowerup.symbol + ' ' + this.nextPowerup.name;
        el.style.color = this.nextPowerup.color;
      } else {
        el.textContent = '—';
      }
    },

    pause: function () {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      document.getElementById('overlay').classList.remove('hidden');
      document.getElementById('overlay-title').textContent = '游戏暂停';
      document.getElementById('overlay-text').textContent = '按空格键或点击继续按钮恢复游戏';
    },

    resume: function () {
      if (this.state !== 'paused') return;
      this.state = 'playing';
      document.getElementById('overlay').classList.add('hidden');
    },

    togglePause: function () {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    },

    restart: function () {
      this.score = 0;
      this.lives = 3;
      this.state = 'playing';
      this.nextPowerup = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      this.updatePowerupPreview();
      document.getElementById('overlay').classList.add('hidden');
      document.getElementById('gameover-overlay').classList.add('hidden');
      document.getElementById('levelclear-overlay').classList.add('hidden');
      this.startLevel(1);
    },

    nextLevel: function () {
      document.getElementById('levelclear-overlay').classList.add('hidden');
      this.state = 'playing';
      this.startLevel(this.level + 1);
    },

    gameOver: function () {
      this.state = 'gameover';
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('breakout_highscore', String(this.highScore));
      }
      document.getElementById('final-score').textContent = this.score;
      document.getElementById('final-highscore').textContent = this.highScore;
      document.getElementById('gameover-overlay').classList.remove('hidden');
      SoundMgr.gameOver();
    },

    levelClear: function () {
      this.state = 'levelclear';
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('breakout_highscore', String(this.highScore));
      }
      this.updateHUD();
      document.getElementById('levelclear-title').textContent = '第 ' + this.level + ' 关通过！';
      document.getElementById('levelclear-text').textContent = '分数: ' + this.score + ' | 准备进入下一关';
      document.getElementById('levelclear-overlay').classList.remove('hidden');
      SoundMgr.levelClear();
    },

    spawnParticles: function (x, y, color, count) {
      for (var i = 0; i < (count || 8); i++) {
        this.particles.push(new Particle(x, y, color));
      }
    },

    breakBrick: function (brick, isBombChain) {
      if (!brick.alive) return;
      brick.alive = false;
      var cx = brick.x + brick.w / 2;
      var cy = brick.y + brick.h / 2;
      var col = brick.getColor();
      this.spawnParticles(cx, cy, col, 10);

      var points = 10;
      if (brick.type === 7) points = 20;
      else if (brick.type === 8) points = 30;
      else if (brick.type === 9) points = 15;
      this.score += points;

      if (brick.type === 8 && !isBombChain) {
        var puType = this.nextPowerup;
        this.powerups.push(new PowerUp(cx, cy, puType));
        this.nextPowerup = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        this.updatePowerupPreview();
      }

      if (brick.type === 9 && !isBombChain) {
        SoundMgr.bomb();
        var self = this;
        this.bricks.forEach(function (b) {
          if (b.alive && b !== brick) {
            var dx = (b.x + b.w / 2) - cx;
            var dy = (b.y + b.h / 2) - cy;
            if (Math.sqrt(dx * dx + dy * dy) < 100) {
              setTimeout(function () { self.breakBrick(b, true); }, 50);
            }
          }
        });
        for (var i = 0; i < 20; i++) {
          this.spawnParticles(cx, cy, COLORS.brickBomb, 1);
        }
      }

      this.updateHUD();
    },

    checkBrickCollision: function (ball) {
      for (var i = 0; i < this.bricks.length; i++) {
        var br = this.bricks[i];
        if (!br.alive) continue;

        var nx = Math.max(br.x, Math.min(ball.x, br.x + br.w));
        var ny = Math.max(br.y, Math.min(ball.y, br.y + br.h));
        var dx = ball.x - nx;
        var dy = ball.y - ny;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ball.r) {
          if (br.type === 7 && br.hits > 1) {
            br.hits--;
            br.shake = 5;
            SoundMgr.silver();
          } else {
            this.breakBrick(br, false);
            if (br.type !== 9) SoundMgr.hit();
          }

          var overlapX = ball.r - Math.abs(dx);
          var overlapY = ball.r - Math.abs(dy);
          if (overlapX < overlapY) {
            ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
            ball.x += (dx > 0 ? 1 : -1) * overlapX;
          } else {
            ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
            ball.y += (dy > 0 ? 1 : -1) * overlapY;
          }
          return true;
        }
      }
      return false;
    },

    checkLaserCollision: function () {
      for (var i = this.paddle.lasers.length - 1; i >= 0; i--) {
        var l = this.paddle.lasers[i];
        for (var j = 0; j < this.bricks.length; j++) {
          var br = this.bricks[j];
          if (!br.alive) continue;
          if (l.x > br.x && l.x < br.x + br.w && l.y < br.y + br.h && l.y > br.y) {
            this.paddle.lasers.splice(i, 1);
            if (br.type === 7 && br.hits > 1) {
              br.hits--;
              SoundMgr.silver();
            } else {
              this.breakBrick(br, false);
              if (br.type !== 9) SoundMgr.hit();
            }
            break;
          }
        }
      }
    },

    checkPaddleCollision: function (ball) {
      var p = this.paddle;
      if (ball.vy > 0 &&
          ball.y + ball.r > p.y &&
          ball.y - ball.r < p.y + p.h &&
          ball.x > p.x && ball.x < p.x + p.w) {
        var hitPos = (ball.x - p.x) / p.w;
        var angle = (hitPos - 0.5) * (Math.PI * 0.7);
        var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.abs(Math.cos(angle) * speed);
        ball.y = p.y - ball.r - 1;
      }
    },

    applyPowerup: function (pu) {
      SoundMgr.powerup();
      var t = pu.type.key;
      if (t === 'extend') {
        this.paddle.w = Math.min(200, this.paddle.baseW + 50);
      } else if (t === 'shrink') {
        this.paddle.w = Math.max(60, this.paddle.baseW - 40);
      } else if (t === 'multiball') {
        var newBalls = [];
        for (var i = 0; i < this.balls.length; i++) {
          if (this.balls.length + newBalls.length >= 3) break;
          var b = this.balls[i];
          for (var k = 0; k < 2 && this.balls.length + newBalls.length < 3; k++) {
            var nb = new Ball(b.x, b.y);
            nb.stuck = false;
            var ang = Math.atan2(b.vy, b.vx) + (k === 0 ? 0.4 : -0.4);
            var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            nb.vx = Math.cos(ang) * sp;
            nb.vy = Math.sin(ang) * sp;
            nb.speed = b.speed;
            nb.slowFactor = b.slowFactor;
            newBalls.push(nb);
          }
        }
        this.balls = this.balls.concat(newBalls);
      } else if (t === 'slow') {
        for (var si = 0; si < this.balls.length; si++) {
          this.balls[si].slowFactor = 0.5;
        }
        var self = this;
        setTimeout(function () {
          for (var s = 0; s < self.balls.length; s++) {
            self.balls[s].slowFactor = 1;
          }
        }, 8000);
      } else if (t === 'laser') {
        this.paddle.hasLaser = true;
      }
      this.score += 25;
      this.updateHUD();
    },

    update: function () {
      if (this.state !== 'playing') return;

      if (this.useMouse) {
        this.paddle.targetX = this.mouseX - this.paddle.w / 2;
      }
      if (this.keys['arrowleft'] || this.keys['a']) {
        this.paddle.targetX -= this.paddle.speed;
        this.useMouse = false;
      }
      if (this.keys['arrowright'] || this.keys['d']) {
        this.paddle.targetX += this.paddle.speed;
        this.useMouse = false;
      }

      this.paddle.update();

      for (var i = this.balls.length - 1; i >= 0; i--) {
        var ball = this.balls[i];
        ball.update(this.paddle);
        if (!ball.stuck) {
          this.checkPaddleCollision(ball);
          this.checkBrickCollision(ball);
          if (ball.y - ball.r > H) {
            this.balls.splice(i, 1);
          }
        }
      }

      if (this.balls.length === 0 && this.state === 'playing') {
        this.lives--;
        SoundMgr.lifeLost();
        if (this.lives <= 0) {
          this.gameOver();
        } else {
          this.updateHUD();
          this.paddle.reset();
          this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 10)];
          this.balls[0].speed = 5 + (this.level - 1) * 0.3;
        }
      }

      this.checkLaserCollision();

      for (var pi = this.powerups.length - 1; pi >= 0; pi--) {
        var pu = this.powerups[pi];
        pu.update();
        if (pu.y > H + 20) {
          this.powerups.splice(pi, 1);
          continue;
        }
        var pd = this.paddle;
        if (pu.y + pu.h / 2 > pd.y && pu.y - pu.h / 2 < pd.y + pd.h &&
            pu.x + pu.w / 2 > pd.x && pu.x - pu.w / 2 < pd.x + pd.w) {
          this.applyPowerup(pu);
          this.powerups.splice(pi, 1);
        }
      }

      for (var pti = this.particles.length - 1; pti >= 0; pti--) {
        this.particles[pti].update();
        if (this.particles[pti].life <= 0) this.particles.splice(pti, 1);
      }

      var remaining = this.bricks.filter(function (b) { return b.alive; }).length;
      if (remaining === 0) {
        this.levelClear();
      }
    },

    drawBricks: function () {
      for (var i = 0; i < this.bricks.length; i++) {
        if (this.bricks[i].alive) this.bricks[i].draw(ctx);
      }
    },

    draw: function () {
      var grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, COLORS.bgTop);
      grad.addColorStop(1, COLORS.bgBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(74,158,255,0.05)';
      ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (var gy = 0; gy < H; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      this.drawBricks();

      for (var i = 0; i < this.powerups.length; i++) {
        this.powerups[i].draw(ctx);
      }

      this.paddle.draw(ctx);

      for (var j = 0; j < this.balls.length; j++) {
        this.balls[j].draw(ctx);
      }

      for (var k = 0; k < this.particles.length; k++) {
        this.particles[k].draw(ctx);
      }

      if (this.balls.length > 0 && this.balls[0].stuck && this.state === 'playing') {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('点击或按空格发射小球', W / 2, H / 2 + 80);
      }
    },

    loop: function () {
      this.update();
      this.draw();
      requestAnimationFrame(this.loop.bind(this));
    },

    openEditor: function () {
      document.getElementById('editor-overlay').classList.remove('hidden');
      this.pause();
      Editor.init();
    },

    closeEditor: function () {
      document.getElementById('editor-overlay').classList.add('hidden');
    }
  };

  var Editor = {
    canvas: null,
    ctx: null,
    grid: [],
    rows: 8,
    cols: 10,
    cellW: 68,
    cellH: 24,
    padding: 2,
    offsetX: 0,
    offsetY: 0,
    selectedType: 1,
    mouseDown: false,

    init: function () {
      this.canvas = document.getElementById('editor-canvas');
      this.ctx = this.canvas.getContext('2d');
      var saved = localStorage.getItem('breakout_custom_level');
      if (saved) {
        try {
          this.grid = JSON.parse(saved);
        } catch (e) {
          this.grid = this.createEmptyGrid();
        }
      } else {
        this.grid = this.createEmptyGrid();
      }
      this.offsetX = (this.canvas.width - (this.cols * (this.cellW + this.padding) - this.padding)) / 2;
      this.offsetY = 20;
      this.bindEvents();
      this.draw();
    },

    createEmptyGrid: function () {
      var g = [];
      for (var r = 0; r < this.rows; r++) {
        g.push([]);
        for (var c = 0; c < this.cols; c++) {
          g[r].push(0);
        }
      }
      return g;
    },

    bindEvents: function () {
      var self = this;
      this.canvas.onmousedown = function (e) { self.mouseDown = true; self.handleClick(e); };
      this.canvas.onmouseup = function () { self.mouseDown = false; };
      this.canvas.onmousemove = function (e) { if (self.mouseDown) self.handleClick(e); };
      this.canvas.onmouseleave = function () { self.mouseDown = false; };

      document.getElementById('brick-type-select').onchange = function () {
        self.selectedType = parseInt(this.value, 10);
      };
      document.getElementById('btn-clear-grid').onclick = function () {
        self.grid = self.createEmptyGrid();
        self.draw();
      };
      document.getElementById('btn-save-level').onclick = function () {
        localStorage.setItem('breakout_custom_level', JSON.stringify(self.grid));
        alert('关卡已保存到本地！');
      };
      document.getElementById('btn-load-level').onclick = function () {
        var saved = localStorage.getItem('breakout_custom_level');
        if (saved) {
          try {
            self.grid = JSON.parse(saved);
            self.draw();
          } catch (e) { alert('加载失败'); }
        } else {
          alert('没有找到已保存的关卡');
        }
      };
      document.getElementById('btn-play-level').onclick = function () {
        self.playLevel();
      };
    },

    handleClick: function (e) {
      var rect = this.canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      var my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      var col = Math.floor((mx - this.offsetX) / (this.cellW + this.padding));
      var row = Math.floor((my - this.offsetY) / (this.cellH + this.padding));
      if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
        this.grid[row][col] = this.selectedType;
        this.draw();
      }
    },

    getBrickColor: function (type) {
      if (type >= 1 && type <= 6) return COLORS.brickNormal[type - 1];
      if (type === 7) return COLORS.brickSilver;
      if (type === 8) return COLORS.brickGold;
      if (type === 9) return COLORS.brickBomb;
      return null;
    },

    draw: function () {
      var c = this.ctx;
      c.fillStyle = '#0a0a1a';
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);

      for (var r = 0; r < this.rows; r++) {
        for (var col = 0; col < this.cols; col++) {
          var x = this.offsetX + col * (this.cellW + this.padding);
          var y = this.offsetY + r * (this.cellH + this.padding);
          var type = this.grid[r][col];

          if (type === 0) {
            c.strokeStyle = '#1a2a4f';
            c.lineWidth = 1;
            c.strokeRect(x, y, this.cellW, this.cellH);
          } else {
            var col2 = this.getBrickColor(type);
            c.fillStyle = col2;
            c.fillRect(x, y, this.cellW, this.cellH);
            if (type === 7) {
              c.fillStyle = '#fff';
              c.font = 'bold 10px Arial';
              c.textAlign = 'center';
              c.textBaseline = 'middle';
              c.fillText('2', x + this.cellW / 2, y + this.cellH / 2);
            } else if (type === 8) {
              c.fillStyle = '#fff';
              c.font = 'bold 14px Arial';
              c.textAlign = 'center';
              c.textBaseline = 'middle';
              c.fillText('★', x + this.cellW / 2, y + this.cellH / 2 + 1);
            } else if (type === 9) {
              c.fillStyle = '#fff';
              c.font = 'bold 14px Arial';
              c.textAlign = 'center';
              c.textBaseline = 'middle';
              c.fillText('💣', x + this.cellW / 2, y + this.cellH / 2 + 1);
            }
          }
        }
      }
    },

    playLevel: function () {
      var bricks = [];
      for (var r = 0; r < this.rows; r++) {
        for (var c = 0; c < this.cols; c++) {
          var type = this.grid[r][c];
          if (type > 0) {
            bricks.push({
              x: this.offsetX + c * (this.cellW + this.padding),
              y: this.offsetY + r * (this.cellH + this.padding),
              w: this.cellW,
              h: this.cellH,
              type: type,
              hits: type === 7 ? 2 : 1,
              color: type <= 6 ? COLORS.brickNormal[type - 1] : null
            });
          }
        }
      }
      if (bricks.length === 0) {
        alert('请先放置一些砖块！');
        return;
      }
      Game.closeEditor();
      Game.score = 0;
      Game.lives = 3;
      Game.level = 1;
      Game.state = 'playing';
      document.getElementById('overlay').classList.add('hidden');
      document.getElementById('gameover-overlay').classList.add('hidden');
      document.getElementById('levelclear-overlay').classList.add('hidden');
      Game.bricks = bricks.map(function (d) { return new Brick(d); });
      Game.paddle.reset();
      Game.balls = [new Ball(Game.paddle.x + Game.paddle.w / 2, Game.paddle.y - 10)];
      Game.balls[0].speed = 5;
      Game.powerups = [];
      Game.particles = [];
      Game.paused = false;
      Game.updateHUD();
    }
  };

  window.addEventListener('load', function () {
    Game.init();
  });
})();
