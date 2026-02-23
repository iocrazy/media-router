import type { ReactNode } from 'react'

export type ToolType =
  | 'trim'
  | 'concat'
  | 'speed'
  | 'crop'
  | 'text'
  | 'filter'
  | 'music'
  | 'sticker'
  | 'canvas'

interface Tool {
  id: ToolType
  label: string
  icon: ReactNode
}

const iconClass = 'w-5 h-5'

const tools: Tool[] = [
  {
    id: 'trim',
    label: '裁剪',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L4.939 4.939m5.182 5.182L4.939 15.303" />
      </svg>
    ),
  },
  {
    id: 'concat',
    label: '拼接',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h4v12H4V6zm6 0h4v12h-4V6zm6 0h4v12h-4V6z" />
      </svg>
    ),
  },
  {
    id: 'speed',
    label: '调速',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'crop',
    label: '画面',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4H3m14 0h4m-4 14v4M3 17h4m10 0h4M7 21v-4" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: '文字',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M8 6v12m4-12v12" />
      </svg>
    ),
  },
  {
    id: 'filter',
    label: '滤镜',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm0 0v9l6.36 3.64" />
      </svg>
    ),
  },
  {
    id: 'music',
    label: '音乐',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    ),
  },
  {
    id: 'sticker',
    label: '贴纸',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'canvas',
    label: '画布',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </svg>
    ),
  },
]

interface ToolBarProps {
  active: ToolType | null
  onChange: (tool: ToolType | null) => void
  disabled?: boolean
}

export default function ToolBar({ active, onChange, disabled }: ToolBarProps) {
  return (
    <div className="px-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tools.map((tool) => {
          const isActive = active === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => onChange(isActive ? null : tool.id)}
              disabled={disabled}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[56px] transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tool.icon}
              <span className="text-xs whitespace-nowrap">{tool.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
