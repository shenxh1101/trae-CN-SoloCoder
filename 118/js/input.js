window.InputManager = (function () {
    class InputManager {
        constructor() {
            this.isMovingLeft = false;
            this.isMovingRight = false;
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.touchActive = false;
            this.touchBoundElement = null;
            this._keyDownHandler = this._onKeyDown.bind(this);
            this._keyUpHandler = this._onKeyUp.bind(this);
            this._touchStartHandler = this._onTouchStart.bind(this);
            this._touchMoveHandler = this._onTouchMove.bind(this);
            this._touchEndHandler = this._onTouchEnd.bind(this);
            this._attachKeyboardListeners();
        }

        get direction() {
            if (this.isMovingLeft) return 'left';
            if (this.isMovingRight) return 'right';
            return null;
        }

        _attachKeyboardListeners() {
            document.addEventListener('keydown', this._keyDownHandler);
            document.addEventListener('keyup', this._keyUpHandler);
        }

        _onKeyDown(e) {
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.isMovingLeft = true;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.isMovingRight = true;
                    break;
            }
        }

        _onKeyUp(e) {
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.isMovingLeft = false;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.isMovingRight = false;
                    break;
            }
        }

        bindTouch(element) {
            if (this.touchBoundElement) {
                this.touchBoundElement.removeEventListener('touchstart', this._touchStartHandler, { passive: false });
                this.touchBoundElement.removeEventListener('touchmove', this._touchMoveHandler, { passive: false });
                this.touchBoundElement.removeEventListener('touchend', this._touchEndHandler, { passive: false });
                this.touchBoundElement.removeEventListener('touchcancel', this._touchEndHandler, { passive: false });
            }
            this.touchBoundElement = element;
            element.addEventListener('touchstart', this._touchStartHandler, { passive: false });
            element.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
            element.addEventListener('touchend', this._touchEndHandler, { passive: false });
            element.addEventListener('touchcancel', this._touchEndHandler, { passive: false });
        }

        _onTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchActive = true;
            this._updateTouchDirection(touch.clientX);
        }

        _onTouchMove(e) {
            e.preventDefault();
            if (e.touches.length === 0) return;
            const touch = e.touches[0];
            this._updateTouchDirection(touch.clientX);
        }

        _updateTouchDirection(clientX) {
            const rect = this.touchBoundElement.getBoundingClientRect();
            const relX = clientX - rect.left;
            const midX = rect.width / 2;
            const swipeDelta = clientX - this.touchStartX;
            if (Math.abs(swipeDelta) > 20) {
                if (swipeDelta < 0) {
                    this.isMovingLeft = true;
                    this.isMovingRight = false;
                } else {
                    this.isMovingRight = true;
                    this.isMovingLeft = false;
                }
            } else {
                if (relX < midX) {
                    this.isMovingLeft = true;
                    this.isMovingRight = false;
                } else {
                    this.isMovingRight = true;
                    this.isMovingLeft = false;
                }
            }
        }

        _onTouchEnd(e) {
            e.preventDefault();
            this.touchActive = false;
            this.isMovingLeft = false;
            this.isMovingRight = false;
        }

        destroy() {
            document.removeEventListener('keydown', this._keyDownHandler);
            document.removeEventListener('keyup', this._keyUpHandler);
            if (this.touchBoundElement) {
                this.touchBoundElement.removeEventListener('touchstart', this._touchStartHandler);
                this.touchBoundElement.removeEventListener('touchmove', this._touchMoveHandler);
                this.touchBoundElement.removeEventListener('touchend', this._touchEndHandler);
                this.touchBoundElement.removeEventListener('touchcancel', this._touchEndHandler);
                this.touchBoundElement = null;
            }
        }
    }
    return InputManager;
})();
