import { useState } from 'react'

const stickerCategories = ['热门', '表情', '装饰', '文字']

const stickers: Record<string, string[]> = {
  '热门': ['😀', '😂', '🥰', '😎', '🤩', '🎉', '❤️', '⭐', '🔥', '👍', '💯', '🎵', '📸', '✈️', '🌈', '🍕'],
  '表情': ['😊', '😁', '🤣', '😍', '🥳', '😜', '🤗', '😴', '🤔', '😱', '🥺', '😈', '👻', '💀', '🤖', '👽'],
  '装饰': ['✨', '💫', '🌟', '💥', '🎀', '🎁', '🎈', '🎊', '💝', '💖', '🌸', '🍀', '🦋', '🌙', '☀️', '🌊'],
  '文字': ['💪', '🎯', '👑', '💎', '🏆', '📌', '🚀', '💡', '⚡', '🎬', '📝', '💻', '🎨', '🎭', '🎪', '🎠'],
}

interface StickerPanelProps {
  onSelect: (emoji: string) => void
}

export default function StickerPanel({ onSelect }: StickerPanelProps) {
  const [category, setCategory] = useState('热门')

  return (
    <div className="px-4 space-y-3">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {stickerCategories.map((c) => (
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

      {/* Sticker grid */}
      <div className="grid grid-cols-8 gap-1">
        {stickers[category].map((emoji, i) => (
          <button
            key={`${category}-${i}`}
            onClick={() => onSelect(emoji)}
            className="w-10 h-10 flex items-center justify-center text-2xl rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        选择后添加到画布，可自由拖拽调整位置
      </p>
    </div>
  )
}
