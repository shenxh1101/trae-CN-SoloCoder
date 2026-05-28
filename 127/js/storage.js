const BEST_RECORDS_KEY = 'puzzle_wheel_best_records';
const SETTINGS_KEY = 'puzzle_wheel_settings';

export const loadBestRecords = () => {
  try {
    const data = localStorage.getItem(BEST_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveBestRecord = (record) => {
  try {
    const records = loadBestRecords();
    const existingIndex = records.findIndex(
      (r) => r.difficulty === record.difficulty
    );
    
    if (existingIndex >= 0) {
      const existing = records[existingIndex];
      if (
        record.minSpins < existing.minSpins ||
        (record.minSpins === existing.minSpins && record.bestTime < existing.bestTime)
      ) {
        records[existingIndex] = record;
      }
    } else {
      records.push(record);
    }
    
    localStorage.setItem(BEST_RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    console.error('Failed to save best record');
    return false;
  }
};

export const getBestRecord = (difficulty) => {
  const records = loadBestRecords();
  return records.find((r) => r.difficulty === difficulty) || null;
};

export const loadSettings = () => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    console.error('Failed to save settings');
    return false;
  }
};
