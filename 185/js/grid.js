const GridManager = (() => {
  function createEmptyGrid() {
    return Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => null)
    );
  }

  function canPlaceWord(grid, word, row, col, dir) {
    for (let i = 0; i < word.length; i++) {
      const r = row + dir.dr * i;
      const c = col + dir.dc * i;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
      if (grid[r][c] !== null && grid[r][c] !== word[i]) return false;
    }
    return true;
  }

  function placeWord(grid, word, row, col, dir) {
    const positions = [];
    for (let i = 0; i < word.length; i++) {
      const r = row + dir.dr * i;
      const c = col + dir.dc * i;
      grid[r][c] = word[i];
      positions.push({ row: r, col: c });
    }
    return positions;
  }

  function tryPlaceWord(grid, word) {
    const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);
    for (let attempt = 0; attempt < 100; attempt++) {
      const dir = shuffledDirs[attempt % shuffledDirs.length];
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      if (canPlaceWord(grid, word, row, col, dir)) {
        return placeWord(grid, word, row, col, dir);
      }
    }
    return null;
  }

  function fillEmptyCells(grid) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) {
          grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }
  }

  function selectWords(theme, difficulty) {
    const bank = WORD_BANKS[theme];
    if (!bank) return [];
    let pool = [];
    const diffKey = difficulty === 'easy' ? 'easy' : difficulty === 'medium' ? 'medium' : 'hard';
    pool = [...bank.words[diffKey]];
    pool = pool.filter(w => w.length <= GRID_SIZE);
    pool.sort(() => Math.random() - 0.5);
    const count = WORD_COUNT_RANGE.min + Math.floor(Math.random() * (WORD_COUNT_RANGE.max - WORD_COUNT_RANGE.min + 1));
    return pool.slice(0, Math.min(count, pool.length));
  }

  function generateGrid(theme, difficulty) {
    const words = selectWords(theme, difficulty);
    let grid, placedWords, success;

    for (let retry = 0; retry < 20; retry++) {
      grid = createEmptyGrid();
      placedWords = [];
      success = true;

      const sortedWords = [...words].sort((a, b) => b.length - a.length);

      for (const word of sortedWords) {
        const positions = tryPlaceWord(grid, word.toUpperCase());
        if (positions) {
          placedWords.push({
            word: word.toUpperCase(),
            positions: positions
          });
        } else {
          success = false;
          break;
        }
      }

      if (success && placedWords.length >= Math.min(5, words.length)) {
        break;
      }
    }

    if (!success) {
      grid = createEmptyGrid();
      placedWords = [];
      const fallbackWords = words.slice(0, 5);
      for (const word of fallbackWords) {
        const positions = tryPlaceWord(grid, word.toUpperCase());
        if (positions) {
          placedWords.push({ word: word.toUpperCase(), positions });
        }
      }
    }

    fillEmptyCells(grid);

    return { grid, placedWords };
  }

  function getCellsBetween(r1, c1, r2, c2) {
    const dr = r2 - r1;
    const dc = c2 - c1;
    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    if (absDr !== 0 && absDc !== 0 && absDr !== absDc) return null;

    const steps = Math.max(absDr, absDc);
    if (steps === 0) return [{ row: r1, col: c1 }];

    const stepR = dr === 0 ? 0 : dr / absDr;
    const stepC = dc === 0 ? 0 : dc / absDc;

    const cells = [];
    for (let i = 0; i <= steps; i++) {
      cells.push({ row: r1 + stepR * i, col: c1 + stepC * i });
    }
    return cells;
  }

  return { generateGrid, getCellsBetween };
})();
