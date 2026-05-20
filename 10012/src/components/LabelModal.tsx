import { useState, useEffect, useRef } from 'react'

interface LabelModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (label: string) => void
  initialLabel?: string
  labelSuggestions: string[]
  title?: string
}

function LabelModal({
  isOpen,
  onClose,
  onConfirm,
  initialLabel = '',
  labelSuggestions,
  title = '输入标签名称'
}: LabelModalProps) {
  const [label, setLabel] = useState(initialLabel)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLabel(initialLabel)
  }, [initialLabel])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (label.trim()) {
      onConfirm(label.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 modal-overlay"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl p-6 w-96 max-w-full mx-4 modal-content border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如: car, pedestrian..."
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            autoComplete="off"
          />

          {labelSuggestions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">常用标签：</p>
              <div className="flex flex-wrap gap-2">
                {labelSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setLabel(suggestion)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      label === suggestion
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!label.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LabelModal
