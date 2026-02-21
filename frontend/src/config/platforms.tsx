const DouyinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className || "w-5 h-5"} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z" />
  </svg>
)

const KuaishouIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className || "w-5 h-5"} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
)

const XiaohongshuIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className || "w-5 h-5"} fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
)

export interface PlatformConfig {
  name: string
  icon: React.FC<{ className?: string }>
  color: string
  bgColor: string
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  douyin: {
    name: "抖音",
    icon: DouyinIcon,
    color: "#000000",
    bgColor: "#000000",
  },
  kuaishou: {
    name: "快手",
    icon: KuaishouIcon,
    color: "#FF4906",
    bgColor: "#FF4906",
  },
  xiaohongshu: {
    name: "小红书",
    icon: XiaohongshuIcon,
    color: "#FF2442",
    bgColor: "#FF2442",
  },
}

export function getPlatform(key: string): PlatformConfig {
  return PLATFORMS[key] || PLATFORMS.douyin
}
