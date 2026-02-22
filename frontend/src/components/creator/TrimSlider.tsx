import { useRef, useCallback } from 'react';

interface TrimSliderProps {
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}

const MIN_GAP = 0.5;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TrimSlider({
  duration,
  start,
  end,
  onChange,
}: TrimSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const getPositionFromEvent = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track || duration <= 0) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration],
  );

  const handlePointerDown = useCallback(
    (handle: 'start' | 'end') => (e: React.PointerEvent) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const pos = getPositionFromEvent(ev.clientX);
        if (handle === 'start') {
          const clamped = Math.max(0, Math.min(pos, end - MIN_GAP));
          onChange(clamped, end);
        } else {
          const clamped = Math.min(duration, Math.max(pos, start + MIN_GAP));
          onChange(start, clamped);
        }
      };

      const onUp = () => {
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', onUp);
      };

      target.addEventListener('pointermove', onMove);
      target.addEventListener('pointerup', onUp);
    },
    [duration, start, end, onChange, getPositionFromEvent],
  );

  const startPercent = duration > 0 ? (start / duration) * 100 : 0;
  const endPercent = duration > 0 ? (end / duration) * 100 : 100;
  const selectedDuration = end - start;

  return (
    <div className="px-2 py-4">
      {/* Track */}
      <div ref={trackRef} className="relative h-2 rounded-full bg-gray-200">
        {/* Selected range */}
        <div
          className="absolute top-0 h-full rounded-full bg-blue-500"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        />

        {/* Start handle */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none"
          style={{ left: `${startPercent}%` }}
          onPointerDown={handlePointerDown('start')}
        >
          <div className="h-5 w-5 rounded-full border-2 border-blue-600 bg-white shadow" />
        </div>

        {/* End handle */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none"
          style={{ left: `${endPercent}%` }}
          onPointerDown={handlePointerDown('end')}
        >
          <div className="h-5 w-5 rounded-full border-2 border-blue-600 bg-white shadow" />
        </div>
      </div>

      {/* Labels */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-gray-500">{formatTime(start)}</span>
        <span className="font-medium text-blue-600">
          时长 {formatTime(selectedDuration)}
        </span>
        <span className="text-gray-500">{formatTime(end)}</span>
      </div>
    </div>
  );
}
