import { useState } from 'react'
import AiResultGrid from './AiResultGrid'

const styleOptions = [
  { id: 'realistic', label: '写实', icon: '📷' },
  { id: 'anime', label: '动漫', icon: '🎨' },
  { id: 'illustration', label: '插画', icon: '✏️' },
  { id: '3d', label: '3D', icon: '🧊' },
]

const sizeOptions = [
  { id: 'portrait', label: '竖屏 9:16', icon: '📱' },
  { id: 'landscape', label: '横屏 16:9', icon: '🖥️' },
  { id: 'square', label: '方形 1:1', icon: '⬜' },
]

interface AiCreatorProps {
  onBack: () => void
  onUseResult: (type: 'image' | 'video') => void
}

export default function AiCreator({ onBack, onUseResult }: AiCreatorProps) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('realistic')
  const [size, setSize] = useState('portrait')
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [selectedResult, setSelectedResult] = useState<number | null>(null)

  const handleGenerate = async (type: 'image' | 'video') => {
    if (!prompt.trim()) return
    setGenerating(true)
    setResults([])
    setSelectedResult(null)

    // Simulate AI generation
    await new Promise((r) => setTimeout(r, 2000))

    // Mock results
    const mockResults = type === 'image'
      ? ['🖼️', '🎨', '🌄', '🏙️']
      : ['🎬', '📽️', '🎥']
    setResults(mockResults)
    setGenerating(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600"
        >
          ← 返回
        </button>
        <h2 className="text-lg font-bold">AI 创作</h2>
      </div>

      {/* Prompt input */}
      <div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要的画面内容，例如：一只猫在花园里玩耍，阳光明媚..."
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Style selector */}
      <div>
        <p className="text-xs text-gray-500 mb-2">风格</p>
        <div className="flex gap-2">
          {styleOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-colors ${
                style === s.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Size selector */}
      <div>
        <p className="text-xs text-gray-500 mb-2">尺寸</p>
        <div className="flex gap-2">
          {sizeOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSize(s.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm transition-colors ${
                size === s.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleGenerate('image')}
          disabled={!prompt.trim() || generating}
          className="py-3 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {generating ? '生成中...' : '✨ 生成图片'}
        </button>
        <button
          onClick={() => handleGenerate('video')}
          disabled={!prompt.trim() || generating}
          className="py-3 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {generating ? '生成中...' : '🎬 生成视频'}
        </button>
      </div>

      {/* Loading */}
      {generating && (
        <div className="text-center py-6">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 mt-2">AI 正在创作中...</p>
        </div>
      )}

      {/* Results */}
      <AiResultGrid
        results={results}
        selectedIndex={selectedResult}
        onSelect={setSelectedResult}
      />

      {/* Use result */}
      {selectedResult !== null && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onUseResult('image')}
            className="py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            选择并编辑
          </button>
          <button
            onClick={() => handleGenerate('image')}
            className="py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            重新生成
          </button>
        </div>
      )}
    </div>
  )
}
