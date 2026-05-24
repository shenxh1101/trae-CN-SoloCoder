import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { Settings, UploadConfig } from '../types';

function getSettingsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
}

export function getDefaultSettings(): Settings {
  return {
    theme: 'system',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    lineHeight: 1.6,
    editorFontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, monospace',
    editorFontSize: 14,
    autoSave: true,
    autoSaveInterval: 30000,
    versionSnapshotInterval: 300000,
    maxSnapshotsPerNote: 50,
    imageUpload: {
      type: 'local',
      localPath: path.join(app.getPath('userData'), 'images'),
    } as UploadConfig,
    pinnedNotes: [],
    defaultNotebook: null,
    defaultTemplate: null,
  };
}

export function loadSettings(): Settings {
  const settingsPath = getSettingsPath();
  const defaultSettings = getDefaultSettings();
  if (!fs.existsSync(settingsPath)) {
    return defaultSettings;
  }
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    return { ...defaultSettings, ...saved };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Partial<Settings>): boolean {
  try {
    const current = loadSettings();
    const merged = { ...current, ...settings };
    const settingsPath = getSettingsPath();
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}
