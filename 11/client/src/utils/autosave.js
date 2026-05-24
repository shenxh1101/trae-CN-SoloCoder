const STORAGE_PREFIX = 'codesandbox:';

const getKey = (snippetId) => `${STORAGE_PREFIX}${snippetId}`;

export const saveToLocalStorage = (snippetId, data) => {
  try {
    const key = getKey(snippetId);
    const saveData = {
      ...data,
      savedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(saveData));
    return true;
  } catch (err) {
    console.error('Error saving to localStorage:', err);
    return false;
  }
};

export const loadFromLocalStorage = (snippetId) => {
  try {
    const key = getKey(snippetId);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Error loading from localStorage:', err);
    return null;
  }
};

export const removeFromLocalStorage = (snippetId) => {
  try {
    const key = getKey(snippetId);
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error('Error removing from localStorage:', err);
    return false;
  }
};

export const clearOldSaves = (maxAge = 7 * 24 * 60 * 60 * 1000) => {
  try {
    const now = Date.now();
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(STORAGE_PREFIX) && key !== `${STORAGE_PREFIX}ownerId` && key !== `${STORAGE_PREFIX}userName`) {
        try {
          const rawData = localStorage.getItem(key);
          const data = JSON.parse(rawData);
          if (data.savedAt && now - data.savedAt > maxAge) {
            keysToRemove.push(key);
          }
        } catch (parseErr) {
          console.warn(`Skipping invalid JSON data for key ${key}:`, parseErr);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return keysToRemove.length;
  } catch (err) {
    console.error('Error clearing old saves:', err);
    return 0;
  }
};

export const setupAutoSave = (snippetId, getState, interval = 30000) => {
  const saveInterval = setInterval(() => {
    const state = getState();
    if (state) {
      saveToLocalStorage(snippetId, state);
    }
  }, interval);

  const handleBeforeUnload = () => {
    const state = getState();
    if (state) {
      saveToLocalStorage(snippetId, state);
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    clearInterval(saveInterval);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};
