import type { FractalParams } from '@/types'

export function exportParams(params: FractalParams): void {
  const json = JSON.stringify(params, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = 'fractal-params.json'
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

export function importParams(): Promise<FractalParams> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('未选择文件'))
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const params = JSON.parse(ev.target?.result as string) as FractalParams
          resolve(params)
        } catch {
          reject(new Error('无效的JSON文件'))
        }
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsText(file)
    }
    input.click()
  })
}
