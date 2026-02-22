interface EditorLoadingProps {
  status: 'loading' | 'error';
  onRetry: () => void;
}

export default function EditorLoading({ status, onRetry }: EditorLoadingProps) {
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-7 w-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">编辑器加载失败</p>
        <button
          onClick={onRetry}
          className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-medium text-white active:bg-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="text-sm font-medium text-gray-700">正在准备编辑器...</p>
      <p className="text-xs text-gray-400">首次加载需要下载约 25MB 资源</p>
    </div>
  );
}
