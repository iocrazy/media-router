interface SpeedPanelProps {
  speed: number;
  onChange: (speed: number) => void;
  processing: boolean;
  onApply: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.5, 2];

export default function SpeedPanel({
  speed,
  onChange,
  processing,
  onApply,
}: SpeedPanelProps) {
  return (
    <div className="space-y-4 rounded-xl bg-gray-50 p-4">
      <div className="flex justify-center gap-2">
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              speed === s
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <button
        onClick={onApply}
        disabled={processing || speed === 1}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {processing ? '处理中...' : '应用调速'}
      </button>
    </div>
  );
}
