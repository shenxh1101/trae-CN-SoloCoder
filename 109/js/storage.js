const Storage = {
  getHighScores() {
    try {
      const data = localStorage.getItem('hangman_highScores');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveHighScore(category, difficulty, score) {
    const scores = this.getHighScores();
    if (!scores[category]) {
      scores[category] = {};
    }
    if (!scores[category][difficulty] || score > scores[category][difficulty]) {
      scores[category][difficulty] = score;
      localStorage.setItem('hangman_highScores', JSON.stringify(scores));
      return true;
    }
    return false;
  },

  getHighScore(category, difficulty) {
    const scores = this.getHighScores();
    return scores[category]?.[difficulty] || 0;
  },

  getSettings() {
    try {
      const data = localStorage.getItem('hangman_settings');
      return data ? JSON.parse(data) : {
        soundEnabled: true,
        difficulty: 'easy',
        category: 'animals'
      };
    } catch {
      return {
        soundEnabled: true,
        difficulty: 'easy',
        category: 'animals'
      };
    }
  },

  saveSettings(settings) {
    localStorage.setItem('hangman_settings', JSON.stringify(settings));
  },

  getCustomWordLists() {
    try {
      const data = localStorage.getItem('hangman_customLists');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveCustomWordList(key, listData) {
    const customLists = this.getCustomWordLists();
    customLists[key] = listData;
    localStorage.setItem('hangman_customLists', JSON.stringify(customLists));
  },

  deleteCustomWordList(key) {
    const customLists = this.getCustomWordLists();
    delete customLists[key];
    localStorage.setItem('hangman_customLists', JSON.stringify(customLists));
  },

  getAllWordLists() {
    const customLists = this.getCustomWordLists();
    return { ...wordLists, ...customLists };
  }
};
