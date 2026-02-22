import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFFmpeg } from '../hooks/useFFmpeg'
import VideoPreview from '../components/creator/VideoPreview'
import TrimSlider from '../components/creator/TrimSlider'
import ToolBar from '../components/creator/ToolBar'
import type { ToolType } from '../components/creator/ToolBar'
import TrimPanel from '../components/creator/panels/TrimPanel'
import SpeedPanel from '../components/creator/panels/SpeedPanel'
import TextPanel from '../components/creator/panels/TextPanel'
import FilterPanel from '../components/creator/panels/FilterPanel'
import ConcatPanel from '../components/creator/panels/ConcatPanel'
import ExportButton from '../components/creator/ExportButton'
import EditorLoading from '../components/creator/EditorLoading'

export default function Create() {
  const navigate = useNavigate()
  const { status, progress, load, trim, changeSpeed, addText, applyFilter, concat } = useFFmpeg()

  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [activeTool, setActiveTool] = useState<ToolType | null>(null)

  // Trim state
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)

  // Speed state
  const [speed, setSpeed] = useState(1)

  // Concat state
  const [concatFiles, setConcatFiles] = useState<File[]>([])

  // Load FFmpeg on mount
  useEffect(() => { load() }, [load])

  // Update video URL when source file changes
  useEffect(() => {
    if (sourceFile) {
      const url = URL.createObjectURL(sourceFile)
      setVideoUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setVideoUrl(null)
    }
  }, [sourceFile])

  const handleDurationChange = useCallback((d: number) => {
    setDuration(d)
    setTrimEnd(d)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSourceFile(file)
      setConcatFiles([file])
      setTrimStart(0)
      setSpeed(1)
    }
  }

  const updateSourceFromBlob = (blob: Blob) => {
    const file = new File([blob], sourceFile?.name || 'edited.mp4', { type: 'video/mp4' })
    setSourceFile(file)
    setConcatFiles([file])
    setTrimStart(0)
    setSpeed(1)
  }

  const handleTrimApply = async () => {
    if (!sourceFile) return
    const blob = await trim(sourceFile, trimStart, trimEnd)
    if (blob) updateSourceFromBlob(blob)
  }

  const handleSpeedApply = async () => {
    if (!sourceFile || speed === 1) return
    const blob = await changeSpeed(sourceFile, speed)
    if (blob) updateSourceFromBlob(blob)
  }

  const handleTextApply = async (text: string, fontSize: number, color: string) => {
    if (!sourceFile) return
    const blob = await addText(sourceFile, text, fontSize, color)
    if (blob) updateSourceFromBlob(blob)
  }

  const handleFilterApply = async (filterName: string) => {
    if (!sourceFile) return
    const blob = await applyFilter(sourceFile, filterName)
    if (blob) updateSourceFromBlob(blob)
  }

  const handleConcatApply = async () => {
    if (concatFiles.length < 2) return
    const blob = await concat(concatFiles)
    if (blob) updateSourceFromBlob(blob)
  }

  const handleExport = () => {
    if (!sourceFile) return
    navigate('/publish', { state: { videoFile: sourceFile, fromCreator: true } })
  }

  if (status === 'loading' || status === 'error') {
    return <EditorLoading status={status === 'loading' ? 'loading' : 'error'} onRetry={load} />
  }

  return (
    <div className="space-y-3 -mx-4">
      {/* Video preview or file picker */}
      <div className="px-4">
        {!sourceFile ? (
          <label className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
            <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm text-gray-500">选择视频文件</span>
            <span className="text-xs text-gray-400 mt-1">支持 MP4、MOV、AVI 格式</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
          </label>
        ) : (
          <VideoPreview
            src={videoUrl}
            trimStart={activeTool === 'trim' ? trimStart : undefined}
            trimEnd={activeTool === 'trim' ? trimEnd : undefined}
            onDurationChange={handleDurationChange}
          />
        )}
      </div>

      {sourceFile && (
        <>
          {/* Trim slider (visible when trim tool is active) */}
          {activeTool === 'trim' && (
            <TrimSlider
              duration={duration}
              start={trimStart}
              end={trimEnd}
              onChange={(s, e) => { setTrimStart(s); setTrimEnd(e) }}
            />
          )}

          {/* Toolbar */}
          <ToolBar
            active={activeTool}
            onChange={setActiveTool}
            disabled={status === 'processing'}
          />

          {/* Active tool panel */}
          {activeTool === 'trim' && (
            <TrimPanel
              start={trimStart}
              end={trimEnd}
              duration={duration}
              processing={status === 'processing'}
              onApply={handleTrimApply}
            />
          )}
          {activeTool === 'speed' && (
            <SpeedPanel
              speed={speed}
              onChange={setSpeed}
              processing={status === 'processing'}
              onApply={handleSpeedApply}
            />
          )}
          {activeTool === 'text' && (
            <TextPanel
              processing={status === 'processing'}
              onApply={handleTextApply}
            />
          )}
          {activeTool === 'filter' && (
            <FilterPanel
              processing={status === 'processing'}
              onApply={handleFilterApply}
            />
          )}
          {activeTool === 'concat' && (
            <ConcatPanel
              files={concatFiles}
              onAdd={(files) => setConcatFiles((prev) => [...prev, ...files])}
              onRemove={(i) => setConcatFiles((prev) => prev.filter((_, idx) => idx !== i))}
              processing={status === 'processing'}
              onApply={handleConcatApply}
            />
          )}

          {/* Export button (when no tool is active) */}
          {!activeTool && (
            <ExportButton
              progress={progress}
              processing={status === 'processing'}
              hasVideo={!!sourceFile}
              onExport={handleExport}
            />
          )}
        </>
      )}
    </div>
  )
}
