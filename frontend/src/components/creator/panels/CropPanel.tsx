import { useState } from 'react'

interface AspectRatio {
  id: string
  label: string
  sub: string
  ratio: number | null
}

const aspects: AspectRatio[] = [
  { id: 'free', label: '自由', sub: '自由裁剪', ratio: null },
  { id: '9:16', label: '9:16', sub: '抖音竖屏', ratio: 9 / 16 },
  { id: '16:9', label: '16:9', sub: '横屏', ratio: 16 / 9 },
  { id: '1:1', label: '1:1', sub: '方形', ratio: 1 },
  { id: '4:3', label: '4:3', sub: '传统', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', sub: '竖屏', ratio: 3 / 4 },
]

interface CropPanelProps {
  processing: boolean
  onApply: (aspectId: string, ratio: number | null) => void
}

export default function CropPanel({ processing, onApply }: CropPanelProps) {
  const [selected, setSelected] = useState('9:16')

  const aspect = aspects.find((a) => a.id === selected)!

  return (
    <div className="px-4 space-y-3">
      <p className="text-xs text-gray-500">选择画面比例</p>
      <div className="grid grid-cols-3 gap-2">
        {aspects.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelected(a.id)}
            className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
              selected === a.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            <span className="text-sm font-bold">{a.label}</span>
            <span className="text-xs text-gray-500">{a.sub}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => onApply(selected, aspect.ratio)}
        disabled={processing}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {processing ? '处理中...' : '应用裁剪'}
      </button>
    </div>
  )
}
