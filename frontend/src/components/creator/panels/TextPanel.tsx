import { useState } from 'react';

interface TextPanelProps {
  processing: boolean;
  onApply: (text: string, fontSize: number, color: string) => void;
}

const FONT_SIZES = [24, 32, 48, 64];

const COLORS = [
  { id: 'white', value: '#ffffff', bg: 'bg-white border border-gray-300' },
  { id: 'yellow', value: '#facc15', bg: 'bg-yellow-400' },
  { id: 'red', value: '#ef4444', bg: 'bg-red-500' },
  { id: 'cyan', value: '#06b6d4', bg: 'bg-cyan-500' },
  { id: 'lime', value: '#84cc16', bg: 'bg-lime-500' },
];

export default function TextPanel({ processing, onApply }: TextPanelProps) {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(32);
  const [color, setColor] = useState('#ffffff');

  return (
    <div className="space-y-4 rounded-xl bg-gray-50 p-4">
      {/* Text input */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 50))}
        maxLength={50}
        placeholder="输入文字内容..."
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      <div className="text-right text-xs text-gray-400">{text.length}/50</div>

      {/* Font size */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">字号</span>
        <div className="flex gap-2">
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setFontSize(s)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                fontSize === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 shrink-0">颜色</span>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setColor(c.value)}
              className={`h-7 w-7 rounded-full ${c.bg} ${
                color === c.value ? 'ring-2 ring-blue-600 ring-offset-2' : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Apply */}
      <button
        onClick={() => onApply(text, fontSize, color)}
        disabled={processing || text.trim().length === 0}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {processing ? '处理中...' : '添加文字'}
      </button>
    </div>
  );
}
