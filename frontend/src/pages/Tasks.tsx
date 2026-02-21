import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import type { Task } from '../services/api'
import { getPlatform } from '../config/platforms'

function Countdown({ scheduledAt }: { scheduledAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(scheduledAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('即将发布')
        return
      }
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      if (hours > 0) {
        setRemaining(`${hours}小时${minutes}分钟后发布`)
      } else if (minutes > 0) {
        setRemaining(`${minutes}分${seconds}秒后发布`)
      } else {
        setRemaining(`${seconds}秒后发布`)
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [scheduledAt])

  return <span className="text-blue-600 text-sm font-medium">{remaining}</span>
}

function ShareButton({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState(false)

  const handleShare = async () => {
    setLoading(true)
    try {
      const res = await api.getShareSchema(taskId)
      // On mobile, try to open Douyin directly
      window.location.href = res.schema_url
    } catch (err) {
      alert(err instanceof Error ? err.message : '获取分享链接失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="text-xs px-3 py-1 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
    >
      {loading ? '加载中...' : '打开抖音发布'}
    </button>
  )
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(new Set())
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

  // Poll for updates on active tasks
  useEffect(() => {
    const activeTasks = tasks.filter(
      (t) => t.status === 'publishing' || t.status === 'scheduled' || t.status === 'pending_share'
    )
    if (activeTasks.length === 0) return

    const interval = setInterval(async () => {
      for (const task of activeTasks) {
        try {
          const updated = await api.getTask(task.id)
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? updated : t))
          )
        } catch {
          // ignore
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [tasks])

  const handleCancel = async (taskId: string) => {
    if (!confirm('确定取消这个定时发布任务吗？')) return

    setCancellingId(taskId)
    try {
      const updated = await api.cancelTask(taskId)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消失败')
    } finally {
      setCancellingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return { text: '视频', color: 'bg-purple-100 text-purple-700' }
      case 'image_text':
        return { text: '图文', color: 'bg-teal-100 text-teal-700' }
      case 'article':
        return { text: '文章', color: 'bg-amber-100 text-amber-700' }
      default:
        return { text: type, color: 'bg-gray-100 text-gray-700' }
    }
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
      case 'pending_share':
        return '📤'
      case 'scheduled':
        return '🕐'
      case 'cancelled':
        return '🚫'
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
      case 'pending_share':
        return '待分享'
      case 'scheduled':
        return '定时发布'
      case 'cancelled':
        return '已取消'
      default:
        return status
    }
  }

  const toggleBatch = (batchId: string) => {
    setExpandedBatchIds((prev) => {
      const next = new Set(prev)
      if (next.has(batchId)) {
        next.delete(batchId)
      } else {
        next.add(batchId)
      }
      return next
    })
  }

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return { text: '私密', color: 'bg-red-100 text-red-700' }
      case 'draft':
        return { text: '仅自己', color: 'bg-gray-100 text-gray-500' }
      default:
        return null
    }
  }

  const getDistributionModeLabel = (mode: string) => {
    switch (mode) {
      case 'broadcast':
        return '广播模式'
      case 'one_to_one':
        return '轮流模式'
      default:
        return mode
    }
  }

  const getTaskCardClass = (task: Task) => {
    const base = 'p-4 border rounded-lg'
    const highlight = task.id === highlightId ? ' ring-2 ring-blue-500' : ''

    switch (task.status) {
      case 'pending_share':
        return `${base} bg-orange-50 border-orange-200${highlight}`
      case 'scheduled':
        return `${base} bg-blue-50 border-blue-200${highlight}`
      case 'cancelled':
        return `${base} bg-gray-50 border-gray-200${highlight}`
      default:
        return `${base} bg-white${highlight}`
    }
  }

  const renderTaskCard = (task: Task) => (
    <div key={task.id} className={getTaskCardClass(task)}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium">{task.title}</h3>
            {(() => {
              const ct = getContentTypeLabel(task.content_type || 'video')
              return (
                <span className={`text-xs px-2 py-0.5 rounded-full ${ct.color}`}>
                  {ct.text}
                </span>
              )
            })()}
            {(() => {
              const vb = getVisibilityBadge(task.visibility)
              return vb ? (
                <span className={`text-xs px-2 py-0.5 rounded-full ${vb.color}`}>
                  {vb.text}
                </span>
              ) : null
            })()}
            {task.ai_content && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                AI
              </span>
            )}
            {task.status === 'pending_share' && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                待分享
              </span>
            )}
            {task.status === 'scheduled' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                定时
              </span>
            )}
            {task.status === 'cancelled' && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                已取消
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1">
              {task.description}
            </p>
          )}
          {task.topics && task.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {task.topics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5"
                >
                  #{topic}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.status === 'pending_share' && (task.content_type || 'video') === 'video' && (
            <ShareButton taskId={task.id} />
          )}
          {task.status === 'scheduled' && (
            <button
              onClick={() => handleCancel(task.id)}
              disabled={cancellingId === task.id}
              className="text-xs px-2 py-1 text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
            >
              {cancellingId === task.id ? '取消中...' : '取消'}
            </button>
          )}
          <span className="text-sm text-gray-400">
            {formatDate(task.created_at)}
          </span>
        </div>
      </div>

      {/* Pending share hint */}
      {task.status === 'pending_share' && (task.content_type || 'video') === 'video' && (
        <div className="mb-3 p-2 bg-orange-100 rounded text-sm text-orange-800">
          请点击「打开抖音发布」按钮，在抖音 App 中确认发布
        </div>
      )}

      {/* Scheduled task countdown */}
      {task.status === 'scheduled' && task.scheduled_at && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-gray-500">
            计划时间: {formatDate(task.scheduled_at)}
          </span>
          <span className="text-gray-300">|</span>
          <Countdown scheduledAt={task.scheduled_at} />
        </div>
      )}

      <div className="space-y-2">
        {task.accounts.map((acc) => {
          // TODO: Use acc.platform once the API returns it in TaskAccount
          const accAny = acc as unknown as { platform?: string }
          const platform = getPlatform(accAny.platform || 'douyin')
          const PlatformIcon = platform.icon
          return (
            <div
              key={acc.account_id}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded"
            >
              <div className="relative shrink-0">
                <img
                  src={acc.avatar_url || '/default-avatar.png'}
                  alt={acc.username}
                  className="w-6 h-6 rounded-full bg-gray-200"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full text-white"
                  style={{ backgroundColor: platform.bgColor }}
                >
                  <PlatformIcon className="w-2 h-2" />
                </span>
              </div>
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
          )
        })}
      </div>
    </div>
  )

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
          {(() => {
            // Group tasks: batch tasks grouped by batch_id, non-batch tasks standalone
            const batchGroups = new Map<string, Task[]>()
            const standalone: Task[] = []
            // Maintain insertion order for rendering
            const orderedItems: Array<{ type: 'batch'; batchId: string } | { type: 'standalone'; task: Task }> = []
            const seenBatchIds = new Set<string>()

            for (const task of tasks) {
              if (task.batch_id) {
                if (!batchGroups.has(task.batch_id)) {
                  batchGroups.set(task.batch_id, [])
                }
                batchGroups.get(task.batch_id)!.push(task)
                if (!seenBatchIds.has(task.batch_id)) {
                  seenBatchIds.add(task.batch_id)
                  orderedItems.push({ type: 'batch', batchId: task.batch_id })
                }
              } else {
                standalone.push(task)
                orderedItems.push({ type: 'standalone', task })
              }
            }

            return orderedItems.map((item) => {
              if (item.type === 'standalone') {
                const task = item.task
                return renderTaskCard(task)
              }

              // Batch group
              const batchId = item.batchId
              const batchTasks = batchGroups.get(batchId)!
              const isExpanded = expandedBatchIds.has(batchId)
              const firstTask = batchTasks[0]

              return (
                <div key={`batch-${batchId}`} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleBatch(batchId)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        批量任务 ({batchTasks.length})
                      </span>
                      {firstTask.distribution_mode && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {getDistributionModeLabel(firstTask.distribution_mode)}
                        </span>
                      )}
                      {!isExpanded && (
                        <span className="text-sm text-gray-500">
                          {firstTask.title}
                          {batchTasks.length > 1 && ` 等 ${batchTasks.length} 个任务`}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm shrink-0 ml-2">
                      {isExpanded ? '收起' : '展开'}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-4 p-4">
                      {batchTasks.map((task) => renderTaskCard(task))}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}
    </div>
  )
}
