export type ToolType = 'trim' | 'concat' | 'speed' | 'text' | 'filter';

interface ToolBarProps {
  active: ToolType | null;
  onChange: (tool: ToolType | null) => void;
  disabled: boolean;
}

interface ToolDef {
  type: ToolType;
  label: string;
  icon: React.ReactNode;
}

const tools: ToolDef[] = [
  {
    type: 'trim',
    label: '裁剪',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
  },
  {
    type: 'concat',
    label: '拼接',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h4v4H4V6zm0 8h4v4H4v-4zm12-8h4v4h-4V6zm0 8h4v4h-4v-4zM10 9h4m-4 6h4" />
      </svg>
    ),
  },
  {
    type: 'speed',
    label: '调速',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    type: 'text',
    label: '文字',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M8 6v12m4-12v12m-2 0h4M6 6h2" />
      </svg>
    ),
  },
  {
    type: 'filter',
    label: '滤镜',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.95 7.95l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default function ToolBar({ active, onChange, disabled }: ToolBarProps) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto px-1 py-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {tools.map(({ type, label, icon }) => {
        const isActive = active === type;
        return (
          <button
            key={type}
            onClick={() => onChange(isActive ? null : type)}
            disabled={disabled}
            className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-2 transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-600'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
