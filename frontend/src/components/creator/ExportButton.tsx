interface ExportButtonProps {
  progress: number;
  processing: boolean;
  hasVideo: boolean;
  onExport: () => void;
}

export default function ExportButton({
  progress,
  processing,
  hasVideo,
  onExport,
}: ExportButtonProps) {
  if (!hasVideo) return null;

  if (processing) {
    return (
      <div className="space-y-2 px-4">
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <p className="text-center text-xs text-gray-500">
          导出中 {Math.round(progress)}%
        </p>
      </div>
    );
  }

  return (
    <div className="px-4">
      <button
        onClick={onExport}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white active:opacity-90"
      >
        导出并发布
      </button>
    </div>
  );
}
