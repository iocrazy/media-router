import { useState } from 'react'

interface Filter {
  id: string
  label: string
  color: string
  category: string
}

const filters: Filter[] = [
  // 自然
  { id: 'grayscale', label: '黑白', color: '#6B7280', category: '自然' },
  { id: 'warm', label: '暖阳', color: '#F59E0B', category: '自然' },
  { id: 'cool', label: '冷调', color: '#3B82F6', category: '自然' },
  { id: 'vivid', label: '鲜艳', color: '#EC4899', category: '自然' },
  // 人像
  { id: 'soft', label: '柔光', color: '#FDE68A', category: '人像' },
  { id: 'portrait', label: '人像', color: '#FBBF24', category: '人像' },
  { id: 'rosy', label: '红润', color: '#FB7185', category: '人像' },
  { id: 'fair', label: '白皙', color: '#F0F0F0', category: '人像' },
  // 美食
  { id: 'appetite', label: '食欲', color: '#F97316', category: '美食' },
  { id: 'fresh', label: '清新', color: '#34D399', category: '美食' },
  { id: 'golden', label: '金黄', color: '#D97706', category: '美食' },
  // 风景
  { id: 'vintage', label: '复古', color: '#92400E', category: '风景' },
  { id: 'sunset', label: '日落', color: '#F87171', category: '风景' },
  { id: 'forest', label: '森林', color: '#059669', category: '风景' },
  { id: 'ocean', label: '海洋', color: '#0EA5E9', category: '风景' },
]

const categories = ['全部', '自然', '人像', '美食', '风景']

interface FilterPanelProps {
  processing: boolean
  onApply: (filterName: string, intensity: number) => void
}

export default function FilterPanel({ processing, onApply }: FilterPanelProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [category, setCategory] = useState('全部')
  const [intensity, setIntensity] = useState(80)

  const filtered = category === '全部'
    ? filters
    : filters.filter((f) => f.category === category)

  return (
    <div className="px-4 space-y-3">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              category === c
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-4 gap-3">
        {filtered.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelected(f.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors ${
              selected === f.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-transparent'
            }`}
          >
            <div
              className="w-12 h-12 rounded-lg"
              style={{ backgroundColor: f.color }}
            />
            <span className="text-xs text-gray-700">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Intensity slider */}
      {selected && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-16">强度</span>
          <input
            type="range"
            min={10}
            max={100}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <span className="text-xs text-gray-500 w-8">{intensity}%</span>
        </div>
      )}

      {/* Apply button */}
      <button
        onClick={() => selected && onApply(selected, intensity / 100)}
        disabled={!selected || processing}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {processing ? '处理中...' : '应用滤镜'}
      </button>
    </div>
  )
}
