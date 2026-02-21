import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { api } from '../services/api'
import type { Account, Task } from '../services/api'
import { getPlatform } from '../config/platforms'

function SharePanel({ task }: { task: Task }) {
  const [schemaUrl, setSchemaUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.getShareSchema(task.id).then((res) => {
      setSchemaUrl(res.schema_url)
    }).catch((err) => {
      console.error('Failed to get share schema:', err)
    }).finally(() => setLoading(false))
  }, [task.id])

  const handleOpenDouyin = () => {
    if (schemaUrl) {
      window.location.href = schemaUrl
    }
  }

  const handleCopy = async () => {
    if (!schemaUrl) return
    try {
      await navigator.clipboard.writeText(schemaUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = schemaUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">正在生成分享链接...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-green-800 mb-1">任务创建成功</h2>
        <p className="text-sm text-green-600">
          请使用抖音完成发布
        </p>
      </div>

      {schemaUrl && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="font-medium mb-4 text-center">发布到抖音</h3>

          {/* Mobile: Direct open button */}
          <button
            onClick={handleOpenDouyin}
            className="w-full py-3 bg-black text-white rounded-lg font-medium mb-3 active:bg-gray-800"
          >
            打开抖音发布
          </button>

          <p className="text-xs text-gray-400 text-center mb-4">
            点击后将跳转到抖音 App 的发布页，视频和标题已自动填入
          </p>

          {/* Desktop fallback: Copy link */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-2">
              如果无法自动跳转，请复制以下链接在手机浏览器中打开：
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={schemaUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 truncate"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 shrink-0"
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!schemaUrl && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            无法生成分享链接，请在发布记录页手动重试
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/tasks')}
          className="flex-1 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          查看发布记录
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex-1 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          继续发布
        </button>
      </div>
    </div>
  )
}

export default function Publish() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [createdTask, setCreatedTask] = useState<Task | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getAccounts().then(setAccounts).catch(console.error)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
    }
  }

  const toggleAccount = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const getScheduledISOString = (): string | undefined => {
    if (!isScheduled || !scheduledDate || !scheduledTime) return undefined
    const localDate = new Date(`${scheduledDate}T${scheduledTime}`)
    return localDate.toISOString()
  }

  const isScheduleValid = (): boolean => {
    if (!isScheduled) return true
    if (!scheduledDate || !scheduledTime) return false
    const scheduled = new Date(`${scheduledDate}T${scheduledTime}`)
    return scheduled.getTime() > Date.now()
  }

  const handlePublish = async () => {
    if (!videoFile || !title || selectedIds.length === 0) {
      alert('请填写完整信息')
      return
    }

    if (isScheduled && !isScheduleValid()) {
      alert('定时发布时间必须晚于当前时间')
      return
    }

    try {
      // 1. Upload video to Supabase Storage
      setUploading(true)
      const fileName = `${Date.now()}-${videoFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, videoFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(uploadData.path)

      setUploading(false)

      // 2. Create publish task
      setPublishing(true)
      const task = await api.createTask({
        title,
        description,
        video_url: urlData.publicUrl,
        account_ids: selectedIds,
        scheduled_at: getScheduledISOString(),
      })

      // 3. Show share panel (for H5 share flow)
      setCreatedTask(task)
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败')
    } finally {
      setUploading(false)
      setPublishing(false)
    }
  }

  // If task was created, show share panel
  if (createdTask) {
    return <SharePanel task={createdTask} />
  }

  const activeAccounts = accounts.filter((a) => a.status === 'active')

  // Set default scheduled time to 1 hour from now
  const handleScheduleToggle = (scheduled: boolean) => {
    setIsScheduled(scheduled)
    if (scheduled && !scheduledDate) {
      const now = new Date(Date.now() + 60 * 60 * 1000)
      setScheduledDate(now.toISOString().split('T')[0])
      setScheduledTime(now.toTimeString().slice(0, 5))
    }
  }

  // Min date for the date picker (today)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">发布视频</h1>

      {/* Video Upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors mb-6"
      >
        {videoPreview ? (
          <video
            src={videoPreview}
            className="max-h-64 mx-auto rounded"
            controls
          />
        ) : (
          <div>
            <p className="text-gray-500 mb-2">拖拽或点击上传视频</p>
            <p className="text-sm text-gray-400">支持 MP4, MOV 格式</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          标题 *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入视频标题"
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          描述
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="输入视频描述，可以添加 #话题"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Account Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择发布账号 *
        </label>
        {activeAccounts.length === 0 ? (
          <p className="text-gray-500 text-sm">
            没有可用账号，请先
            <a href="/accounts" className="text-blue-600 hover:underline">
              添加账号
            </a>
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {activeAccounts.map((account) => {
              const platform = getPlatform(account.platform)
              const PlatformIcon = platform.icon
              return (
                <label
                  key={account.id}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedIds.includes(account.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(account.id)}
                    onChange={() => toggleAccount(account.id)}
                    className="hidden"
                  />
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full text-white shrink-0"
                    style={{ backgroundColor: platform.bgColor }}
                  >
                    <PlatformIcon className="w-3 h-3" />
                  </span>
                  <img
                    src={account.avatar_url || '/default-avatar.png'}
                    alt={account.username}
                    className="w-8 h-8 rounded-full bg-gray-200"
                  />
                  <span className="text-sm">{account.username}</span>
                  {selectedIds.includes(account.id) && (
                    <span className="text-blue-600">✓</span>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Publish Mode Toggle */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          发布方式
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleScheduleToggle(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isScheduled
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            立即发布
          </button>
          <button
            type="button"
            onClick={() => handleScheduleToggle(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isScheduled
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            定时发布
          </button>
        </div>
      </div>

      {/* Schedule DateTime Picker */}
      {isScheduled && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-sm font-medium text-blue-800 mb-2">
            选择发布时间
          </label>
          <div className="flex gap-3">
            <input
              type="date"
              value={scheduledDate}
              min={today}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          {scheduledDate && scheduledTime && !isScheduleValid() && (
            <p className="text-red-500 text-xs mt-2">
              定时发布时间必须晚于当前时间
            </p>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 animate-pulse w-full" />
          </div>
          <p className="text-sm text-gray-500 mt-1">上传中...</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handlePublish}
        disabled={
          uploading ||
          publishing ||
          !videoFile ||
          !title ||
          selectedIds.length === 0 ||
          (isScheduled && !isScheduleValid())
        }
        className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading
          ? '上传中...'
          : publishing
            ? '提交中...'
            : isScheduled
              ? '设置定时发布'
              : '创建发布任务'}
      </button>
    </div>
  )
}
