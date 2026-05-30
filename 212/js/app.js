class ArtStyleApp {
  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.currentImage = null;
    this.currentFilename = '';
    this.batchImages = [];
    this.currentStyle = 'vanGogh';
    this.currentIntensity = 70;
    this.useCompareMode = false;
    this.comparePosition = 50;
    this.isProcessing = false;
    this.processingStartTime = 0;
    
    this.initElements();
    this.loadPreferences();
    this.initEventListeners();
    this.renderStyleCards();
  }

  initElements() {
    this.uploadArea = document.getElementById('uploadArea');
    this.uploadInput = document.getElementById('uploadInput');
    this.styleGrid = document.getElementById('styleGrid');
    this.intensitySlider = document.getElementById('intensitySlider');
    this.intensityValue = document.getElementById('intensityValue');
    this.compareToggle = document.getElementById('compareToggle');
    this.canvasOriginal = document.getElementById('canvasOriginal');
    this.canvasStyled = document.getElementById('canvasStyled');
    this.canvasContainer = document.getElementById('canvasContainer');
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.compareSlider = document.getElementById('compareSlider');
    this.chunkIndicator = document.getElementById('chunkIndicator');
    this.placeholder = document.getElementById('placeholder');
    this.processingOverlay = document.getElementById('processingOverlay');
    this.progressFill = document.getElementById('progressFill');
    this.progressPercent = document.getElementById('progressPercent');
    this.processingTime = document.getElementById('processingTime');
    this.batchList = document.getElementById('batchList');
    this.batchContainer = document.getElementById('batchContainer');
    this.btnDownload = document.getElementById('btnDownload');
    this.btnRandom = document.getElementById('btnRandom');
    this.btnReset = document.getElementById('btnReset');
    this.btnBatchDownload = document.getElementById('btnBatchDownload');
  }

  loadPreferences() {
    const prefs = storageManager.loadPreferences();
    this.currentStyle = prefs.lastStyle || 'vanGogh';
    this.currentIntensity = prefs.lastIntensity || 70;
    this.useCompareMode = prefs.useCompareMode || false;
    
    this.intensitySlider.value = this.currentIntensity;
    this.intensityValue.textContent = `${this.currentIntensity}%`;
    
    if (this.useCompareMode) {
      this.compareToggle.classList.add('active');
    }
    
    this.updateCompareMode();
  }

  savePreferences() {
    storageManager.savePreferences({
      lastStyle: this.currentStyle,
      lastIntensity: this.currentIntensity,
      useCompareMode: this.useCompareMode
    });
  }

  initEventListeners() {
    this.uploadArea.addEventListener('click', () => this.uploadInput.click());
    
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });
    
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });
    
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });
    
    this.uploadInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    this.intensitySlider.addEventListener('input', (e) => {
      this.currentIntensity = parseInt(e.target.value);
      this.intensityValue.textContent = `${this.currentIntensity}%`;
      this.debouncedApplyStyle();
    });

    this.intensitySlider.addEventListener('change', () => {
      this.savePreferences();
    });

    this.compareToggle.addEventListener('click', () => {
      this.useCompareMode = !this.useCompareMode;
      this.compareToggle.classList.toggle('active');
      this.updateCompareMode();
      this.savePreferences();
    });

    this.compareSlider.addEventListener('mousedown', (e) => {
      this.startCompareDrag(e);
    });

    this.compareSlider.addEventListener('touchstart', (e) => {
      this.startCompareDrag(e.touches[0]);
    });

    this.btnDownload.addEventListener('click', () => this.downloadImage());
    this.btnRandom.addEventListener('click', () => this.randomBlend());
    this.btnReset.addEventListener('click', () => this.resetApp());
    this.btnBatchDownload.addEventListener('click', () => this.batchDownload());
  }

  debouncedApplyStyle = debounce(() => {
    if (this.currentImage && !this.isProcessing) {
      this.applyStyleWithProgress();
    }
  }, 300);

  renderStyleCards() {
    this.styleGrid.innerHTML = '';
    
    Object.keys(artStyles).forEach((styleId) => {
      const style = artStyles[styleId];
      const isFavorite = storageManager.isFavorite(styleId);
      const isActive = this.currentStyle === styleId;
      
      const card = document.createElement('div');
      card.className = `style-card ${isActive ? 'active' : ''}`;
      card.dataset.style = styleId;
      
      const previewUrl = this.generateStylePreview(styleId);
      
      card.innerHTML = `
        <div class="style-preview" style="background: ${this.getStyleGradient(styleId)}; display: flex; align-items: center; justify-content: center; font-size: 2rem;">
          ${style.icon}
        </div>
        <div class="style-name">${style.name}</div>
        <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-favorite="${styleId}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      `;
      
      card.addEventListener('click', (e) => {
        if (e.target.closest('.favorite-btn')) {
          e.stopPropagation();
          return;
        }
        this.selectStyle(styleId);
      });
      
      card.querySelector('.favorite-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(styleId);
      });
      
      this.styleGrid.appendChild(card);
    });
  }

  getStyleGradient(styleId) {
    const gradients = {
      vanGogh: 'linear-gradient(135deg, #ffc864, #c89632, #6496c8)',
      monet: 'linear-gradient(135deg, #b4c8dc, #96b496, #c8b4a0)',
      picasso: 'linear-gradient(135deg, #ff6464, #6496ff, #ffc832)',
      ukiyo: 'linear-gradient(135deg, #c83232, #325096, #f0dcb4)',
      kandinsky: 'linear-gradient(135deg, #323296, #ffc800, #c83232)',
      daVinci: 'linear-gradient(135deg, #b4a078, #786450, #c8b496)',
      warhol: 'linear-gradient(135deg, #ff0000, #00ffff, #ffff00)',
      hokusai: 'linear-gradient(135deg, #1e3c78, #c8dcf0, #3c6496)'
    };
    return gradients[styleId] || 'linear-gradient(135deg, #667eea, #764ba2)';
  }

  generateStylePreview(styleId) {
    return '';
  }

  selectStyle(styleId) {
    if (this.currentStyle === styleId) return;
    
    this.currentStyle = styleId;
    
    document.querySelectorAll('.style-card').forEach(card => {
      card.classList.toggle('active', card.dataset.style === styleId);
    });
    
    this.savePreferences();
    
    if (this.currentImage && !this.isProcessing) {
      this.applyStyleWithProgress();
    }
  }

  toggleFavorite(styleId) {
    const isFavorite = storageManager.saveFavoriteStyle(styleId);
    
    document.querySelectorAll(`.favorite-btn[data-favorite="${styleId}"]`).forEach(btn => {
      btn.classList.toggle('active', isFavorite);
    });
    
    showToast(isFavorite ? '已添加到收藏' : '已取消收藏');
  }

  async handleFiles(files) {
    if (files.length === 0) return;
    
    if (files.length === 1) {
      await this.loadSingleImage(files[0]);
    } else {
      await this.loadBatchImages(files);
    }
  }

  async loadSingleImage(file) {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error');
      return;
    }
    
    try {
      this.showProcessing();
      const img = await this.imageProcessor.loadImage(file);
      this.currentImage = img;
      this.currentFilename = getFilenameWithoutExtension(file.name);
      
      this.hidePlaceholder();
      this.renderOriginalImage();
      await this.applyStyleWithProgress();
      
      showToast('图片加载成功');
    } catch (e) {
      console.error('Failed to load image:', e);
      showToast('图片加载失败', 'error');
      this.hideProcessing();
    }
  }

  async loadBatchImages(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      showToast('请上传图片文件', 'error');
      return;
    }
    
    this.batchImages = [];
    this.batchList.innerHTML = '';
    this.batchContainer.style.display = 'block';
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      try {
        const img = await this.imageProcessor.loadImage(file);
        this.batchImages.push({
          image: img,
          filename: getFilenameWithoutExtension(file.name),
          status: 'pending'
        });
        
        this.addBatchItem(img, file.name, i);
      } catch (e) {
        console.error('Failed to load image:', file.name, e);
      }
    }
    
    if (this.batchImages.length > 0) {
      await this.loadSingleImage(imageFiles[0]);
    }
  }

  addBatchItem(img, filename, index) {
    const item = document.createElement('div');
    item.className = 'batch-item';
    item.dataset.index = index;
    
    const thumbCanvas = document.createElement('canvas');
    const thumbCtx = thumbCanvas.getContext('2d');
    thumbCanvas.width = 48;
    thumbCanvas.height = 48;
    
    const scale = Math.max(48 / img.width, 48 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    thumbCtx.drawImage(img, (48 - w) / 2, (48 - h) / 2, w, h);
    
    item.innerHTML = `
      <img class="thumbnail" src="${thumbCanvas.toDataURL()}" alt="thumbnail">
      <div class="info">
        <div class="name">${filename}</div>
        <div class="status">等待处理</div>
      </div>
      <button class="remove-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    
    item.querySelector('.remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeBatchItem(index);
    });
    
    this.batchList.appendChild(item);
  }

  removeBatchItem(index) {
    this.batchImages.splice(index, 1);
    const item = this.batchList.querySelector(`[data-index="${index}"]`);
    if (item) {
      this.batchList.removeChild(item);
    }
    
    if (this.batchImages.length === 0) {
      this.batchContainer.style.display = 'none';
    }
  }

  renderOriginalImage() {
    const canvas = this.canvasOriginal;
    const ctx = canvas.getContext('2d');
    
    const maxWidth = 800;
    const maxHeight = 600;
    let width = this.currentImage.width;
    let height = this.currentImage.height;
    
    if (width > maxWidth) {
      height = (maxWidth / width) * height;
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = (maxHeight / height) * width;
      height = maxHeight;
    }
    
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
    this.canvasStyled.width = Math.floor(width);
    this.canvasStyled.height = Math.floor(height);
    
    ctx.drawImage(this.currentImage, 0, 0, width, height);
  }

  async applyStyleToCanvas() {
    if (!this.currentImage || this.isProcessing) return;
    
    this.isProcessing = true;
    this.processingStartTime = Date.now();
    
    try {
      const styledCanvas = this.canvasStyled;
      const styledCtx = styledCanvas.getContext('2d');
      
      let width = this.canvasOriginal.width;
      let height = this.canvasOriginal.height;
      
      if (this.currentIntensity === 0) {
        styledCtx.drawImage(this.currentImage, 0, 0, width, height);
        this.isProcessing = false;
        return;
      }
      
      const imageData = styledCtx.createImageData(width, height);
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(this.currentImage, 0, 0, width, height);
      const originalData = tempCtx.getImageData(0, 0, width, height);
      
      const resultData = this.imageProcessor.applyStyle(originalData, this.currentStyle, this.currentIntensity);
      
      styledCtx.putImageData(resultData, 0, 0);
      
      const elapsed = Date.now() - this.processingStartTime;
      this.updateProcessingTime(elapsed);
      
    } catch (e) {
      console.error('Style application failed:', e);
      showToast('风格化处理失败', 'error');
    }
    
    this.isProcessing = false;
  }

  async applyStyleWithProgress() {
    if (!this.currentImage || this.isProcessing) return;
    
    this.isProcessing = true;
    this.processingStartTime = Date.now();
    this.showProcessing();
    this.showChunkIndicator();
    
    try {
      const resultData = await this.imageProcessor.processInChunks(
        this.currentImage,
        this.currentStyle,
        this.currentIntensity,
        this.canvasOriginal.width,
        this.canvasOriginal.height,
        (progress, chunk) => {
          this.updateProgress(progress);
          this.updateChunkPosition(chunk);
        }
      );
      
      const styledCtx = this.canvasStyled.getContext('2d');
      styledCtx.putImageData(resultData, 0, 0);
      
      const elapsed = Date.now() - this.processingStartTime;
      this.updateProcessingTime(elapsed);
      
    } catch (e) {
      console.error('Style application failed:', e);
      showToast('风格化处理失败', 'error');
    }
    
    this.hideChunkIndicator();
    this.hideProcessing();
    this.isProcessing = false;
  }

  showChunkIndicator() {
    this.chunkIndicator.style.display = 'block';
  }

  hideChunkIndicator() {
    this.chunkIndicator.style.display = 'none';
  }

  updateChunkPosition(chunk) {
    if (!this.canvasOriginal.width || !this.canvasOriginal.height) return;
    
    const wrapperRect = this.canvasWrapper.getBoundingClientRect();
    const canvasRect = this.canvasStyled.getBoundingClientRect();
    
    const scaleX = canvasRect.width / this.canvasOriginal.width;
    const scaleY = canvasRect.height / this.canvasOriginal.height;
    
    const relativeX = canvasRect.left - wrapperRect.left;
    const relativeY = canvasRect.top - wrapperRect.top;
    
    this.chunkIndicator.style.left = `${relativeX + chunk.x * scaleX}px`;
    this.chunkIndicator.style.top = `${relativeY + chunk.y * scaleY}px`;
    this.chunkIndicator.style.width = `${chunk.width * scaleX}px`;
    this.chunkIndicator.style.height = `${chunk.height * scaleY}px`;
  }

  updateProgress(ratio) {
    const percent = Math.round(ratio * 100);
    this.progressFill.style.width = `${percent}%`;
    this.progressPercent.textContent = `${percent}%`;
  }

  updateProcessingTime(ms) {
    this.processingTime.textContent = formatTime(ms);
  }

  updateCompareMode() {
    if (this.useCompareMode) {
      this.canvasWrapper.classList.add('compare-container');
      this.canvasOriginal.style.display = 'flex';
      this.canvasOriginal.style.position = 'absolute';
      this.canvasStyled.style.position = 'absolute';
      this.compareSlider.style.display = 'block';
      this.updateCompareClip();
    } else {
      this.canvasWrapper.classList.remove('compare-container');
      this.canvasOriginal.style.display = 'none';
      this.canvasStyled.style.position = 'relative';
      this.compareSlider.style.display = 'none';
    }
  }

  updateCompareClip() {
    this.canvasStyled.style.clipPath = `inset(0 ${100 - this.comparePosition}% 0 0)`;
    this.compareSlider.style.left = `${this.comparePosition}%`;
  }

  startCompareDrag(e) {
    if (!this.useCompareMode) return;
    
    const startX = e.clientX;
    const startPosition = this.comparePosition;
    const containerRect = this.canvasContainer.getBoundingClientRect();
    
    const onMove = (moveE) => {
      const clientX = moveE.clientX || moveE.touches[0].clientX;
      const deltaX = clientX - startX;
      const deltaPercent = (deltaX / containerRect.width) * 100;
      this.comparePosition = clamp(startPosition + deltaPercent, 0, 100);
      this.updateCompareClip();
    };
    
    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  }

  async randomBlend() {
    const styleKeys = Object.keys(artStyles);
    const style1 = styleKeys[Math.floor(Math.random() * styleKeys.length)];
    let style2 = styleKeys[Math.floor(Math.random() * styleKeys.length)];
    while (style2 === style1) {
      style2 = styleKeys[Math.floor(Math.random() * styleKeys.length)];
    }
    
    const ratio = 0.3 + Math.random() * 0.4;
    
    showToast(`随机混合: ${artStyles[style1].name} + ${artStyles[style2].name}`);
    
    if (this.currentImage && !this.isProcessing) {
      await this.applyBlendedStyle(style1, style2, ratio);
    }
  }

  async applyBlendedStyle(style1, style2, ratio) {
    this.isProcessing = true;
    this.processingStartTime = Date.now();
    
    try {
      const blendedStyle = this.imageProcessor.blendStyles(style1, style2, ratio);
      if (!blendedStyle) return;
      
      const styledCanvas = this.canvasStyled;
      const styledCtx = styledCanvas.getContext('2d');
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = styledCanvas.width;
      tempCanvas.height = styledCanvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(this.currentImage, 0, 0, styledCanvas.width, styledCanvas.height);
      const imageData = tempCtx.getImageData(0, 0, styledCanvas.width, styledCanvas.height);
      
      const intensityRatio = this.currentIntensity / 100;
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        r = this.imageProcessor.applyBrightness(r, blendedStyle.filters.brightness, intensityRatio);
        g = this.imageProcessor.applyBrightness(g, blendedStyle.filters.brightness, intensityRatio);
        b = this.imageProcessor.applyBrightness(b, blendedStyle.filters.brightness, intensityRatio);
        
        r = this.imageProcessor.applyContrast(r, blendedStyle.filters.contrast, intensityRatio);
        g = this.imageProcessor.applyContrast(g, blendedStyle.filters.contrast, intensityRatio);
        b = this.imageProcessor.applyContrast(b, blendedStyle.filters.contrast, intensityRatio);
        
        const hsl = this.imageProcessor.rgbToHsl(r, g, b);
        hsl[0] = (hsl[0] + blendedStyle.filters.hueRotate * intensityRatio + 360) % 360;
        hsl[1] = Math.min(1, hsl[1] * (1 + (blendedStyle.filters.saturation - 1) * intensityRatio));
        const rgb = this.imageProcessor.hslToRgb(hsl[0], hsl[1], hsl[2]);
        r = rgb[0];
        g = rgb[1];
        b = rgb[2];
        
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
      
      styledCtx.putImageData(imageData, 0, 0);
      
      const elapsed = Date.now() - this.processingStartTime;
      this.updateProcessingTime(elapsed);
      
    } catch (e) {
      console.error('Blend application failed:', e);
    }
    
    this.isProcessing = false;
  }

  async downloadImage() {
    if (!this.currentImage) {
      showToast('请先上传图片', 'error');
      return;
    }
    
    const styleName = artStyles[this.currentStyle]?.name || 'styled';
    const filename = `${this.currentFilename}_${styleName}`;
    
    await downloadManager.downloadPNG(this.canvasStyled, filename);
    showToast('图片已下载');
  }

  async batchDownload() {
    if (this.batchImages.length === 0) {
      showToast('没有批量图片', 'error');
      return;
    }
    
    this.showProcessing();
    this.updateProgress(0);
    
    const canvases = [];
    const filenames = [];
    const styleName = artStyles[this.currentStyle]?.name || 'styled';
    
    for (let i = 0; i < this.batchImages.length; i++) {
      const item = this.batchImages[i];
      const batchItem = this.batchList.querySelector(`[data-index="${i}"]`);
      if (batchItem) {
        batchItem.querySelector('.status').textContent = '处理中...';
      }
      
      const canvas = document.createElement('canvas');
      const maxWidth = 1200;
      const maxHeight = 900;
      let width = item.image.width;
      let height = item.image.height;
      
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }
      
      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(item.image, 0, 0, width, height);
      
      const imageData = ctx.getImageData(0, 0, width, height);
      const resultData = this.imageProcessor.applyStyle(imageData, this.currentStyle, this.currentIntensity);
      ctx.putImageData(resultData, 0, 0);
      
      canvases.push(canvas);
      filenames.push(`${item.filename}_${styleName}`);
      
      this.updateProgress((i + 1) / this.batchImages.length);
      
      if (batchItem) {
        batchItem.querySelector('.status').textContent = '已完成';
        batchItem.querySelector('.status').classList.add('completed');
      }
      
      await new Promise(r => setTimeout(r, 50));
    }
    
    await downloadManager.initZip();
    if (!downloadManager.zip) {
      this.hideProcessing();
      showToast('JSZip 未加载，无法批量下载', 'error');
      return;
    }
    
    await downloadManager.batchDownload(canvases, filenames, 'art_style_transfer', (progress) => {
      this.updateProgress(0.5 + progress * 0.5);
    });
    
    this.hideProcessing();
    showToast('批量下载完成');
  }

  showProcessing() {
    this.processingOverlay.classList.add('active');
  }

  hideProcessing() {
    this.processingOverlay.classList.remove('active');
  }

  hidePlaceholder() {
    this.placeholder.style.display = 'none';
  }

  showPlaceholder() {
    this.placeholder.style.display = 'flex';
  }

  resetApp() {
    this.currentImage = null;
    this.currentFilename = '';
    this.batchImages = [];
    this.isProcessing = false;
    
    this.canvasOriginal.width = 1;
    this.canvasOriginal.height = 1;
    this.canvasStyled.width = 1;
    this.canvasStyled.height = 1;
    
    this.batchList.innerHTML = '';
    this.batchContainer.style.display = 'none';
    
    this.showPlaceholder();
    this.updateProgress(0);
    this.processingTime.textContent = '0ms';
    
    showToast('已重置');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof JSZip !== 'undefined') {
    console.log('JSZip 已成功加载');
    downloadManager.initZip();
  } else {
    console.warn('JSZip 未加载，批量下载功能可能不可用');
  }
  window.artStyleApp = new ArtStyleApp();
});
