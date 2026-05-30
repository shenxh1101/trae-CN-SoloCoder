import { useRef, useState, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { extractColors } from '@/utils/colorExtractor'

export default function ImageUploader() {
  const uploadedImage = useStore((s) => s.uploadedImage)
  const setUploadedImage = useStore((s) => s.setUploadedImage)
  const setColorPalette = useStore((s) => s.setColorPalette)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setUploadedImage(dataUrl)
        const img = new Image()
        img.onload = () => {
          const palette = extractColors(img)
          setColorPalette(palette)
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    },
    [setUploadedImage, setColorPalette]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  const onClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClick}
      className={`flex items-center gap-3 p-3 bg-white/5 backdrop-blur-md border rounded-xl cursor-pointer transition-all ${
        dragging ? 'border-purple-500/60 bg-purple-500/10' : 'border-white/10 hover:border-white/20'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className="hidden"
      />
      {uploadedImage ? (
        <img
          src={uploadedImage}
          alt="preview"
          className="w-16 h-16 rounded-lg object-cover border border-white/10"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-white/5 border border-dashed border-white/20 flex items-center justify-center shrink-0">
          <Upload size={20} className="text-white/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white/70 text-sm font-['Noto_Sans_SC']">
          {uploadedImage ? '已上传图片' : '拖放或点击上传'}
        </p>
        <p className="text-white/30 text-xs mt-1">JPG / PNG / WebP</p>
      </div>
    </div>
  )
}
