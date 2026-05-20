export interface Annotation {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  canvasLeft: number
  canvasTop: number
  canvasWidth: number
  canvasHeight: number
  createdAt: string
}

export interface COCOImage {
  id: number
  file_name: string
  width: number
  height: number
  date_captured: string
}

export interface COCOAnnotation {
  id: number
  image_id: number
  category_id: number
  bbox: [number, number, number, number]
  area: number
  segmentation: number[][]
  iscrowd: number
}

export interface COCOCategory {
  id: number
  name: string
  supercategory: string
}

export interface COCOData {
  info: {
    description: string
    version: string
    year: number
    contributor: string
    date_created: string
  }
  images: COCOImage[]
  annotations: COCOAnnotation[]
  categories: COCOCategory[]
}

export interface StorageData {
  annotations: Annotation[]
  imageName: string
  imageDataUrl?: string
  imageWidth?: number
  imageHeight?: number
  labelSuggestions: string[]
  savedAt: string
}

export interface Point {
  x: number
  y: number
}
