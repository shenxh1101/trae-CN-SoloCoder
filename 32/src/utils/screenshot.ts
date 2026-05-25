export function takeScreenshot(): void {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `earth-screenshot-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}
