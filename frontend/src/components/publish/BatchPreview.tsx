import type { Account, DistributionMode } from '../../services/api'

interface VideoFile {
  name: string
  url: string | null
}

interface BatchPreviewProps {
  videoFiles: VideoFile[]
  accounts: Account[]
  selectedIds: string[]
  distributionMode: DistributionMode
  useFilenameAsTitle: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

function deriveTitle(fileName: string, useFilenameAsTitle: boolean, fallbackTitle: string): string {
  if (useFilenameAsTitle) {
    return fileName.replace(/\.[^.]+$/, '')
  }
  return fallbackTitle || fileName.replace(/\.[^.]+$/, '')
}

interface TaskRow {
  videoName: string
  accountNames: string[]
}

function buildTaskRows(
  videoFiles: VideoFile[],
  accounts: Account[],
  selectedIds: string[],
  distributionMode: DistributionMode,
  useFilenameAsTitle: boolean,
  title: string,
): TaskRow[] {
  const selectedAccounts = accounts.filter((a) => selectedIds.includes(a.id))
  if (selectedAccounts.length === 0 || videoFiles.length === 0) return []

  const rows: TaskRow[] = []

  if (distributionMode === 'broadcast') {
    for (const file of videoFiles) {
      rows.push({
        videoName: deriveTitle(file.name, useFilenameAsTitle, title),
        accountNames: selectedAccounts.map((a) => a.username),
      })
    }
  } else {
    for (let i = 0; i < videoFiles.length; i++) {
      const account = selectedAccounts[i % selectedAccounts.length]
      rows.push({
        videoName: deriveTitle(videoFiles[i].name, useFilenameAsTitle, title),
        accountNames: [account.username],
      })
    }
  }

  return rows
}

export default function BatchPreview({
  videoFiles,
  accounts,
  selectedIds,
  distributionMode,
  useFilenameAsTitle,
  title,
  onConfirm,
  onCancel,
}: BatchPreviewProps) {
  const rows = buildTaskRows(videoFiles, accounts, selectedIds, distributionMode, useFilenameAsTitle, title)
  const totalTasks = distributionMode === 'broadcast'
    ? videoFiles.length * selectedIds.length
    : videoFiles.length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">任务预览</h2>

        <div className="space-y-2 mb-4">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-gray-900 shrink-0 max-w-[40%] truncate">
                {row.videoName}
              </span>
              <span className="text-gray-400 shrink-0">→</span>
              <span className="text-gray-600 truncate">
                {row.accountNames.join(', ')}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500 mb-6">
          将生成 <span className="font-medium text-gray-900">{totalTasks}</span> 个发布任务
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            确认发布
          </button>
        </div>
      </div>
    </div>
  )
}
