import type { Annotation, COCOData, StorageData } from '../types'

const STORAGE_KEY = 'image-annotation-tool'

export const saveToStorage = (data: StorageData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('保存到localStorage失败:', e)
  }
}

export const loadFromStorage = (): StorageData | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) as StorageData : null
  } catch (e) {
    console.error('从localStorage读取失败:', e)
    return null
  }
}

export const clearStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('清除localStorage失败:', e)
  }
}

export const exportToCOCO = (
  annotations: Annotation[],
  imageName: string,
  imageWidth: number = 0,
  imageHeight: number = 0
): COCOData => {
  const categories: { id: number; name: string; supercategory: string }[] = []
  const categoryMap: Record<string, number> = {}
  let categoryId = 1

  annotations.forEach(ann => {
    if (!categoryMap[ann.label]) {
      categoryMap[ann.label] = categoryId
      categories.push({
        id: categoryId,
        name: ann.label,
        supercategory: 'object'
      })
      categoryId++
    }
  })

  const cocoAnnotations = annotations.map((ann, index) => ({
    id: index + 1,
    image_id: 1,
    category_id: categoryMap[ann.label],
    bbox: [ann.x, ann.y, ann.width, ann.height] as [number, number, number, number],
    area: ann.width * ann.height,
    segmentation: [],
    iscrowd: 0
  }))

  return {
    info: {
      description: 'Image Annotation Tool Export',
      version: '1.0',
      year: new Date().getFullYear(),
      contributor: 'Image Annotation Tool',
      date_created: new Date().toISOString()
    },
    images: [
      {
        id: 1,
        file_name: imageName,
        width: imageWidth,
        height: imageHeight,
        date_captured: new Date().toISOString()
      }
    ],
    annotations: cocoAnnotations,
    categories
  }
}

export const downloadJSON = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
