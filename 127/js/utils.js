export const normalizeAngle = (angle) => {
  let result = angle % 360;
  if (result < 0) result += 360;
  return result;
};

export const generateRandomSpin = () => {
  const fullRotations = 3 + Math.floor(Math.random() * 4);
  const randomAngle = Math.random() * 360;
  return fullRotations * 360 + randomAngle;
};

export const getSectorAngle = (difficulty) => {
  return 360 / difficulty;
};

export const getSectorAtPointer = (currentRotation, difficulty) => {
  const sectorAngle = getSectorAngle(difficulty);
  const normalized = normalizeAngle(currentRotation);
  const pointerAngle = 270;
  const adjusted = normalizeAngle(pointerAngle - normalized);
  return Math.floor(adjusted / sectorAngle);
};

export const checkAlignment = (sectorIndex, currentRotation, difficulty) => {
  const sectorAngle = getSectorAngle(difficulty);
  const pointerAngle = 270;
  const sectorCenter = (sectorIndex * sectorAngle + sectorAngle / 2 + currentRotation) % 360;
  let diff = Math.abs(sectorCenter - pointerAngle);
  diff = Math.min(diff, 360 - diff);
  return diff < sectorAngle / 4;
};

export const shuffleArray = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const getAngleFromPoint = (clientX, clientY, centerX, centerY) => {
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
};

export const getCenterFromElement = (element) => {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
};

export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

export const lerp = (start, end, t) => {
  return start + (end - start) * t;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const easeOutCubic = (t) => {
  return 1 - Math.pow(1 - t, 3);
};

export const easeInOutCubic = (t) => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
