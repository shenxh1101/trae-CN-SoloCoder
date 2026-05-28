const Game = {
  state: {
    currentWord: '',
    currentHint: '',
    guessedLetters: [],
    wrongGuesses: 0,
    maxWrongGuesses: 6,
    score: 0,
    isGameOver: false,
    isWin: false,
    mode: 'single',
    difficulty: 'easy',
    category: 'animals',
    hintUsed: false,
    customWord: null,
    currentPlayer: 1,
    player1Score: 0,
    player2Score: 0,
    round: 1,
    dualPhase: 'input'
  },

  init() {
    const settings = Storage.getSettings();
    this.state.difficulty = settings.difficulty;
    this.state.category = settings.category;
    Sound.enabled = settings.soundEnabled;
  },

  filterByDifficulty(words, difficulty) {
    return words.filter(item => {
      const len = item.word.length;
      if (difficulty === 'easy') {
        return len >= 4 && len <= 5;
      } else if (difficulty === 'hard') {
        return len >= 8 && len <= 10;
      }
      return len >= 4 && len <= 10;
    });
  },

  getRandomWord() {
    const allLists = Storage.getAllWordLists();
    const categoryData = allLists[this.state.category];
    
    if (!categoryData || !categoryData.words || categoryData.words.length === 0) {
      return { word: 'test', hint: '测试单词' };
    }

    let filteredWords = this.filterByDifficulty(categoryData.words, this.state.difficulty);
    
    if (filteredWords.length === 0) {
      filteredWords = categoryData.words;
    }

    const randomIndex = Math.floor(Math.random() * filteredWords.length);
    return filteredWords[randomIndex];
  },

  startNewGame() {
    if (this.state.mode === 'dual') {
      this.startDualRound();
      return;
    }

    const wordData = this.getRandomWord();
    this.state.currentWord = wordData.word.toLowerCase();
    this.state.currentHint = wordData.hint;
    this.state.guessedLetters = [];
    this.state.wrongGuesses = 0;
    this.state.isGameOver = false;
    this.state.isWin = false;
    this.state.score = 0;
    this.state.hintUsed = false;
  },

  startDualRound() {
    if (this.state.dualPhase === 'input') {
      this.state.guessedLetters = [];
      this.state.wrongGuesses = 0;
      this.state.isGameOver = false;
      this.state.isWin = false;
      this.state.score = 0;
      this.state.hintUsed = false;
    } else {
      this.state.dualPhase = 'input';
      this.state.currentWord = '';
      this.state.currentHint = '';
    }
  },

  setDualWord(word, hint) {
    this.state.currentWord = word.toLowerCase();
    this.state.currentHint = hint;
    this.state.dualPhase = 'guess';
    this.state.guessedLetters = [];
    this.state.wrongGuesses = 0;
    this.state.isGameOver = false;
    this.state.isWin = false;
    this.state.score = 0;
    this.state.hintUsed = false;
  },

  finishDualRound() {
    const score = this.calculateScore();
    
    if (this.state.currentPlayer === 1) {
      this.state.player1Score += score;
    } else {
      this.state.player2Score += score;
    }

    if (this.state.round === 1) {
      this.state.round = 2;
      this.state.currentPlayer = this.state.currentPlayer === 1 ? 2 : 1;
      this.state.dualPhase = 'input';
      return false;
    } else {
      return true;
    }
  },

  resetDualGame() {
    this.state.currentPlayer = 1;
    this.state.player1Score = 0;
    this.state.player2Score = 0;
    this.state.round = 1;
    this.state.dualPhase = 'input';
    this.state.currentWord = '';
    this.state.currentHint = '';
  },

  guessLetter(letter) {
    letter = letter.toLowerCase();

    if (this.state.isGameOver || this.state.guessedLetters.includes(letter)) {
      return null;
    }

    this.state.guessedLetters.push(letter);

    const isCorrect = this.state.currentWord.includes(letter);

    if (!isCorrect) {
      this.state.wrongGuesses++;
      Sound.playWrong();
    } else {
      Sound.playCorrect();
    }

    this.checkGameEnd();

    return isCorrect;
  },

  checkGameEnd() {
    if (this.checkWin()) {
      this.state.isGameOver = true;
      this.state.isWin = true;
      this.state.score = this.calculateScore();
      Sound.playWin();
      
      if (this.state.mode === 'single') {
        Storage.saveHighScore(this.state.category, this.state.difficulty, this.state.score);
      }
      return true;
    }

    if (this.checkLose()) {
      this.state.isGameOver = true;
      this.state.isWin = false;
      this.state.score = 0;
      Sound.playLose();
      return true;
    }

    return false;
  },

  checkWin() {
    return this.state.currentWord.split('').every(letter => 
      this.state.guessedLetters.includes(letter)
    );
  },

  checkLose() {
    return this.state.wrongGuesses >= this.state.maxWrongGuesses;
  },

  calculateScore() {
    if (!this.state.isWin) return 0;
    
    const remainingChances = this.state.maxWrongGuesses - this.state.wrongGuesses;
    const wordLength = this.state.currentWord.length;
    const baseScore = wordLength * 10;
    const bonusScore = remainingChances * 20;
    const hintPenalty = this.state.hintUsed ? 20 : 0;
    
    return Math.max(0, baseScore + bonusScore - hintPenalty);
  },

  getHint() {
    if (this.state.hintUsed) {
      const unguessedLetters = this.state.currentWord
        .split('')
        .filter(letter => !this.state.guessedLetters.includes(letter));
      
      if (unguessedLetters.length > 0) {
        const randomLetter = unguessedLetters[Math.floor(Math.random() * unguessedLetters.length)];
        this.guessLetter(randomLetter);
        return { type: 'letter', value: randomLetter };
      }
    }
    
    this.state.hintUsed = true;
    return { type: 'hint', value: this.state.currentHint };
  },

  setMode(mode) {
    this.state.mode = mode;
    if (mode === 'dual') {
      this.resetDualGame();
    }
  },

  setDifficulty(difficulty) {
    this.state.difficulty = difficulty;
    const settings = Storage.getSettings();
    settings.difficulty = difficulty;
    Storage.saveSettings(settings);
  },

  setCategory(category) {
    this.state.category = category;
    const settings = Storage.getSettings();
    settings.category = category;
    Storage.saveSettings(settings);
  },

  setSoundEnabled(enabled) {
    Sound.setEnabled(enabled);
    const settings = Storage.getSettings();
    settings.soundEnabled = enabled;
    Storage.saveSettings(settings);
  }
};
