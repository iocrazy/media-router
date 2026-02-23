interface AiResultGridProps {
  results: string[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export default function AiResultGrid({ results, selectedIndex, onSelect }: AiResultGridProps) {
  if (results.length === 0) return null

  return (
    <div>
      <p className="text-sm font-medium mb-2">生成结果</p>
      <div className="grid grid-cols-3 gap-2">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`aspect-[3/4] rounded-lg border-2 flex items-center justify-center text-4xl bg-gray-100 transition-colors ${
              selectedIndex === i
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  )
}
