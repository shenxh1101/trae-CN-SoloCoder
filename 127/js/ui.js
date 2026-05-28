import { formatTime, getSectorAngle } from './utils.js';
import { getBestRecord } from './storage.js';

let confettiAnimationId = null;
let confettiParticles = [];

export const renderWheel = (state, elements) => {
  const { wheel, wheelInner, pointer } = elements;
  const { sectors, currentRotation, isSpinning, isDragging, difficulty, pointerAtSector, showHint, isCompleted } = state;

  if (sectors.length === 0) {
    wheel.classList.add('empty');
    wheelInner.innerHTML = `
      <div class="empty-message">
        <div class="empty-icon">🎡</div>
        <div class="empty-text">上传图片开始游戏</div>
        <div class="empty-subtext">选择一张图片，将其切割成扇形拼图</div>
      </div>
    `;
    return;
  }

  wheel.classList.remove('empty');
  
  const displayRotation = isSpinning ? state.targetRotation : currentRotation;
  const sectorAngle = getSectorAngle(difficulty);
  
  wheelInner.style.transform = `rotate(${displayRotation}deg)`;
  wheelInner.style.transition = isDragging 
    ? 'none' 
    : isSpinning 
      ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
      : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

  let sectorsHtml = '';
  sectors.forEach((sector, index) => {
    const isUnderPointer = index === pointerAtSector;
    const isHintSector = showHint && sector.originalIndex === 0;
    
    const classNames = [
      'sector',
      isUnderPointer ? 'highlighted' : '',
      sector.isAligned ? 'aligned' : '',
      isHintSector ? 'hint' : ''
    ].filter(Boolean).join(' ');
    
    sectorsHtml += `
      <div class="${classNames}" data-sector="${index}">
        <div class="sector-image" style="background-image: url('${sector.imageData}')"></div>
      </div>
    `;
  });

  for (let i = 0; i < difficulty; i++) {
    sectorsHtml += `
      <div class="sector-divider" style="transform: rotate(${i * sectorAngle + sectorAngle / 2}deg)"></div>
    `;
  }

  wheelInner.innerHTML = sectorsHtml;

  const currentSector = sectors[pointerAtSector];
  if (currentSector?.isAligned) {
    pointer.classList.add('correct');
  } else {
    pointer.classList.remove('correct');
  }
};

export const renderInfo = (state, elements) => {
  const { spinCount, elapsedTime, alignedCount, difficulty, isCompleted } = state;
  
  elements.spinCount.textContent = spinCount;
  elements.elapsedTime.textContent = formatTime(elapsedTime);
  elements.alignedCount.textContent = alignedCount;
  elements.totalCount.textContent = difficulty;

  if (isCompleted) {
    elements.completionBanner.classList.remove('hidden');
    elements.spinBtn.classList.add('completed');
    elements.spinIcon.textContent = '🎉';
    elements.spinText.textContent = '已完成！';
  } else {
    elements.completionBanner.classList.add('hidden');
    elements.spinBtn.classList.remove('completed');
    elements.spinIcon.textContent = '▶️';
    elements.spinText.textContent = '点击旋转';
  }
};

export const renderBestRecord = (state, elements) => {
  const { difficulty } = state;
  const record = getBestRecord(difficulty);
  
  if (record) {
    elements.bestRecord.classList.remove('hidden');
    elements.bestSpins.textContent = `${record.minSpins} 次`;
    elements.bestTime.textContent = formatTime(record.bestTime);
  } else {
    elements.bestRecord.classList.add('hidden');
  }
};

export const renderDifficultyButtons = (state, elements) => {
  const { difficulty, isSpinning } = state;
  
  elements.difficultyBtns.forEach(btn => {
    const btnDifficulty = parseInt(btn.dataset.difficulty);
    btn.classList.toggle('active', btnDifficulty === difficulty);
    btn.disabled = isSpinning;
  });
};

export const renderUtilityButtons = (state, elements) => {
  const { showHint, autoPlayMode, isSpinning, isCompleted, sectors } = state;
  const hasImage = sectors.length > 0;
  
  elements.hintBtn.classList.toggle('hint-active', showHint);
  elements.hintBtn.disabled = isSpinning || !hasImage;
  
  elements.autoPlayBtn.classList.toggle('active', autoPlayMode);
  elements.autoPlayBtn.disabled = isSpinning || isCompleted || !hasImage;
  
  elements.resetBtn.disabled = isSpinning || !hasImage;
  elements.spinBtn.disabled = isSpinning || !hasImage || isCompleted;
  elements.spinBtn.classList.toggle('spinning', isSpinning);

  if (showHint) {
    elements.hintBubble.classList.remove('hidden');
  } else {
    elements.hintBubble.classList.add('hidden');
  }
};

export const renderThumbnail = (state, elements) => {
  const { fullImageData, showThumbnail } = state;
  
  if (fullImageData && showThumbnail) {
    elements.thumbnailPreview.classList.remove('hidden');
    elements.thumbnailImage.src = fullImageData;
    elements.modalImage.src = fullImageData;
  } else {
    elements.thumbnailPreview.classList.add('hidden');
  }
};

export const renderSettings = (state, elements) => {
  const { soundEnabled, showThumbnail: showThumb, backgroundColor } = state;
  
  elements.soundToggle.checked = soundEnabled;
  elements.thumbnailToggleSetting.checked = showThumb;
  
  elements.colorOptions.forEach(option => {
    option.classList.toggle('active', option.dataset.color === backgroundColor);
  });
};

export const startConfetti = (canvas) => {
  stopConfetti(canvas);
  
  canvas.classList.remove('hidden');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const ctx = canvas.getContext('2d');
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#1dd1a1', '#ff9f43'];
  
  confettiParticles = [];
  for (let i = 0; i < 150; i++) {
    confettiParticles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15 - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      life: 1,
    });
  }
  
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let hasActiveParticles = false;
    
    confettiParticles.forEach((p) => {
      if (p.life <= 0) return;
      hasActiveParticles = true;
      
      p.vy += 0.2;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.life -= 0.005;
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    
    if (hasActiveParticles) {
      confettiAnimationId = requestAnimationFrame(animate);
    } else {
      stopConfetti(canvas);
    }
  };
  
  animate();
};

export const stopConfetti = (canvas) => {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  confettiParticles = [];
  canvas.classList.add('hidden');
};
