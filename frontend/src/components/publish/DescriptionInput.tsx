interface DescriptionInputProps {
  value: string
  onChange: (v: string) => void
  onAddTopic?: () => void
}

export default function DescriptionInput({ value, onChange, onAddTopic }: DescriptionInputProps) {
  const maxLength = 5000

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
      <label className="block text-sm font-bold text-gray-900 mb-2">
        描述
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="添加作品描述..."
        rows={4}
        maxLength={maxLength}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <div className="mt-1 text-right text-xs text-gray-400">
        {value.length}/{maxLength}
      </div>
      <div className="mt-2 flex flex-row gap-2">
        <button
          type="button"
          onClick={onAddTopic}
          className="border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100"
        >
          #添加话题
        </button>
      </div>
    </div>
  )
}
