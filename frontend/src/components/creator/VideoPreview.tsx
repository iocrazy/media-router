import { useRef, useState, useEffect, useCallback } from 'react';

interface VideoPreviewProps {
  src: string | null;
  trimStart?: number;
  trimEnd?: number;
  onDurationChange?: (duration: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VideoPreview({
  src,
  trimStart = 0,
  trimEnd,
  onDurationChange,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const effectiveTrimEnd = trimEnd ?? duration;

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    onDurationChange?.(video.duration);
  }, [onDurationChange]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    if (effectiveTrimEnd > 0 && video.currentTime >= effectiveTrimEnd) {
      video.pause();
      setPlaying(false);
    }
  }, [effectiveTrimEnd]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
      setPlaying(false);
    } else {
      if (video.currentTime < trimStart || video.currentTime >= effectiveTrimEnd) {
        video.currentTime = trimStart;
      }
      video.play();
      setPlaying(true);
    }
  }, [playing, trimStart, effectiveTrimEnd]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-black">
        <p className="text-sm text-gray-400">请选择视频文件</p>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-xl bg-black"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        playsInline
      />

      {/* Play/pause overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50">
            <svg
              className="ml-1 h-7 w-7 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Time display */}
      <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5">
        <span className="text-xs font-mono text-white">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
