# 视频创作工具模块设计

> 日期：2026-02-22
> 目标：为 MediaHub 添加视频编辑功能，将产品定位为"创作工具"，以满足抖音开放平台 aweme.share 审核要求。

## 背景

抖音开放平台的投稿能力（aweme.share）仅对创作工具、社区、硬件配套、游戏类应用开放。MediaHub 作为内容管理平台无法直接申请通过。需要加入真实的视频创作功能，将产品重新定位为"视频创作+发布工具"。

## 设计目标

- **审核优先**：做出看起来专业的基础剪辑功能，够截图、够演示
- **纯 Web 端**：浏览器内完成所有视频处理，不依赖后端
- **最小开发量**：只做审核必需的功能，不过度建设
- **与现有系统集成**：编辑完成后无缝跳转到发布页

## 技术方案：FFmpeg.wasm

使用 FFmpeg WebAssembly 版本在浏览器端完成视频处理。

优势：
- 纯前端，不需要后端配合
- FFmpeg 是行业标准，功能可靠
- 截图效果专业，审核材料可信度高

代价：
- FFmpeg.wasm 核心约 25MB，需懒加载
- 大视频处理时性能受限于浏览器

## 页面与导航

新增「创作」页面（`/create`），插入底部导航栏：

```
账号 | 创作 | 发布 | 记录
```

用户流程：

```
创作页 → 选择/上传视频 → 编辑 → 导出 → 跳转发布页
```

## 编辑功能清单

| 功能 | 说明 | FFmpeg 实现 |
|------|------|------------|
| 视频导入 | 本地选择视频文件 | `<input type="file">` |
| 裁剪 | 选择起止时间截取片段 | `-ss -to` |
| 拼接 | 多段视频合并 | `concat` demuxer |
| 调速 | 0.5x / 1x / 1.5x / 2x | `setpts=PTS*N` + `atempo` |
| 文字叠加 | 添加标题文字到视频 | `drawtext` filter |
| 滤镜 | 5 个预设（黑白、暖色、冷色、复古、鲜艳） | `colorbalance` / `eq` / `hue` |
| 导出 | 输出 MP4 | H.264 编码 |

## UI 布局（移动端优先）

```
┌─────────────────────────┐
│     视频预览区域          │
│   ┌─────────────────┐   │
│   │                 │   │
│   │   Video Player  │   │
│   │                 │   │
│   └─────────────────┘   │
│                         │
│  ──●━━━━━━━━━━━━●──     │  ← 裁剪滑块
│  00:03        00:15     │
│                         │
├─────────────────────────┤
│  工具栏 (横向滚动)        │
│  [裁剪] [拼接] [调速]    │
│  [文字] [滤镜] [导出]    │
├─────────────────────────┤
│  当前工具的参数面板        │
│  (滤镜网格 / 文字输入等)  │
└─────────────────────────┘
```

## 组件架构

```
pages/Create.tsx                — 页面入口
components/creator/
├── VideoPreview.tsx            — 视频播放 + 预览
├── TrimSlider.tsx              — 双滑块裁剪时间选择器
├── ToolBar.tsx                 — 底部工具栏（图标按钮）
├── panels/
│   ├── TrimPanel.tsx           — 裁剪参数（起止时间显示）
│   ├── ConcatPanel.tsx         — 拼接（添加更多视频片段）
│   ├── SpeedPanel.tsx          — 调速选项（4 档按钮）
│   ├── TextPanel.tsx           — 文字输入 + 字号 + 颜色 + 位置
│   └── FilterPanel.tsx         — 滤镜预设缩略图网格
├── ExportButton.tsx            — 导出按钮 + 进度条
└── EditorLoading.tsx           — FFmpeg 加载中状态
hooks/
└── useFFmpeg.ts                — FFmpeg.wasm 初始化 + 命令封装
```

## 新增依赖

```json
{
  "@ffmpeg/ffmpeg": "^0.12.x",
  "@ffmpeg/util": "^0.12.x"
}
```

## FFmpeg.wasm 加载策略

1. 懒加载：仅在进入 `/create` 页面时触发
2. 显示加载进度："正在准备编辑器..."
3. 使用 SharedArrayBuffer + Web Worker 避免阻塞主线程
4. Vite 配置：需要设置 COOP/COEP headers 支持 SharedArrayBuffer

## 与现有系统集成

- 编辑导出的视频通过 React Router state 传递到发布页
- `navigate('/publish', { state: { videoFile, fromCreator: true } })`
- 发布页 ContentUpload 组件检测到 state 中的 videoFile 时自动填入
- 不改动现有发布流程

## Vite 配置变更

需要在 vite.config.ts 中添加 COOP/COEP headers：

```ts
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  }
}
```

## 不做的事情（YAGNI）

- 不做时间线编辑器（太复杂）
- 不做音频分离/混音
- 不做转场特效
- 不做贴纸/表情包
- 不做云端视频处理
- 不做视频模板
