const MAX_HISTORY = 20;

export class HistoryManager {
    constructor() {
        this.stack = [];
        this.index = -1;
        this.maxSize = MAX_HISTORY;
    }

    deepCloneFrames(frames) {
        return frames.map(frame => 
            frame.map(row => [...row])
        );
    }

    framesEqual(framesA, framesB) {
        if (framesA.length !== framesB.length) return false;
        for (let f = 0; f < framesA.length; f++) {
            for (let y = 0; y < 32; y++) {
                for (let x = 0; x < 32; x++) {
                    if (framesA[f][y][x] !== framesB[f][y][x]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    saveState(frames, currentFrame) {
        const newFrames = this.deepCloneFrames(frames);
        
        if (this.index >= 0 && this.index < this.stack.length) {
            const currentState = this.stack[this.index];
            if (currentState.currentFrame === currentFrame && 
                this.framesEqual(currentState.frames, newFrames)) {
                return;
            }
        }

        const state = {
            frames: newFrames,
            currentFrame: currentFrame
        };

        if (this.index < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.index + 1);
        }

        this.stack.push(state);

        if (this.stack.length > this.maxSize) {
            this.stack.shift();
            this.index = this.maxSize - 1;
        } else {
            this.index++;
        }

        this.updateButtons();
    }

    canUndo() {
        return this.index > 0;
    }

    canRedo() {
        return this.index < this.stack.length - 1;
    }

    undo() {
        if (!this.canUndo()) return null;
        
        this.index--;
        const state = this.stack[this.index];
        this.updateButtons();
        
        return {
            frames: this.deepCloneFrames(state.frames),
            currentFrame: state.currentFrame
        };
    }

    redo() {
        if (!this.canRedo()) return null;
        
        this.index++;
        const state = this.stack[this.index];
        this.updateButtons();
        
        return {
            frames: this.deepCloneFrames(state.frames),
            currentFrame: state.currentFrame
        };
    }

    updateButtons() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        
        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
        }
        if (redoBtn) {
            redoBtn.disabled = !this.canRedo();
        }
    }

    reset(initialFrames, currentFrame) {
        this.stack = [];
        this.index = -1;
        this.saveState(initialFrames, currentFrame);
    }

    getCurrentState() {
        if (this.index < 0 || this.index >= this.stack.length) return null;
        return this.stack[this.index];
    }
}
