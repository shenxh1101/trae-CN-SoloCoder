
  
  
  const W = 800, H = 600;
  
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

  
  module.exports = { Paddle, Ball, Particle, PowerUp, Brick, COLORS, POWERUP_TYPES, W, H };
