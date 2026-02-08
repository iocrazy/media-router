import { useState, useEffect } from 'react'
import { api } from '../services/api'
import type { Account } from '../services/api'

const DouyinIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z" />
  </svg>
)

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-56 overflow-hidden">
      {/* Status badge */}
      <div className="flex justify-end p-3 pb-0">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            isActive
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
        >
          {isActive ? '正常' : '已失效'}
        </span>
      </div>

      {/* Avatar + Info */}
      <div className="flex flex-col items-center px-4 pb-4">
        <div className="relative">
          <img
            src={account.avatar_url || '/default-avatar.png'}
            alt={account.username}
            className="w-16 h-16 rounded-full bg-gray-200 object-cover"
          />
          <div className="absolute -bottom-1 -right-1 bg-black text-white rounded-full p-0.5">
            <DouyinIcon />
          </div>
        </div>

        <p className="mt-3 font-semibold text-gray-900">{account.username}</p>
        <p className="text-xs text-gray-400 mt-0.5">@{account.platform_user_id}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Actions */}
      <div className="flex divide-x divide-gray-100">
        {!isActive && (
          <button
            onClick={() => onRefresh(account.id)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新登录
          </button>
        )}
        <button
          onClick={() => onDelete(account.id)}
          className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          删除
        </button>
      </div>
    </div>
  )
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleAddDouyin = async () => {
    const url = await api.getDouyinAuthUrl()
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">账号管理</h1>
        <button
          onClick={handleAddDouyin}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + 添加抖音账号
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <div className="text-4xl mb-3 text-gray-300">
            <DouyinIcon />
          </div>
          <p className="text-gray-400 mb-4">还没有绑定任何账号</p>
          <button
            onClick={handleAddDouyin}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            添加抖音账号
          </button>
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
