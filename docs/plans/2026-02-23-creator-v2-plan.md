# Creator v2 Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the video creator module with templates, canvas editor, expanded filters, music, stickers, crop, subtitle styles, and AI creation page to pass Douyin aweme.share audit.

**Architecture:** Extend existing Create.tsx from single-entry to three-entry mode (templates, free edit, AI). Add Konva.js canvas overlay on VideoPreview for drag-and-drop elements. Expand ToolBar from 5 to 9 tools. Most new panels are UI-rich with minimal FFmpeg logic. AI creator is a separate page component.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Konva.js + react-konva, FFmpeg.wasm 0.12

---

## Task 1: Install Konva dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install packages**

```bash
cd frontend && npm install konva react-konva
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add konva and react-konva dependencies"
```

---

## Task 2: Extend ToolBar to 9 tools

**Files:**
- Modify: `frontend/src/components/creator/ToolBar.tsx`

Update `ToolType` and `tools` array.

**Step 1: Rewrite ToolBar.tsx**

```tsx
import type { ReactNode } from 'react'

export type ToolType =
  | 'trim'
  | 'concat'
  | 'speed'
  | 'crop'
  | 'text'
  | 'filter'
  | 'music'
  | 'sticker'
  | 'canvas'

interface Tool {
  id: ToolType
  label: string
  icon: ReactNode
}

const iconClass = 'w-5 h-5'

const tools: Tool[] = [
  {
    id: 'trim',
    label: '裁剪',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L4.939 4.939m5.182 5.182L4.939 15.303" />
      </svg>
    ),
  },
  {
    id: 'concat',
    label: '拼接',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h4v12H4V6zm6 0h4v12h-4V6zm6 0h4v12h-4V6z" />
      </svg>
    ),
  },
  {
    id: 'speed',
    label: '调速',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'crop',
    label: '画面',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4H3m14 0h4m-4 14v4M3 17h4m10 0h4M7 21v-4" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: '文字',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M8 6v12m4-12v12" />
      </svg>
    ),
  },
  {
    id: 'filter',
    label: '滤镜',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm0 0v9l6.36 3.64" />
      </svg>
    ),
  },
  {
    id: 'music',
    label: '音乐',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    ),
  },
  {
    id: 'sticker',
    label: '贴纸',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'canvas',
    label: '画布',
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </svg>
    ),
  },
]

interface ToolBarProps {
  active: ToolType | null
  onChange: (tool: ToolType | null) => void
  disabled?: boolean
}

export default function ToolBar({ active, onChange, disabled }: ToolBarProps) {
  return (
    <div className="px-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tools.map((tool) => {
          const isActive = active === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => onChange(isActive ? null : tool.id)}
              disabled={disabled}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[56px] transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tool.icon}
              <span className="text-xs whitespace-nowrap">{tool.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Build verify**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Errors in Create.tsx because new ToolTypes are not handled yet. That's OK — we'll fix in later tasks.

**Step 3: Commit**

```bash
git add frontend/src/components/creator/ToolBar.tsx
git commit -m "feat: extend toolbar to 9 tools (crop, music, sticker, canvas)"
```

---

## Task 3: Refactor FilterPanel — 15 filters with categories and intensity

**Files:**
- Modify: `frontend/src/components/creator/panels/FilterPanel.tsx`

**Step 1: Rewrite FilterPanel.tsx**

```tsx
import { useState } from 'react'

interface Filter {
  id: string
  label: string
  color: string
  category: string
}

const filters: Filter[] = [
  // 自然
  { id: 'grayscale', label: '黑白', color: '#6B7280', category: '自然' },
  { id: 'warm', label: '暖阳', color: '#F59E0B', category: '自然' },
  { id: 'cool', label: '冷调', color: '#3B82F6', category: '自然' },
  { id: 'vivid', label: '鲜艳', color: '#EC4899', category: '自然' },
  // 人像
  { id: 'soft', label: '柔光', color: '#FDE68A', category: '人像' },
  { id: 'portrait', label: '人像', color: '#FBBF24', category: '人像' },
  { id: 'rosy', label: '红润', color: '#FB7185', category: '人像' },
  { id: 'fair', label: '白皙', color: '#F0F0F0', category: '人像' },
  // 美食
  { id: 'appetite', label: '食欲', color: '#F97316', category: '美食' },
  { id: 'fresh', label: '清新', color: '#34D399', category: '美食' },
  { id: 'golden', label: '金黄', color: '#D97706', category: '美食' },
  // 风景
  { id: 'vintage', label: '复古', color: '#92400E', category: '风景' },
  { id: 'sunset', label: '日落', color: '#F87171', category: '风景' },
  { id: 'forest', label: '森林', color: '#059669', category: '风景' },
  { id: 'ocean', label: '海洋', color: '#0EA5E9', category: '风景' },
]

const categories = ['全部', '自然', '人像', '美食', '风景']

interface FilterPanelProps {
  processing: boolean
  onApply: (filterName: string, intensity: number) => void
}

export default function FilterPanel({ processing, onApply }: FilterPanelProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [category, setCategory] = useState('全部')
  const [intensity, setIntensity] = useState(80)

  const filtered = category === '全部'
    ? filters
    : filters.filter((f) => f.category === category)

  return (
    <div className="px-4 space-y-3">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              category === c
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-4 gap-3">
        {filtered.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelected(f.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors ${
              selected === f.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-transparent'
            }`}
          >
            <div
              className="w-12 h-12 rounded-lg"
              style={{ backgroundColor: f.color }}
            />
            <span className="text-xs text-gray-700">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Intensity slider */}
      {selected && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-16">强度</span>
          <input
            type="range"
            min={10}
            max={100}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <span className="text-xs text-gray-500 w-8">{intensity}%</span>
        </div>
      )}

      {/* Apply button */}
      <button
        onClick={() => selected && onApply(selected, intensity / 100)}
        disabled={!selected || processing}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {processing ? '处理中...' : '应用滤镜'}
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/panels/FilterPanel.tsx
git commit -m "feat: expand FilterPanel to 15 filters with categories and intensity"
```

---

## Task 4: Refactor TextPanel — 6 subtitle styles

**Files:**
- Modify: `frontend/src/components/creator/panels/TextPanel.tsx`

**Step 1: Rewrite TextPanel.tsx**

```tsx
import { useState } from 'react'

interface SubtitleStyle {
  id: string
  label: string
  preview: string  // CSS class description for preview
  fontColor: string
  strokeColor?: string
  bgColor?: string
}

const subtitleStyles: SubtitleStyle[] = [
  { id: 'classic', label: '经典白字', preview: '白底黑边', fontColor: '#FFFFFF', strokeColor: '#000000' },
  { id: 'rainbow', label: '彩虹字', preview: '渐变彩色', fontColor: '#FF6B6B' },
  { id: 'bubble', label: '气泡框', preview: '圆角背景', fontColor: '#333333', bgColor: '#FFFFFF' },
  { id: 'neon', label: '霓虹灯', preview: '发光效果', fontColor: '#00FF88', strokeColor: '#00CC66' },
  { id: 'typewriter', label: '打字机', preview: '等宽字体', fontColor: '#F5F5DC' },
  { id: 'danmu', label: '弹幕风', preview: '滚动字幕', fontColor: '#FFFFFF', bgColor: 'rgba(0,0,0,0.5)' },
]

const fontSizes = [24, 32, 48, 64]

interface TextPanelProps {
  processing: boolean
  onApply: (text: string, fontSize: number, color: string, styleId: string) => void
}

export default function TextPanel({ processing, onApply }: TextPanelProps) {
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(32)
  const [selectedStyle, setSelectedStyle] = useState('classic')

  const style = subtitleStyles.find((s) => s.id === selectedStyle)!

  return (
    <div className="px-4 space-y-3">
      {/* Text input */}
      <div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 50))}
          placeholder="输入文字内容..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{text.length}/50</p>
      </div>

      {/* Subtitle style grid */}
      <div>
        <p className="text-xs text-gray-500 mb-2">字幕样式</p>
        <div className="grid grid-cols-3 gap-2">
          {subtitleStyles.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${
                selectedStyle === s.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <div
                className="text-sm font-bold mb-1 truncate"
                style={{
                  color: s.fontColor,
                  textShadow: s.strokeColor
                    ? `1px 1px 0 ${s.strokeColor}, -1px -1px 0 ${s.strokeColor}, 1px -1px 0 ${s.strokeColor}, -1px 1px 0 ${s.strokeColor}`
                    : undefined,
                  backgroundColor: s.bgColor || 'transparent',
                  padding: s.bgColor ? '2px 6px' : undefined,
                  borderRadius: s.bgColor ? '4px' : undefined,
                }}
              >
                示例
              </div>
              <span className="text-xs text-gray-600">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div>
        <p className="text-xs text-gray-500 mb-2">字号</p>
        <div className="flex gap-2">
          {fontSizes.map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`flex-1 py-2 rounded-lg text-sm ${
                fontSize === size
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Apply */}
      <button
        onClick={() => text && onApply(text, fontSize, style.fontColor, selectedStyle)}
        disabled={!text.trim() || processing}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {processing ? '处理中...' : '添加文字'}
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/panels/TextPanel.tsx
git commit -m "feat: add 6 subtitle styles to TextPanel"
```

---

## Task 5: Create CropPanel

**Files:**
- Create: `frontend/src/components/creator/panels/CropPanel.tsx`

**Step 1: Create CropPanel.tsx**

```tsx
import { useState } from 'react'

interface AspectRatio {
  id: string
  label: string
  sub: string
  ratio: number | null // null = free
}

const aspects: AspectRatio[] = [
  { id: 'free', label: '自由', sub: '自由裁剪', ratio: null },
  { id: '9:16', label: '9:16', sub: '抖音竖屏', ratio: 9 / 16 },
  { id: '16:9', label: '16:9', sub: '横屏', ratio: 16 / 9 },
  { id: '1:1', label: '1:1', sub: '方形', ratio: 1 },
  { id: '4:3', label: '4:3', sub: '传统', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', sub: '竖屏', ratio: 3 / 4 },
]

interface CropPanelProps {
  processing: boolean
  onApply: (aspectId: string, ratio: number | null) => void
}

export default function CropPanel({ processing, onApply }: CropPanelProps) {
  const [selected, setSelected] = useState('9:16')

  const aspect = aspects.find((a) => a.id === selected)!

  return (
    <div className="px-4 space-y-3">
      <p className="text-xs text-gray-500">选择画面比例</p>
      <div className="grid grid-cols-3 gap-2">
        {aspects.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelected(a.id)}
            className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
              selected === a.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            <span className="text-sm font-bold">{a.label}</span>
            <span className="text-xs text-gray-500">{a.sub}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => onApply(selected, aspect.ratio)}
        disabled={processing}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {processing ? '处理中...' : '应用裁剪'}
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/panels/CropPanel.tsx
git commit -m "feat: add CropPanel with 6 aspect ratio options"
```

---

## Task 6: Create MusicPanel

**Files:**
- Create: `frontend/src/components/creator/panels/MusicPanel.tsx`

**Step 1: Create MusicPanel.tsx**

A music library panel with categories, track list, play preview, and volume controls. Uses static data (no actual audio files needed for screenshots).

```tsx
import { useState } from 'react'

interface MusicTrack {
  id: string
  name: string
  duration: string
  category: string
}

const tracks: MusicTrack[] = [
  { id: 'm1', name: '阳光正好', duration: '0:30', category: '热门' },
  { id: 'm2', name: '夏日微风', duration: '0:25', category: '热门' },
  { id: 'm3', name: '活力满满', duration: '0:20', category: '热门' },
  { id: 'm4', name: '温暖时光', duration: '0:35', category: '抒情' },
  { id: 'm5', name: '星空漫步', duration: '0:28', category: '抒情' },
  { id: 'm6', name: '青春节拍', duration: '0:22', category: '轻快' },
  { id: 'm7', name: '欢乐时刻', duration: '0:30', category: '轻快' },
  { id: 'm8', name: '都市脉动', duration: '0:32', category: '电子' },
  { id: 'm9', name: '数码未来', duration: '0:26', category: '电子' },
  { id: 'm10', name: '清晨鸟鸣', duration: '0:40', category: '自然' },
]

const musicCategories = ['热门', '轻快', '抒情', '电子', '自然']

interface MusicPanelProps {
  processing: boolean
  onApply: (trackId: string, musicVolume: number, originalVolume: number) => void
}

export default function MusicPanel({ processing, onApply }: MusicPanelProps) {
  const [category, setCategory] = useState('热门')
  const [selected, setSelected] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [musicVolume, setMusicVolume] = useState(70)
  const [originalVolume, setOriginalVolume] = useState(100)

  const filtered = tracks.filter((t) => t.category === category)

  return (
    <div className="px-4 space-y-3">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {musicCategories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              category === c
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filtered.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
              selected === t.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
            }`}
            onClick={() => setSelected(t.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setPlaying(playing === t.id ? null : t.id)
              }}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              {playing === t.id ? '⏸' : '▶'}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">♪ {t.name}</p>
            </div>
            <span className="text-xs text-gray-400">{t.duration}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelected(t.id)
              }}
              className={`text-lg ${selected === t.id ? 'text-blue-600' : 'text-gray-300'}`}
            >
              {selected === t.id ? '✓' : '+'}
            </button>
          </div>
        ))}
      </div>

      {/* Volume controls */}
      {selected && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">🔊 音乐</span>
            <input
              type="range"
              min={0}
              max={100}
              value={musicVolume}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-xs text-gray-500 w-10">{musicVolume}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">🔊 原声</span>
            <input
              type="range"
              min={0}
              max={100}
              value={originalVolume}
              onChange={(e) => setOriginalVolume(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-xs text-gray-500 w-10">{originalVolume}%</span>
          </div>
        </div>
      )}

      {/* Apply */}
      <button
        onClick={() => selected && onApply(selected, musicVolume / 100, originalVolume / 100)}
        disabled={!selected || processing}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {processing ? '处理中...' : '添加音乐'}
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/panels/MusicPanel.tsx
git commit -m "feat: add MusicPanel with categories, track list, and volume controls"
```

---

## Task 7: Create StickerPanel

**Files:**
- Create: `frontend/src/components/creator/panels/StickerPanel.tsx`

**Step 1: Create StickerPanel.tsx**

```tsx
import { useState } from 'react'

const stickerCategories = ['热门', '表情', '装饰', '文字']

const stickers: Record<string, string[]> = {
  '热门': ['😀', '😂', '🥰', '😎', '🤩', '🎉', '❤️', '⭐', '🔥', '👍', '💯', '🎵', '📸', '✈️', '🌈', '🍕'],
  '表情': ['😊', '😁', '🤣', '😍', '🥳', '😜', '🤗', '😴', '🤔', '😱', '🥺', '😈', '👻', '💀', '🤖', '👽'],
  '装饰': ['✨', '💫', '🌟', '💥', '🎀', '🎁', '🎈', '🎊', '💝', '💖', '🌸', '🍀', '🦋', '🌙', '☀️', '🌊'],
  '文字': ['💪', '🎯', '👑', '💎', '🏆', '📌', '🚀', '💡', '⚡', '🎬', '📝', '💻', '🎨', '🎭', '🎪', '🎠'],
}

interface StickerPanelProps {
  onSelect: (emoji: string) => void
}

export default function StickerPanel({ onSelect }: StickerPanelProps) {
  const [category, setCategory] = useState('热门')

  return (
    <div className="px-4 space-y-3">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {stickerCategories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              category === c
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="grid grid-cols-8 gap-1">
        {stickers[category].map((emoji, i) => (
          <button
            key={`${category}-${i}`}
            onClick={() => onSelect(emoji)}
            className="w-10 h-10 flex items-center justify-center text-2xl rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        选择后添加到画布，可自由拖拽调整位置
      </p>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/panels/StickerPanel.tsx
git commit -m "feat: add StickerPanel with emoji grid and categories"
```

---

## Task 8: Create TemplatePicker

**Files:**
- Create: `frontend/src/components/creator/TemplatePicker.tsx`

**Step 1: Create TemplatePicker.tsx**

```tsx
interface Template {
  id: string
  name: string
  icon: string
  desc: string
  color: string
}

const templates: Template[] = [
  { id: 'vlog', name: 'Vlog', icon: '📷', desc: '日常记录', color: '#EFF6FF' },
  { id: 'rhythm', name: '卡点', icon: '🎬', desc: '节奏卡点', color: '#FEF3C7' },
  { id: 'ecom', name: '带货', icon: '🛍️', desc: '产品展示', color: '#FEE2E2' },
  { id: 'photo', name: '图文', icon: '📖', desc: '图片故事', color: '#ECFDF5' },
  { id: 'music', name: '音乐', icon: '🎵', desc: '音乐混剪', color: '#EDE9FE' },
  { id: 'effect', name: '特效', icon: '✨', desc: '炫酷特效', color: '#FDF4FF' },
  { id: 'tutorial', name: '教程', icon: '📚', desc: '知识分享', color: '#F0F9FF' },
  { id: 'food', name: '美食', icon: '🍜', desc: '美食探店', color: '#FFF7ED' },
]

interface TemplatePickerProps {
  onSelect: (templateId: string) => void
  onFreeEdit: () => void
  onAiCreate: () => void
}

export default function TemplatePicker({ onSelect, onFreeEdit, onAiCreate }: TemplatePickerProps) {
  return (
    <div className="space-y-6">
      {/* Template grid */}
      <div>
        <h2 className="text-lg font-bold mb-3">从模板开始创作</h2>
        <div className="grid grid-cols-4 gap-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all active:scale-95"
              style={{ backgroundColor: t.color }}
            >
              <span className="text-3xl">{t.icon}</span>
              <span className="text-sm font-medium">{t.name}</span>
              <span className="text-xs text-gray-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-sm text-gray-400">或</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Free edit & AI buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onFreeEdit}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium text-gray-700">自由编辑</span>
          <span className="text-xs text-gray-400">选择视频开始</span>
        </button>

        <button
          onClick={onAiCreate}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-400 hover:bg-purple-50 transition-colors"
        >
          <span className="text-3xl">🤖</span>
          <span className="text-sm font-medium text-purple-700">AI 创作</span>
          <span className="text-xs text-gray-400">智能生成内容</span>
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/creator/TemplatePicker.tsx
git commit -m "feat: add TemplatePicker with 8 templates and triple entry points"
```

---

## Task 9: Create VideoCanvas (Konva editor)

**Files:**
- Create: `frontend/src/components/creator/VideoCanvas.tsx`
- Create: `frontend/src/components/creator/CanvasToolbar.tsx`

**Step 1: Create CanvasToolbar.tsx**

```tsx
interface CanvasToolbarProps {
  onAddText: () => void
  onAddSticker: () => void
  onAddImage: () => void
  onAddShape: () => void
  onDelete: () => void
  hasSelection: boolean
}

export default function CanvasToolbar({
  onAddText,
  onAddSticker,
  onAddImage,
  onAddShape,
  onDelete,
  hasSelection,
}: CanvasToolbarProps) {
  const buttons = [
    { label: '文字', icon: 'T', onClick: onAddText },
    { label: '贴纸', icon: '😀', onClick: onAddSticker },
    { label: '图片', icon: '📷', onClick: onAddImage },
    { label: '形状', icon: '⬜', onClick: onAddShape },
  ]

  return (
    <div className="flex items-center gap-2 px-4">
      {buttons.map((b) => (
        <button
          key={b.label}
          onClick={b.onClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
        >
          <span>{b.icon}</span>
          <span className="text-gray-700">{b.label}</span>
        </button>
      ))}
      {hasSelection && (
        <button
          onClick={onDelete}
          className="ml-auto px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-sm hover:bg-red-100"
        >
          删除
        </button>
      )}
    </div>
  )
}
```

**Step 2: Create VideoCanvas.tsx**

```tsx
import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Text, Rect, Circle, Image as KonvaImage } from 'react-konva'
import type Konva from 'konva'
import CanvasToolbar from './CanvasToolbar'

interface CanvasElement {
  id: string
  type: 'text' | 'sticker' | 'shape'
  x: number
  y: number
  text?: string
  fontSize?: number
  fill?: string
  width?: number
  height?: number
  radius?: number
  rotation?: number
}

interface VideoCanvasProps {
  width: number
  height: number
}

let nextId = 1

export default function VideoCanvas({ width, height }: VideoCanvasProps) {
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const stageRef = useRef<Konva.Stage>(null)

  const addElement = (el: Omit<CanvasElement, 'id'>) => {
    const id = `el_${nextId++}`
    setElements((prev) => [...prev, { ...el, id }])
    setSelectedId(id)
  }

  const handleAddText = () => {
    addElement({
      type: 'text',
      x: width / 2 - 40,
      y: height / 2 - 12,
      text: '双击编辑',
      fontSize: 24,
      fill: '#FFFFFF',
    })
  }

  const handleAddSticker = () => {
    addElement({
      type: 'sticker',
      x: width / 2 - 16,
      y: height / 2 - 16,
      text: '⭐',
      fontSize: 40,
    })
  }

  const handleAddShape = () => {
    addElement({
      type: 'shape',
      x: width / 2 - 30,
      y: height / 2 - 30,
      width: 60,
      height: 60,
      fill: 'rgba(255,255,255,0.3)',
    })
  }

  const handleAddImage = () => {
    // Trigger file input for image upload
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      addElement({
        type: 'sticker',
        x: width / 2 - 30,
        y: height / 2 - 30,
        text: '🖼️',
        fontSize: 48,
      })
    }
    input.click()
  }

  const handleDelete = () => {
    if (selectedId) {
      setElements((prev) => prev.filter((el) => el.id !== selectedId))
      setSelectedId(null)
    }
  }

  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id ? { ...el, x: e.target.x(), y: e.target.y() } : el,
      ),
    )
  }

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div className="px-4">
        <div
          className="relative rounded-lg overflow-hidden bg-black/20"
          style={{ width, height }}
        >
          <Stage
            ref={stageRef}
            width={width}
            height={height}
            onClick={handleStageClick}
            onTap={handleStageClick}
          >
            <Layer>
              {elements.map((el) => {
                if (el.type === 'text' || el.type === 'sticker') {
                  return (
                    <Text
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      text={el.text}
                      fontSize={el.fontSize}
                      fill={el.fill || '#FFFFFF'}
                      draggable
                      onClick={() => setSelectedId(el.id)}
                      onTap={() => setSelectedId(el.id)}
                      onDragEnd={(e) => handleDragEnd(el.id, e)}
                      shadowColor={selectedId === el.id ? '#3B82F6' : undefined}
                      shadowBlur={selectedId === el.id ? 10 : 0}
                      shadowOpacity={selectedId === el.id ? 0.8 : 0}
                    />
                  )
                }
                if (el.type === 'shape') {
                  return (
                    <Rect
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      fill={el.fill}
                      draggable
                      onClick={() => setSelectedId(el.id)}
                      onTap={() => setSelectedId(el.id)}
                      onDragEnd={(e) => handleDragEnd(el.id, e)}
                      stroke={selectedId === el.id ? '#3B82F6' : undefined}
                      strokeWidth={selectedId === el.id ? 2 : 0}
                      cornerRadius={4}
                    />
                  )
                }
                return null
              })}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Toolbar */}
      <CanvasToolbar
        onAddText={handleAddText}
        onAddSticker={handleAddSticker}
        onAddImage={handleAddImage}
        onAddShape={handleAddShape}
        onDelete={handleDelete}
        hasSelection={!!selectedId}
      />

      {elements.length === 0 && (
        <p className="text-xs text-gray-400 text-center">
          使用上方工具添加元素到画布，可自由拖拽调整位置
        </p>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/creator/VideoCanvas.tsx frontend/src/components/creator/CanvasToolbar.tsx
git commit -m "feat: add Konva-based VideoCanvas and CanvasToolbar"
```

---

## Task 10: Create AiCreator page components

**Files:**
- Create: `frontend/src/components/creator/ai/AiCreator.tsx`
- Create: `frontend/src/components/creator/ai/AiResultGrid.tsx`

**Step 1: Create AiResultGrid.tsx**

```tsx
interface AiResultGridProps {
  results: string[]  // placeholder image URLs or emojis
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export default function AiResultGrid({ results, selectedIndex, onSelect }: AiResultGridProps) {
  if (results.length === 0) return null

  return (
    <div>
      <p className="text-sm font-medium mb-2">生成结果</p>
      <div className="grid grid-cols-3 gap-2">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`aspect-[3/4] rounded-lg border-2 flex items-center justify-center text-4xl bg-gray-100 transition-colors ${
              selectedIndex === i
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Create AiCreator.tsx**

```tsx
import { useState } from 'react'
import AiResultGrid from './AiResultGrid'

const styleOptions = [
  { id: 'realistic', label: '写实', icon: '📷' },
  { id: 'anime', label: '动漫', icon: '🎨' },
  { id: 'illustration', label: '插画', icon: '✏️' },
  { id: '3d', label: '3D', icon: '🧊' },
]

const sizeOptions = [
  { id: 'portrait', label: '竖屏 9:16', icon: '📱' },
  { id: 'landscape', label: '横屏 16:9', icon: '🖥️' },
  { id: 'square', label: '方形 1:1', icon: '⬜' },
]

interface AiCreatorProps {
  onBack: () => void
  onUseResult: (type: 'image' | 'video') => void
}

export default function AiCreator({ onBack, onUseResult }: AiCreatorProps) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('realistic')
  const [size, setSize] = useState('portrait')
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [selectedResult, setSelectedResult] = useState<number | null>(null)

  const handleGenerate = async (type: 'image' | 'video') => {
    if (!prompt.trim()) return
    setGenerating(true)
    setResults([])
    setSelectedResult(null)

    // Simulate AI generation
    await new Promise((r) => setTimeout(r, 2000))

    // Mock results
    const mockResults = type === 'image'
      ? ['🖼️', '🎨', '🌄', '🏙️']
      : ['🎬', '📽️', '🎥']
    setResults(mockResults)
    setGenerating(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600"
        >
          ← 返回
        </button>
        <h2 className="text-lg font-bold">AI 创作</h2>
      </div>

      {/* Prompt input */}
      <div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要的画面内容，例如：一只猫在花园里玩耍，阳光明媚..."
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Style selector */}
      <div>
        <p className="text-xs text-gray-500 mb-2">风格</p>
        <div className="flex gap-2">
          {styleOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-colors ${
                style === s.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Size selector */}
      <div>
        <p className="text-xs text-gray-500 mb-2">尺寸</p>
        <div className="flex gap-2">
          {sizeOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSize(s.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm transition-colors ${
                size === s.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleGenerate('image')}
          disabled={!prompt.trim() || generating}
          className="py-3 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {generating ? '生成中...' : '✨ 生成图片'}
        </button>
        <button
          onClick={() => handleGenerate('video')}
          disabled={!prompt.trim() || generating}
          className="py-3 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {generating ? '生成中...' : '🎬 生成视频'}
        </button>
      </div>

      {/* Loading */}
      {generating && (
        <div className="text-center py-6">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 mt-2">AI 正在创作中...</p>
        </div>
      )}

      {/* Results */}
      <AiResultGrid
        results={results}
        selectedIndex={selectedResult}
        onSelect={setSelectedResult}
      />

      {/* Use result */}
      {selectedResult !== null && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onUseResult('image')}
            className="py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            选择并编辑
          </button>
          <button
            onClick={() => handleGenerate('image')}
            className="py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            重新生成
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
mkdir -p frontend/src/components/creator/ai
git add frontend/src/components/creator/ai/
git commit -m "feat: add AiCreator and AiResultGrid components"
```

---

## Task 11: Add crop and filter intensity to useFFmpeg hook

**Files:**
- Modify: `frontend/src/hooks/useFFmpeg.ts`

**Step 1: Add crop operation and update applyFilter to support intensity**

Add these two new methods to the hook. Append them before the `return` statement.

Add `crop` method after `concat`:

```ts
const crop = useCallback(
  async (
    inputFile: File,
    aspectId: string,
    ratio: number | null,
  ): Promise<Blob | null> => {
    const ext = getExtension(inputFile.name)
    const inputName = `input${ext}`
    const outputName = `output${ext}`

    // If no ratio (free), use 9:16 as default
    const r = ratio ?? 9 / 16

    // Calculate crop dimensions based on target ratio
    // Assume we want to crop to center
    let cropFilter: string
    if (r > 1) {
      // Wider: crop height
      cropFilter = `crop=iw:iw/${r.toFixed(4)}:0:(ih-iw/${r.toFixed(4)})/2`
    } else {
      // Taller or square: crop width
      cropFilter = `crop=ih*${r.toFixed(4)}:ih:(iw-ih*${r.toFixed(4)})/2:0`
    }

    return runOperation(inputFile, inputName, outputName, [
      '-i', inputName,
      '-vf', cropFilter,
      outputName,
    ])
  },
  [runOperation],
)
```

Update the `applyFilter` method signature to accept `intensity` parameter (0-1):

Update the `filterMap` to support intensity. Replace the existing `applyFilter` with:

```ts
const applyFilter = useCallback(
  async (inputFile: File, filterName: string, intensity: number = 1): Promise<Blob | null> => {
    const ext = getExtension(inputFile.name)
    const inputName = `input${ext}`
    const outputName = `output${ext}`

    const filterMap: Record<string, string> = {
      grayscale: 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
      warm: 'colortemperature=6500',
      cool: 'colortemperature=3500',
      vintage: 'curves=vintage',
      vivid: `eq=saturation=${1 + 0.5 * intensity}:contrast=${1 + 0.1 * intensity}`,
      soft: `gblur=sigma=${2 * intensity}`,
      portrait: `eq=brightness=${0.05 * intensity}:saturation=${1 + 0.2 * intensity}`,
      rosy: `colorbalance=rs=${0.3 * intensity}:gs=${-0.1 * intensity}:bs=${-0.1 * intensity}`,
      fair: `eq=brightness=${0.1 * intensity}:gamma=${1 + 0.2 * intensity}`,
      appetite: `colorbalance=rs=${0.2 * intensity}:gs=${0.1 * intensity}`,
      fresh: `eq=saturation=${1 + 0.3 * intensity}:brightness=${0.05 * intensity}`,
      golden: `colorbalance=rs=${0.2 * intensity}:gs=${0.15 * intensity}:bs=${-0.1 * intensity}`,
      sunset: `colorbalance=rs=${0.4 * intensity}:gs=${0.1 * intensity}:bs=${-0.2 * intensity}`,
      forest: `colorbalance=rs=${-0.1 * intensity}:gs=${0.3 * intensity}:bs=${0.1 * intensity}`,
      ocean: `colorbalance=rs=${-0.1 * intensity}:gs=${0.1 * intensity}:bs=${0.3 * intensity}`,
    }

    const filterValue = filterMap[filterName]
    if (!filterValue) {
      console.error(`Unknown filter: ${filterName}`)
      return null
    }

    return runOperation(inputFile, inputName, outputName, [
      '-i', inputName,
      '-vf', filterValue,
      outputName,
    ])
  },
  [runOperation],
)
```

Update the return statement to include `crop`:

```ts
return {
  status,
  progress,
  load,
  trim,
  changeSpeed,
  addText,
  applyFilter,
  concat,
  crop,
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useFFmpeg.ts
git commit -m "feat: add crop operation and filter intensity to useFFmpeg"
```

---

## Task 12: Rewrite Create.tsx — three-entry mode with all panels

**Files:**
- Modify: `frontend/src/pages/Create.tsx`

This is the largest task. The page needs to support three modes:
1. TemplatePicker (initial screen)
2. Editor (video editing with all 9 tools + canvas overlay)
3. AI Creator

**Step 1: Rewrite Create.tsx**

```tsx
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSourceFile(file)
      setConcatFiles([file])
      setTrimStart(0)
      setSpeed(1)
      setMode('editor')
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
    // Would need actual audio files and FFmpeg amix for real implementation
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
    // Open file picker, then enter editor with template presets
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
```

**Step 2: Build verify**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Create.tsx
git commit -m "feat: rewrite Create page with template picker, AI creator, and 9 tools"
```

---

## Task 13: Build verification and push

**Step 1: Full build check**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

Expected: Clean build, no errors.

**Step 2: Push to deploy**

```bash
git push origin master
```

**Step 3: Verify deployment**

```bash
vercel ls 2>&1 | head -6
```

Wait for `● Ready` status.
