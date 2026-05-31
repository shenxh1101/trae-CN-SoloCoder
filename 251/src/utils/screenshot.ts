import * as THREE from 'three';

interface ComposerType {
  render: () => void;
}

export function takeScreenshot(
  renderer: THREE.WebGLRenderer,
  scene?: THREE.Scene,
  camera?: THREE.Camera,
  composer?: ComposerType | null
): void {
  const dataURL = getScreenshotDataURL(renderer, scene, camera, composer);
  
  const link = document.createElement('a');
  link.download = `endless-stairs-${Date.now()}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log(`📸 截图已保存: ${link.download} (${Math.round(dataURL.length / 1024)}KB)`);
}

export function getScreenshotDataURL(
  renderer: THREE.WebGLRenderer,
  scene?: THREE.Scene,
  camera?: THREE.Camera,
  composer?: ComposerType | null
): string {
  const canvas = renderer.domElement;
  
  const currentAutoClear = renderer.autoClear;
  const currentClearAlpha = renderer.getClearAlpha();
  const currentClearColor = new THREE.Color();
  renderer.getClearColor(currentClearColor);
  
  try {
    renderer.autoClear = true;
    
    if (composer) {
      console.log('🎬 使用 EffectComposer 渲染截图');
      composer.render();
    } else if (scene && camera) {
      console.log('🎬 使用标准渲染路径');
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(scene, camera);
    } else {
      console.log('🎬 使用默认画布内容');
    }
    
    const dataURL = canvas.toDataURL('image/png', 1.0);
    
    if (isDataURLBlank(dataURL)) {
      console.warn('⚠️  截图可能空白，尝试强制渲染...');
      
      if (scene && camera) {
        renderer.setClearColor(0x000000, 1);
        renderer.clear();
        renderer.render(scene, camera);
        
        const retryDataURL = canvas.toDataURL('image/png', 1.0);
        if (!isDataURLBlank(retryDataURL)) {
          return retryDataURL;
        }
      }
      
      console.error('❌ 截图失败，返回占位图');
      return createFallbackDataURL();
    }
    
    return dataURL;
  } catch (error) {
    console.error('截图时发生错误:', error);
    return createFallbackDataURL();
  } finally {
    renderer.autoClear = currentAutoClear;
    renderer.setClearColor(currentClearColor, currentClearAlpha);
  }
}

function isDataURLBlank(dataURL: string): boolean {
  if (!dataURL || dataURL === 'data:,') {
    return true;
  }
  
  try {
    const base64 = dataURL.split(',')[1];
    if (!base64 || base64.length < 100) {
      return true;
    }
    
    const binary = atob(base64);
    
    if (binary.length < 100) {
      return true;
    }
    
    const signature = binary.charCodeAt(0) === 137 &&
                      binary.charCodeAt(1) === 80 &&
                      binary.charCodeAt(2) === 78 &&
                      binary.charCodeAt(3) === 71;
    
    if (!signature) {
      return true;
    }
    
    return false;
  } catch {
    return true;
  }
}

function createFallbackDataURL(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a0a2e');
    gradient.addColorStop(1, '#0a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1920, 1080);
    
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 64px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('无尽阶梯', 960, 500);
    
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.font = 'bold 48px "JetBrains Mono", monospace';
    ctx.fillText('ENDLESS STAIRS', 960, 580);
    
    ctx.fillStyle = '#666';
    ctx.shadowBlur = 0;
    ctx.font = '20px "JetBrains Mono", monospace';
    ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 960, 660);
    
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 1920;
      const y = Math.random() * 1080;
      const size = Math.random() * 3 + 1;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  return canvas.toDataURL('image/png');
}

export function copyScreenshotToClipboard(
  renderer: THREE.WebGLRenderer,
  scene?: THREE.Scene,
  camera?: THREE.Camera,
  composer?: ComposerType | null
): Promise<void> {
  return new Promise((resolve, reject) => {
    const dataURL = getScreenshotDataURL(renderer, scene, camera, composer);
    
    fetch(dataURL)
      .then(res => res.blob())
      .then(blob => {
        if (blob.size < 100) {
          reject(new Error('截图文件过小，可能为空'));
          return;
        }
        return navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
      })
      .then(resolve)
      .catch(reject);
  });
}

export function debugScreenshot(
  renderer: THREE.WebGLRenderer,
  scene?: THREE.Scene,
  camera?: THREE.Camera
): void {
  console.log('🔍 截图调试信息:');
  console.log('  - Canvas 尺寸:', renderer.domElement.width, 'x', renderer.domElement.height);
  console.log('  - Pixel Ratio:', renderer.getPixelRatio());
  console.log('  - Auto Clear:', renderer.autoClear);
  console.log('  - Scene 存在:', !!scene);
  console.log('  - Camera 存在:', !!camera);
  console.log('  - preserveDrawingBuffer:', renderer.getContext().getContextAttributes()?.preserveDrawingBuffer);
  console.log('  - Context Lost:', renderer.getContext().isContextLost());
  
  if (scene) {
    console.log('  - Scene 子对象数:', scene.children.length);
  }
  if (camera) {
    console.log('  - Camera 位置:', camera.position.toArray());
  }
}
