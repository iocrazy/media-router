import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import type { Account } from '../services/api'
import { PLATFORMS, getPlatform } from '../config/platforms'

function AccountCard({
  account,
  onRefresh,
  onDelete,
}: {
  account: Account
  onRefresh: (id: string) => void
  onDelete: (id: string) => void
}) {
  const isActive = account.status === 'active'
  const platform = getPlatform(account.platform)
  const PlatformIcon = platform.icon

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-52 overflow-hidden hover:shadow-md transition-shadow">
      {/* Status badge */}
      <div className="flex justify-end p-3 pb-0">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isActive
              ? 'bg-green-50 text-green-600'
              : 'bg-red-50 text-red-500'
          }`}
        >
          {isActive ? '正常' : '已失效'}
        </span>
      </div>

      {/* Avatar + Info */}
      <div className="flex flex-col items-center px-4 pt-1 pb-4">
        <div className="relative">
          <img
            src={account.avatar_url || '/default-avatar.png'}
            alt={account.username}
            className="w-16 h-16 rounded-full bg-gray-100 object-cover ring-2 ring-gray-100"
          />
          <div
            className="absolute -bottom-1 -right-1 text-white rounded-full p-0.5"
            style={{ backgroundColor: platform.bgColor }}
          >
            <PlatformIcon className="w-4 h-4" />
          </div>
        </div>

        <p className="mt-3 font-semibold text-gray-900 text-sm">{account.username}</p>
        <p className="text-xs text-gray-400 mt-1">{platform.name}账号</p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Actions */}
      <div className="flex divide-x divide-gray-100">
        {!isActive ? (
          <>
            <button
              onClick={() => onRefresh(account.id)}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新登录
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
          </>
        ) : (
          <button
            onClick={() => onDelete(account.id)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        )}
      </div>
    </div>
  )
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPlatformMenu, setShowPlatformMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchAccounts = async () => {
    try {
      const data = await api.getAccounts()
      setAccounts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlError = params.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
      window.history.replaceState({}, '', window.location.pathname)
    }
    fetchAccounts()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPlatformMenu(false)
      }
    }
    if (showPlatformMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPlatformMenu])

  const handleAddAccount = async (platform: string) => {
    setShowPlatformMenu(false)
    const url = await api.getPlatformAuthUrl(platform)
    window.location.href = url
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个账号吗？')) return
    try {
      await api.deleteAccount(id)
      setAccounts(accounts.filter((a) => a.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleRefresh = async (id: string) => {
    try {
      const updated = await api.refreshAccount(id)
      setAccounts(accounts.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      alert(err instanceof Error ? err.message : '刷新失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  const AddAccountButton = () => (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowPlatformMenu(!showPlatformMenu)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        + 添加账号
      </button>
      {showPlatformMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          {Object.entries(PLATFORMS).map(([key, platform]) => {
            const Icon = platform.icon
            return (
              <button
                key={key}
                onClick={() => handleAddAccount(key)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full text-white"
                  style={{ backgroundColor: platform.bgColor }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                {platform.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">账号管理</h1>
        <AddAccountButton />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <div className="flex justify-center gap-3 text-4xl mb-3 text-gray-300">
            {Object.entries(PLATFORMS).map(([key, platform]) => {
              const Icon = platform.icon
              return (
                <span key={key} className="opacity-40">
                  <Icon className="w-8 h-8" />
                </span>
              )
            })}
          </div>
          <p className="text-gray-400 mb-4">还没有绑定任何账号</p>
          <div className="flex justify-center gap-3">
            {Object.entries(PLATFORMS).map(([key, platform]) => {
              const Icon = platform.icon
              return (
                <button
                  key={key}
                  onClick={() => handleAddAccount(key)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-md hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: platform.bgColor }}
                >
                  <Icon className="w-4 h-4" />
                  添加{platform.name}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onRefresh={handleRefresh}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
