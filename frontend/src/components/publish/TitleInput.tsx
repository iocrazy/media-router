interface TitleInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function TitleInput({ value, onChange, placeholder }: TitleInputProps) {
  const maxLength = 100

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
      <label className="block text-sm font-bold text-gray-900 mb-2">
        标题
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '添加作品标题'}
        maxLength={maxLength}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <div className="mt-1 text-right text-xs text-gray-400">
        {value.length}/{maxLength}
      </div>
    </div>
  )
}
