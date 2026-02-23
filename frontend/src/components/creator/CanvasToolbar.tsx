interface CanvasToolbarProps {
  onAddText: () => void
  onAddSticker: () => void
  onAddImage: () => void
  onAddShape: () => void
  onDelete: () => void
  hasSelection: boolean
}

export default function CanvasToolbar({
  onAddText,
  onAddSticker,
  onAddImage,
  onAddShape,
  onDelete,
  hasSelection,
}: CanvasToolbarProps) {
  const buttons = [
    { label: '文字', icon: 'T', onClick: onAddText },
    { label: '贴纸', icon: '😀', onClick: onAddSticker },
    { label: '图片', icon: '📷', onClick: onAddImage },
    { label: '形状', icon: '⬜', onClick: onAddShape },
  ]

  return (
    <div className="flex items-center gap-2 px-4">
      {buttons.map((b) => (
        <button
          key={b.label}
          onClick={b.onClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
        >
          <span>{b.icon}</span>
          <span className="text-gray-700">{b.label}</span>
        </button>
      ))}
      {hasSelection && (
        <button
          onClick={onDelete}
          className="ml-auto px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-sm hover:bg-red-100"
        >
          删除
        </button>
      )}
    </div>
  )
}
