import { useState, useRef, useCallback } from 'react'
import type { ContentType } from '../../services/api'
import { supabase } from '../../lib/supabase'

export interface VideoFile {
  file: File
  name: string
  url: string | null
  uploading: boolean
}

interface ContentUploadProps {
  contentType: ContentType
  // Video
  videoFiles: VideoFile[]
  onVideoFilesChange: (files: VideoFile[]) => void
  // Image
  imageUrls: string[]
  onImageUrlsChange: (urls: string[]) => void
  // Article
  articleContent: string
  onArticleContentChange: (content: string) => void
}

const uploadFile = async (file: File, bucket: string): Promise<string> => {
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file)
  if (error) throw error
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return urlData.publicUrl
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function VideoUpload({ videoFiles, onVideoFilesChange }: {
  videoFiles: VideoFile[]
  onVideoFilesChange: (files: VideoFile[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const newFiles: VideoFile[] = Array.from(selectedFiles).map((file) => ({
      file,
      name: file.name,
      url: null,
      uploading: true,
    }))

    const merged = [...videoFiles, ...newFiles]
    onVideoFilesChange(merged)

    for (let i = 0; i < newFiles.length; i++) {
      const vf = newFiles[i]
      try {
        const url = await uploadFile(vf.file, 'videos')
        onVideoFilesChange((prev) => {
          void prev
          return merged.map((f) =>
            f === vf ? { ...f, url, uploading: false } : f
          )
        })
        merged[videoFiles.length + i] = { ...vf, url, uploading: false }
      } catch {
        merged[videoFiles.length + i] = { ...vf, url: null, uploading: false }
        onVideoFilesChange([...merged])
      }
    }
  }, [videoFiles, onVideoFilesChange])

  const handleRemove = (index: number) => {
    onVideoFilesChange(videoFiles.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      {videoFiles.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-gray-500">拖拽或点击上传视频</p>
        </div>
      ) : (
        <div>
          <div className="text-sm text-gray-500 mb-2">
            已添加 {videoFiles.length} 个视频
          </div>
          <div className="space-y-2 mb-3">
            {videoFiles.map((vf, index) => (
              <div
                key={`${vf.name}-${index}`}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm text-gray-700 truncate">{vf.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatFileSize(vf.file.size)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {vf.uploading ? (
                    <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
          >
            添加视频
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function ImageUpload({ imageUrls, onImageUrlsChange }: {
  imageUrls: string[]
  onImageUrlsChange: (urls: string[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        if (imageUrls.length + newUrls.length >= 9) break
        const url = await uploadFile(file, 'images')
        newUrls.push(url)
      }
      onImageUrlsChange([...imageUrls, ...newUrls])
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = (index: number) => {
    onImageUrlsChange(imageUrls.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="text-sm text-gray-500 mb-2">{imageUrls.length}/9</div>
      <div className="grid grid-cols-3 gap-3">
        {imageUrls.map((url, index) => (
          <div key={`${url}-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white hover:bg-black/70 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
        {imageUrls.length < 9 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function ArticleEditor({ articleContent, onArticleContentChange }: {
  articleContent: string
  onArticleContentChange: (content: string) => void
}) {
  return (
    <textarea
      value={articleContent}
      onChange={(e) => onArticleContentChange(e.target.value)}
      rows={10}
      placeholder="输入文章内容..."
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
    />
  )
}

export default function ContentUpload({
  contentType,
  videoFiles,
  onVideoFilesChange,
  imageUrls,
  onImageUrlsChange,
  articleContent,
  onArticleContentChange,
}: ContentUploadProps) {
  const label =
    contentType === 'video' ? '视频' :
    contentType === 'image_text' ? '图片' : '文章'

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
      <label className="block text-sm font-bold text-gray-900 mb-2">
        {label}
      </label>
      {contentType === 'video' && (
        <VideoUpload
          videoFiles={videoFiles}
          onVideoFilesChange={onVideoFilesChange}
        />
      )}
      {contentType === 'image_text' && (
        <ImageUpload
          imageUrls={imageUrls}
          onImageUrlsChange={onImageUrlsChange}
        />
      )}
      {contentType === 'article' && (
        <ArticleEditor
          articleContent={articleContent}
          onArticleContentChange={onArticleContentChange}
        />
      )}
    </div>
  )
}
