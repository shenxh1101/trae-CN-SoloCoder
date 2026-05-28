class ScoreManager {
  constructor() {
    this.score = 0;
  }

  addScore(points) {
    this.score += points;
  }

  getHighScore() {
    const stored = localStorage.getItem('neonRushHighScore');
    return stored !== null ? parseInt(stored, 10) : 0;
  }

  setHighScore(score) {
    localStorage.setItem('neonRushHighScore', score);
  }

  getDifficultyLevel() {
    return Math.floor(this.score / 100);
  }

  reset() {
    this.score = 0;
  }

  checkNewRecord() {
    return this.score > this.getHighScore();
  }
}

window.ScoreManager = ScoreManager;
