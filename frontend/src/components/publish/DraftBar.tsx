import type { Draft, ContentType } from '../../services/api'

interface DraftBarProps {
  drafts: Draft[]
  onLoad: (draft: Draft) => void
  onDelete: (id: string) => void
}

const contentTypeIcon: Record<ContentType, string> = {
  video: '\uD83C\uDFAC',
  image_text: '\uD83D\uDDBC\uFE0F',
  article: '\uD83D\uDCDD',
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

export default function DraftBar({ drafts, onLoad, onDelete }: DraftBarProps) {
  if (drafts.length === 0) return null

  return (
    <div className="overflow-x-auto whitespace-nowrap pb-2 mb-4">
      <div className="inline-flex gap-3">
        {drafts.map((draft) => (
          <button
            key={draft.id}
            type="button"
            onClick={() => onLoad(draft)}
            className="group relative inline-block w-40 shrink-0 rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-blue-400 hover:shadow-sm transition-all"
          >
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(draft.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  onDelete(draft.id)
                }
              }}
              className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 text-xs transition-colors"
            >
              ✕
            </span>
            <div className="text-lg leading-none mb-1">
              {contentTypeIcon[draft.content_type]}
            </div>
            <div className="text-sm font-medium text-gray-900 truncate">
              {draft.title || '无标题'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {relativeTime(draft.updated_at)}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
