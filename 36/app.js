// ========== Color Utilities ==========
function hexToRgb(hex) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => {
    const h = Math.round(Math.max(0, Math.min(255, v))).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function isValidHex(hex) {
  if (!hex || typeof hex !== 'string') return false;
  hex = hex.trim();
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}

// ========== State ==========
const state = {
  hue: 0,
  saturation: 100,
  lightness: 50,
  currentHex: '#ff0000',
  favorites: [],
  currentScheme: 'complementary'
};

let updatingInput = false;

// ========== Elements ==========
const $ = id => document.getElementById(id);
const hueRing = $('hueRing');
const svSquare = $('svSquare');
const svCtx = svSquare.getContext('2d');
const svCursor = $('svCursor');
const svCanvasWrap = svSquare.parentElement;
const currentSwatch = $('currentSwatch');
const hexInput = $('hexInput');
const rInput = $('rInput'), gInput = $('gInput'), bInput = $('bInput');
const hInput = $('hInput'), sInput = $('sInput'), lInput = $('lInput');
const favBtn = $('favBtn');
const favList = $('favList');
const previewLight = $('previewLight');
const previewDark = $('previewDark');
const randomBtn = $('randomBtn');
const clearFavsBtn = $('clearFavsBtn');
const extractCanvas = $('extractCanvas');
const extractCtx = extractCanvas.getContext('2d', { willReadFrequently: true });
const extractColors = $('extractColors');
const imageInput = $('imageInput');
const uploadBtn = $('uploadBtn');
const schemeDisplay = $('schemeDisplay');
const contrastFg = $('contrastFg');
const contrastBg = $('contrastBg');
const contrastFgHex = $('contrastFgHex');
const contrastBgHex = $('contrastBgHex');
const contrastRatioEl = $('contrastRatio');

// ========== Hue Ring ==========
function drawHueRing() {
  const size = 240;
  const cx = size / 2, cy = size / 2;
  const outerR = 110, innerR = 80;
  const steps = 360;

  hueRing.innerHTML = '';

  const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hitArea.setAttribute('cx', cx);
  hitArea.setAttribute('cy', cy);
  hitArea.setAttribute('r', outerR);
  hitArea.setAttribute('fill', 'transparent');
  hueRing.appendChild(hitArea);

  for (let i = 0; i < steps; i++) {
    const angle1 = (i / steps) * 2 * Math.PI - Math.PI / 2;
    const angle2 = ((i + 1) / steps) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + outerR * Math.cos(angle1);
    const y1 = cy + outerR * Math.sin(angle1);
    const x2 = cx + outerR * Math.cos(angle2);
    const y2 = cy + outerR * Math.sin(angle2);
    const x3 = cx + innerR * Math.cos(angle2);
    const y3 = cy + innerR * Math.sin(angle2);
    const x4 = cx + innerR * Math.cos(angle1);
    const y4 = cy + innerR * Math.sin(angle1);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`);
    path.setAttribute('fill', `hsl(${i}, 100%, 50%)`);
    path.style.pointerEvents = 'none';
    hueRing.appendChild(path);
  }

  const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  innerCircle.setAttribute('cx', cx);
  innerCircle.setAttribute('cy', cy);
  innerCircle.setAttribute('r', innerR - 2);
  innerCircle.setAttribute('fill', 'white');
  innerCircle.style.pointerEvents = 'none';
  hueRing.appendChild(innerCircle);

  let cursor = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  cursor.setAttribute('id', 'hueCursor');
  cursor.setAttribute('r', '8');
  cursor.setAttribute('fill', 'white');
  cursor.setAttribute('stroke', '#333');
  cursor.setAttribute('stroke-width', '2');
  cursor.style.pointerEvents = 'none';
  hueRing.appendChild(cursor);
}

function getHueFromRing(clientX, clientY) {
  const rect = hueRing.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  if (angle < 0) angle += 360;
  return Math.round(angle) % 360;
}

function updateHueCursor() {
  const size = 240;
  const cx = size / 2, cy = size / 2;
  const r = 95;
  const angle = (state.hue - 90) * Math.PI / 180;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const cursor = hueRing.querySelector('#hueCursor');
  if (cursor) {
    cursor.setAttribute('cx', x);
    cursor.setAttribute('cy', y);
  }
}

// ========== SV Square ==========
function drawSvSquare() {
  const w = svSquare.width, h = svSquare.height;
  const hueColor = `hsl(${state.hue}, 100%, 50%)`;

  const grd = svCtx.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(1, hueColor);
  svCtx.fillStyle = grd;
  svCtx.fillRect(0, 0, w, h);

  const grd2 = svCtx.createLinearGradient(0, 0, 0, h);
  grd2.addColorStop(0, 'rgba(0,0,0,0)');
  grd2.addColorStop(1, 'rgba(0,0,0,1)');
  svCtx.fillStyle = grd2;
  svCtx.fillRect(0, 0, w, h);
}

function updateSvCursor() {
  const x = (state.saturation / 100) * svSquare.width;
  const y = (1 - state.lightness / 100) * svSquare.height;
  svCursor.style.left = x + 'px';
  svCursor.style.top = y + 'px';
}

function getSvFromPoint(clientX, clientY) {
  const rect = svSquare.getBoundingClientRect();
  let x = clientX - rect.left;
  let y = clientY - rect.top;
  x = Math.max(0, Math.min(rect.width, x));
  y = Math.max(0, Math.min(rect.height, y));
  return {
    saturation: Math.round((x / rect.width) * 100),
    lightness: Math.round((1 - y / rect.height) * 100)
  };
}

// ========== Current Color Updates ==========
function updateFromHSL() {
  const { r, g, b } = hslToRgb(state.hue, state.saturation, state.lightness);
  state.currentHex = rgbToHex(r, g, b);
  updateUI();
}

function updateFromHex() {
  if (!isValidHex(state.currentHex)) return;
  const { r, g, b } = hexToRgb(state.currentHex);
  const { h, s, l } = rgbToHsl(r, g, b);
  state.hue = h;
  state.saturation = s;
  state.lightness = l;
  updateUI();
}

function updateUI() {
  currentSwatch.style.backgroundColor = state.currentHex;
  updatingInput = true;
  hexInput.value = state.currentHex.toUpperCase();
  const rgb = hexToRgb(state.currentHex);
  rInput.value = rgb.r;
  gInput.value = rgb.g;
  bInput.value = rgb.b;
  hInput.value = state.hue;
  sInput.value = state.saturation;
  lInput.value = state.lightness;
  updatingInput = false;
  drawSvSquare();
  updateHueCursor();
  updateSvCursor();
  updateFavBtn();
  updatePreview();
  updateSchemes();
}

function updateFavBtn() {
  const isFav = state.favorites.some(f => f.hex.toLowerCase() === state.currentHex.toLowerCase());
  favBtn.classList.toggle('active', isFav);
  favBtn.textContent = isFav ? '★ 已收藏' : '☆ 收藏';
}

function updatePreview() {
  previewLight.style.color = state.currentHex;
  previewDark.style.color = state.currentHex;
}

// ========== Favorites ==========
function loadFavorites() {
  try {
    const saved = localStorage.getItem('paletteFavorites');
    state.favorites = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(state.favorites)) state.favorites = [];
  } catch {
    state.favorites = [];
  }
  renderFavorites();
}

function saveFavorites() {
  try {
    localStorage.setItem('paletteFavorites', JSON.stringify(state.favorites));
  } catch (e) {
    console.warn('保存收藏失败:', e);
  }
}

function renderFavorites() {
  favList.innerHTML = '';
  state.favorites.forEach((fav, idx) => {
    const item = document.createElement('div');
    item.className = 'fav-item';
    item.style.backgroundColor = fav.hex;
    item.title = fav.hex.toUpperCase();
    item.addEventListener('click', e => {
      if (e.target.classList.contains('delete-fav')) return;
      applyColor(fav.hex);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-fav';
    delBtn.textContent = '×';
    delBtn.title = '删除';
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      state.favorites.splice(idx, 1);
      saveFavorites();
      renderFavorites();
      updateFavBtn();
      showToast('已删除收藏');
    });
    item.appendChild(delBtn);
    favList.appendChild(item);
  });
}

function toggleFavorite() {
  const hex = state.currentHex.toLowerCase();
  const idx = state.favorites.findIndex(f => f.hex.toLowerCase() === hex);
  if (idx >= 0) {
    state.favorites.splice(idx, 1);
    showToast('已取消收藏');
  } else {
    state.favorites.push({ hex: state.currentHex.toUpperCase(), timestamp: Date.now() });
    showToast('已加入收藏');
  }
  saveFavorites();
  renderFavorites();
  updateFavBtn();
}

function applyColor(hex) {
  state.currentHex = hex.startsWith('#') ? hex : '#' + hex;
  updateFromHex();
  showToast('已应用颜色: ' + state.currentHex.toUpperCase());
}

// ========== Color Schemes ==========
function generateSchemes() {
  const { h, s, l } = hexToHsl(state.currentHex);

  return {
    complementary: {
      name: '互补色',
      colors: [
        hslToHex(h, s, l),
        hslToHex((h + 36) % 360, s, l),
        hslToHex((h + 72) % 360, s, l),
        hslToHex((h + 180) % 360, s, l),
        hslToHex((h + 180 + 36) % 360, s, l)
      ]
    },
    analogous: {
      name: '类似色',
      colors: [
        hslToHex((h - 30 + 360) % 360, s, l),
        hslToHex((h - 15 + 360) % 360, s, l),
        hslToHex(h, s, l),
        hslToHex((h + 15) % 360, s, l),
        hslToHex((h + 30) % 360, s, l)
      ]
    },
    split: {
      name: '对比色',
      colors: [
        hslToHex(h, s, l),
        hslToHex((h + 150) % 360, s, l),
        hslToHex((h + 165) % 360, s, l),
        hslToHex((h + 195) % 360, s, l),
        hslToHex((h + 210) % 360, s, l)
      ]
    },
    triadic: {
      name: '三角色',
      colors: [
        hslToHex(h, s, l),
        hslToHex((h + 120) % 360, s, l),
        hslToHex((h + 120 + 15) % 360, s, l),
        hslToHex((h + 240) % 360, s, l),
        hslToHex((h + 240 + 15) % 360, s, l)
      ]
    }
  };
}

function updateSchemes() {
  const schemes = generateSchemes();
  const scheme = schemes[state.currentScheme];
  schemeDisplay.innerHTML = '';

  const rowEl = document.createElement('div');
  rowEl.className = 'scheme-row';

  const label = document.createElement('span');
  label.className = 'scheme-row-label';
  label.textContent = scheme.name;
  rowEl.appendChild(label);

  const swatches = document.createElement('div');
  swatches.className = 'scheme-swatches';

  scheme.colors.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'scheme-swatch';
    sw.style.backgroundColor = color;
    sw.title = color.toUpperCase();
    sw.addEventListener('click', () => applyColor(color));
    swatches.appendChild(sw);
  });

  rowEl.appendChild(swatches);
  schemeDisplay.appendChild(rowEl);
}

// ========== Image Color Extraction ==========
function extractColorsFromImage(img) {
  const maxSize = 100;
  let w = img.width, h = img.height;
  const scale = Math.min(maxSize / w, maxSize / h, 1);
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  extractCanvas.width = w;
  extractCanvas.height = h;
  extractCtx.drawImage(img, 0, 0, w, h);

  try {
    const imageData = extractCtx.getImageData(0, 0, w, h).data;
    const pixelCount = w * h;

    const buckets = {};
    for (let i = 0; i < pixelCount * 4; i += 4) {
      const a = imageData[i + 3];
      if (a < 32) continue;
      const r = Math.floor(imageData[i] / 32) * 32;
      const g = Math.floor(imageData[i + 1] / 32) * 32;
      const b = Math.floor(imageData[i + 2] / 32) * 32;
      const key = r + ',' + g + ',' + b;
      buckets[key] = (buckets[key] || 0) + 1;
    }

    const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    const colors = sorted.slice(0, 5).map(([key]) => {
      const [r, g, b] = key.split(',').map(Number);
      return rgbToHex(r, g, b);
    });

    if (colors.length > 0) {
      renderExtractColors(colors);
    } else {
      showToast('未提取到有效颜色');
    }
  } catch (e) {
    console.warn('图片取色失败:', e);
    showToast('图片取色失败，请尝试其他图片');
  }
}

function renderExtractColors(colors) {
  extractColors.innerHTML = '';
  colors.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'extract-color';
    sw.style.backgroundColor = color;
    sw.title = color.toUpperCase();
    sw.addEventListener('click', () => applyColor(color));
    extractColors.appendChild(sw);
  });
}

// ========== Export ==========
function getExportColors() {
  const colors = [];
  state.favorites.forEach((f, i) => {
    colors.push({ name: 'favorite-' + (i + 1), hex: f.hex });
  });
  const schemes = generateSchemes();
  schemes[state.currentScheme].colors.forEach((c, ci) => {
    colors.push({ name: 'scheme-' + state.currentScheme + '-' + ci, hex: c });
  });
  return colors;
}

function exportAsCSS() {
  const colors = getExportColors();
  if (colors.length === 0) { showToast('没有可导出的颜色'); return; }
  let css = ':root {\n';
  colors.forEach(c => {
    css += '  --' + c.name + ': ' + c.hex + ';\n';
  });
  css += '}\n';
  downloadFile(css, 'palette.css', 'text/css');
  showToast('CSS 变量已导出');
}

function exportAsSCSS() {
  const colors = getExportColors();
  if (colors.length === 0) { showToast('没有可导出的颜色'); return; }
  let scss = '';
  colors.forEach(c => {
    scss += '$' + c.name + ': ' + c.hex + ';\n';
  });
  downloadFile(scss, 'palette.scss', 'text/plain');
  showToast('SCSS 变量已导出');
}

function exportAsASE() {
  const colors = getExportColors();
  if (colors.length === 0) { showToast('没有可导出的颜色'); return; }

  const writeString = (str) => {
    const buf = new ArrayBuffer(str.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i);
    return buf;
  };

  const writeUInt16 = (val) => {
    const buf = new ArrayBuffer(2);
    new DataView(buf).setUint16(0, val);
    return buf;
  };

  const writeUInt32 = (val) => {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setUint32(0, val);
    return buf;
  };

  const writeFloat32 = (val) => {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, val);
    return buf;
  };

  const concat = (buffers) => {
    const total = buffers.reduce((s, b) => s + b.byteLength, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    buffers.forEach(b => {
      result.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    });
    return result.buffer;
  };

  const blocks = [writeString('ASEF'), writeUInt32(1), writeUInt32(colors.length)];

  colors.forEach(c => {
    const { r, g, b } = hexToRgb(c.hex);
    const nameBuf = new ArrayBuffer(c.name.length * 2 + 2);
    const nameView = new DataView(nameBuf);
    for (let i = 0; i < c.name.length; i++) {
      nameView.setUint16(i * 2, c.name.charCodeAt(i));
    }
    nameView.setUint16(c.name.length * 2, 0);

    const colorBlock = [
      writeString('RGB '),
      nameBuf,
      writeFloat32(r / 255),
      writeFloat32(g / 255),
      writeFloat32(b / 255),
      writeUInt16(0)
    ];
    const colorSize = colorBlock.reduce((s, b) => s + b.byteLength, 0);

    blocks.push(writeUInt16(1));
    blocks.push(writeUInt32(colorSize));
    blocks.push(...colorBlock);
  });

  const aseBlob = new Blob([concat(blocks)], { type: 'application/octet-stream' });
  downloadFile(aseBlob, 'palette.ase', 'application/octet-stream');
  showToast('ASE 文件已导出');
}

function downloadFile(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== WCAG Contrast ==========
function luminance(r, g, b) {
  const toLin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function calcContrastRatio(hex1, hex2) {
  if (!isValidHex(hex1) || !isValidHex(hex2)) return null;
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const l1 = luminance(c1.r, c1.g, c1.b);
  const l2 = luminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function updateContrast() {
  let fg = contrastFgHex.value.trim();
  let bg = contrastBgHex.value.trim();
  if (fg && !fg.startsWith('#')) fg = '#' + fg;
  if (bg && !bg.startsWith('#')) bg = '#' + bg;
  if (!isValidHex(fg)) fg = contrastFg.value;
  if (!isValidHex(bg)) bg = contrastBg.value;
  if (!isValidHex(fg) || !isValidHex(bg)) return;

  const ratio = calcContrastRatio(fg, bg);
  if (ratio === null) return;

  contrastRatioEl.textContent = ratio.toFixed(2) + ':1';

  const setLevel = (id, pass) => {
    const el = $(id);
    if (!el) return;
    el.textContent = pass ? '通过' : '未通过';
    el.className = 'level-badge ' + (pass ? 'pass' : 'fail');
  };

  setLevel('aaNormal', ratio >= 4.5);
  setLevel('aaLarge', ratio >= 3);
  setLevel('aaaNormal', ratio >= 7);
  setLevel('aaaLarge', ratio >= 4.5);
}

// ========== Toast ==========
let toastTimer;
function showToast(msg) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ========== Input debounce helpers ==========
function debounce(fn, delay = 200) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ========== Event Handlers ==========
function initEvents() {
  let isDraggingHue = false;
  let isDraggingSv = false;

  hueRing.addEventListener('mousedown', e => {
    e.preventDefault();
    isDraggingHue = true;
    state.hue = getHueFromRing(e.clientX, e.clientY);
    updateFromHSL();
  });

  document.addEventListener('mousemove', e => {
    if (isDraggingHue) {
      state.hue = getHueFromRing(e.clientX, e.clientY);
      updateFromHSL();
    } else if (isDraggingSv) {
      const pt = getSvFromPoint(e.clientX, e.clientY);
      state.saturation = pt.saturation;
      state.lightness = pt.lightness;
      updateFromHSL();
    }
  });

  document.addEventListener('mouseup', () => {
    isDraggingHue = false;
    isDraggingSv = false;
  });

  svCanvasWrap.addEventListener('mousedown', e => {
    e.preventDefault();
    isDraggingSv = true;
    const pt = getSvFromPoint(e.clientX, e.clientY);
    state.saturation = pt.saturation;
    state.lightness = pt.lightness;
    updateFromHSL();
  });

  hueRing.addEventListener('touchstart', e => {
    e.preventDefault();
    isDraggingHue = true;
    const t = e.touches[0];
    state.hue = getHueFromRing(t.clientX, t.clientY);
    updateFromHSL();
  }, { passive: false });

  svCanvasWrap.addEventListener('touchstart', e => {
    e.preventDefault();
    isDraggingSv = true;
    const t = e.touches[0];
    const pt = getSvFromPoint(t.clientX, t.clientY);
    state.saturation = pt.saturation;
    state.lightness = pt.lightness;
    updateFromHSL();
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (isDraggingHue || isDraggingSv) {
      e.preventDefault();
      const t = e.touches[0];
      if (isDraggingHue) {
        state.hue = getHueFromRing(t.clientX, t.clientY);
        updateFromHSL();
      } else if (isDraggingSv) {
        const pt = getSvFromPoint(t.clientX, t.clientY);
        state.saturation = pt.saturation;
        state.lightness = pt.lightness;
        updateFromHSL();
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', () => {
    isDraggingHue = false;
    isDraggingSv = false;
  });

  const applyHexDebounced = debounce(() => {
    if (updatingInput) return;
    let val = hexInput.value.trim();
    if (val && !val.startsWith('#')) val = '#' + val;
    if (isValidHex(val)) {
      const pos = hexInput.selectionStart;
      state.currentHex = val;
      updateFromHex();
      try { hexInput.setSelectionRange(pos, pos); } catch(e) {}
    }
  }, 50);

  hexInput.addEventListener('input', applyHexDebounced);

  const applyRgbDebounced = debounce(() => {
    if (updatingInput) return;
    const r = parseInt(rInput.value, 10);
    const g = parseInt(gInput.value, 10);
    const b = parseInt(bInput.value, 10);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) &&
        r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      state.currentHex = rgbToHex(r, g, b);
      updateFromHex();
    }
  }, 50);

  [rInput, gInput, bInput].forEach(input => {
    input.addEventListener('input', applyRgbDebounced);
  });

  const applyHslDebounced = debounce(() => {
    if (updatingInput) return;
    const h = parseInt(hInput.value, 10);
    const s = parseInt(sInput.value, 10);
    const l = parseInt(lInput.value, 10);
    if (Number.isFinite(h) && Number.isFinite(s) && Number.isFinite(l) &&
        h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
      state.hue = h;
      state.saturation = s;
      state.lightness = l;
      updateFromHSL();
    }
  }, 50);

  [hInput, sInput, lInput].forEach(input => {
    input.addEventListener('input', applyHslDebounced);
  });

  favBtn.addEventListener('click', toggleFavorite);
  clearFavsBtn.addEventListener('click', () => {
    if (state.favorites.length === 0) return;
    if (confirm('确定要清空所有收藏吗？')) {
      state.favorites = [];
      saveFavorites();
      renderFavorites();
      updateFavBtn();
      showToast('收藏已清空');
    }
  });

  randomBtn.addEventListener('click', () => {
    state.hue = Math.floor(Math.random() * 360);
    state.saturation = 60 + Math.floor(Math.random() * 40);
    state.lightness = 40 + Math.floor(Math.random() * 30);
    updateFromHSL();
    showToast('已生成随机颜色');
  });

  uploadBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        extractColorsFromImage(img);
        showToast('已提取图片主色调');
      };
      img.onerror = () => showToast('图片加载失败');
      img.src = ev.target.result;
    };
    reader.onerror = () => showToast('文件读取失败');
    reader.readAsDataURL(file);
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentScheme = btn.dataset.scheme;
      updateSchemes();
    });
  });

  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', () => {
      const fmt = btn.dataset.format;
      if (fmt === 'css') exportAsCSS();
      else if (fmt === 'scss') exportAsSCSS();
      else if (fmt === 'ase') exportAsASE();
    });
  });

  const updateContrastDebounced = debounce(updateContrast, 200);

  contrastFg.addEventListener('input', () => {
    contrastFgHex.value = contrastFg.value;
    updateContrast();
  });
  contrastBg.addEventListener('input', () => {
    contrastBgHex.value = contrastBg.value;
    updateContrast();
  });
  contrastFgHex.addEventListener('input', () => {
    let val = contrastFgHex.value.trim();
    if (val && !val.startsWith('#')) val = '#' + val;
    if (isValidHex(val)) {
      contrastFg.value = val;
    }
    updateContrastDebounced();
  });
  contrastBgHex.addEventListener('input', () => {
    let val = contrastBgHex.value.trim();
    if (val && !val.startsWith('#')) val = '#' + val;
    if (isValidHex(val)) {
      contrastBg.value = val;
    }
    updateContrastDebounced();
  });

  window.addEventListener('resize', () => {
    updateSvCursor();
  });
}

// ========== Init ==========
function init() {
  drawHueRing();
  loadFavorites();
  initEvents();
  updateFromHSL();
  contrastFgHex.value = contrastFg.value;
  contrastBgHex.value = contrastBg.value;
  updateContrast();
}

init();
