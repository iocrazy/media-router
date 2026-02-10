import { useState } from 'react'

interface Video {
  id: string
  title: string
  cover: string
  account: string
  avatar: string
  publishTime: string
  views: number
  likes: number
  comments: number
}

const mockVideos: Video[] = [
  {
    id: '1',
    title: '【爆款推荐】2024新款保温杯 316不锈钢大容量',
    cover: 'https://picsum.photos/seed/v1/160/90',
    account: 'HEYGO',
    avatar: '',
    publishTime: '2025-02-08 14:30',
    views: 12580,
    likes: 346,
    comments: 28,
  },
  {
    id: '2',
    title: '春季新款女装连衣裙 法式复古碎花裙',
    cover: 'https://picsum.photos/seed/v2/160/90',
    account: 'HEYGO',
    avatar: '',
    publishTime: '2025-02-07 10:15',
    views: 8923,
    likes: 215,
    comments: 17,
  },
  {
    id: '3',
    title: '家用智能扫地机器人 全自动清洁吸尘器',
    cover: 'https://picsum.photos/seed/v3/160/90',
    account: 'HEYGO',
    avatar: '',
    publishTime: '2025-02-06 16:45',
    views: 23410,
    likes: 892,
    comments: 64,
  },
  {
    id: '4',
    title: '儿童益智积木玩具 大颗粒拼装恐龙系列',
    cover: 'https://picsum.photos/seed/v4/160/90',
    account: 'HEYGO',
    avatar: '',
    publishTime: '2025-02-05 09:20',
    views: 5678,
    likes: 134,
    comments: 11,
  },
  {
    id: '5',
    title: '厨房收纳置物架 多层不锈钢调料架',
    cover: 'https://picsum.photos/seed/v5/160/90',
    account: 'HEYGO',
    avatar: '',
    publishTime: '2025-02-04 20:00',
    views: 15230,
    likes: 467,
    comments: 35,
  },
  {
    id: '6',
    title: '无线蓝牙耳机 降噪运动跑步专用',
    cover: 'https://picsum.photos/seed/v6/160/90',
    account: 'HEYGO',
    avatar: '',
    publishTime: '2025-02-03 11:30',
    views: 31200,
    likes: 1205,
    comments: 89,
  },
]

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  return num.toString()
}

function VideoCard({ video }: { video: Video }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex gap-3 p-3">
        <img
          src={video.cover}
          alt={video.title}
          className="w-28 h-16 rounded-md object-cover bg-gray-100 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-5">
            {video.title}
          </p>
          <p className="text-xs text-gray-400 mt-1">{video.publishTime}</p>
        </div>
      </div>
      <div className="flex border-t border-gray-50 divide-x divide-gray-50">
        <div className="flex-1 flex items-center justify-center gap-1 py-2">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-xs text-gray-500">{formatNumber(video.views)}</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-1 py-2">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-xs text-gray-500">{formatNumber(video.likes)}</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-1 py-2">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs text-gray-500">{formatNumber(video.comments)}</span>
        </div>
      </div>
    </div>
  )
}

export default function Videos() {
  const [filter, setFilter] = useState<'all' | 'recent'>('all')

  const filteredVideos = filter === 'recent'
    ? mockVideos.slice(0, 3)
    : mockVideos

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">视频管理</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              filter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('recent')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              filter === 'recent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            最近7天
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 mb-3">
        共 {filteredVideos.length} 个视频
      </div>

      <div className="space-y-3">
        {filteredVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
}
