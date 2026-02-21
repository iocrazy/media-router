# 发布系统完整重构设计

> Date: 2026-02-21
> Status: Design

## 背景

参照专业多平台发布工具（蚁小二等）的功能，对 MediaHub 发布系统进行完整重构。保持移动端优先布局，复刻以下核心能力：

- 卡片式表单（描述、可见性、AI标记、话题标签、封面）
- 快速填写 + 每账号独立配置
- 视频批量上传 + 两种分发模式
- 数据库草稿保存

## 数据模型

### 新增表：`drafts`

```sql
create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  content_type varchar(20) not null default 'video',
  title text,
  description text,
  video_urls jsonb not null default '[]',
  image_urls jsonb not null default '[]',
  article_content text,
  cover_url text,
  visibility varchar(20) not null default 'public',
  ai_content boolean not null default false,
  topics jsonb not null default '[]',
  account_ids jsonb not null default '[]',
  account_configs jsonb not null default '{}',
  distribution_mode varchar(20) not null default 'one_to_one',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table drafts enable row level security;
create policy "Users manage own drafts"
  on drafts for all using (auth.uid() = user_id);
```

### 扩展 `publish_tasks`

```sql
alter table publish_tasks
  add column visibility varchar(20) not null default 'public',
  add column ai_content boolean not null default false,
  add column cover_url text,
  add column topics jsonb not null default '[]';
```

### 扩展 `task_accounts`

```sql
alter table task_accounts
  add column title text,
  add column description text,
  add column topics jsonb;
```

## 后端 API

### 草稿 CRUD

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/drafts` | 创建草稿 |
| GET | `/api/drafts` | 列出用户草稿 |
| GET | `/api/drafts/{id}` | 获取草稿详情 |
| PUT | `/api/drafts/{id}` | 更新草稿 |
| DELETE | `/api/drafts/{id}` | 删除草稿 |

### 扩展任务创建

`POST /api/tasks` 请求体扩展：

```python
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: ContentType = "video"
    video_url: Optional[str] = None          # 单视频模式
    video_urls: list[str] = []               # 批量视频模式
    image_urls: list[str] = []
    article_content: Optional[str] = None
    cover_url: Optional[str] = None
    visibility: str = "public"
    ai_content: bool = False
    topics: list[str] = []
    account_ids: list[str]
    account_configs: dict[str, AccountConfig] = {}  # 每账号覆盖
    distribution_mode: str = "broadcast"     # broadcast | one_to_one
    scheduled_at: Optional[datetime] = None
```

**批量任务生成逻辑：**

- `distribution_mode = "broadcast"`（多视频发一账号）：每个视频 × 所有账号 = N×M 个 task_accounts，但每个视频一个 task
- `distribution_mode = "one_to_one"`（一视频一账号）：视频按顺序分配给账号，视频多于账号则循环分配

后端返回 `list[TaskResponse]`（批量模式返回多个任务）。

### Schemas

```python
class AccountConfig(BaseModel):
    """Per-account override for title/description/topics."""
    title: Optional[str] = None
    description: Optional[str] = None
    topics: Optional[list[str]] = None

class DraftCreate(BaseModel):
    content_type: ContentType = "video"
    title: Optional[str] = None
    description: Optional[str] = None
    video_urls: list[str] = []
    image_urls: list[str] = []
    article_content: Optional[str] = None
    cover_url: Optional[str] = None
    visibility: str = "public"
    ai_content: bool = False
    topics: list[str] = []
    account_ids: list[str] = []
    account_configs: dict[str, AccountConfig] = {}
    distribution_mode: str = "broadcast"
    scheduled_at: Optional[datetime] = None

class DraftResponse(DraftCreate):
    id: str
    created_at: datetime
    updated_at: datetime
```

## 前端发布页设计

### 整体流程

```
类型选择 → 内容表单 → (批量预览) → 发布/保存草稿
                ↕
           草稿加载/恢复
```

### Step 1: 类型选择

保持现有三卡片选择（视频/图文/文章）。新增：
- 顶部显示「最近草稿」快捷入口（如有草稿）

### Step 2: 表单页（移动端单栏流式布局）

从上到下依次排列卡片式区块：

#### 2.1 内容上传区

**视频模式：**
- 支持多文件选择，拖拽或点击
- 显示已上传视频列表（缩略图 + 文件名 + 删除按钮）
- 文件数量计数："已添加 N 个视频"

**图文模式：**
- 保持现有多图上传（最多9张）
- 已上传图片网格 + 删除按钮

**文章模式：**
- 保持现有大文本框

#### 2.2 封面设置（可选卡片）

- 默认折叠，点击展开
- 上传封面图 / 从已上传图片中选择
- 预览缩略图
- 提示："不设置则平台默认使用第一张图片作为封面"

#### 2.3 标题

- 文本输入 + 字数统计（右下角显示字数）
- maxLength 100

#### 2.4 描述

- textarea + 字数统计
- 底部快捷按钮：
  - `#添加话题` - 弹出话题输入弹窗，插入 #话题 到描述中
  - `常用话题/标签` - 弹出常用标签列表（localStorage 存储常用标签）

#### 2.5 账号选择

- 搜索框过滤账号
- 账号列表：平台图标 + 头像 + 用户名 + 状态标签
- 授权过期账号显示警告
- 选中后可展开「自定义配置」面板：
  - 标题覆盖（留空则用全局标题）
  - 描述覆盖
  - 话题覆盖

#### 2.6 发布方式

**通用：**
- 立即发布 / 定时发布 切换
- 定时发布选择器（日期+时间）

**视频专属（多视频时显示）：**
- 分发模式选择：
  - 一视频一账号（按顺序分配）
  - 多视频发一账号（全部视频发到所有账号）
- 勾选框：「生成任务时同步视频文件名为标题」

#### 2.7 可见性

- 单选：公开 / 私密/草稿
- 默认「公开」

#### 2.8 AI 内容标记

- 勾选框：「包含AI生成内容」
- 提示文字："支持 抖音、快手、小红书 等平台"

#### 2.9 操作栏（底部固定）

- 「保存到草稿」按钮（次要样式）
- 「创建发布任务」按钮（主要样式）
- 批量视频模式：发布前显示任务预览（将生成 N 个任务）

### 成功页

- 视频单个：显示 SharePanel（现有）
- 视频批量 / 图文 / 文章：显示 SuccessPanel

### 草稿管理

- 发布页顶部：最近草稿条目（点击加载）
- 草稿列表可在发布页 Step 1 访问
- 加载草稿后恢复所有表单状态

## 前端组件拆分

```
pages/Publish.tsx          # 主页面（流程控制）
components/publish/
  ContentUpload.tsx        # 内容上传区（视频/图文/文章）
  CoverUpload.tsx          # 封面上传
  TitleInput.tsx           # 标题 + 字数
  DescriptionInput.tsx     # 描述 + 话题按钮
  AccountSelector.tsx      # 账号选择 + 搜索 + 每账号配置
  PublishModeSelector.tsx  # 发布方式 + 分发模式
  VisibilitySelector.tsx   # 可见性选择
  AiContentToggle.tsx      # AI 标记
  DraftBar.tsx             # 草稿快捷入口
  BatchPreview.tsx         # 批量任务预览
  TopicPicker.tsx          # 话题选择器弹窗
```

## Tasks 页面更新

- 批量任务显示：可折叠的任务组（同一批次的任务归组）
- 内容类型标签（已有）
- 分发模式标签（一对一/广播）

## 不改动的部分

- 登录页、账号页、数据分析页
- 全局布局（底部导航保持不变）
- 平台配置系统

## 验证方式

1. SQL 迁移后检查新表和新列
2. 后端启动正常，API 文档显示新端点
3. 前端 `npm run build` 通过
4. 发布页三种类型表单完整可用
5. 批量视频上传 + 两种分发模式正确生成任务
6. 草稿保存和加载正常
7. 每账号独立配置正确传递到后端
8. Tasks 页正确显示所有新字段
