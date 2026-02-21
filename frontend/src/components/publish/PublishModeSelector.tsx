import type { DistributionMode } from '../../services/api'

interface PublishModeSelectorProps {
  isScheduled: boolean
  onScheduleChange: (scheduled: boolean) => void
  scheduledDate: string
  onScheduledDateChange: (date: string) => void
  scheduledTime: string
  onScheduledTimeChange: (time: string) => void
  distributionMode: DistributionMode
  onDistributionModeChange: (mode: DistributionMode) => void
  showDistribution: boolean
  useFilenameAsTitle: boolean
  onFilenameAsTitleChange: (v: boolean) => void
}

function isDateTimeInPast(date: string, time: string): boolean {
  if (!date || !time) return false
  const selected = new Date(`${date}T${time}`)
  return selected.getTime() < Date.now()
}

export default function PublishModeSelector({
  isScheduled,
  onScheduleChange,
  scheduledDate,
  onScheduledDateChange,
  scheduledTime,
  onScheduledTimeChange,
  distributionMode,
  onDistributionModeChange,
  showDistribution,
  useFilenameAsTitle,
  onFilenameAsTitleChange,
}: PublishModeSelectorProps) {
  const isPast = isDateTimeInPast(scheduledDate, scheduledTime)

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
      <label className="block text-sm font-bold text-gray-900 mb-2">
        发布方式
      </label>

      {/* Immediate / Scheduled toggle */}
      <div className="flex flex-row gap-2 mb-3">
        <button
          type="button"
          onClick={() => onScheduleChange(false)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            !isScheduled
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          立即发布
        </button>
        <button
          type="button"
          onClick={() => onScheduleChange(true)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isScheduled
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          定时发布
        </button>
      </div>

      {/* Date/time pickers */}
      {isScheduled && (
        <div className="mb-3">
          <div className="flex flex-row gap-2">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => onScheduledDateChange(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => onScheduledTimeChange(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {isPast && (
            <p className="mt-1 text-xs text-red-500">
              所选时间已过，请选择未来的时间
            </p>
          )}
        </div>
      )}

      {/* Distribution mode */}
      {showDistribution && (
        <>
          <div className="border-t border-gray-200 my-3" />
          <label className="block text-sm font-bold text-gray-900 mb-2">
            分发模式
          </label>
          <div className="flex flex-row gap-2 mb-3">
            {/* one_to_one */}
            <button
              type="button"
              onClick={() => onDistributionModeChange('one_to_one')}
              className={`flex-1 rounded-lg border-2 p-3 text-left transition-colors ${
                distributionMode === 'one_to_one'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium text-gray-900">
                一视频一账号
              </div>
              <div className="text-xs text-gray-500 mt-1">
                视频按顺序分配给账号
              </div>
            </button>

            {/* broadcast */}
            <button
              type="button"
              onClick={() => onDistributionModeChange('broadcast')}
              className={`flex-1 rounded-lg border-2 p-3 text-left transition-colors ${
                distributionMode === 'broadcast'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium text-gray-900">
                多视频发一账号
              </div>
              <div className="text-xs text-gray-500 mt-1">
                全部视频发到所有账号
              </div>
            </button>
          </div>

          {/* Filename as title checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useFilenameAsTitle}
              onChange={(e) => onFilenameAsTitleChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              生成任务时同步视频文件名为标题
            </span>
          </label>
        </>
      )}
    </div>
  )
}
