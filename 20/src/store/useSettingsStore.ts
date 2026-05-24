import { create } from 'zustand';
import type { Settings, UploadConfig } from '../types';

interface SettingsStore {
  settings: Settings;
  loading: boolean;
  initialized: boolean;
  initSettings: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<boolean>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<boolean>;
  setFontFamily: (font: string) => Promise<boolean>;
  setFontSize: (size: number) => Promise<boolean>;
  setEditorFontFamily: (font: string) => Promise<boolean>;
  setEditorFontSize: (size: number) => Promise<boolean>;
  setImageUploadConfig: (config: UploadConfig) => Promise<boolean>;
  toggleAutoSave: () => Promise<boolean>;
}

const defaultSettings: Settings = {
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
    localPath: '',
  },
  pinnedNotes: [],
  defaultNotebook: null,
  defaultTemplate: null,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  loading: false,
  initialized: false,

  initSettings: async () => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      if (window.electronAPI) {
        const loaded = (await window.electronAPI.settings.get()) as Settings;
        if (loaded) {
          set({ settings: { ...defaultSettings, ...loaded }, initialized: true });
          if (loaded.theme) {
            applyTheme(loaded.theme);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateSettings: async (partial: Partial<Settings>) => {
    try {
      const newSettings = { ...get().settings, ...partial };
      if (window.electronAPI) {
        const success = await window.electronAPI.settings.set(newSettings);
        if (success) {
          set({ settings: newSettings });
          if (partial.theme) {
            applyTheme(partial.theme);
          }
          if (partial.fontSize || partial.fontFamily) {
            applyFontSettings(newSettings);
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  },

  setTheme: async (theme) => {
    return get().updateSettings({ theme });
  },

  setFontFamily: async (font) => {
    return get().updateSettings({ fontFamily: font });
  },

  setFontSize: async (size) => {
    return get().updateSettings({ fontSize: size });
  },

  setEditorFontFamily: async (font) => {
    return get().updateSettings({ editorFontFamily: font });
  },

  setEditorFontSize: async (size) => {
    return get().updateSettings({ editorFontSize: size });
  },

  setImageUploadConfig: async (config) => {
    return get().updateSettings({ imageUpload: config });
  },

  toggleAutoSave: async () => {
    const newValue = !get().settings.autoSave;
    return get().updateSettings({ autoSave: newValue });
  },
}));

function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement;
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function applyFontSettings(settings: Settings): void {
  document.documentElement.style.setProperty('--font-family-sans', settings.fontFamily);
  document.documentElement.style.setProperty('--font-size-base', `${settings.fontSize}px`);
  document.documentElement.style.setProperty('--line-height-base', `${settings.lineHeight}`);
  document.documentElement.style.setProperty('--font-family-mono', settings.editorFontFamily);
}
