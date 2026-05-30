const Leaderboard = (() => {
  const STORAGE_KEY = 'wordsearch_leaderboard';

  function load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function save(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {}
  }

  function addRecord(record) {
    const records = load();
    records.push(record);
    records.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.time - b.time;
    });
    if (records.length > 50) records.length = 50;
    save(records);
  }

  function getRecords(theme, difficulty, mode) {
    const records = load();
    return records.filter(r =>
      r.theme === theme && r.difficulty === difficulty && r.mode === mode
    ).slice(0, 10);
  }

  function getBestTime(theme, difficulty, mode) {
    const records = getRecords(theme, difficulty, mode);
    if (records.length === 0) return null;
    return records[0].time;
  }

  return { addRecord, getRecords, getBestTime };
})();
