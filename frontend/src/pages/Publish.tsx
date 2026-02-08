import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { api } from '../services/api'
import type { Account } from '../services/api'

export default function Publish() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

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

  const handlePublish = async () => {
    if (!videoFile || !title || selectedIds.length === 0) {
      alert('请填写完整信息')
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
      })

      navigate(`/tasks?highlight=${task.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '发布失败')
    } finally {
      setUploading(false)
      setPublishing(false)
    }
  }

  const activeAccounts = accounts.filter((a) => a.status === 'active')

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
            {activeAccounts.map((account) => (
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
            ))}
          </div>
        )}
      </div>

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
        disabled={uploading || publishing || !videoFile || !title || selectedIds.length === 0}
        className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? '上传中...' : publishing ? '发布中...' : '发布到选中账号'}
      </button>
    </div>
  )
}
