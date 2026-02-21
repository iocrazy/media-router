import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Account, AccountConfig } from '../../services/api'
import { getPlatform } from '../../config/platforms'

interface AccountSelectorProps {
  accounts: Account[]
  selectedIds: string[]
  onToggle: (id: string) => void
  accountConfigs: Record<string, AccountConfig>
  onConfigChange: (id: string, config: AccountConfig) => void
}

export default function AccountSelector({
  accounts,
  selectedIds,
  onToggle,
  accountConfigs,
  onConfigChange,
}: AccountSelectorProps) {
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const filteredAccounts = accounts.filter((acc) =>
    acc.username.toLowerCase().includes(search.toLowerCase())
  )

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleConfigField = (
    id: string,
    field: keyof AccountConfig,
    value: string
  ) => {
    const current = accountConfigs[id] || {}
    onConfigChange(id, { ...current, [field]: value })
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
      <label className="block text-sm font-bold text-gray-900 mb-2">
        选择发布账号
      </label>

      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索账号..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
      />

      {/* Account list */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-2">没有可用账号</p>
          <Link
            to="/accounts"
            className="text-sm text-blue-600 hover:underline"
          >
            去绑定账号
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAccounts.map((acc) => {
            const isSelected = selectedIds.includes(acc.id)
            const isExpanded = isSelected && expandedIds.has(acc.id)
            const platform = getPlatform(acc.platform)
            const PlatformIcon = platform.icon

            return (
              <div key={acc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Account row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => onToggle(acc.id)}
                >
                  {/* Platform icon badge + avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={acc.avatar_url || '/default-avatar.png'}
                      alt={acc.username}
                      className="w-8 h-8 rounded-full bg-gray-200"
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full text-white"
                      style={{ backgroundColor: platform.bgColor }}
                    >
                      <PlatformIcon className="w-2.5 h-2.5" />
                    </span>
                  </div>

                  {/* Username */}
                  <span className="text-sm flex-1 truncate">{acc.username}</span>

                  {/* Status */}
                  {acc.status === 'active' ? (
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  ) : (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full shrink-0">
                      已过期
                    </span>
                  )}

                  {/* Selection indicator */}
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Expand arrow for selected accounts */}
                {isSelected && (
                  <div className="border-t border-gray-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(acc.id)
                      }}
                      className="w-full flex items-center justify-center py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Per-account config panel */}
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2">
                        <input
                          type="text"
                          value={accountConfigs[acc.id]?.title || ''}
                          onChange={(e) =>
                            handleConfigField(acc.id, 'title', e.target.value)
                          }
                          placeholder="留空使用全局标题"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <textarea
                          value={accountConfigs[acc.id]?.description || ''}
                          onChange={(e) =>
                            handleConfigField(acc.id, 'description', e.target.value)
                          }
                          placeholder="留空使用全局描述"
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
