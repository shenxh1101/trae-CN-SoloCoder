import type { WebGLRenderer } from 'three';

export function takeScreenshot(gl: WebGLRenderer): void {
  const dataURL = gl.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `galaxy-${Date.now()}.png`;
  link.href = dataURL;
  link.click();
}
