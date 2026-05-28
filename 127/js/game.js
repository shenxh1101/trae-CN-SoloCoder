import { 
  normalizeAngle, 
  generateRandomSpin, 
  getSectorAtPointer, 
  checkAlignment,
  getAngleFromPoint,
  getCenterFromElement
} from './utils.js';
import { createSectorsFromImage, generateDefaultImage, readFileAsDataURL } from './imageProcessor.js';
import { saveBestRecord } from './storage.js';

const createGameState = () => ({
  difficulty: 8,
  sectors: [],
  currentRotation: 0,
  targetRotation: 0,
  isSpinning: false,
  spinCount: 0,
  startTime: null,
  elapsedTime: 0,
  alignedCount: 0,
  isCompleted: false,
  showHint: false,
  soundEnabled: true,
  backgroundColor: '#1a1a2e',
  showThumbnail: true,
  autoPlayMode: false,
  fullImageData: null,
  pointerAtSector: 0,
  
  isDragging: false,
  startAngle: null,
  lastAngle: 0,
  dragRotation: 0,
  
  autoPlayTimer: null,
  gameTimer: null,
  prevAlignedCount: 0,
});

let gameState = createGameState();
let listeners = [];

export const subscribe = (callback) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
};

const notifyListeners = () => {
  listeners.forEach(callback => callback(gameState));
};

export const getState = () => ({ ...gameState });

export const setState = (updates) => {
  gameState = { ...gameState, ...updates };
  notifyListeners();
};

export const initGame = () => {
  const defaultImage = generateDefaultImage();
  loadImageFromData(defaultImage);
  notifyListeners();
};

export const loadImageFromData = async (imageData) => {
  const result = await createSectorsFromImage(imageData, gameState.difficulty);
  const initialRotation = Math.random() * 360;
  
  gameState.sectors = result.sectors;
  gameState.fullImageData = result.fullImageData;
  gameState.currentRotation = initialRotation;
  gameState.targetRotation = initialRotation;
  gameState.spinCount = 0;
  gameState.startTime = null;
  gameState.elapsedTime = 0;
  gameState.alignedCount = 0;
  gameState.isCompleted = false;
  gameState.pointerAtSector = getSectorAtPointer(initialRotation, gameState.difficulty);
  gameState.prevAlignedCount = 0;
  
  notifyListeners();
};

export const setDifficulty = (difficulty) => {
  gameState.difficulty = difficulty;
  gameState.sectors = [];
  gameState.currentRotation = 0;
  gameState.targetRotation = 0;
  gameState.isSpinning = false;
  gameState.spinCount = 0;
  gameState.startTime = null;
  gameState.elapsedTime = 0;
  gameState.alignedCount = 0;
  gameState.isCompleted = false;
  gameState.showHint = false;
  gameState.autoPlayMode = false;
  gameState.fullImageData = null;
  gameState.pointerAtSector = 0;
  
  stopAutoPlay();
  stopGameTimer();
  
  notifyListeners();
  
  if (gameState.fullImageData) {
    loadImageFromData(gameState.fullImageData);
  } else {
    initGame();
  }
};

export const uploadImage = async (file) => {
  const imageData = await readFileAsDataURL(file);
  await loadImageFromData(imageData);
};

export const spinWheel = () => {
  if (gameState.isSpinning || gameState.isCompleted || gameState.sectors.length === 0) return;

  const spinAmount = generateRandomSpin();
  const newTarget = gameState.currentRotation + spinAmount;
  
  if (!gameState.startTime) {
    gameState.startTime = Date.now();
    startGameTimer();
  }
  
  gameState.isSpinning = true;
  gameState.targetRotation = newTarget;
  gameState.spinCount += 1;
  
  notifyListeners();

  setTimeout(() => {
    const finalRotation = gameState.targetRotation;
    
    const updatedSectors = gameState.sectors.map((sector) => ({
      ...sector,
      isAligned: checkAlignment(sector.originalIndex, finalRotation, gameState.difficulty),
    }));
    
    const alignedCount = updatedSectors.filter((s) => s.isAligned).length;
    const isCompleted = alignedCount === gameState.difficulty;
    const pointerAtSector = getSectorAtPointer(finalRotation, gameState.difficulty);
    
    gameState.currentRotation = finalRotation;
    gameState.isSpinning = false;
    gameState.sectors = updatedSectors;
    gameState.alignedCount = alignedCount;
    gameState.isCompleted = isCompleted;
    gameState.pointerAtSector = pointerAtSector;

    if (isCompleted) {
      stopGameTimer();
      const elapsedTime = (Date.now() - gameState.startTime) / 1000;
      gameState.elapsedTime = elapsedTime;
      
      saveBestRecord({
        difficulty: gameState.difficulty,
        minSpins: gameState.spinCount,
        bestTime: elapsedTime,
        date: new Date().toISOString(),
      });
      
      stopAutoPlay();
    }
    
    notifyListeners();
  }, 4000);
};

export const resetGame = () => {
  stopAutoPlay();
  
  const initialRotation = Math.random() * 360;
  
  gameState.currentRotation = initialRotation;
  gameState.targetRotation = initialRotation;
  gameState.isSpinning = false;
  gameState.spinCount = 0;
  gameState.startTime = null;
  gameState.elapsedTime = 0;
  gameState.alignedCount = 0;
  gameState.isCompleted = false;
  gameState.showHint = false;
  gameState.autoPlayMode = false;
  gameState.pointerAtSector = getSectorAtPointer(initialRotation, gameState.difficulty);
  gameState.prevAlignedCount = 0;
  
  gameState.sectors = gameState.sectors.map(sector => ({
    ...sector,
    isAligned: false,
  }));
  
  stopGameTimer();
  notifyListeners();
};

export const toggleHint = () => {
  gameState.showHint = !gameState.showHint;
  notifyListeners();
};

export const toggleSound = () => {
  gameState.soundEnabled = !gameState.soundEnabled;
  notifyListeners();
};

export const setBackgroundColor = (color) => {
  gameState.backgroundColor = color;
  document.body.style.backgroundColor = color;
  document.documentElement.style.setProperty('--bg-color', color);
  notifyListeners();
};

export const toggleThumbnail = () => {
  gameState.showThumbnail = !gameState.showThumbnail;
  notifyListeners();
};

export const toggleAutoPlay = () => {
  gameState.autoPlayMode = !gameState.autoPlayMode;
  
  if (gameState.autoPlayMode) {
    startAutoPlay();
  } else {
    stopAutoPlay();
  }
  
  notifyListeners();
};

const startAutoPlay = () => {
  stopAutoPlay();
  
  const autoPlayStep = () => {
    if (!gameState.autoPlayMode || gameState.isCompleted || gameState.isSpinning) return;
    if (gameState.sectors.length === 0) return;

    const sectorAngle = 360 / gameState.difficulty;
    const currentAngle = normalizeAngle(gameState.currentRotation);
    const targetAngle = 0;
    
    let delta = targetAngle - currentAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    if (Math.abs(delta) < sectorAngle / 2) {
      if (!gameState.startTime) {
        spinWheel();
      } else {
        setManualRotation(normalizeAngle(targetAngle));
      }
    } else {
      const step = Math.sign(delta) * Math.min(Math.abs(delta), sectorAngle * 2);
      const newAngle = normalizeAngle(currentAngle + step);
      setManualRotation(newAngle);
    }

    gameState.autoPlayTimer = setTimeout(autoPlayStep, 800);
  };

  gameState.autoPlayTimer = setTimeout(autoPlayStep, 1000);
};

const stopAutoPlay = () => {
  if (gameState.autoPlayTimer) {
    clearTimeout(gameState.autoPlayTimer);
    gameState.autoPlayTimer = null;
  }
};

const startGameTimer = () => {
  stopGameTimer();
  gameState.gameTimer = setInterval(() => {
    if (gameState.startTime && !gameState.isCompleted) {
      gameState.elapsedTime = (Date.now() - gameState.startTime) / 1000;
      notifyListeners();
    }
  }, 100);
};

const stopGameTimer = () => {
  if (gameState.gameTimer) {
    clearInterval(gameState.gameTimer);
    gameState.gameTimer = null;
  }
};

export const handleDragStart = (e, element) => {
  if (gameState.isSpinning || gameState.sectors.length === 0) return;
  
  e.preventDefault();
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const center = getCenterFromElement(element);
  
  gameState.isDragging = true;
  gameState.startAngle = getAngleFromPoint(clientX, clientY, center.x, center.y);
  gameState.lastAngle = gameState.startAngle;
  gameState.dragRotation = gameState.currentRotation;
};

export const handleDragMove = (e, element) => {
  if (!gameState.isDragging || gameState.startAngle === null) return;
  
  e.preventDefault();
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const center = getCenterFromElement(element);
  const currentAngle = getAngleFromPoint(clientX, clientY, center.x, center.y);
  
  let delta = currentAngle - gameState.lastAngle;
  
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  
  gameState.dragRotation += delta;
  gameState.lastAngle = currentAngle;
  gameState.currentRotation = gameState.dragRotation;
  gameState.pointerAtSector = getSectorAtPointer(gameState.dragRotation, gameState.difficulty);
  
  notifyListeners();
};

export const handleDragEnd = () => {
  if (!gameState.isDragging) return;
  
  gameState.isDragging = false;
  const finalAngle = normalizeAngle(gameState.dragRotation);
  
  setManualRotation(finalAngle);
  
  gameState.startAngle = null;
};

export const setManualRotation = (angle) => {
  const updatedSectors = gameState.sectors.map((sector) => ({
    ...sector,
    isAligned: checkAlignment(sector.originalIndex, angle, gameState.difficulty),
  }));
  
  const alignedCount = updatedSectors.filter((s) => s.isAligned).length;
  const isCompleted = alignedCount === gameState.difficulty;
  
  gameState.currentRotation = angle;
  gameState.targetRotation = angle;
  gameState.dragRotation = angle;
  gameState.sectors = updatedSectors;
  gameState.alignedCount = alignedCount;
  gameState.isCompleted = isCompleted;
  gameState.pointerAtSector = getSectorAtPointer(angle, gameState.difficulty);
  
  if (isCompleted && !gameState.startTime) {
    gameState.startTime = Date.now();
    gameState.elapsedTime = 0.1;
  }
  
  if (isCompleted) {
    stopGameTimer();
    const elapsedTime = gameState.startTime 
      ? (Date.now() - gameState.startTime) / 1000 
      : 0.1;
    gameState.elapsedTime = elapsedTime;
    
    saveBestRecord({
      difficulty: gameState.difficulty,
      minSpins: gameState.spinCount || 1,
      bestTime: elapsedTime,
      date: new Date().toISOString(),
    });
    
    stopAutoPlay();
  }
  
  notifyListeners();
};

export const cleanup = () => {
  stopAutoPlay();
  stopGameTimer();
  listeners = [];
};
