import { STORAGE_KEY } from "./constants";

export interface MatchRecord {
  target: string;
  matched: boolean;
  timeTaken: number;
  timestamp: number;
}

export interface StoredRecord {
  id: string;
  playerName: string;
  score: number;
  accuracy: number;
  fastestTime: number;
  difficulty: string;
  timestamp: number;
  matchHistory: MatchRecord[];
  selectedObjects: string[];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function loadRecords(): StoredRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRecord(record: StoredRecord): void {
  const records = loadRecords();
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getTopRecords(limit = 10): StoredRecord[] {
  const records = loadRecords();
  return records.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function calculateAccuracy(history: MatchRecord[]): number {
  if (history.length === 0) return 0;
  const matched = history.filter((h) => h.matched).length;
  return matched / history.length;
}

export function getFastestTime(history: MatchRecord[]): number {
  const matched = history.filter((h) => h.matched);
  if (matched.length === 0) return 0;
  return Math.min(...matched.map((h) => h.timeTaken));
}

export function getStatsByObject(
  history: MatchRecord[]
): Record<string, { total: number; matched: number; avgTime: number; fastestTime: number }> {
  const stats: Record<
    string,
    { total: number; matched: number; times: number[] }
  > = {};

  history.forEach((h) => {
    if (!stats[h.target]) {
      stats[h.target] = { total: 0, matched: 0, times: [] };
    }
    stats[h.target].total++;
    if (h.matched) {
      stats[h.target].matched++;
      stats[h.target].times.push(h.timeTaken);
    }
  });

  const result: Record<
    string,
    { total: number; matched: number; avgTime: number; fastestTime: number }
  > = {};
  Object.entries(stats).forEach(([key, val]) => {
    result[key] = {
      total: val.total,
      matched: val.matched,
      avgTime:
        val.times.length > 0
          ? val.times.reduce((a, b) => a + b, 0) / val.times.length
          : 0,
      fastestTime: val.times.length > 0 ? Math.min(...val.times) : 0,
    };
  });
  return result;
}
