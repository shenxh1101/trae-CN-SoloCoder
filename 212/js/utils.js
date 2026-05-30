class StorageManager {
  constructor() {
    this.key = 'art_style_transfer_prefs';
  }

  savePreferences(prefs) {
    try {
      const existing = this.loadPreferences();
      const updated = { ...existing, ...prefs };
      localStorage.setItem(this.key, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Failed to save preferences:', e);
      return false;
    }
  }

  loadPreferences() {
    try {
      const data = localStorage.getItem(this.key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
    return {
      lastStyle: 'vanGogh',
      lastIntensity: 70,
      favoriteStyles: [],
      useCompareMode: false
    };
  }

  saveFavoriteStyle(styleId) {
    const prefs = this.loadPreferences();
    if (!prefs.favoriteStyles) {
      prefs.favoriteStyles = [];
    }
    
    const index = prefs.favoriteStyles.indexOf(styleId);
    if (index === -1) {
      prefs.favoriteStyles.push(styleId);
    } else {
      prefs.favoriteStyles.splice(index, 1);
    }
    
    this.savePreferences(prefs);
    return prefs.favoriteStyles.includes(styleId);
  }

  getFavoriteStyles() {
    const prefs = this.loadPreferences();
    return prefs.favoriteStyles || [];
  }

  isFavorite(styleId) {
    return this.getFavoriteStyles().includes(styleId);
  }
}

class DownloadManager {
  constructor() {
    this.zip = null;
  }

  downloadPNG(canvas, filename) {
    return new Promise((resolve) => {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      resolve();
    });
  }

  async initZip() {
    return new Promise((resolve) => {
      const checkJSZip = () => {
        if (typeof JSZip !== 'undefined') {
          this.zip = new JSZip();
          resolve(true);
        } else {
          setTimeout(checkJSZip, 100);
        }
      };
      checkJSZip();
    });
  }

  addToZip(canvas, filename) {
    if (!this.zip) return false;
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          this.zip.file(`${filename}.png`, blob);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 'image/png');
    });
  }

  async downloadZip(filename) {
    if (!this.zip) return null;
    
    const content = await this.zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.download = `${filename}.zip`;
    link.href = URL.createObjectURL(content);
    link.click();
    URL.revokeObjectURL(link.href);
    this.zip = null;
    return content;
  }

  async batchDownload(canvases, filenames, zipFilename, onProgress) {
    this.zip = new JSZip();
    if (!this.zip) {
      showToast('JSZip 未加载，无法批量下载', 'error');
      return null;
    }

    for (let i = 0; i < canvases.length; i++) {
      await this.addToZip(canvases[i], filenames[i]);
      if (onProgress) {
        onProgress((i + 1) / canvases.length);
      }
    }

    return this.downloadZip(zipFilename);
  }
}

class Toast {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type} show`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, duration);
  }
}

let toastInstance = null;
function showToast(message, type = 'success', duration = 3000) {
  if (!toastInstance) {
    toastInstance = new Toast();
  }
  toastInstance.show(message, type, duration);
}

function formatTime(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${seconds}秒`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function getFilenameWithoutExtension(filename) {
  return filename.replace(/\.[^/.]+$/, '');
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const storageManager = new StorageManager();
const downloadManager = new DownloadManager();
