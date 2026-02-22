# Video Creator Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a browser-based video editor to MediaHub using FFmpeg.wasm, positioning the product as a "creation tool" for Douyin aweme.share approval.

**Architecture:** New `/create` route with FFmpeg.wasm-powered editor. Components under `components/creator/`. Hook `useFFmpeg.ts` wraps all FFmpeg operations. Single-threaded FFmpeg core loaded lazily from CDN via blob URLs. Exported video passed to Publish page via React Router state.

**Tech Stack:** @ffmpeg/ffmpeg 0.12, @ffmpeg/util 0.12, React 19, TypeScript, Tailwind CSS 4.0

---

### Task 1: Install dependencies and configure Vite

**Files:**
- Modify: `frontend/package.json` (add dependencies)
- Modify: `frontend/vite.config.ts` (add COOP/COEP headers)

**Step 1: Install FFmpeg packages**

Run:
```bash
cd /Volumes/program/project-code/_playground/meida-router/frontend
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

**Step 2: Update vite.config.ts with COOP/COEP headers**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})
```

Note: `optimizeDeps.exclude` prevents Vite from pre-bundling FFmpeg (it uses Web Workers internally).

**Step 3: Verify dev server starts**

Run: `cd /Volumes/program/project-code/_playground/meida-router/frontend && npm run dev`

Expected: Server starts on localhost:5173 with COOP/COEP headers active.

**Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts
git commit -m "feat: add ffmpeg.wasm dependencies and COOP/COEP headers"
```

---

### Task 2: Create useFFmpeg hook

**Files:**
- Create: `frontend/src/hooks/useFFmpeg.ts`

**Step 1: Create the hook**

```ts
import { useState, useRef, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

export type FFmpegStatus = 'idle' | 'loading' | 'ready' | 'processing' | 'error'

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [status, setStatus] = useState<FFmpegStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [loadProgress, setLoadProgress] = useState(0)

  const load = useCallback(async () => {
    if (ffmpegRef.current) return
    setStatus('loading')
    try {
      const ffmpeg = new FFmpeg()
      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(Math.round(p * 100))
      })

      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      ffmpegRef.current = ffmpeg
      setStatus('ready')
    } catch (e) {
      console.error('FFmpeg load failed:', e)
      setStatus('error')
    }
  }, [])

  const trim = useCallback(async (
    inputFile: File, startTime: number, endTime: number
  ): Promise<Blob | null> => {
    const ffmpeg = ffmpegRef.current
    if (!ffmpeg) return null
    setStatus('processing')
    setProgress(0)
    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(inputFile))
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', String(startTime),
        '-to', String(endTime),
        '-c', 'copy',
        'output.mp4',
      ])
      const data = await ffmpeg.readFile('output.mp4')
      setStatus('ready')
      return new Blob([data], { type: 'video/mp4' })
    } catch (e) {
      console.error('Trim failed:', e)
      setStatus('ready')
      return null
    }
  }, [])

  const changeSpeed = useCallback(async (
    inputFile: File, speed: number
  ): Promise<Blob | null> => {
    const ffmpeg = ffmpegRef.current
    if (!ffmpeg) return null
    setStatus('processing')
    setProgress(0)
    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(inputFile))
      const videoFilter = `setpts=${(1 / speed).toFixed(4)}*PTS`
      const audioFilter = speed <= 2 ? `atempo=${speed}` : `atempo=2.0,atempo=${speed / 2}`
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-filter:v', videoFilter,
        '-filter:a', audioFilter,
        'output.mp4',
      ])
      const data = await ffmpeg.readFile('output.mp4')
      setStatus('ready')
      return new Blob([data], { type: 'video/mp4' })
    } catch (e) {
      console.error('Speed change failed:', e)
      setStatus('ready')
      return null
    }
  }, [])

  const addText = useCallback(async (
    inputFile: File, text: string, fontSize: number, color: string
  ): Promise<Blob | null> => {
    const ffmpeg = ffmpegRef.current
    if (!ffmpeg) return null
    setStatus('processing')
    setProgress(0)
    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(inputFile))
      const filter = `drawtext=text='${text.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${color}:x=(w-text_w)/2:y=h-th-40`
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', filter,
        '-codec:a', 'copy',
        'output.mp4',
      ])
      const data = await ffmpeg.readFile('output.mp4')
      setStatus('ready')
      return new Blob([data], { type: 'video/mp4' })
    } catch (e) {
      console.error('Add text failed:', e)
      setStatus('ready')
      return null
    }
  }, [])

  const applyFilter = useCallback(async (
    inputFile: File, filterName: string
  ): Promise<Blob | null> => {
    const ffmpeg = ffmpegRef.current
    if (!ffmpeg) return null
    setStatus('processing')
    setProgress(0)

    const filterMap: Record<string, string> = {
      grayscale: 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
      warm: 'colortemperature=temperature=6500',
      cool: 'colortemperature=temperature=3500',
      vintage: 'curves=vintage',
      vivid: 'eq=saturation=1.5:contrast=1.1',
    }

    const filter = filterMap[filterName]
    if (!filter) { setStatus('ready'); return null }

    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(inputFile))
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', filter,
        '-codec:a', 'copy',
        'output.mp4',
      ])
      const data = await ffmpeg.readFile('output.mp4')
      setStatus('ready')
      return new Blob([data], { type: 'video/mp4' })
    } catch (e) {
      console.error('Filter failed:', e)
      setStatus('ready')
      return null
    }
  }, [])

  const concat = useCallback(async (
    files: File[]
  ): Promise<Blob | null> => {
    const ffmpeg = ffmpegRef.current
    if (!ffmpeg || files.length < 2) return null
    setStatus('processing')
    setProgress(0)
    try {
      let fileList = ''
      for (let i = 0; i < files.length; i++) {
        const name = `input${i}.mp4`
        await ffmpeg.writeFile(name, await fetchFile(files[i]))
        fileList += `file '${name}'\n`
      }
      await ffmpeg.writeFile('list.txt', new TextEncoder().encode(fileList))
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'list.txt',
        '-c', 'copy',
        'output.mp4',
      ])
      const data = await ffmpeg.readFile('output.mp4')
      setStatus('ready')
      return new Blob([data], { type: 'video/mp4' })
    } catch (e) {
      console.error('Concat failed:', e)
      setStatus('ready')
      return null
    }
  }, [])

  return {
    status,
    progress,
    loadProgress,
    load,
    trim,
    changeSpeed,
    addText,
    applyFilter,
    concat,
  }
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useFFmpeg.ts
git commit -m "feat: add useFFmpeg hook wrapping FFmpeg.wasm operations"
```

---

### Task 3: Create EditorLoading component

**Files:**
- Create: `frontend/src/components/creator/EditorLoading.tsx`

**Step 1: Create the component**

```tsx
interface EditorLoadingProps {
  status: 'loading' | 'error'
  onRetry: () => void
}

export default function EditorLoading({ status, onRetry }: EditorLoadingProps) {
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500 text-sm">编辑器加载失败</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">正在准备编辑器...</p>
      <p className="text-gray-400 text-xs">首次加载需要下载约 25MB 资源</p>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/EditorLoading.tsx
git commit -m "feat: add EditorLoading component"
```

---

### Task 4: Create VideoPreview component

**Files:**
- Create: `frontend/src/components/creator/VideoPreview.tsx`

**Step 1: Create the component**

```tsx
import { useRef, useEffect, useState } from 'react'

interface VideoPreviewProps {
  src: string | null
  trimStart?: number
  trimEnd?: number
  onDurationChange?: (duration: number) => void
}

export default function VideoPreview({ src, trimStart, trimEnd, onDurationChange }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      onDurationChange?.(video.duration)
    }
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (trimEnd && video.currentTime >= trimEnd) {
        video.pause()
        setPlaying(false)
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [trimEnd, onDurationChange])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || !src) return
    if (playing) {
      video.pause()
    } else {
      if (trimStart !== undefined && video.currentTime < trimStart) {
        video.currentTime = trimStart
      }
      video.play()
    }
    setPlaying(!playing)
  }

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (!src) {
    return (
      <div className="bg-black rounded-xl aspect-video flex items-center justify-center">
        <p className="text-gray-500 text-sm">请选择视频文件</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={src}
        className="w-full rounded-xl bg-black aspect-video object-contain"
        playsInline
        onClick={togglePlay}
      />
      {/* Play/pause overlay */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}
      {/* Time display */}
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/VideoPreview.tsx
git commit -m "feat: add VideoPreview component with play/pause controls"
```

---

### Task 5: Create TrimSlider component

**Files:**
- Create: `frontend/src/components/creator/TrimSlider.tsx`

**Step 1: Create the component**

```tsx
import { useState, useRef, useCallback } from 'react'

interface TrimSliderProps {
  duration: number
  start: number
  end: number
  onChange: (start: number, end: number) => void
}

export default function TrimSlider({ duration, start, end, onChange }: TrimSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const getPosition = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track || duration === 0) return 0
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * duration * 10) / 10
  }, [duration])

  const handlePointerDown = (handle: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(handle)
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const pos = getPosition(e.clientX)
    if (dragging === 'start') {
      onChange(Math.min(pos, end - 0.5), end)
    } else {
      onChange(start, Math.max(pos, start + 0.5))
    }
  }

  const handlePointerUp = () => {
    setDragging(null)
  }

  if (duration === 0) return null

  const startPct = (start / duration) * 100
  const endPct = (end / duration) * 100

  return (
    <div className="px-4 py-3">
      <div
        ref={trackRef}
        className="relative h-8 select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Background track */}
        <div className="absolute top-3 left-0 right-0 h-2 bg-gray-200 rounded-full" />
        {/* Selected range */}
        <div
          className="absolute top-3 h-2 bg-blue-500 rounded-full"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        {/* Start handle */}
        <div
          className="absolute top-1 w-5 h-6 bg-white border-2 border-blue-600 rounded cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${startPct}% - 10px)` }}
          onPointerDown={handlePointerDown('start')}
        />
        {/* End handle */}
        <div
          className="absolute top-1 w-5 h-6 bg-white border-2 border-blue-600 rounded cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${endPct}% - 10px)` }}
          onPointerDown={handlePointerDown('end')}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{formatTime(start)}</span>
        <span className="text-blue-600 font-medium">
          时长 {formatTime(end - start)}
        </span>
        <span>{formatTime(end)}</span>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/TrimSlider.tsx
git commit -m "feat: add TrimSlider with dual-handle range selection"
```

---

### Task 6: Create ToolBar component

**Files:**
- Create: `frontend/src/components/creator/ToolBar.tsx`

**Step 1: Create the component**

```tsx
export type ToolType = 'trim' | 'concat' | 'speed' | 'text' | 'filter'

interface ToolBarProps {
  active: ToolType | null
  onChange: (tool: ToolType | null) => void
  disabled: boolean
}

const tools: { id: ToolType; label: string; icon: string }[] = [
  { id: 'trim', label: '裁剪', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
  { id: 'concat', label: '拼接', icon: 'M12 4v16m8-8H4' },
  { id: 'speed', label: '调速', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { id: 'text', label: '文字', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { id: 'filter', label: '滤镜', icon: 'M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z' },
]

export default function ToolBar({ active, onChange, disabled }: ToolBarProps) {
  return (
    <div className="flex gap-1 px-4 py-2 overflow-x-auto">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onChange(active === tool.id ? null : tool.id)}
          disabled={disabled}
          className={`flex flex-col items-center min-w-[56px] px-3 py-2 rounded-xl transition-colors ${
            active === tool.id
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-500 hover:bg-gray-100'
          } ${disabled ? 'opacity-40' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
          </svg>
          <span className="text-xs mt-1">{tool.label}</span>
        </button>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/ToolBar.tsx
git commit -m "feat: add ToolBar component with tool icons"
```

---

### Task 7: Create tool panels (TrimPanel, SpeedPanel, TextPanel, FilterPanel, ConcatPanel)

**Files:**
- Create: `frontend/src/components/creator/panels/TrimPanel.tsx`
- Create: `frontend/src/components/creator/panels/SpeedPanel.tsx`
- Create: `frontend/src/components/creator/panels/TextPanel.tsx`
- Create: `frontend/src/components/creator/panels/FilterPanel.tsx`
- Create: `frontend/src/components/creator/panels/ConcatPanel.tsx`

**Step 1: Create TrimPanel**

```tsx
interface TrimPanelProps {
  start: number
  end: number
  duration: number
  processing: boolean
  onApply: () => void
}

export default function TrimPanel({ start, end, duration, processing, onApply }: TrimPanelProps) {
  const fmt = (t: number) => {
    const m = Math.floor(t / 60)
    const s = (t % 60).toFixed(1)
    return `${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">起点: <span className="text-gray-900">{fmt(start)}</span></span>
        <span className="text-gray-500">终点: <span className="text-gray-900">{fmt(end)}</span></span>
        <span className="text-gray-500">时长: <span className="text-blue-600 font-medium">{fmt(end - start)}</span></span>
      </div>
      <button
        onClick={onApply}
        disabled={processing || (start === 0 && end === duration)}
        className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-xl disabled:opacity-40"
      >
        {processing ? '处理中...' : '应用裁剪'}
      </button>
    </div>
  )
}
```

**Step 2: Create SpeedPanel**

```tsx
interface SpeedPanelProps {
  speed: number
  onChange: (speed: number) => void
  processing: boolean
  onApply: () => void
}

const speeds = [0.5, 0.75, 1, 1.5, 2]

export default function SpeedPanel({ speed, onChange, processing, onApply }: SpeedPanelProps) {
  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex gap-2">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`flex-1 py-2 text-sm rounded-xl transition-colors ${
              speed === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
      <button
        onClick={onApply}
        disabled={processing || speed === 1}
        className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-xl disabled:opacity-40"
      >
        {processing ? '处理中...' : '应用调速'}
      </button>
    </div>
  )
}
```

**Step 3: Create TextPanel**

```tsx
import { useState } from 'react'

interface TextPanelProps {
  processing: boolean
  onApply: (text: string, fontSize: number, color: string) => void
}

const colors = ['white', 'yellow', 'red', 'cyan', 'lime']
const sizes = [24, 32, 48, 64]

export default function TextPanel({ processing, onApply }: TextPanelProps) {
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(32)
  const [color, setColor] = useState('white')

  return (
    <div className="px-4 py-3 space-y-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="输入文字内容"
        className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        maxLength={50}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">字号</span>
        <div className="flex gap-1.5">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => setFontSize(s)}
              className={`px-2.5 py-1 text-xs rounded-lg ${
                fontSize === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">颜色</span>
        <div className="flex gap-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 ${
                color === c ? 'border-blue-600 scale-110' : 'border-gray-300'
              }`}
              style={{ backgroundColor: c === 'white' ? '#ffffff' : c }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={() => onApply(text, fontSize, color)}
        disabled={processing || !text.trim()}
        className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-xl disabled:opacity-40"
      >
        {processing ? '处理中...' : '添加文字'}
      </button>
    </div>
  )
}
```

**Step 4: Create FilterPanel**

```tsx
interface FilterPanelProps {
  processing: boolean
  onApply: (filter: string) => void
}

const filters = [
  { id: 'grayscale', label: '黑白', color: 'bg-gray-400' },
  { id: 'warm', label: '暖色', color: 'bg-orange-300' },
  { id: 'cool', label: '冷色', color: 'bg-blue-300' },
  { id: 'vintage', label: '复古', color: 'bg-amber-200' },
  { id: 'vivid', label: '鲜艳', color: 'bg-pink-400' },
]

export default function FilterPanel({ processing, onApply }: FilterPanelProps) {
  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-5 gap-3">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => onApply(f.id)}
            disabled={processing}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`w-14 h-14 rounded-xl ${f.color} ${processing ? 'opacity-40' : ''}`} />
            <span className="text-xs text-gray-600">{f.label}</span>
          </button>
        ))}
      </div>
      {processing && (
        <p className="text-center text-xs text-gray-400 mt-3">正在应用滤镜...</p>
      )}
    </div>
  )
}
```

**Step 5: Create ConcatPanel**

```tsx
import { useRef } from 'react'

interface ConcatPanelProps {
  files: File[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  processing: boolean
  onApply: () => void
}

export default function ConcatPanel({ files, onAdd, onRemove, processing, onApply }: ConcatPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAdd(Array.from(e.target.files))
    }
    e.target.value = ''
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="space-y-2">
        {files.map((f, i) => (
          <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl">
            <span className="text-sm text-gray-700 truncate flex-1">{i + 1}. {f.name}</span>
            <button onClick={() => onRemove(i)} className="text-red-400 text-xs ml-2 shrink-0">
              删除
            </button>
          </div>
        ))}
      </div>
      <input ref={inputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleSelect} />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 text-sm rounded-xl"
      >
        + 添加视频片段
      </button>
      <button
        onClick={onApply}
        disabled={processing || files.length < 2}
        className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-xl disabled:opacity-40"
      >
        {processing ? '拼接中...' : `合并 ${files.length} 个视频`}
      </button>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add frontend/src/components/creator/panels/
git commit -m "feat: add all editor tool panels (trim, speed, text, filter, concat)"
```

---

### Task 8: Create ExportButton component

**Files:**
- Create: `frontend/src/components/creator/ExportButton.tsx`

**Step 1: Create the component**

```tsx
interface ExportButtonProps {
  progress: number
  processing: boolean
  hasVideo: boolean
  onExport: () => void
}

export default function ExportButton({ progress, processing, hasVideo, onExport }: ExportButtonProps) {
  if (!hasVideo) return null

  return (
    <div className="px-4 py-3">
      {processing ? (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-gray-500">导出中 {progress}%</p>
        </div>
      ) : (
        <button
          onClick={onExport}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl"
        >
          导出并发布
        </button>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/ExportButton.tsx
git commit -m "feat: add ExportButton with progress bar"
```

---

### Task 9: Create the Create page and wire everything together

**Files:**
- Create: `frontend/src/pages/Create.tsx`

**Step 1: Create the page**

```tsx
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
          {/* Trim slider (always visible when trim tool is active) */}
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
```

**Step 2: Commit**

```bash
git add frontend/src/pages/Create.tsx
git commit -m "feat: add Create page wiring all editor components together"
```

---

### Task 10: Add route and navigation tab for Create page

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add import, route, tab icon, and tab item**

In `App.tsx`, add the following changes:

1. Add import at top:
```ts
import Create from './pages/Create'
```

2. Add `create` case to `TabIcon` switch (before `default`):
```tsx
case 'create':
  return (
    <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
```

3. Update `tabItems` to include create tab (insert after accounts, before publish):
```ts
const tabItems = [
  { path: '/accounts', label: '账号', icon: 'accounts' },
  { path: '/create', label: '创作', icon: 'create' },
  { path: '/publish', label: '发布', icon: 'publish' },
  { path: '/tasks', label: '记录', icon: 'tasks' },
]
```

Note: Removing `videos` and `analytics` tabs (mock pages) to make room. 4 tabs is optimal for mobile.

4. Add the route (after `/accounts` route):
```tsx
<Route
  path="/create"
  element={
    <ProtectedRoute>
      <Create />
    </ProtectedRoute>
  }
/>
```

**Step 2: Verify the app loads**

Run: `cd /Volumes/program/project-code/_playground/meida-router/frontend && npm run dev`

Visit http://localhost:5173/create. You should see the video file picker.

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add Create route and navigation tab to app layout"
```

---

### Task 11: Integrate Create page export with Publish page

**Files:**
- Modify: `frontend/src/pages/Publish.tsx` (read location state)

**Step 1: Add location state handling at top of Publish component**

Near the top of the `Publish` function (after existing state declarations), add:

```tsx
import { useNavigate, useLocation } from 'react-router-dom'

// Inside the component, after existing useState calls:
const location = useLocation()

useEffect(() => {
  const state = location.state as { videoFile?: File; fromCreator?: boolean } | null
  if (state?.videoFile && state?.fromCreator) {
    const file = state.videoFile
    const videoFile: VideoFile = {
      file,
      name: file.name,
      url: null,
      uploading: false,
    }
    setVideoFiles([videoFile])
    setContentType('video')
    // Clear navigation state
    window.history.replaceState({}, document.title)
  }
}, [location.state])
```

**Step 2: Commit**

```bash
git add frontend/src/pages/Publish.tsx
git commit -m "feat: accept video from Create page via navigation state"
```

---

### Task 12: Build verification and final commit

**Step 1: Run TypeScript check**

Run: `cd /Volumes/program/project-code/_playground/meida-router/frontend && npx tsc --noEmit`

Expected: No type errors.

**Step 2: Run build**

Run: `cd /Volumes/program/project-code/_playground/meida-router/frontend && npm run build`

Expected: Build succeeds.

**Step 3: Fix any errors if present, then commit**

```bash
git add -A
git commit -m "feat: video creator tool v1.0 — FFmpeg.wasm browser editor for Douyin approval"
```
