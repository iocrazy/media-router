interface Template {
  id: string
  name: string
  icon: string
  desc: string
  color: string
}

const templates: Template[] = [
  { id: 'vlog', name: 'Vlog', icon: '📷', desc: '日常记录', color: '#EFF6FF' },
  { id: 'rhythm', name: '卡点', icon: '🎬', desc: '节奏卡点', color: '#FEF3C7' },
  { id: 'ecom', name: '带货', icon: '🛍️', desc: '产品展示', color: '#FEE2E2' },
  { id: 'photo', name: '图文', icon: '📖', desc: '图片故事', color: '#ECFDF5' },
  { id: 'music', name: '音乐', icon: '🎵', desc: '音乐混剪', color: '#EDE9FE' },
  { id: 'effect', name: '特效', icon: '✨', desc: '炫酷特效', color: '#FDF4FF' },
  { id: 'tutorial', name: '教程', icon: '📚', desc: '知识分享', color: '#F0F9FF' },
  { id: 'food', name: '美食', icon: '🍜', desc: '美食探店', color: '#FFF7ED' },
]

interface TemplatePickerProps {
  onSelect: (templateId: string) => void
  onFreeEdit: () => void
  onAiCreate: () => void
}

export default function TemplatePicker({ onSelect, onFreeEdit, onAiCreate }: TemplatePickerProps) {
  return (
    <div className="space-y-6">
      {/* Template grid */}
      <div>
        <h2 className="text-lg font-bold mb-3">从模板开始创作</h2>
        <div className="grid grid-cols-4 gap-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all active:scale-95"
              style={{ backgroundColor: t.color }}
            >
              <span className="text-3xl">{t.icon}</span>
              <span className="text-sm font-medium">{t.name}</span>
              <span className="text-xs text-gray-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-sm text-gray-400">或</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Free edit & AI buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onFreeEdit}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium text-gray-700">自由编辑</span>
          <span className="text-xs text-gray-400">选择视频开始</span>
        </button>

        <button
          onClick={onAiCreate}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-400 hover:bg-purple-50 transition-colors"
        >
          <span className="text-3xl">🤖</span>
          <span className="text-sm font-medium text-purple-700">AI 创作</span>
          <span className="text-xs text-gray-400">智能生成内容</span>
        </button>
      </div>
    </div>
  )
}
