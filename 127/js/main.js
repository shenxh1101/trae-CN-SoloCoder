import { 
  subscribe, 
  getState, 
  initGame, 
  setDifficulty, 
  uploadImage, 
  spinWheel, 
  resetGame, 
  toggleHint, 
  toggleSound, 
  setBackgroundColor, 
  toggleThumbnail, 
  toggleAutoPlay,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  cleanup,
  setManualRotation
} from './game.js';
import { 
  renderWheel, 
  renderInfo, 
  renderBestRecord, 
  renderDifficultyButtons, 
  renderUtilityButtons, 
  renderThumbnail, 
  renderSettings,
  startConfetti,
  stopConfetti 
} from './ui.js';
import { 
  playSpinSound, 
  playClickSound, 
  playAlignSound, 
  playCompleteSound, 
  resumeAudioContext 
} from './sound.js';
import { loadSettings, saveSettings } from './storage.js';

const elements = {};
let prevState = null;

const initElements = () => {
  elements.wheel = document.getElementById('wheel');
  elements.wheelInner = document.getElementById('wheelInner');
  elements.pointer = document.getElementById('pointer');
  elements.spinCount = document.getElementById('spinCount');
  elements.elapsedTime = document.getElementById('elapsedTime');
  elements.alignedCount = document.getElementById('alignedCount');
  elements.totalCount = document.getElementById('totalCount');
  elements.bestRecord = document.getElementById('bestRecord');
  elements.bestSpins = document.getElementById('bestSpins');
  elements.bestTime = document.getElementById('bestTime');
  elements.completionBanner = document.getElementById('completionBanner');
  elements.difficultyBtns = document.querySelectorAll('.difficulty-btn');
  elements.spinBtn = document.getElementById('spinBtn');
  elements.spinIcon = document.getElementById('spinIcon');
  elements.spinText = document.getElementById('spinText');
  elements.resetBtn = document.getElementById('resetBtn');
  elements.hintBtn = document.getElementById('hintBtn');
  elements.autoPlayBtn = document.getElementById('autoPlayBtn');
  elements.settingsBtn = document.getElementById('settingsBtn');
  elements.hintBubble = document.getElementById('hintBubble');
  elements.thumbnailToggle = document.getElementById('thumbnailToggle');
  elements.thumbnailPreview = document.getElementById('thumbnailPreview');
  elements.thumbnailImage = document.getElementById('thumbnailImage');
  elements.thumbnailClose = document.getElementById('thumbnailClose');
  elements.settingsModal = document.getElementById('settingsModal');
  elements.settingsClose = document.getElementById('settingsClose');
  elements.settingsSave = document.getElementById('settingsSave');
  elements.soundToggle = document.getElementById('soundToggle');
  elements.thumbnailToggleSetting = document.getElementById('thumbnailToggleSetting');
  elements.colorOptions = document.querySelectorAll('.color-option');
  elements.imageModal = document.getElementById('imageModal');
  elements.modalImage = document.getElementById('modalImage');
  elements.imageModalClose = document.getElementById('imageModalClose');
  elements.confettiCanvas = document.getElementById('confettiCanvas');
  elements.fileInput = document.getElementById('fileInput');
};

const render = (state) => {
  renderWheel(state, elements);
  renderInfo(state, elements);
  renderBestRecord(state, elements);
  renderDifficultyButtons(state, elements);
  renderUtilityButtons(state, elements);
  renderThumbnail(state, elements);
  
  if (prevState && !prevState.isCompleted && state.isCompleted) {
    if (state.soundEnabled) {
      playCompleteSound();
    }
    startConfetti(elements.confettiCanvas);
  }
  
  if (prevState && prevState.alignedCount < state.alignedCount && !state.isCompleted) {
    if (state.soundEnabled) {
      playAlignSound();
    }
  }
  
  prevState = state;
};

const bindEvents = () => {
  elements.difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const state = getState();
      if (state.soundEnabled) playClickSound();
      resumeAudioContext();
      const difficulty = parseInt(btn.dataset.difficulty);
      setDifficulty(difficulty);
      stopConfetti(elements.confettiCanvas);
    });
  });

  elements.spinBtn.addEventListener('click', () => {
    const state = getState();
    if (state.soundEnabled) playSpinSound();
    resumeAudioContext();
    spinWheel();
  });

  elements.resetBtn.addEventListener('click', () => {
    const state = getState();
    if (state.soundEnabled) playClickSound();
    resumeAudioContext();
    resetGame();
    stopConfetti(elements.confettiCanvas);
  });

  elements.hintBtn.addEventListener('click', () => {
    const state = getState();
    if (state.soundEnabled) playClickSound();
    resumeAudioContext();
    toggleHint();
  });

  elements.autoPlayBtn.addEventListener('click', () => {
    const state = getState();
    if (state.soundEnabled) playClickSound();
    resumeAudioContext();
    toggleAutoPlay();
  });

  elements.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const state = getState();
      if (state.soundEnabled) playClickSound();
      resumeAudioContext();
      await uploadImage(file);
    }
    e.target.value = '';
    stopConfetti(elements.confettiCanvas);
  });

  elements.settingsBtn.addEventListener('click', () => {
    const state = getState();
    if (state.soundEnabled) playClickSound();
    renderSettings(state, elements);
    elements.settingsModal.classList.remove('hidden');
  });

  elements.settingsClose.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });

  elements.settingsSave.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });

  elements.soundToggle.addEventListener('change', () => {
    toggleSound();
    const state = getState();
    saveSettings({
      soundEnabled: state.soundEnabled,
      backgroundColor: state.backgroundColor,
      showThumbnail: state.showThumbnail
    });
  });

  elements.thumbnailToggleSetting.addEventListener('change', () => {
    toggleThumbnail();
    const state = getState();
    saveSettings({
      soundEnabled: state.soundEnabled,
      backgroundColor: state.backgroundColor,
      showThumbnail: state.showThumbnail
    });
  });

  elements.colorOptions.forEach(option => {
    option.addEventListener('click', () => {
      const color = option.dataset.color;
      setBackgroundColor(color);
      const state = getState();
      saveSettings({
        soundEnabled: state.soundEnabled,
        backgroundColor: state.backgroundColor,
        showThumbnail: state.showThumbnail
      });
      renderSettings(state, elements);
    });
  });

  elements.thumbnailToggle.addEventListener('click', () => {
    const state = getState();
    if (state.soundEnabled) playClickSound();
    toggleThumbnail();
    saveSettings({
      soundEnabled: state.soundEnabled,
      backgroundColor: state.backgroundColor,
      showThumbnail: state.showThumbnail
    });
  });

  elements.thumbnailClose.addEventListener('click', (e) => {
    e.stopPropagation();
    const state = getState();
    if (state.soundEnabled) playClickSound();
    toggleThumbnail();
    saveSettings({
      soundEnabled: state.soundEnabled,
      backgroundColor: state.backgroundColor,
      showThumbnail: state.showThumbnail
    });
  });

  elements.thumbnailPreview.addEventListener('click', () => {
    elements.imageModal.classList.remove('hidden');
  });

  elements.imageModalClose.addEventListener('click', () => {
    elements.imageModal.classList.add('hidden');
  });

  elements.imageModal.addEventListener('click', (e) => {
    if (e.target === elements.imageModal) {
      elements.imageModal.classList.add('hidden');
    }
  });

  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.classList.add('hidden');
    }
  });

  elements.wheel.addEventListener('mousedown', (e) => {
    resumeAudioContext();
    handleDragStart(e, elements.wheel);
  });

  elements.wheel.addEventListener('mousemove', (e) => {
    handleDragMove(e, elements.wheel);
  });

  elements.wheel.addEventListener('mouseup', handleDragEnd);
  elements.wheel.addEventListener('mouseleave', handleDragEnd);

  elements.wheel.addEventListener('touchstart', (e) => {
    resumeAudioContext();
    handleDragStart(e, elements.wheel);
  }, { passive: false });

  elements.wheel.addEventListener('touchmove', (e) => {
    handleDragMove(e, elements.wheel);
  }, { passive: false });

  elements.wheel.addEventListener('touchend', handleDragEnd);

  window.addEventListener('resize', () => {
      elements.confettiCanvas.width = window.innerWidth;
      elements.confettiCanvas.height = window.innerHeight;
    });
};

const loadSavedSettings = () => {
  const settings = loadSettings();
  if (settings) {
    if (settings.soundEnabled !== undefined && !settings.soundEnabled) {
      toggleSound();
    }
    if (settings.backgroundColor) {
      setBackgroundColor(settings.backgroundColor);
    }
    if (settings.showThumbnail !== undefined && !settings.showThumbnail) {
      toggleThumbnail();
    }
  }
};

const init = () => {
  initElements();
  bindEvents();
  subscribe(render);
  loadSavedSettings();
  initGame();
  render(getState());
};

window.addEventListener('beforeunload', cleanup);

init();
