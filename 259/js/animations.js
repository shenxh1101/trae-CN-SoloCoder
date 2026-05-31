class AnimationController {
    constructor(robot, robotWrapper, robotCanvas) {
        this.robot = robot;
        this.wrapper = robotWrapper;
        this.canvas = robotCanvas;
        this.currentAnimation = null;
        this.animationTimeout = null;
        this.isAnimating = false;
        this.currentScale = 1;
        this.currentRotation = 0;
        
        this.animationDurations = {
            turnLeft: 1000,
            turnRight: 1000,
            dance: 3000,
            grow: 800,
            shrink: 800,
            rotate: 2000,
            jump: 500,
            wave: 1500,
            blink: 300,
            reset: 500,
            emotion: 500
        };
    }

    getDuration(animationName) {
        return this.animationDurations[animationName] || 1000;
    }

    async play(animationName, options = {}) {
        if (this.isAnimating) {
            await this.stop();
        }
        
        this.isAnimating = true;
        this.currentAnimation = animationName;
        
        const duration = options.duration || this.getDuration(animationName);
        const emotion = options.emotion;
        const targetEmotion = options.targetEmotion;
        
        if (emotion) {
            this.robot.setEmotion(emotion);
        }
        
        return new Promise((resolve) => {
            this.wrapper.classList.add('animating');
            
            let animationPromise = Promise.resolve();
            
            switch (animationName) {
                case 'turnLeft':
                    this.playTurnLeft(duration);
                    break;
                case 'turnRight':
                    this.playTurnRight(duration);
                    break;
                case 'dance':
                    this.playDance(duration);
                    break;
                case 'grow':
                    this.playGrow(duration);
                    break;
                case 'shrink':
                    this.playShrink(duration);
                    break;
                case 'rotate':
                    this.playRotate(duration);
                    break;
                case 'jump':
                    this.playJump(duration);
                    break;
                case 'wave':
                    animationPromise = this.playWave(duration);
                    break;
                case 'blink':
                    animationPromise = this.playBlink(duration);
                    break;
                case 'reset':
                    this.playReset(duration);
                    break;
                case 'emotion':
                    this.playEmotion(targetEmotion, duration);
                    break;
                default:
                    this.playDefault(animationName, duration);
            }
            
            this.animationTimeout = setTimeout(async () => {
                await animationPromise;
                this.cleanup();
                resolve();
            }, duration);
        });
    }

    playTurnLeft(duration) {
        this.currentRotation -= 90;
        this.canvas.style.transform = `rotate(${this.currentRotation}deg) scale(${this.currentScale})`;
        this.canvas.style.transition = `transform ${duration}ms ease`;
    }

    playTurnRight(duration) {
        this.currentRotation += 90;
        this.canvas.style.transform = `rotate(${this.currentRotation}deg) scale(${this.currentScale})`;
        this.canvas.style.transition = `transform ${duration}ms ease`;
    }

    playDance(duration) {
        this.canvas.style.animation = `dance ${duration}ms ease`;
    }

    playGrow(duration) {
        this.currentScale = 1.5;
        this.canvas.style.transform = `rotate(${this.currentRotation}deg) scale(${this.currentScale})`;
        this.canvas.style.transition = `transform ${duration}ms ease`;
        this.robot.state.scale = 1.5;
    }

    playShrink(duration) {
        this.currentScale = 0.8;
        this.canvas.style.transform = `rotate(${this.currentRotation}deg) scale(${this.currentScale})`;
        this.canvas.style.transition = `transform ${duration}ms ease`;
        this.robot.state.scale = 0.8;
    }

    playRotate(duration) {
        this.canvas.style.animation = `rotate360 ${duration}ms ease forwards`;
    }

    playJump(duration) {
        this.canvas.style.animation = `jump ${duration}ms ease`;
    }

    async playWave(duration) {
        this.canvas.style.animation = `wave ${duration}ms ease`;
        await this.robot.wave(duration);
    }

    async playBlink(duration) {
        await this.robot.blink(duration);
    }

    playReset(duration) {
        this.robot.reset();
        this.currentScale = 1;
        this.currentRotation = 0;
        this.canvas.style.transform = 'none';
        this.canvas.style.animation = 'none';
        this.canvas.style.transition = 'none';
    }

    playEmotion(targetEmotion, duration) {
        if (targetEmotion) {
            this.robot.setEmotion(targetEmotion);
        }
    }

    playDefault(animationName, duration) {
        this.wrapper.classList.add(animationName);
    }

    stop() {
        return new Promise((resolve) => {
            if (this.animationTimeout) {
                clearTimeout(this.animationTimeout);
                this.animationTimeout = null;
            }
            
            this.cleanup();
            setTimeout(resolve, 50);
        });
    }

    cleanup() {
        this.canvas.style.animation = '';
        this.wrapper.classList.remove('animating');
        this.wrapper.classList.remove(
            'turn-left', 'turn-right', 'dance', 'grow', 
            'shrink', 'rotate', 'jump', 'wave'
        );
        
        this.isAnimating = false;
        this.currentAnimation = null;
    }

    getCurrentAnimation() {
        return this.currentAnimation;
    }

    isPlaying() {
        return this.isAnimating;
    }
}
