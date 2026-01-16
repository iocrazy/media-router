import { useState, useEffect } from 'react'
import { api, Account } from '../services/api'

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
    fetchAccounts()
  }, [])

  const handleAddDouyin = () => {
    window.location.href = api.getDouyinAuthUrl()
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
        <p className="text-red-500 mb-4">{error}</p>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">还没有绑定任何账号</p>
          <button
            onClick={handleAddDouyin}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            添加抖音账号
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center p-4 bg-white border rounded-lg"
            >
              <img
                src={account.avatar_url || '/default-avatar.png'}
                alt={account.username}
                className="w-12 h-12 rounded-full bg-gray-200"
              />
              <div className="ml-4 flex-1">
                <p className="font-medium">{account.username}</p>
                <p className="text-sm text-gray-500">
                  @{account.platform_user_id}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {account.status === 'active' ? (
                  <span className="text-green-600 text-sm">✅ 正常</span>
                ) : (
                  <>
                    <span className="text-orange-500 text-sm">⚠️ 已过期</span>
                    <button
                      onClick={() => handleRefresh(account.id)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      重新授权
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(account.id)}
                  className="text-red-500 text-sm hover:underline"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
