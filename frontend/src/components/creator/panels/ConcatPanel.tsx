import { useRef } from 'react';

interface ConcatPanelProps {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  processing: boolean;
  onApply: () => void;
}

export default function ConcatPanel({
  files,
  onAdd,
  onRemove,
  processing,
  onApply,
}: ConcatPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      onAdd(Array.from(selected));
    }
    // Reset input so the same files can be re-selected
    e.target.value = '';
  };

  return (
    <div className="space-y-3 rounded-xl bg-gray-50 p-4">
      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                {index + 1}
              </span>
              <span className="flex-1 truncate text-sm text-gray-700">
                {file.name}
              </span>
              <button
                onClick={() => onRemove(index)}
                className="shrink-0 text-gray-400 hover:text-red-500"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 active:bg-gray-100"
      >
        + 添加视频片段
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Apply */}
      <button
        onClick={onApply}
        disabled={processing || files.length < 2}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {processing ? '处理中...' : `合并 ${files.length} 个视频`}
      </button>
    </div>
  );
}
