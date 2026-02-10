const summaryData = [
  { label: '总播放', value: 97021, icon: '▶', color: 'bg-blue-50 text-blue-600' },
  { label: '总点赞', value: 3259, icon: '♥', color: 'bg-red-50 text-red-500' },
  { label: '总评论', value: 244, icon: '💬', color: 'bg-green-50 text-green-600' },
  { label: '总分享', value: 1832, icon: '↗', color: 'bg-purple-50 text-purple-600' },
]

const videoStats = [
  {
    id: '1',
    title: '【爆款推荐】2024新款保温杯 316不锈钢大容量',
    views: 12580,
    likes: 346,
    comments: 28,
    shares: 156,
    trend: '+12.3%',
    trendUp: true,
  },
  {
    id: '2',
    title: '无线蓝牙耳机 降噪运动跑步专用',
    views: 31200,
    likes: 1205,
    comments: 89,
    shares: 523,
    trend: '+28.7%',
    trendUp: true,
  },
  {
    id: '3',
    title: '家用智能扫地机器人 全自动清洁吸尘器',
    views: 23410,
    likes: 892,
    comments: 64,
    shares: 412,
    trend: '+5.1%',
    trendUp: true,
  },
  {
    id: '4',
    title: '春季新款女装连衣裙 法式复古碎花裙',
    views: 8923,
    likes: 215,
    comments: 17,
    shares: 98,
    trend: '-3.2%',
    trendUp: false,
  },
  {
    id: '5',
    title: '厨房收纳置物架 多层不锈钢调料架',
    views: 15230,
    likes: 467,
    comments: 35,
    shares: 287,
    trend: '+8.6%',
    trendUp: true,
  },
]

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  return num.toLocaleString()
}

export default function Analytics() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">数据总览</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {summaryData.map((item) => (
          <div
            key={item.label}
            className={`rounded-xl p-4 ${item.color}`}
          >
            <div className="text-lg mb-1">{item.icon}</div>
            <div className="text-2xl font-bold">{formatNumber(item.value)}</div>
            <div className="text-xs mt-1 opacity-70">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">视频数据排行</h2>
        <span className="text-xs text-gray-400">近7天</span>
      </div>

      {/* Video Stats List */}
      <div className="space-y-3">
        {videoStats.map((video, index) => (
          <div
            key={video.id}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-3"
          >
            <div className="flex items-start gap-2 mb-2">
              <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                index === 0 ? 'bg-yellow-100 text-yellow-600' :
                index === 1 ? 'bg-gray-100 text-gray-500' :
                index === 2 ? 'bg-orange-50 text-orange-500' :
                'bg-gray-50 text-gray-400'
              }`}>
                {index + 1}
              </span>
              <p className="text-sm text-gray-900 line-clamp-1 flex-1">{video.title}</p>
              <span className={`text-xs font-medium flex-shrink-0 ${
                video.trendUp ? 'text-green-500' : 'text-red-500'
              }`}>
                {video.trend}
              </span>
            </div>
            <div className="flex gap-4 ml-7">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{formatNumber(video.views)}</div>
                <div className="text-xs text-gray-400">播放</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{formatNumber(video.likes)}</div>
                <div className="text-xs text-gray-400">点赞</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{video.comments}</div>
                <div className="text-xs text-gray-400">评论</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{video.shares}</div>
                <div className="text-xs text-gray-400">分享</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
