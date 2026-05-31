const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve('./.aicg/config.json');
const DEFAULT_CONFIG = {
  ai: {
    provider: 'mock',
    apiKey: '',
    baseUrl: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 30000
  },
  output: {
    defaultDir: './output',
    versionsDir: './.aicg/versions'
  },
  features: {
    enableASCII: true,
    enableWCAG: true,
    enableVersionControl: true
  }
};

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return deepMerge(DEFAULT_CONFIG, userConfig);
    } catch (e) {
      console.warn('Warning: Invalid config file, using defaults');
    }
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function getConfig() {
  return loadConfig();
}

function updateConfig(updates) {
  const config = loadConfig();
  const merged = deepMerge(config, updates);
  saveConfig(merged);
  return merged;
}

function setConfigValue(path, value) {
  const config = loadConfig();
  const keys = path.split('.');
  let current = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  saveConfig(config);
  return config;
}

function getAIConfig() {
  const config = loadConfig();
  return config.ai;
}

module.exports = { 
  loadConfig, 
  saveConfig, 
  getConfig, 
  updateConfig, 
  setConfigValue,
  getAIConfig,
  DEFAULT_CONFIG 
};
