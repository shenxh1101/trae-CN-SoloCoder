window.UIManager = (function () {
    class UIManager {
        constructor() {
            this.menuScreen = document.getElementById('menu-screen');
            this.gameoverScreen = document.getElementById('gameover-screen');
            this.hud = document.getElementById('hud');
            this.mobileControls = document.getElementById('mobile-controls');
            this.currentScoreEl = document.getElementById('current-score');
            this.finalScoreEl = document.getElementById('final-score');
            this.menuHighScoreEl = document.getElementById('menu-high-score');
            this.gameoverHighScoreEl = document.getElementById('gameover-high-score');
            this.newRecordEl = document.getElementById('new-record');
            this.shieldIndicator = document.getElementById('shield-indicator');
            this.boostIndicator = document.getElementById('boost-indicator');
            this.soundToggleBtn = document.getElementById('sound-toggle');
            this.soundIcon = document.getElementById('sound-icon');
            this.startBtn = document.getElementById('start-btn');
            this.retryBtn = document.getElementById('retry-btn');
            this.shareBtn = document.getElementById('share-btn');
            this.skinOptions = document.querySelectorAll('.skin-option');
            this.laneBtns = document.querySelectorAll('.lane-btn');
            this.selectedSkin = 'red';
            this.selectedLanes = 2;
            this._isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                            (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        }

        get isMobile() {
            return this._isMobile;
        }

        init(callbacks) {
            this.callbacks = callbacks || {};
            this.skinOptions.forEach(opt => {
                opt.addEventListener('click', () => {
                    const color = opt.dataset.color;
                    this.selectSkin(color);
                    if (this.callbacks.onSkinChange) this.callbacks.onSkinChange(color);
                });
            });
            this.laneBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const lanes = parseInt(btn.dataset.lanes);
                    this.selectLanes(lanes);
                    if (this.callbacks.onLaneChange) this.callbacks.onLaneChange(lanes);
                });
            });
            this.startBtn.addEventListener('click', () => {
                if (this.callbacks.onStart) this.callbacks.onStart();
            });
            this.retryBtn.addEventListener('click', () => {
                if (this.callbacks.onRetry) this.callbacks.onRetry();
            });
            this.shareBtn.addEventListener('click', () => {
                if (this.callbacks.onShare) this.callbacks.onShare();
            });
            this.soundToggleBtn.addEventListener('click', () => {
                if (this.callbacks.onSoundToggle) {
                    const enabled = this.callbacks.onSoundToggle();
                    this.setSoundIcon(enabled);
                }
            });
        }

        selectSkin(color) {
            this.selectedSkin = color;
            this.skinOptions.forEach(opt => {
                if (opt.dataset.color === color) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
        }

        selectLanes(lanes) {
            this.selectedLanes = lanes;
            this.laneBtns.forEach(btn => {
                if (parseInt(btn.dataset.lanes) === lanes) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        setSoundIcon(enabled) {
            if (enabled) {
                this.soundIcon.textContent = '\u266B';
                this.soundToggleBtn.classList.remove('muted');
            } else {
                this.soundIcon.textContent = '\u266A';
                this.soundToggleBtn.classList.add('muted');
            }
        }

        setMenuHighScore(score) {
            this.menuHighScoreEl.textContent = score;
        }

        showMenu(highScore) {
            this.menuScreen.classList.remove('hidden');
            this.gameoverScreen.classList.add('hidden');
            this.hud.classList.add('hidden');
            this.mobileControls.classList.add('hidden');
            this.setMenuHighScore(highScore);
        }

        showGame() {
            this.menuScreen.classList.add('hidden');
            this.gameoverScreen.classList.add('hidden');
            this.hud.classList.remove('hidden');
            if (this._isMobile) {
                this.mobileControls.classList.remove('hidden');
            }
            this.updateScore(0);
            this.setShieldActive(false);
            this.setBoostActive(false);
        }

        showGameOver(finalScore, highScore, isNewRecord) {
            this.gameoverScreen.classList.remove('hidden');
            this.hud.classList.add('hidden');
            this.mobileControls.classList.add('hidden');
            this.finalScoreEl.textContent = finalScore;
            this.gameoverHighScoreEl.textContent = highScore;
            if (isNewRecord) {
                this.newRecordEl.classList.remove('hidden');
            } else {
                this.newRecordEl.classList.add('hidden');
            }
        }

        updateScore(score) {
            this.currentScoreEl.textContent = score;
        }

        setShieldActive(active) {
            if (active) {
                this.shieldIndicator.classList.remove('hidden');
                this.shieldIndicator.classList.add('shield');
            } else {
                this.shieldIndicator.classList.add('hidden');
            }
        }

        setBoostActive(active) {
            if (active) {
                this.boostIndicator.classList.remove('hidden');
                this.boostIndicator.classList.add('boost');
            } else {
                this.boostIndicator.classList.add('hidden');
            }
        }

        shareScore(score) {
            const text = `我在《霓虹狂飙》中获得了 ${score} 分！来挑战我吧！\ud83c\udfc1`;
            if (navigator.share) {
                navigator.share({
                    title: '霓虹狂飙 - 赛车躲避游戏',
                    text: text
                }).catch(() => {});
            } else {
                const url = window.location.href;
                const fullText = `${text} ${url}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(fullText).then(() => {
                        alert('得分已复制到剪贴板，快去分享吧！');
                    }).catch(() => {
                        alert(fullText);
                    });
                } else {
                    alert(fullText);
                }
            }
        }
    }
    return UIManager;
})();
