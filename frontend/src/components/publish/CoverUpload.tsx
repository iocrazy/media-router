import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

interface CoverUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  imageUrls?: string[]
}

const uploadFile = async (file: File, bucket: string): Promise<string> => {
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file)
  if (error) throw error
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return urlData.publicUrl
}

export default function CoverUpload({ value, onChange, imageUrls }: CoverUploadProps) {
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const url = await uploadFile(files[0], 'images')
      onChange(url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <span className="text-sm font-bold text-gray-900">封面设置</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {value ? (
            <div className="relative inline-block">
              <img
                src={value}
                alt="封面预览"
                className="h-24 w-auto rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute -top-1.5 -right-1.5 bg-black/50 rounded-full p-0.5 text-white hover:bg-black/70 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <svg className="animate-spin h-6 w-6 text-gray-400 mx-auto" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <svg className="mx-auto h-6 w-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-gray-500">上传封面图片</p>
                </>
              )}
            </button>
          )}

          {imageUrls && imageUrls.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">从已上传图片中选择</p>
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => onChange(url)}
                    className={`h-14 w-14 rounded-lg overflow-hidden border-2 transition-colors ${
                      value === url ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            不设置则平台默认使用第一张图片作为封面
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFileSelect(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}
