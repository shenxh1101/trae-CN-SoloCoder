const WORD_BANKS = {
  animals: {
    name: '动物',
    icon: '🐾',
    words: {
      easy: ['cat', 'dog', 'pig', 'cow', 'hen', 'fox', 'bat', 'owl', 'ant', 'bee', 'rat', 'ape', 'elk', 'yak', 'ram'],
      medium: ['lion', 'bear', 'deer', 'wolf', 'hawk', 'frog', 'crab', 'seal', 'goat', 'fish', 'mole', 'toad', 'swan', 'dove', 'puma'],
      hard: ['tiger', 'eagle', 'shark', 'whale', 'horse', 'snake', 'zebra', 'camel', 'panda', 'koala', 'bison', 'otter', 'raven', 'heron', 'trout']
    }
  },
  fruits: {
    name: '水果',
    icon: '🍎',
    words: {
      easy: ['fig', 'plum', 'pear', 'lime', 'kiwi', 'date'],
      medium: ['apple', 'grape', 'mango', 'peach', 'lemon', 'melon', 'berry', 'olive', 'guava', 'prune', 'pomelo', 'cherry'],
      hard: ['banana', 'orange', 'cherry', 'papaya', 'lychee', 'coconut', 'avocado', 'apricot', 'tangerine', 'blueberry']
    }
  },
  countries: {
    name: '国家',
    icon: '🌍',
    words: {
      easy: ['cuba', 'peru', 'iran', 'iraq', 'fiji', 'togo', 'mali', 'laos', 'chad', 'oman'],
      medium: ['japan', 'china', 'india', 'nepal', 'chile', 'spain', 'italy', 'egypt', 'syria', 'benin'],
      hard: ['brazil', 'canada', 'mexico', 'norway', 'sweden', 'greece', 'poland', 'russia', 'france', 'germany']
    }
  }
};

const GRID_SIZE = 10;
const DIRECTIONS = [
  { dr: 0, dc: 1, name: 'right' },
  { dr: 0, dc: -1, name: 'left' },
  { dr: 1, dc: 0, name: 'down' },
  { dr: -1, dc: 0, name: 'up' },
  { dr: 1, dc: 1, name: 'down-right' },
  { dr: 1, dc: -1, name: 'down-left' },
  { dr: -1, dc: 1, name: 'up-right' },
  { dr: -1, dc: -1, name: 'up-left' }
];

const WORD_COUNT_RANGE = { min: 5, max: 8 };

const SCORING = {
  correct: 100,
  wrong: -20,
  hint: -50
};

const TIMED_MODE_SECONDS = 180;
