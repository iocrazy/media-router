interface AiContentToggleProps {
  value: boolean
  onChange: (v: boolean) => void
}

export default function AiContentToggle({ value, onChange }: AiContentToggleProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-900">
          包含AI生成内容
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${
            value ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
              value ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        支持 抖音、快手、小红书 等平台
      </p>
    </div>
  )
}
