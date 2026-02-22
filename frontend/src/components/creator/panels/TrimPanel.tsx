interface TrimPanelProps {
  start: number;
  end: number;
  duration: number;
  processing: boolean;
  onApply: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TrimPanel({
  start,
  end,
  duration,
  processing,
  onApply,
}: TrimPanelProps) {
  const noChange = start === 0 && end === duration;
  const trimDuration = end - start;

  return (
    <div className="space-y-4 rounded-xl bg-gray-50 p-4">
      <div className="flex justify-between text-xs text-gray-500">
        <span>开始: {formatTime(start)}</span>
        <span>时长: {formatTime(trimDuration)}</span>
        <span>结束: {formatTime(end)}</span>
      </div>

      <button
        onClick={onApply}
        disabled={processing || noChange}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {processing ? '处理中...' : '应用裁剪'}
      </button>
    </div>
  );
}
