import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFFmpeg } from '../hooks/useFFmpeg'
import VideoPreview from '../components/creator/VideoPreview'
import VideoCanvas from '../components/creator/VideoCanvas'
import TrimSlider from '../components/creator/TrimSlider'
import ToolBar from '../components/creator/ToolBar'
import type { ToolType } from '../components/creator/ToolBar'
import TemplatePicker from '../components/creator/TemplatePicker'
import TrimPanel from '../components/creator/panels/TrimPanel'
import SpeedPanel from '../components/creator/panels/SpeedPanel'
import TextPanel from '../components/creator/panels/TextPanel'
import FilterPanel from '../components/creator/panels/FilterPanel'
import ConcatPanel from '../components/creator/panels/ConcatPanel'
import CropPanel from '../components/creator/panels/CropPanel'
import MusicPanel from '../components/creator/panels/MusicPanel'
import StickerPanel from '../components/creator/panels/StickerPanel'
import ExportButton from '../components/creator/ExportButton'
import EditorLoading from '../components/creator/EditorLoading'
import AiCreator from '../components/creator/ai/AiCreator'

type PageMode = 'picker' | 'editor' | 'ai'

export default function Create() {
  const navigate = useNavigate()
  const { status, progress, load, trim, changeSpeed, addText, applyFilter, concat, crop } = useFFmpeg()

  const [mode, setMode] = useState<PageMode>('picker')
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

  const handleTextApply = async (text: string, fontSize: number, color: string, _styleId: string) => {
    if (!sourceFile) return
    const blob = await addText(sourceFile, text, fontSize, color)
    if (blob) updateSourceFromBlob(blob)
  }

  const handleFilterApply = async (filterName: string, intensity: number) => {
    if (!sourceFile) return
    const blob = await applyFilter(sourceFile, filterName, intensity)
    if (blob) updateSourceFromBlob(blob)
  }

  const handleConcatApply = async () => {
    if (concatFiles.length < 2) return
    const blob = await concat(concatFiles)
    if (blob) updateSourceFromBlob(blob)
  }

  const handleCropApply = async (aspectId: string, ratio: number | null) => {
    if (!sourceFile) return
    const blob = await crop(sourceFile, aspectId, ratio)
    if (blob) updateSourceFromBlob(blob)
  }

  const handleMusicApply = async (_trackId: string, _musicVolume: number, _originalVolume: number) => {
    // Music overlay is display-only for now
    alert('音乐已添加（演示模式）')
  }

  const handleStickerSelect = (_emoji: string) => {
    // Switch to canvas mode to place sticker
    setActiveTool('canvas')
  }

  const handleExport = () => {
    if (!sourceFile) return
    navigate('/publish', { state: { videoFile: sourceFile, fromCreator: true } })
  }

  // Template handler
  const handleTemplateSelect = (_templateId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) {
        setSourceFile(file)
        setConcatFiles([file])
        setMode('editor')
      }
    }
    input.click()
  }

  const handleFreeEdit = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) {
        setSourceFile(file)
        setConcatFiles([file])
        setMode('editor')
      }
    }
    input.click()
  }

  // FFmpeg loading state
  if (status === 'loading' || status === 'error') {
    return <EditorLoading status={status === 'loading' ? 'loading' : 'error'} onRetry={load} />
  }

  // AI Creator mode
  if (mode === 'ai') {
    return (
      <AiCreator
        onBack={() => setMode('picker')}
        onUseResult={() => setMode('picker')}
      />
    )
  }

  // Template picker mode
  if (mode === 'picker') {
    return (
      <TemplatePicker
        onSelect={handleTemplateSelect}
        onFreeEdit={handleFreeEdit}
        onAiCreate={() => setMode('ai')}
      />
    )
  }

  // Editor mode
  return (
    <div className="space-y-3 -mx-4">
      {/* Back button */}
      <div className="px-4">
        <button
          onClick={() => { setMode('picker'); setSourceFile(null); setActiveTool(null) }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← 返回选择
        </button>
      </div>

      {/* Video preview */}
      <div className="px-4 relative">
        <VideoPreview
          src={videoUrl}
          trimStart={activeTool === 'trim' ? trimStart : undefined}
          trimEnd={activeTool === 'trim' ? trimEnd : undefined}
          onDurationChange={handleDurationChange}
        />
        {/* Canvas overlay */}
        {activeTool === 'canvas' && (
          <div className="absolute inset-0">
            <VideoCanvas width={343} height={193} />
          </div>
        )}
      </div>

      {sourceFile && (
        <>
          {/* Trim slider */}
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
          {activeTool === 'crop' && (
            <CropPanel
              processing={status === 'processing'}
              onApply={handleCropApply}
            />
          )}
          {activeTool === 'music' && (
            <MusicPanel
              processing={status === 'processing'}
              onApply={handleMusicApply}
            />
          )}
          {activeTool === 'sticker' && (
            <StickerPanel
              onSelect={handleStickerSelect}
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
