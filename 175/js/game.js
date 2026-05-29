class CausalGame {
  constructor() {
    this.state = {
      theme: 'life',
      difficulty: 'easy',
      cards: [],
      flippedCards: [],
      matchedPairs: 0,
      totalPairs: 8,
      attempts: 0,
      startTime: null,
      elapsedTime: 0,
      isPlaying: false,
      timerInterval: null,
      isProcessing: false
    };
  }

  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  initGame(theme, difficulty) {
    this.state.theme = theme;
    this.state.difficulty = difficulty;
    
    const config = GAME_DATA.config.difficulties[difficulty];
    this.state.totalPairs = config.pairs;
    this.state.matchedPairs = 0;
    this.state.attempts = 0;
    this.state.flippedCards = [];
    this.state.isProcessing = false;
    this.state.isPlaying = true;
    this.state.startTime = Date.now();
    this.state.elapsedTime = 0;

    const themeData = GAME_DATA.themes[theme];
    const selectedPairs = this.shuffleArray(themeData.pairs).slice(0, config.pairs);
    
    const cards = [];
    selectedPairs.forEach((pair, index) => {
      cards.push({
        id: `cause-${index}`,
        pairId: pair.id,
        type: 'cause',
        content: pair.cause,
        explanation: pair.explanation,
        isFlipped: false,
        isMatched: false
      });
      cards.push({
        id: `effect-${index}`,
        pairId: pair.id,
        type: 'effect',
        content: pair.effect,
        explanation: pair.explanation,
        isFlipped: false,
        isMatched: false
      });
    });

    this.state.cards = this.shuffleArray(cards);
    this.startTimer();
    
    return {
      cards: this.state.cards,
      rows: config.rows,
      cols: config.cols
    };
  }

  startTimer() {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
    }
    
    this.state.timerInterval = setInterval(() => {
      if (this.state.isPlaying && this.state.startTime) {
        this.state.elapsedTime = Math.floor((Date.now() - this.state.startTime) / 1000);
        if (typeof uiManager !== 'undefined' && uiManager.updateTimer) {
          uiManager.updateTimer(this.state.elapsedTime);
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
  }

  flipCard(cardIndex) {
    if (this.state.isProcessing) return null;
    
    const card = this.state.cards[cardIndex];
    if (card.isFlipped || card.isMatched) return null;

    audioManager.playFlip();
    card.isFlipped = true;
    this.state.flippedCards.push(cardIndex);

    if (this.state.flippedCards.length === 2) {
      this.state.attempts++;
      this.state.isProcessing = true;
      
      const [firstIndex, secondIndex] = this.state.flippedCards;
      const firstCard = this.state.cards[firstIndex];
      const secondCard = this.state.cards[secondIndex];

      const isMatch = firstCard.pairId === secondCard.pairId && 
                      firstCard.type !== secondCard.type;

      return {
        isMatch,
        firstIndex,
        secondIndex,
        firstCard,
        secondCard,
        explanation: isMatch ? firstCard.explanation : null
      };
    }

    return { isMatch: null, cardIndex, card };
  }

  processMatchResult(result, onMatchComplete) {
    if (!result || result.isMatch === null) {
      return;
    }

    const { isMatch, firstIndex, secondIndex, explanation } = result;

    setTimeout(() => {
      if (isMatch) {
        this.state.cards[firstIndex].isMatched = true;
        this.state.cards[secondIndex].isMatched = true;
        this.state.matchedPairs++;
        audioManager.playSuccess();
      } else {
        this.state.cards[firstIndex].isFlipped = false;
        this.state.cards[secondIndex].isFlipped = false;
        audioManager.playError();
      }

      this.state.flippedCards = [];
      this.state.isProcessing = false;

      if (onMatchComplete) {
        onMatchComplete({
          isMatch,
          firstIndex,
          secondIndex,
          explanation,
          matchedPairs: this.state.matchedPairs,
          totalPairs: this.state.totalPairs,
          attempts: this.state.attempts,
          isGameComplete: this.state.matchedPairs === this.state.totalPairs
        });
      }

      if (this.state.matchedPairs === this.state.totalPairs) {
        this.gameComplete();
      }
    }, isMatch ? 500 : 1000);
  }

  gameComplete() {
    this.stopTimer();
    this.state.isPlaying = false;
    audioManager.playVictory();
    
    const time = this.state.elapsedTime;
    const score = this.calculateScore();
    
    const themeData = GAME_DATA.themes[this.state.theme];
    const funFact = themeData.funFacts[Math.floor(Math.random() * themeData.funFacts.length)];

    if (typeof uiManager !== 'undefined' && uiManager.showVictory) {
      uiManager.showVictory({
        time,
        score,
        attempts: this.state.attempts,
        funFact,
        theme: this.state.theme,
        difficulty: this.state.difficulty
      });
    }
  }

  calculateScore() {
    const baseScore = 1000;
    const timePenalty = this.state.elapsedTime * 2;
    const attemptPenalty = this.state.attempts * 5;
    return Math.max(0, baseScore - timePenalty - attemptPenalty);
  }

  getHint() {
    const unmatchedCards = this.state.cards
      .map((card, index) => ({ ...card, originalIndex: index }))
      .filter(card => !card.isMatched && !card.isFlipped);

    for (let i = 0; i < unmatchedCards.length; i++) {
      for (let j = i + 1; j < unmatchedCards.length; j++) {
        const card1 = unmatchedCards[i];
        const card2 = unmatchedCards[j];
        if (card1.pairId === card2.pairId && card1.type !== card2.type) {
          return [card1.originalIndex, card2.originalIndex];
        }
      }
    }
    return [];
  }

  shuffleUnmatched() {
    const unmatchedIndices = [];
    const unmatchedCards = [];

    this.state.cards.forEach((card, index) => {
      if (!card.isMatched) {
        unmatchedIndices.push(index);
        unmatchedCards.push(card);
      }
    });

    const shuffled = this.shuffleArray(unmatchedCards);
    unmatchedIndices.forEach((originalIndex, i) => {
      this.state.cards[originalIndex] = shuffled[i];
      this.state.cards[originalIndex].isFlipped = false;
    });

    this.state.flippedCards = [];
    this.state.isProcessing = false;

    return this.state.cards;
  }

  getStats() {
    return {
      matchedPairs: this.state.matchedPairs,
      totalPairs: this.state.totalPairs,
      attempts: this.state.attempts,
      elapsedTime: this.state.elapsedTime
    };
  }

  destroy() {
    this.stopTimer();
  }
}

const game = new CausalGame();
