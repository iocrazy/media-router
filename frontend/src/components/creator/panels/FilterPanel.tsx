interface FilterPanelProps {
  processing: boolean;
  onApply: (filter: string) => void;
}

const FILTERS = [
  { id: 'gray', label: '黑白', color: 'bg-gray-500' },
  { id: 'orange', label: '暖色', color: 'bg-orange-400' },
  { id: 'blue', label: '冷色', color: 'bg-blue-400' },
  { id: 'amber', label: '复古', color: 'bg-amber-600' },
  { id: 'pink', label: '鲜艳', color: 'bg-pink-400' },
];

export default function FilterPanel({ processing, onApply }: FilterPanelProps) {
  if (processing) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-gray-50 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          正在应用滤镜...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="grid grid-cols-5 gap-3">
        {FILTERS.map(({ id, label, color }) => (
          <button
            key={id}
            onClick={() => onApply(id)}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`aspect-square w-full rounded-xl ${color}`} />
            <span className="text-xs text-gray-600">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
