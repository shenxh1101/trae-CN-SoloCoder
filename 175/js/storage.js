class StorageManager {
  constructor() {
    this.leaderboardKey = 'causal-game-leaderboard';
    this.maxRecords = 5;
    this.validThemes = ['life', 'science', 'history'];
    this.validDifficulties = ['easy', 'medium', 'hard'];
  }

  isValidTheme(theme) {
    return this.validThemes.includes(theme);
  }

  isValidDifficulty(difficulty) {
    return this.validDifficulties.includes(difficulty);
  }

  getLeaderboard() {
    try {
      const data = localStorage.getItem(this.leaderboardKey);
      if (data) {
        const parsed = JSON.parse(data);
        return this.ensureLeaderboardStructure(parsed);
      }
    } catch (e) {
      console.error('读取排行榜数据失败:', e);
    }
    return this.createEmptyLeaderboard();
  }

  createEmptyLeaderboard() {
    const leaderboard = {};
    this.validThemes.forEach(theme => {
      leaderboard[theme] = {};
      this.validDifficulties.forEach(difficulty => {
        leaderboard[theme][difficulty] = [];
      });
    });
    return leaderboard;
  }

  ensureLeaderboardStructure(data) {
    const leaderboard = this.createEmptyLeaderboard();
    
    if (data && typeof data === 'object') {
      this.validThemes.forEach(theme => {
        if (data[theme] && typeof data[theme] === 'object') {
          this.validDifficulties.forEach(difficulty => {
            if (Array.isArray(data[theme][difficulty])) {
              leaderboard[theme][difficulty] = data[theme][difficulty]
                .filter(entry => this.isValidEntry(entry))
                .sort((a, b) => a.time - b.time)
                .slice(0, this.maxRecords);
            }
          });
        }
      });
    }
    
    return leaderboard;
  }

  isValidEntry(entry) {
    return entry && 
           typeof entry.name === 'string' && 
           typeof entry.time === 'number' && 
           typeof entry.score === 'number' &&
           entry.time >= 0 &&
           entry.score >= 0;
  }

  saveLeaderboard(leaderboard) {
    try {
      const validatedData = this.ensureLeaderboardStructure(leaderboard);
      localStorage.setItem(this.leaderboardKey, JSON.stringify(validatedData));
      return true;
    } catch (e) {
      console.error('保存排行榜数据失败:', e);
      return false;
    }
  }

  addScore(theme, difficulty, name, time, score) {
    if (!this.isValidTheme(theme) || !this.isValidDifficulty(difficulty)) {
      console.error('无效的主题或难度:', theme, difficulty);
      return -1;
    }

    const leaderboard = this.getLeaderboard();

    const entry = {
      name: (name && name.trim()) || '匿名玩家',
      time: Math.max(0, Math.floor(time)),
      score: Math.max(0, Math.floor(score)),
      date: new Date().toLocaleDateString('zh-CN')
    };

    leaderboard[theme][difficulty].push(entry);
    leaderboard[theme][difficulty].sort((a, b) => {
      if (a.time !== b.time) {
        return a.time - b.time;
      }
      return b.score - a.score;
    });
    leaderboard[theme][difficulty] = leaderboard[theme][difficulty].slice(0, this.maxRecords);

    this.saveLeaderboard(leaderboard);
    
    const rank = leaderboard[theme][difficulty].findIndex(e => 
      e.name === entry.name && 
      e.time === entry.time && 
      e.score === entry.score &&
      e.date === entry.date
    ) + 1;
    
    return rank;
  }

  getTopScores(theme, difficulty) {
    if (!this.isValidTheme(theme) || !this.isValidDifficulty(difficulty)) {
      return [];
    }
    
    const leaderboard = this.getLeaderboard();
    return leaderboard[theme][difficulty] || [];
  }

  clearLeaderboard(theme = null, difficulty = null) {
    if (theme && difficulty) {
      if (!this.isValidTheme(theme) || !this.isValidDifficulty(difficulty)) {
        return false;
      }
      const leaderboard = this.getLeaderboard();
      leaderboard[theme][difficulty] = [];
      return this.saveLeaderboard(leaderboard);
    } else if (theme) {
      if (!this.isValidTheme(theme)) {
        return false;
      }
      const leaderboard = this.getLeaderboard();
      this.validDifficulties.forEach(d => {
        leaderboard[theme][d] = [];
      });
      return this.saveLeaderboard(leaderboard);
    } else {
      return this.saveLeaderboard(this.createEmptyLeaderboard());
    }
  }

  isNewRecord(theme, difficulty, time) {
    const topScores = this.getTopScores(theme, difficulty);
    if (topScores.length < this.maxRecords) {
      return true;
    }
    return time < topScores[topScores.length - 1].time;
  }
}

const storageManager = new StorageManager();
