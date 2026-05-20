import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { fabric } from 'fabric'
import type { Annotation } from '../types'

interface AnnotationCanvasProps {
  image: string | null
  annotations: Annotation[]
  zoom: number
  pan: { x: number; y: number }
  setPan: (pan: { x: number; y: number }) => void
  isDrawing: boolean
  onAnnotationCreate: (data: {
    x: number
    y: number
    width: number
    height: number
    canvasLeft: number
    canvasTop: number
    canvasWidth: number
    canvasHeight: number
  }) => void
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void
  onSelectAnnotation: (id: string | null) => void
  onDoubleClickAnnotation: (annotation: Annotation) => void
  selectedAnnotationId: string | null
}

interface CanvasRef {
  deleteAnnotation: (id: string) => void
  selectAnnotation: (id: string) => void
  clearAll: () => void
  updateAnnotation: (id: string, annotation: Partial<Annotation>) => void
}

const AnnotationCanvas = forwardRef<CanvasRef, AnnotationCanvasProps>(({
  image,
  annotations,
  zoom,
  pan,
  setPan,
  isDrawing,
  onAnnotationCreate,
  onAnnotationUpdate,
  onSelectAnnotation,
  onDoubleClickAnnotation,
  selectedAnnotationId
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fabricImageRef = useRef<fabric.Image | null>(null)
  const isDrawingRef = useRef(false)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const currentRectRef = useRef<fabric.Rect | null>(null)
  const annotationMapRef = useRef<Map<string, fabric.Rect>>(new Map())
  const labelTextMapRef = useRef<Map<string, fabric.Text>>(new Map())
  const isPanningRef = useRef(false)
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null)

  useImperativeHandle(ref, () => ({
    deleteAnnotation: (id: string) => {
      const canvas = fabricCanvasRef.current
      const rect = annotationMapRef.current.get(id)
      const labelText = labelTextMapRef.current.get(id)
      if (rect && canvas) {
        canvas.remove(rect)
        annotationMapRef.current.delete(id)
      }
      if (labelText && canvas) {
        canvas.remove(labelText)
        labelTextMapRef.current.delete(id)
      }
      canvas?.renderAll()
    },
    selectAnnotation: (id: string) => {
      const canvas = fabricCanvasRef.current
      const rect = annotationMapRef.current.get(id)
      if (rect && canvas) {
        canvas.setActiveObject(rect)
        canvas.renderAll()
      }
    },
    clearAll: () => {
      const canvas = fabricCanvasRef.current
      if (canvas) {
        annotationMapRef.current.forEach(rect => canvas.remove(rect))
        labelTextMapRef.current.forEach(text => canvas.remove(text))
        annotationMapRef.current.clear()
        labelTextMapRef.current.clear()
        canvas.renderAll()
      }
    },
    updateAnnotation: (id: string, annotation: Partial<Annotation>) => {
      const labelText = labelTextMapRef.current.get(id)
      if (labelText && annotation.label) {
        labelText.set('text', annotation.label)
        fabricCanvasRef.current?.renderAll()
      }
    }
  }))

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      selection: !isDrawing,
      preserveObjectStacking: true,
      backgroundColor: '#111827'
    })
    fabricCanvasRef.current = canvas

    return () => {
      canvas.dispose()
    }
  }, [])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.selection = !isDrawing
    annotationMapRef.current.forEach(rect => {
      rect.selectable = !isDrawing
      rect.evented = !isDrawing
    })
    canvas.defaultCursor = isDrawing ? 'crosshair' : 'default'
  }, [isDrawing])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    if (!image) {
      if (fabricImageRef.current) {
        canvas.remove(fabricImageRef.current)
        fabricImageRef.current = null
      }
      return
    }

    fabric.Image.fromURL(image, (img) => {
      if (fabricImageRef.current) {
        canvas.remove(fabricImageRef.current)
      }

      const container = canvasRef.current?.parentElement
      if (!container) return

      const maxWidth = container.clientWidth - 40
      const maxHeight = container.clientHeight - 40

      let scale = 1
      if (img.width && img.height && (img.width > maxWidth || img.height > maxHeight)) {
        scale = Math.min(maxWidth / img.width, maxHeight / img.height)
      }

      img.set({
        left: ((canvas.width || 0) - (img.width || 0) * scale) / 2,
        top: ((canvas.height || 0) - (img.height || 0) * scale) / 2,
        selectable: false,
        evented: false,
        scaleX: scale,
        scaleY: scale
      })

      fabricImageRef.current = img
      canvas.add(img)
      canvas.sendToBack(img)
      canvas.renderAll()
    }, { crossOrigin: 'anonymous' })
  }, [image])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.setZoom(zoom)
    canvas.absolutePan(new fabric.Point(pan.x, pan.y))
    canvas.renderAll()
  }, [zoom, pan])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const handleMouseDown = (e: fabric.IEvent) => {
      const evt = e.e as MouseEvent
      if (isDrawing && evt.button === 0 && !e.target) {
        const pointer = canvas.getPointer(evt)
        startPointRef.current = pointer
        isDrawingRef.current = true

        const rect = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'rgba(59, 130, 246, 0.15)',
          stroke: '#3b82f6',
          strokeWidth: 2,
          selectable: true,
          evented: true
        })

        currentRectRef.current = rect
        canvas.add(rect)
      } else if (!isDrawing && evt.button === 0 && !e.target) {
        isPanningRef.current = true
        lastPanPointRef.current = { x: evt.clientX, y: evt.clientY }
        canvas.defaultCursor = 'grabbing'
      }
    }

    const handleMouseMove = (e: fabric.IEvent) => {
      const evt = e.e as MouseEvent
      if (isDrawingRef.current && currentRectRef.current && startPointRef.current) {
        const pointer = canvas.getPointer(evt)
        const width = pointer.x - startPointRef.current.x
        const height = pointer.y - startPointRef.current.y

        currentRectRef.current.set({
          left: width > 0 ? startPointRef.current.x : pointer.x,
          top: height > 0 ? startPointRef.current.y : pointer.y,
          width: Math.abs(width),
          height: Math.abs(height)
        })

        canvas.renderAll()
      } else if (isPanningRef.current && lastPanPointRef.current) {
        const deltaX = evt.clientX - lastPanPointRef.current.x
        const deltaY = evt.clientY - lastPanPointRef.current.y

        setPan({
          x: pan.x + deltaX / zoom,
          y: pan.y + deltaY / zoom
        })

        lastPanPointRef.current = { x: evt.clientX, y: evt.clientY }
      }
    }

    const handleMouseUp = () => {
      if (isDrawingRef.current && currentRectRef.current) {
        const rect = currentRectRef.current
        const width = rect.width || 0
        const height = rect.height || 0

        if (width > 5 && height > 5) {
          const img = fabricImageRef.current
          let imageX = rect.left || 0
          let imageY = rect.top || 0
          let imageWidth = width
          let imageHeight = height

          if (img) {
            const imgLeft = img.left || 0
            const imgTop = img.top || 0
            const imgScale = img.scaleX || 1
            imageX = ((rect.left || 0) - imgLeft) / imgScale
            imageY = ((rect.top || 0) - imgTop) / imgScale
            imageWidth = width / imgScale
            imageHeight = height / imgScale
          }

          canvas.remove(rect)
          currentRectRef.current = null

          onAnnotationCreate({
            x: imageX,
            y: imageY,
            width: imageWidth,
            height: imageHeight,
            canvasLeft: rect.left || 0,
            canvasTop: rect.top || 0,
            canvasWidth: width,
            canvasHeight: height
          })
        } else {
          canvas.remove(rect)
          currentRectRef.current = null
        }

        canvas.renderAll()
      }

      isDrawingRef.current = false
      startPointRef.current = null

      if (isPanningRef.current) {
        isPanningRef.current = false
        lastPanPointRef.current = null
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.defaultCursor = isDrawing ? 'crosshair' : 'default'
        }
      }
    }

    const handleMouseWheel = (e: fabric.IEvent) => {
      const evt = e.e as WheelEvent
      evt.preventDefault()
      evt.stopPropagation()

      const delta = evt.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta))

      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = evt.clientX - rect.left
      const mouseY = evt.clientY - rect.top

      const zoomPoint = new fabric.Point(mouseX, mouseY)
      canvas.zoomToPoint(zoomPoint, newZoom)

      const vpt = canvas.viewportTransform
      if (vpt) {
        setPan({ x: vpt[4], y: vpt[5] })
      }
    }

    const handleObjectSelected = (e: fabric.IEvent) => {
      const obj = e.target as fabric.Object & { annotationId?: string }
      if (obj && obj.annotationId) {
        onSelectAnnotation(obj.annotationId)
      }
    }

    const handleSelectionCleared = () => {
      onSelectAnnotation(null)
    }

    const handleObjectModified = (e: fabric.IEvent) => {
      const obj = e.target as fabric.Object & { annotationId?: string }
      if (obj && obj.annotationId) {
        const img = fabricImageRef.current
        let imageX = obj.left || 0
        let imageY = obj.top || 0
        let imageWidth = (obj.width || 0) * (obj.scaleX || 1)
        let imageHeight = (obj.height || 0) * (obj.scaleY || 1)

        if (img) {
          const imgLeft = img.left || 0
          const imgTop = img.top || 0
          const imgScale = img.scaleX || 1
          imageX = ((obj.left || 0) - imgLeft) / imgScale
          imageY = ((obj.top || 0) - imgTop) / imgScale
          imageWidth = ((obj.width || 0) * (obj.scaleX || 1)) / imgScale
          imageHeight = ((obj.height || 0) * (obj.scaleY || 1)) / imgScale
        }

        const labelText = labelTextMapRef.current.get(obj.annotationId)
        if (labelText) {
          labelText.set({
            left: obj.left,
            top: (obj.top || 0) - 20
          })
        }

        onAnnotationUpdate(obj.annotationId, {
          x: imageX,
          y: imageY,
          width: imageWidth,
          height: imageHeight,
          canvasLeft: obj.left,
          canvasTop: obj.top,
          canvasWidth: (obj.width || 0) * (obj.scaleX || 1),
          canvasHeight: (obj.height || 0) * (obj.scaleY || 1)
        })

        canvas.renderAll()
      }
    }

    const handleMouseDblClick = (e: fabric.IEvent) => {
      const obj = e.target as fabric.Object & { annotationId?: string }
      if (obj && obj.annotationId) {
        const annotation = annotations.find(a => a.id === obj.annotationId)
        if (annotation) {
          onDoubleClickAnnotation(annotation)
        }
      }
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)
    canvas.on('mouse:wheel', handleMouseWheel)
    canvas.on('selection:created', handleObjectSelected)
    canvas.on('selection:updated', handleObjectSelected)
    canvas.on('selection:cleared', handleSelectionCleared)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('mouse:dblclick', handleMouseDblClick)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
      canvas.off('mouse:wheel', handleMouseWheel)
      canvas.off('selection:created', handleObjectSelected)
      canvas.off('selection:updated', handleObjectSelected)
      canvas.off('selection:cleared', handleSelectionCleared)
      canvas.off('object:modified', handleObjectModified)
      canvas.off('mouse:dblclick', handleMouseDblClick)
    }
  }, [isDrawing, zoom, annotations, onAnnotationCreate, onAnnotationUpdate, onSelectAnnotation, onDoubleClickAnnotation, setPan])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    annotationMapRef.current.forEach((rect, id) => {
      const annotation = annotations.find(a => a.id === id)
      const labelText = labelTextMapRef.current.get(id)
      if (annotation) {
        const isSelected = annotation.id === selectedAnnotationId
        rect.set({
          stroke: isSelected ? '#f59e0b' : '#3b82f6',
          strokeWidth: isSelected ? 3 : 2
        })
        if (labelText) {
          labelText.set('text', annotation.label)
        }
      }
    })

    annotations.forEach(ann => {
      if (!annotationMapRef.current.has(ann.id)) {
        const rect = new fabric.Rect({
          left: ann.canvasLeft,
          top: ann.canvasTop,
          width: ann.canvasWidth,
          height: ann.canvasHeight,
          fill: 'rgba(59, 130, 246, 0.15)',
          stroke: '#3b82f6',
          strokeWidth: 2,
          selectable: !isDrawing,
          evented: !isDrawing
        })
        ;(rect as fabric.Rect & { annotationId: string }).annotationId = ann.id
        annotationMapRef.current.set(ann.id, rect)
        canvas.add(rect)

        const labelText = new fabric.Text(ann.label, {
          left: ann.canvasLeft,
          top: ann.canvasTop - 20,
          fontSize: 14,
          fill: '#ffffff',
          backgroundColor: '#3b82f6',
          padding: 4
        })
        labelTextMapRef.current.set(ann.id, labelText)
        canvas.add(labelText)
      }
    })

    canvas.renderAll()
  }, [annotations, selectedAnnotationId, isDrawing])

  return (
    <div className={`w-full h-full flex items-center justify-center canvas-container ${isDrawing ? 'drawing' : ''} ${isPanningRef.current ? 'panning' : ''}`}>
      <canvas
        ref={canvasRef}
        width={900}
        height={600}
        className="rounded-lg shadow-lg border border-gray-700"
      />
    </div>
  )
})

AnnotationCanvas.displayName = 'AnnotationCanvas'

export default AnnotationCanvas
