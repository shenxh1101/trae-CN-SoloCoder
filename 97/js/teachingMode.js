class TeachingMode {
    constructor(piano) {
        this.piano = piano;
        this.isActive = false;
        this.score = 0;
        this.streak = 0;
        this.currentNote = null;
        this.timerInterval = null;
        this.timeLimit = 5000;
        this.startTime = 0;
        this.answered = false;

        this.availableNotes = [
            'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
            'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
        ];

        this.whiteNotes = [
            'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
            'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'
        ];
    }

    start() {
        this.isActive = true;
        this.score = 0;
        this.streak = 0;
        this.answered = false;
        this.updateScoreDisplay();
        this.nextQuestion();
    }

    stop() {
        this.isActive = false;
        this.answered = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        document.getElementById('targetNote').textContent = '-';
        document.getElementById('timerBar').style.width = '0%';
        document.getElementById('feedback').textContent = '';
        document.getElementById('feedback').className = 'feedback';
    }

    nextQuestion() {
        if (!this.isActive) return;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.answered = false;

        const prevNote = this.currentNote;
        const pool = this.availableNotes;
        do {
            this.currentNote = pool[Math.floor(Math.random() * pool.length)];
        } while (this.currentNote === prevNote && pool.length > 1);

        document.getElementById('targetNote').textContent = this.currentNote;
        document.getElementById('feedback').textContent = '';
        document.getElementById('feedback').className = 'feedback';

        this.startTime = performance.now();

        this.timerInterval = setInterval(() => {
            if (!this.isActive || this.answered) return;
            const elapsed = performance.now() - this.startTime;
            const remaining = Math.max(0, this.timeLimit - elapsed);
            const percent = (remaining / this.timeLimit) * 100;
            document.getElementById('timerBar').style.width = percent + '%';

            if (remaining <= 0) {
                this.handleTimeout();
            }
        }, 50);
    }

    checkAnswer(note) {
        if (!this.isActive || !this.currentNote || this.answered) return false;

        if (note === this.currentNote) {
            this.answered = true;
            const elapsed = performance.now() - this.startTime;
            const timeBonus = Math.max(0, Math.floor((this.timeLimit - elapsed) / 500));
            this.score += 10 + this.streak * 2 + timeBonus;
            this.streak++;
            this.updateScoreDisplay();

            document.getElementById('feedback').textContent = '✓ 正确！ +' + (10 + this.streak * 2 + timeBonus);
            document.getElementById('feedback').className = 'feedback correct';

            setTimeout(() => {
                this.nextQuestion();
            }, 800);
            return true;
        } else {
            this.streak = 0;
            this.updateScoreDisplay();

            document.getElementById('feedback').textContent = '✗ 再试一次';
            document.getElementById('feedback').className = 'feedback wrong';

            return false;
        }
    }

    handleTimeout() {
        if (!this.isActive || this.answered) return;
        this.answered = true;

        this.streak = 0;
        this.updateScoreDisplay();

        document.getElementById('feedback').textContent = '⏰ 时间到！正确答案是 ' + this.currentNote;
        document.getElementById('feedback').className = 'feedback wrong';

        setTimeout(() => {
            this.nextQuestion();
        }, 1500);
    }

    updateScoreDisplay() {
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('streakValue').textContent = this.streak;
    }
}
