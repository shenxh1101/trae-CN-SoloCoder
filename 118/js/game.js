window.Game = (function () {
    const GameState = {
        MENU: 'menu',
        PLAYING: 'playing',
        GAMEOVER: 'gameover'
    };

    class Game {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.state = GameState.MENU;
            this.animationId = null;
            this.lastTime = 0;
            this.deltaTime = 1;

            this.audioManager = new window.AudioManager();
            this.scoreManager = new window.ScoreManager();
            this.inputManager = new window.InputManager();
            this.uiManager = new window.UIManager();
            this.renderer = new window.Renderer(this.canvas, this.uiManager.selectedLanes);
            this.player = new window.Player(this.canvas, this.uiManager.selectedSkin, this.uiManager.selectedLanes);
            this.obstacleManager = new window.Obstacle.ObstacleManager(this.canvas, this.uiManager.selectedLanes);
            this.powerUpManager = new window.PowerUp.PowerUpManager(this.canvas, this.uiManager.selectedLanes);

            this._bindUI();
            this._bindTouch();
            this.uiManager.setSoundIcon(this.audioManager.enabled);
            this.uiManager.showMenu(this.scoreManager.getHighScore());
        }

        _bindUI() {
            this.uiManager.init({
                onStart: () => this.startGame(),
                onRetry: () => this.backToMenu(),
                onShare: () => this.shareScore(),
                onSkinChange: (color) => this.changeSkin(color),
                onLaneChange: (lanes) => this.changeLanes(lanes),
                onSoundToggle: () => this.toggleSound()
            });
        }

        _bindTouch() {
            const gameContainer = document.getElementById('game-container');
            this.inputManager.bindTouch(gameContainer);
        }

        changeSkin(color) {
            this.player.setSkin(color);
        }

        changeLanes(lanes) {
            this.player.setLaneCount(lanes);
            this.obstacleManager.setLaneCount(lanes);
            this.powerUpManager.setLaneCount(lanes);
            this.renderer.setLaneCount(lanes);
        }

        toggleSound() {
            return this.audioManager.toggle();
        }

        startGame() {
            this.state = GameState.PLAYING;
            this.scoreManager.reset();
            this.player.reset();
            this.obstacleManager.reset();
            this.obstacleManager.setDifficultyLevel(0);
            this.powerUpManager.reset();
            this.uiManager.showGame();
            this.lastTime = performance.now();
            this._gameLoop();
        }

        backToMenu() {
            this.state = GameState.MENU;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            this.uiManager.showMenu(this.scoreManager.getHighScore());
        }

        shareScore() {
            this.uiManager.shareScore(this.scoreManager.score);
        }

        endGame() {
            this.state = GameState.GAMEOVER;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            const isNewRecord = this.scoreManager.checkNewRecord();
            if (isNewRecord) {
                this.scoreManager.setHighScore(this.scoreManager.score);
            }
            this.audioManager.playCrash();
            this.uiManager.showGameOver(
                this.scoreManager.score,
                this.scoreManager.getHighScore(),
                isNewRecord
            );
        }

        _gameLoop() {
            if (this.state !== GameState.PLAYING) return;
            const now = performance.now();
            const dt = Math.min((now - this.lastTime) / 16.67, 3);
            this.deltaTime = dt;
            this.lastTime = now;
            this._update(now, dt);
            this._render(dt);
            this.animationId = requestAnimationFrame(() => this._gameLoop());
        }

        _update(currentTime, deltaTime) {
            if (this.inputManager.isMovingLeft) {
                this.player.moveLeft(deltaTime);
            }
            if (this.inputManager.isMovingRight) {
                this.player.moveRight(deltaTime);
            }
            this.player.update(currentTime);
            this.obstacleManager.update(deltaTime);
            this.obstacleManager.spawn(currentTime);
            this.powerUpManager.update(deltaTime);
            this.powerUpManager.spawn(currentTime);
            this._handleCollisions(currentTime);
            this._updateUI();
        }

        _handleCollisions(currentTime) {
            const playerRect = this.player.getRect();

            const collision = this.obstacleManager.checkCollision(playerRect);
            if (collision) {
                collision.passed = true;
                if (this.player.hasShield) {
                    this.player.consumeShield(currentTime);
                    const obsIndex = this.obstacleManager.obstacles.indexOf(collision);
                    if (obsIndex !== -1) {
                        this.obstacleManager.obstacles.splice(obsIndex, 1);
                    }
                } else {
                    this.endGame();
                    return;
                }
            }

            const dodged = this.obstacleManager.checkDodged(this.player.y + this.player.height);
            if (dodged > 0) {
                const scoreToAdd = dodged * 10;
                this.scoreManager.addScore(scoreToAdd);
                if (this.audioManager.enabled) {
                    this.audioManager.playDodge();
                }
                const newLevel = this.scoreManager.getDifficultyLevel();
                this.obstacleManager.setDifficultyLevel(newLevel);
                this.powerUpManager.setDifficultyLevel(newLevel);
            }

            const collected = this.powerUpManager.checkCollection(playerRect);
            for (const p of collected) {
                if (this.audioManager.enabled) {
                    this.audioManager.playPowerup();
                }
                if (p.type === 'boost') {
                    this.player.activateBoost(5000, currentTime);
                } else if (p.type === 'shield') {
                    this.player.activateShield();
                }
            }
        }

        _updateUI() {
            this.uiManager.updateScore(this.scoreManager.score);
            this.uiManager.setShieldActive(this.player.hasShield);
            this.uiManager.setBoostActive(this.player.hasBoost);
        }

        _render(deltaTime) {
            const gameState = {
                player: this.player,
                obstacles: this.obstacleManager.obstacles,
                powerups: this.powerUpManager.powerups,
                baseSpeed: this.obstacleManager.baseSpeed,
                deltaTime: deltaTime
            };
            this.renderer.render(gameState);
        }

        destroy() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this.inputManager.destroy();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.gameInstance = new Game();
    });

    return Game;
})();
