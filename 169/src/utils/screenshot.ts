export function takeScreenshot(canvas: HTMLCanvasElement | null, filename: string = 'fractal-kaleidoscope') {
  if (!canvas) return

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
