import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../services/api'
import type { Account, Task, ContentType, Visibility, DistributionMode, AccountConfig, Draft } from '../services/api'
import type { VideoFile } from '../components/publish/ContentUpload'
import { supabase } from '../lib/supabase'
import ContentUpload from '../components/publish/ContentUpload'
import CoverUpload from '../components/publish/CoverUpload'
import TitleInput from '../components/publish/TitleInput'
import DescriptionInput from '../components/publish/DescriptionInput'
import AccountSelector from '../components/publish/AccountSelector'
import PublishModeSelector from '../components/publish/PublishModeSelector'
import VisibilitySelector from '../components/publish/VisibilitySelector'
import AiContentToggle from '../components/publish/AiContentToggle'
import TopicPicker from '../components/publish/TopicPicker'
import DraftBar from '../components/publish/DraftBar'
import BatchPreview from '../components/publish/BatchPreview'

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

function SuccessPanel({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate()

  const label = tasks.length > 1
    ? `已创建 ${tasks.length} 个发布任务`
    : tasks[0].content_type === 'image_text'
      ? '图文任务创建成功'
      : '文章任务创建成功'

  const scheduledHint = tasks[0]?.scheduled_at
    ? '任务将在预定时间发布'
    : '任务已提交，等待发布'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-green-800 mb-1">{label}</h2>
        <p className="text-sm text-green-600">
          {scheduledHint}
        </p>
      </div>

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

const CONTENT_TYPES: { type: ContentType; label: string; desc: string; icon: string }[] = [
  { type: 'video', label: '视频', desc: '上传视频文件发布', icon: '🎬' },
  { type: 'image_text', label: '图文', desc: '上传图片配文字发布', icon: '🖼️' },
  { type: 'article', label: '文章', desc: '撰写图文文章发布', icon: '📝' },
]

export default function Publish() {
  // Step
  const [step, setStep] = useState<'select' | 'form' | 'success'>('select')
  const [contentType, setContentType] = useState<ContentType>('video')

  // Content
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [articleContent, setArticleContent] = useState('')

  // Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [aiContent, setAiContent] = useState(false)

  // Accounts
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [accountConfigs, setAccountConfigs] = useState<Record<string, AccountConfig>>({})

  // Publish mode
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('broadcast')
  const [useFilenameAsTitle, setUseFilenameAsTitle] = useState(false)

  // Drafts
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)

  // UI
  const [showTopicPicker, setShowTopicPicker] = useState(false)
  const [showBatchPreview, setShowBatchPreview] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [createdTasks, setCreatedTasks] = useState<Task[]>([])

  const location = useLocation()

  // Load accounts and drafts on mount
  useEffect(() => {
    api.getAccounts().then(setAccounts).catch(console.error)
    api.getDrafts().then(setDrafts).catch(console.error)
  }, [])

  // Accept video from Create page
  useEffect(() => {
    const state = location.state as { videoFile?: File; fromCreator?: boolean } | null
    if (state?.fromCreator && state.videoFile) {
      const file = state.videoFile
      setContentType('video')
      setStep('form')
      setVideoFiles([{ file, name: file.name, url: null, uploading: true }])
      // Upload the file
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
      supabase.storage.from('videos').upload(fileName, file).then(({ data, error }) => {
        if (error) {
          setVideoFiles([{ file, name: file.name, url: null, uploading: false }])
          return
        }
        const { data: urlData } = supabase.storage.from('videos').getPublicUrl(data.path)
        setVideoFiles([{ file, name: file.name, url: urlData.publicUrl, uploading: false }])
      })
      // Clear location state to prevent re-trigger
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const getScheduledISOString = (): string | undefined => {
    if (!isScheduled || !scheduledDate || !scheduledTime) return undefined
    return new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
  }

  const isFormValid = (): boolean => {
    if (!title.trim() || selectedIds.length === 0) return false
    if (contentType === 'video' && videoFiles.filter(f => f.url).length === 0) return false
    if (contentType === 'image_text' && imageUrls.length === 0) return false
    if (contentType === 'article' && !articleContent.trim()) return false
    if (isScheduled && (!scheduledDate || !scheduledTime)) return false
    return true
  }

  const handleSelectType = (type: ContentType) => {
    setContentType(type)
    setStep('form')
  }

  const handleLoadDraft = (draft: Draft) => {
    setContentType(draft.content_type)
    setTitle(draft.title || '')
    setDescription(draft.description || '')
    setVideoFiles(draft.video_urls.map(url => ({ file: new File([], ''), name: url.split('/').pop() || 'video', url, uploading: false })))
    setImageUrls(draft.image_urls)
    setArticleContent(draft.article_content || '')
    setCoverUrl(draft.cover_url)
    setVisibility(draft.visibility)
    setAiContent(draft.ai_content)
    setSelectedIds(draft.account_ids)
    setAccountConfigs(draft.account_configs)
    setDistributionMode(draft.distribution_mode)
    if (draft.scheduled_at) {
      setIsScheduled(true)
      const d = new Date(draft.scheduled_at)
      setScheduledDate(d.toISOString().split('T')[0])
      setScheduledTime(d.toTimeString().slice(0, 5))
    }
    setCurrentDraftId(draft.id)
    setStep('form')
  }

  const handleDeleteDraft = (id: string) => {
    api.deleteDraft(id).then(() => {
      setDrafts(prev => prev.filter(d => d.id !== id))
      if (currentDraftId === id) {
        setCurrentDraftId(null)
      }
    }).catch(console.error)
  }

  const handleSaveDraft = async () => {
    const draftData = {
      content_type: contentType,
      title: title || null,
      description: description || null,
      video_urls: videoFiles.filter(f => f.url).map(f => f.url!),
      image_urls: imageUrls,
      article_content: articleContent || null,
      cover_url: coverUrl,
      visibility,
      ai_content: aiContent,
      topics: [],
      account_ids: selectedIds,
      account_configs: accountConfigs,
      distribution_mode: distributionMode,
      scheduled_at: getScheduledISOString() || null,
    }

    try {
      if (currentDraftId) {
        await api.updateDraft(currentDraftId, draftData)
      } else {
        const saved = await api.createDraft(draftData)
        setCurrentDraftId(saved.id)
      }
      alert('草稿已保存')
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存草稿失败')
    }
  }

  const handlePublish = async () => {
    try {
      setPublishing(true)

      // Build video URLs from uploaded files
      const videoUrls = videoFiles.filter(f => f.url).map(f => f.url!)

      const scheduledAt = getScheduledISOString()

      const tasks = await api.createTask({
        title,
        description: description || undefined,
        content_type: contentType,
        video_url: videoUrls.length === 1 ? videoUrls[0] : undefined,
        video_urls: videoUrls.length > 1 ? videoUrls : undefined,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        article_content: contentType === 'article' ? articleContent : undefined,
        cover_url: coverUrl || undefined,
        visibility,
        ai_content: aiContent,
        topics: [],
        account_ids: selectedIds,
        account_configs: Object.keys(accountConfigs).length > 0 ? accountConfigs : undefined,
        distribution_mode: distributionMode,
        scheduled_at: scheduledAt,
      })

      setCreatedTasks(tasks)
      setStep('success')

      // Delete draft if publishing from a draft
      if (currentDraftId) {
        api.deleteDraft(currentDraftId).catch(console.error)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败')
    } finally {
      setPublishing(false)
    }
  }

  const handleTopicSelect = (topic: string) => {
    setDescription(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + `#${topic} `)
    setShowTopicPicker(false)
  }

  const toggleAccount = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const isBatchVideo = contentType === 'video' && videoFiles.filter(f => f.url).length > 1

  // Step: success
  if (step === 'success') {
    if (createdTasks.length === 1 && createdTasks[0].content_type === 'video') {
      return <SharePanel task={createdTasks[0]} />
    }
    return <SuccessPanel tasks={createdTasks} />
  }

  // Step: select
  if (step === 'select') {
    return (
      <div className="max-w-2xl mx-auto">
        <DraftBar
          drafts={drafts}
          onLoad={handleLoadDraft}
          onDelete={handleDeleteDraft}
        />
        <h1 className="text-2xl font-bold mb-6">选择发布类型</h1>
        <div className="grid grid-cols-3 gap-4">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.type}
              onClick={() => handleSelectType(ct.type)}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <span className="text-4xl">{ct.icon}</span>
              <span className="font-medium text-lg">{ct.label}</span>
              <span className="text-sm text-gray-500 text-center">{ct.desc}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Step: form
  const typeLabel = CONTENT_TYPES.find((ct) => ct.type === contentType)!.label

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setStep('select')}
          className="text-gray-400 hover:text-gray-600"
        >
          ← 返回
        </button>
        <h1 className="text-2xl font-bold">发布{typeLabel}</h1>
      </div>

      <ContentUpload
        contentType={contentType}
        videoFiles={videoFiles}
        onVideoFilesChange={setVideoFiles}
        imageUrls={imageUrls}
        onImageUrlsChange={setImageUrls}
        articleContent={articleContent}
        onArticleContentChange={setArticleContent}
      />

      {(contentType === 'video' || contentType === 'image_text') && (
        <CoverUpload
          value={coverUrl}
          onChange={setCoverUrl}
          imageUrls={contentType === 'image_text' ? imageUrls : undefined}
        />
      )}

      <TitleInput
        value={title}
        onChange={setTitle}
      />

      <DescriptionInput
        value={description}
        onChange={setDescription}
        onAddTopic={() => setShowTopicPicker(true)}
      />

      <AccountSelector
        accounts={accounts}
        selectedIds={selectedIds}
        onToggle={toggleAccount}
        accountConfigs={accountConfigs}
        onConfigChange={(id, config) => setAccountConfigs(prev => ({ ...prev, [id]: config }))}
      />

      <PublishModeSelector
        isScheduled={isScheduled}
        onScheduleChange={setIsScheduled}
        scheduledDate={scheduledDate}
        onScheduledDateChange={setScheduledDate}
        scheduledTime={scheduledTime}
        onScheduledTimeChange={setScheduledTime}
        distributionMode={distributionMode}
        onDistributionModeChange={setDistributionMode}
        showDistribution={contentType === 'video' && videoFiles.length > 1}
        useFilenameAsTitle={useFilenameAsTitle}
        onFilenameAsTitleChange={setUseFilenameAsTitle}
      />

      <VisibilitySelector
        value={visibility}
        onChange={setVisibility}
      />

      <AiContentToggle
        value={aiContent}
        onChange={setAiContent}
      />

      {/* Fixed bottom bar */}
      <div className="sticky bottom-0 bg-white border-t p-4">
        {!isFormValid() && !publishing && (
          <p className="text-xs text-red-500 mb-2 text-center">
            {!title.trim() ? '请填写标题' :
             selectedIds.length === 0 ? '请选择至少一个发布账号' :
             contentType === 'video' && videoFiles.filter(f => f.url).length === 0 ? '请上传视频文件' :
             contentType === 'image_text' && imageUrls.length === 0 ? '请上传至少一张图片' :
             contentType === 'article' && !articleContent.trim() ? '请填写文章内容' :
             isScheduled && (!scheduledDate || !scheduledTime) ? '请设置定时发布时间' : ''}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex-1 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            保存到草稿
          </button>
          {isBatchVideo ? (
            <button
              type="button"
              onClick={() => setShowBatchPreview(true)}
              disabled={publishing || !isFormValid()}
              className="flex-1 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              查看批量任务预览
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !isFormValid()}
              className="flex-1 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? '提交中...' : '创建发布任务'}
            </button>
          )}
        </div>
      </div>

      {/* TopicPicker modal */}
      {showTopicPicker && (
        <TopicPicker
          onSelect={handleTopicSelect}
          onClose={() => setShowTopicPicker(false)}
        />
      )}

      {/* BatchPreview modal */}
      {showBatchPreview && (
        <BatchPreview
          videoFiles={videoFiles.map(f => ({ name: f.name, url: f.url }))}
          accounts={accounts}
          selectedIds={selectedIds}
          distributionMode={distributionMode}
          useFilenameAsTitle={useFilenameAsTitle}
          title={title}
          onConfirm={() => {
            setShowBatchPreview(false)
            handlePublish()
          }}
          onCancel={() => setShowBatchPreview(false)}
        />
      )}
    </div>
  )
}
