import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, Task } from '../services/api'

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks()
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // Poll for updates on publishing tasks
  useEffect(() => {
    const publishingTasks = tasks.filter((t) => t.status === 'publishing')
    if (publishingTasks.length === 0) return

    const interval = setInterval(async () => {
      for (const task of publishingTasks) {
        try {
          const updated = await api.getTask(task.id)
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? updated : t))
          )
        } catch {
          // ignore
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [tasks])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅'
      case 'failed':
        return '❌'
      case 'pending':
      case 'publishing':
        return '⏳'
      default:
        return '❓'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功'
      case 'failed':
        return '失败'
      case 'pending':
        return '等待中'
      case 'publishing':
        return '发布中'
      default:
        return status
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
        <h1 className="text-2xl font-bold">发布记录</h1>
        <a
          href="/publish"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + 新建发布
        </a>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">还没有发布记录</p>
          <a
            href="/publish"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            去发布
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 bg-white border rounded-lg ${
                task.id === highlightId ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {formatDate(task.created_at)}
                </span>
              </div>

              <div className="space-y-2">
                {task.accounts.map((acc) => (
                  <div
                    key={acc.account_id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                  >
                    <img
                      src={acc.avatar_url || '/default-avatar.png'}
                      alt={acc.username}
                      className="w-6 h-6 rounded-full bg-gray-200"
                    />
                    <span className="text-sm flex-1">{acc.username}</span>
                    <span className="text-sm">
                      {getStatusIcon(acc.status)} {getStatusText(acc.status)}
                    </span>
                    {acc.status === 'success' && acc.published_url && (
                      <a
                        href={acc.published_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm hover:underline"
                      >
                        查看
                      </a>
                    )}
                    {acc.status === 'failed' && acc.error_message && (
                      <span className="text-red-500 text-xs">
                        {acc.error_message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
