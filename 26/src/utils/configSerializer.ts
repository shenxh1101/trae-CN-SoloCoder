import LZString from 'lz-string';
import type { ShoeConfig } from '@/types';
import { createDefaultConfig } from '@/data/presets';

export const serializeConfig = (config: ShoeConfig): string => {
  try {
    const jsonString = JSON.stringify(config);
    return LZString.compressToEncodedURIComponent(jsonString);
  } catch (error) {
    console.error('Failed to serialize config:', error);
    return '';
  }
};

export const deserializeConfig = (compressed: string): ShoeConfig | null => {
  try {
    const jsonString = LZString.decompressFromEncodedURIComponent(compressed);
    if (!jsonString) return null;
    const config = JSON.parse(jsonString) as ShoeConfig;
    return validateConfig(config);
  } catch (error) {
    console.error('Failed to deserialize config:', error);
    return null;
  }
};

const validateConfig = (config: Partial<ShoeConfig>): ShoeConfig | null => {
  const defaultConfig = createDefaultConfig();

  if (!config || typeof config !== 'object') return null;

  const validated: ShoeConfig = {
    id: config.id || defaultConfig.id,
    name: config.name || defaultConfig.name,
    parts: {
      upper: { ...defaultConfig.parts.upper, ...(config.parts?.upper || {}) },
      sole: { ...defaultConfig.parts.sole, ...(config.parts?.sole || {}) },
      laces: { ...defaultConfig.parts.laces, ...(config.parts?.laces || {}) },
      logo: { ...defaultConfig.parts.logo, ...(config.parts?.logo || {}) },
      heel: { ...defaultConfig.parts.heel, ...(config.parts?.heel || {}) },
      tongue: { ...defaultConfig.parts.tongue, ...(config.parts?.tongue || {}) },
      lining: { ...defaultConfig.parts.lining, ...(config.parts?.lining || {}) }
    },
    decals: Array.isArray(config.decals) ? config.decals : defaultConfig.decals,
    lighting: {
      ...defaultConfig.lighting,
      ...(config.lighting || {}),
      mainLightPosition: {
        ...defaultConfig.lighting.mainLightPosition,
        ...(config.lighting?.mainLightPosition || {})
      }
    },
    createdAt: config.createdAt || Date.now(),
    updatedAt: config.updatedAt || Date.now()
  };

  return validated;
};

export const exportConfigAsJson = (config: ShoeConfig): string => {
  return JSON.stringify(config, null, 2);
};

export const importConfigFromJson = (jsonString: string): ShoeConfig | null => {
  try {
    const config = JSON.parse(jsonString) as ShoeConfig;
    return validateConfig(config);
  } catch (error) {
    console.error('Failed to import config from JSON:', error);
    return null;
  }
};

export const generateShareLink = (config: ShoeConfig, baseUrl: string = window.location.origin): string => {
  const serialized = serializeConfig(config);
  return `${baseUrl}?config=${serialized}`;
};

export const parseShareLink = (url: string): ShoeConfig | null => {
  try {
    const urlObj = new URL(url);
    const configParam = urlObj.searchParams.get('config');
    if (!configParam) {
      const match = url.match(/[?&]config=([^#&]+)/);
      if (!match) return null;
      return deserializeConfig(match[1]);
    }
    return deserializeConfig(configParam);
  } catch (error) {
    console.error('Failed to parse share link:', error);
    return null;
  }
};

export const saveConfigToLocalStorage = (config: ShoeConfig): void => {
  try {
    localStorage.setItem('shoe_config', JSON.stringify(config));
    localStorage.setItem('shoe_config_id', config.id);
  } catch (error) {
    console.error('Failed to save config to localStorage:', error);
  }
};

export const loadConfigFromLocalStorage = (): ShoeConfig | null => {
  try {
    const stored = localStorage.getItem('shoe_config');
    if (!stored) return null;
    const config = JSON.parse(stored) as ShoeConfig;
    return validateConfig(config);
  } catch (error) {
    console.error('Failed to load config from localStorage:', error);
    return null;
  }
};

export const downloadConfigFile = (config: ShoeConfig): void => {
  try {
    const json = exportConfigAsJson(config);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shoe-config-${config.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download config file:', error);
  }
};

export const readConfigFromFile = (file: File): Promise<ShoeConfig | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = importConfigFromJson(content);
        resolve(config);
      } catch (error) {
        console.error('Failed to read config file:', error);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
};
