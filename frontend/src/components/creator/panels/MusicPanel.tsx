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
              {playing === t.id ? '\u23F8' : '\u25B6'}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{'\u266A'} {t.name}</p>
            </div>
            <span className="text-xs text-gray-400">{t.duration}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelected(t.id)
              }}
              className={`text-lg ${selected === t.id ? 'text-blue-600' : 'text-gray-300'}`}
            >
              {selected === t.id ? '\u2713' : '+'}
            </button>
          </div>
        ))}
      </div>

      {/* Volume controls */}
      {selected && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">{'\uD83D\uDD0A'} 音乐</span>
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
            <span className="text-xs text-gray-500 w-16">{'\uD83D\uDD0A'} 原声</span>
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
