import { useState, useEffect } from 'react'

interface TopicPickerProps {
  onSelect: (topic: string) => void
  onClose: () => void
}

const STORAGE_KEY = 'mediahub_topics'
const MAX_RECENT = 20

function loadRecentTopics(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === 'string').slice(0, MAX_RECENT)
    }
    return []
  } catch {
    return []
  }
}

function saveRecentTopic(topic: string) {
  const existing = loadRecentTopics()
  const filtered = existing.filter((t) => t !== topic)
  const updated = [topic, ...filtered].slice(0, MAX_RECENT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export default function TopicPicker({ onSelect, onClose }: TopicPickerProps) {
  const [input, setInput] = useState('')
  const [recentTopics, setRecentTopics] = useState<string[]>([])

  useEffect(() => {
    setRecentTopics(loadRecentTopics())
  }, [])

  const handleAdd = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    saveRecentTopic(trimmed)
    setRecentTopics(loadRecentTopics())
    onSelect(trimmed)
    setInput('')
  }

  const handleSelectRecent = (topic: string) => {
    saveRecentTopic(topic)
    setRecentTopics(loadRecentTopics())
    onSelect(topic)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full bg-white rounded-t-xl max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">添加话题</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入话题名称"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!input.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            添加
          </button>
        </div>

        {/* Recent topics */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {recentTopics.length > 0 && (
            <>
              <p className="text-xs text-gray-500 mb-2">常用话题</p>
              <div className="flex flex-wrap gap-2">
                {recentTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleSelectRecent(topic)}
                    className="bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                  >
                    #{topic}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
