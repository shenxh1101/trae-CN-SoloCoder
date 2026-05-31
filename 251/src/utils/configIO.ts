import { StairConfig, DEFAULT_CONFIG } from '../types';

export function exportConfig(config: StairConfig): void {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `stairs-config-${Date.now()}.json`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
}

export function exportConfigToClipboard(config: StairConfig): Promise<void> {
  const json = JSON.stringify(config, null, 2);
  return navigator.clipboard.writeText(json);
}

export function importConfigFromFile(file: File): Promise<StairConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = validateAndParseConfig(content);
        resolve(config);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function importConfigFromClipboard(): Promise<StairConfig> {
  return navigator.clipboard.readText().then((text) => {
    return validateAndParseConfig(text);
  });
}

export function validateAndParseConfig(jsonString: string): StairConfig {
  let parsed: unknown;
  
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
  
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Config must be an object');
  }
  
  const config = parsed as Partial<StairConfig>;
  const validStyles: StairConfig['style'][] = ['neon', 'stone', 'glass'];
  const validBackgrounds: StairConfig['background'][] = ['starfield', 'abyss'];
  
  const validateString = (value: unknown, fieldName: string, defaultValue: string): string => {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value !== 'string') {
      throw new Error(`Invalid ${fieldName}: expected string`);
    }
    return value;
  };

  const validateNumber = (value: unknown, fieldName: string, min: number, max: number, defaultValue: number): number => {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Invalid ${fieldName}: expected number`);
    }
    if (value < min) {
      throw new Error(`Invalid ${fieldName}: must be >= ${min}`);
    }
    if (value > max) {
      throw new Error(`Invalid ${fieldName}: must be <= ${max}`);
    }
    return value;
  };

  const validateBoolean = (value: unknown, fieldName: string, defaultValue: boolean): boolean => {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value !== 'boolean') {
      throw new Error(`Invalid ${fieldName}: expected boolean`);
    }
    return value;
  };

  const validateEnum = <T extends string>(
    value: unknown,
    fieldName: string,
    validValues: T[],
    defaultValue: T
  ): T => {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value !== 'string') {
      throw new Error(`Invalid ${fieldName}: expected string`);
    }
    if (!validValues.includes(value as T)) {
      throw new Error(`Invalid ${fieldName}: must be one of [${validValues.join(', ')}]`);
    }
    return value as T;
  };

  const validatedConfig: StairConfig = {
    seed: validateString(config.seed, 'seed', DEFAULT_CONFIG.seed),
    style: validateEnum(config.style, 'style', validStyles, DEFAULT_CONFIG.style),
    background: validateEnum(config.background, 'background', validBackgrounds, DEFAULT_CONFIG.background),
    stairColor: validateString(config.stairColor, 'stairColor', DEFAULT_CONFIG.stairColor),
    accentColor: validateString(config.accentColor, 'accentColor', DEFAULT_CONFIG.accentColor),
    stepWidth: validateNumber(config.stepWidth, 'stepWidth', 1, 10, DEFAULT_CONFIG.stepWidth),
    stepHeight: validateNumber(config.stepHeight, 'stepHeight', 0.1, 2, DEFAULT_CONFIG.stepHeight),
    stepDepth: validateNumber(config.stepDepth, 'stepDepth', 0.5, 5, DEFAULT_CONFIG.stepDepth),
    spiral: validateBoolean(config.spiral, 'spiral', DEFAULT_CONFIG.spiral),
    spiralAngle: validateNumber(config.spiralAngle, 'spiralAngle', 0, 45, DEFAULT_CONFIG.spiralAngle),
    particleEnabled: validateBoolean(config.particleEnabled, 'particleEnabled', DEFAULT_CONFIG.particleEnabled),
    particleCount: validateNumber(config.particleCount, 'particleCount', 0, 200, DEFAULT_CONFIG.particleCount),
    autoWalk: validateBoolean(config.autoWalk, 'autoWalk', DEFAULT_CONFIG.autoWalk),
    autoWalkSpeed: validateNumber(config.autoWalkSpeed, 'autoWalkSpeed', 0.1, 5, DEFAULT_CONFIG.autoWalkSpeed),
    soundEnabled: validateBoolean(config.soundEnabled, 'soundEnabled', DEFAULT_CONFIG.soundEnabled),
    soundVolume: validateNumber(config.soundVolume, 'soundVolume', 0, 1, DEFAULT_CONFIG.soundVolume),
  };
  
  return validatedConfig;
}

export function configToShareString(config: StairConfig): string {
  const json = JSON.stringify(config);
  return btoa(encodeURIComponent(json));
}

export function shareStringToConfig(shareString: string): StairConfig {
  try {
    const json = decodeURIComponent(atob(shareString));
    return validateAndParseConfig(json);
  } catch (error) {
    throw new Error('Invalid share string');
  }
}
