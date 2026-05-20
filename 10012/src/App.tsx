import { useState, useEffect, useRef, useCallback } from 'react'
import type { Annotation } from './types'
import Toolbar from './components/Toolbar'
import AnnotationCanvas from './components/AnnotationCanvas'
import AnnotationList from './components/AnnotationList'
import StatusBar from './components/StatusBar'
import LabelModal from './components/LabelModal'
import { loadFromStorage, saveToStorage, exportToCOCO, downloadJSON } from './utils/storage'
import { v4 as uuidv4 } from 'uuid'

const DEFAULT_LABELS = ['car', 'pedestrian', 'truck', 'bus', 'bicycle', 'motorcycle']
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200',
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1200'
]

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string>('')
  const [imageWidth, setImageWidth] = useState<number>(0)
  const [imageHeight, setImageHeight] = useState<number>(0)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [labelSuggestions, setLabelSuggestions] = useState<string[]>(DEFAULT_LABELS)
  const [showLabelModal, setShowLabelModal] = useState<boolean>(false)
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    x: number
    y: number
    width: number
    height: number
    canvasLeft: number
    canvasTop: number
    canvasWidth: number
    canvasHeight: number
  } | null>(null)
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null)

  const canvasRef = useRef<{
    deleteAnnotation: (id: string) => void
    selectAnnotation: (id: string) => void
    clearAll: () => void
    updateAnnotation: (id: string, annotation: Partial<Annotation>) => void
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = loadFromStorage()
    if (saved) {
      setAnnotations(saved.annotations || [])
      setImageName(saved.imageName || '')
      setImageWidth(saved.imageWidth || 0)
      setImageHeight(saved.imageHeight || 0)
      if (saved.labelSuggestions?.length) {
        setLabelSuggestions(saved.labelSuggestions)
      }
      if (saved.imageDataUrl) {
        setImage(saved.imageDataUrl)
      }
    }
  }, [])

  useEffect(() => {
    if (annotations.length > 0 || imageName) {
      const saveData: {
        annotations: Annotation[]
        imageName: string
        imageWidth: number
        imageHeight: number
        labelSuggestions: string[]
        savedAt: string
        imageDataUrl?: string
      } = {
        annotations,
        imageName,
        imageWidth,
        imageHeight,
        labelSuggestions,
        savedAt: new Date().toISOString()
      }
      if (image && image.startsWith('data:')) {
        saveData.imageDataUrl = image
      }
      saveToStorage(saveData)
    }
  }, [annotations, imageName, imageWidth, imageHeight, labelSuggestions, image])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId && !(e.target as HTMLElement).matches('input, textarea')) {
          e.preventDefault()
          handleDeleteAnnotation(selectedAnnotationId)
        }
      } else if (e.key === 'Tab') {
        if (labelSuggestions.length > 0 && !(e.target as HTMLElement).matches('input, textarea')) {
          e.preventDefault()
          const randomIndex = Math.floor(Math.random() * labelSuggestions.length)
          setLabelSuggestions(prev => {
            const current = prev[randomIndex]
            const others = prev.filter((_, i) => i !== randomIndex)
            return [current, ...others]
          })
        }
      } else if (e.key === 'Escape') {
        setShowLabelModal(false)
        setPendingAnnotation(null)
        setEditingAnnotation(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAnnotationId, labelSuggestions])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setImage(dataUrl)
      setImageName(file.name)
      setAnnotations([])
      setZoom(1)
      setPan({ x: 0, y: 0 })
      setSelectedAnnotationId(null)

      const img = new Image()
      img.onload = () => {
        setImageWidth(img.width)
        setImageHeight(img.height)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleLoadSampleImage = () => {
    const randomImage = SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)]
    setImage(randomImage)
    setImageName('sample-image.jpg')
    setAnnotations([])
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSelectedAnnotationId(null)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImageWidth(img.width)
      setImageHeight(img.height)
    }
    img.src = randomImage
  }

  const handleAnnotationStart = (data: {
    x: number
    y: number
    width: number
    height: number
    canvasLeft: number
    canvasTop: number
    canvasWidth: number
    canvasHeight: number
  }) => {
    setPendingAnnotation(data)
    setShowLabelModal(true)
  }

  const handleLabelConfirm = (label: string) => {
    if (editingAnnotation) {
      const updatedAnnotation = { ...editingAnnotation, label }
      setAnnotations(prev => prev.map(a =>
        a.id === editingAnnotation.id ? updatedAnnotation : a
      ))
      if (canvasRef.current) {
        canvasRef.current.updateAnnotation(editingAnnotation.id, updatedAnnotation)
      }
      setEditingAnnotation(null)
    } else if (pendingAnnotation) {
      const newAnnotation: Annotation = {
        ...pendingAnnotation,
        id: uuidv4(),
        label,
        createdAt: new Date().toISOString()
      }
      setAnnotations(prev => [...prev, newAnnotation])

      if (!labelSuggestions.includes(label)) {
        setLabelSuggestions(prev => [...prev, label])
      }
      setPendingAnnotation(null)
    }
    setShowLabelModal(false)
  }

  const handleAnnotationUpdate = (id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(a =>
      a.id === id ? { ...a, ...updates } : a
    ))
  }

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id))
    setSelectedAnnotationId(null)
    if (canvasRef.current) {
      canvasRef.current.deleteAnnotation(id)
    }
  }

  const handleSelectAnnotation = (id: string | null) => {
    setSelectedAnnotationId(id)
    if (id && canvasRef.current) {
      canvasRef.current.selectAnnotation(id)
    }
  }

  const handleEditAnnotationLabel = (annotation: Annotation) => {
    setEditingAnnotation(annotation)
    setShowLabelModal(true)
  }

  const handleClearAll = () => {
    if (window.confirm('确定要清除所有标注吗？')) {
      setAnnotations([])
      setSelectedAnnotationId(null)
      if (canvasRef.current) {
        canvasRef.current.clearAll()
      }
    }
  }

  const handleSave = useCallback(() => {
    const saveData: {
      annotations: Annotation[]
      imageName: string
      imageWidth: number
      imageHeight: number
      labelSuggestions: string[]
      savedAt: string
      imageDataUrl?: string
    } = {
      annotations,
      imageName,
      imageWidth,
      imageHeight,
      labelSuggestions,
      savedAt: new Date().toISOString()
    }
    if (image && image.startsWith('data:')) {
      saveData.imageDataUrl = image
    }
    saveToStorage(saveData)
    alert('标注已保存到本地存储！')
  }, [annotations, imageName, imageWidth, imageHeight, labelSuggestions, image])

  const handleExportCOCO = () => {
    if (!imageName) {
      alert('请先上传图片！')
      return
    }
    const cocoData = exportToCOCO(annotations, imageName, imageWidth, imageHeight)
    const filename = `${imageName.split('.')[0]}_annotations.json`
    downloadJSON(cocoData, filename)
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 5))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1))
  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleCloseModal = () => {
    setShowLabelModal(false)
    setPendingAnnotation(null)
    setEditingAnnotation(null)
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      <Toolbar
        onImageUpload={() => fileInputRef.current?.click()}
        onLoadSample={handleLoadSampleImage}
        onSave={handleSave}
        onExport={handleExportCOCO}
        onClearAll={handleClearAll}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        zoom={zoom}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        labelSuggestions={labelSuggestions}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <AnnotationCanvas
            ref={canvasRef}
            image={image}
            annotations={annotations}
            zoom={zoom}
            pan={pan}
            setPan={setPan}
            isDrawing={isDrawing}
            onAnnotationCreate={handleAnnotationStart}
            onAnnotationUpdate={handleAnnotationUpdate}
            onSelectAnnotation={handleSelectAnnotation}
            onDoubleClickAnnotation={handleEditAnnotationLabel}
            selectedAnnotationId={selectedAnnotationId}
          />
        </div>

        <AnnotationList
          annotations={annotations}
          selectedId={selectedAnnotationId}
          onSelect={handleSelectAnnotation}
          onDelete={handleDeleteAnnotation}
          onEditLabel={handleEditAnnotationLabel}
        />
      </div>

      <StatusBar
        annotationCount={annotations.length}
        imageName={imageName}
        zoom={zoom}
      />

      {showLabelModal && (
        <LabelModal
          isOpen={showLabelModal}
          onClose={handleCloseModal}
          onConfirm={handleLabelConfirm}
          initialLabel={editingAnnotation?.label || labelSuggestions[0] || ''}
          labelSuggestions={labelSuggestions}
          title={editingAnnotation ? '编辑标签' : '输入标签名称'}
        />
      )}
    </div>
  )
}

export default App
