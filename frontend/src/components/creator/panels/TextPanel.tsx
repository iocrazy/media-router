import { useState } from 'react'

interface SubtitleStyle {
  id: string
  label: string
  preview: string
  fontColor: string
  strokeColor?: string
  bgColor?: string
}

const subtitleStyles: SubtitleStyle[] = [
  { id: 'classic', label: '经典白字', preview: '白底黑边', fontColor: '#FFFFFF', strokeColor: '#000000' },
  { id: 'rainbow', label: '彩虹字', preview: '渐变彩色', fontColor: '#FF6B6B' },
  { id: 'bubble', label: '气泡框', preview: '圆角背景', fontColor: '#333333', bgColor: '#FFFFFF' },
  { id: 'neon', label: '霓虹灯', preview: '发光效果', fontColor: '#00FF88', strokeColor: '#00CC66' },
  { id: 'typewriter', label: '打字机', preview: '等宽字体', fontColor: '#F5F5DC' },
  { id: 'danmu', label: '弹幕风', preview: '滚动字幕', fontColor: '#FFFFFF', bgColor: 'rgba(0,0,0,0.5)' },
]

const fontSizes = [24, 32, 48, 64]

interface TextPanelProps {
  processing: boolean
  onApply: (text: string, fontSize: number, color: string, styleId: string) => void
}

export default function TextPanel({ processing, onApply }: TextPanelProps) {
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(32)
  const [selectedStyle, setSelectedStyle] = useState('classic')

  const style = subtitleStyles.find((s) => s.id === selectedStyle)!

  return (
    <div className="px-4 space-y-3">
      {/* Text input */}
      <div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 50))}
          placeholder="输入文字内容..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{text.length}/50</p>
      </div>

      {/* Subtitle style grid */}
      <div>
        <p className="text-xs text-gray-500 mb-2">字幕样式</p>
        <div className="grid grid-cols-3 gap-2">
          {subtitleStyles.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${
                selectedStyle === s.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <div
                className="text-sm font-bold mb-1 truncate"
                style={{
                  color: s.fontColor,
                  textShadow: s.strokeColor
                    ? `1px 1px 0 ${s.strokeColor}, -1px -1px 0 ${s.strokeColor}, 1px -1px 0 ${s.strokeColor}, -1px 1px 0 ${s.strokeColor}`
                    : undefined,
                  backgroundColor: s.bgColor || 'transparent',
                  padding: s.bgColor ? '2px 6px' : undefined,
                  borderRadius: s.bgColor ? '4px' : undefined,
                }}
              >
                示例
              </div>
              <span className="text-xs text-gray-600">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div>
        <p className="text-xs text-gray-500 mb-2">字号</p>
        <div className="flex gap-2">
          {fontSizes.map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`flex-1 py-2 rounded-lg text-sm ${
                fontSize === size
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Apply */}
      <button
        onClick={() => text && onApply(text, fontSize, style.fontColor, selectedStyle)}
        disabled={!text.trim() || processing}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {processing ? '处理中...' : '添加文字'}
      </button>
    </div>
  )
}
