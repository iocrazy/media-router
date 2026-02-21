import type { Visibility } from '../../services/api'

interface VisibilitySelectorProps {
  value: Visibility
  onChange: (v: Visibility) => void
}

const options: { label: string; value: Visibility }[] = [
  { label: '公开', value: 'public' },
  { label: '私密', value: 'private' },
  { label: '仅自己可见', value: 'draft' },
]

export default function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
      <label className="block text-sm font-bold text-gray-900 mb-2">
        谁可以看
      </label>
      <div className="flex flex-row gap-2">
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
