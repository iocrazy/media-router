# Publish System Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the publish page to support batch video upload, per-account configuration, drafts, visibility/AI settings, and topic tags — all in a mobile-first layout.

**Architecture:** Card-based form sections in a single-column mobile layout. Backend gains a drafts CRUD API and batch task creation (one_to_one / broadcast distribution modes). Frontend is decomposed into 11 reusable components under `components/publish/`.

**Tech Stack:** FastAPI + Pydantic (backend), React 19 + TypeScript + Tailwind CSS 4.0 (frontend), Supabase (DB + Storage + RLS)

**Design doc:** `docs/plans/2026-02-21-publish-system-redesign.md`

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/005_publish_redesign.sql`

**Step 1: Write the migration SQL**

```sql
-- 1. Create drafts table
create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type varchar(20) not null default 'video',
  title text,
  description text,
  video_urls jsonb not null default '[]'::jsonb,
  image_urls jsonb not null default '[]'::jsonb,
  article_content text,
  cover_url text,
  visibility varchar(20) not null default 'public',
  ai_content boolean not null default false,
  topics jsonb not null default '[]'::jsonb,
  account_ids jsonb not null default '[]'::jsonb,
  account_configs jsonb not null default '{}'::jsonb,
  distribution_mode varchar(20) not null default 'broadcast',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table drafts enable row level security;

create policy "Users manage own drafts"
  on drafts for all using (auth.uid() = user_id);

-- 2. Extend publish_tasks
alter table publish_tasks
  add column if not exists visibility varchar(20) not null default 'public',
  add column if not exists ai_content boolean not null default false,
  add column if not exists cover_url text,
  add column if not exists topics jsonb not null default '[]'::jsonb,
  add column if not exists distribution_mode varchar(20),
  add column if not exists batch_id uuid;

-- 3. Extend task_accounts with per-account overrides
alter table task_accounts
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists topics jsonb;
```

**Step 2: Commit**

```bash
git add supabase/migrations/005_publish_redesign.sql
git commit -m "feat: add migration for publish system redesign (drafts table, extended columns)"
```

---

## Task 2: Backend Schemas

**Files:**
- Modify: `backend/app/models/schemas.py`

**Step 1: Add AccountConfig, DraftCreate, DraftResponse schemas and update TaskCreate/TaskResponse**

Replace the entire file with:

```python
from pydantic import BaseModel, model_validator
from datetime import datetime
from typing import Literal, Optional


# Account schemas
class AccountBase(BaseModel):
    platform: str
    platform_user_id: str
    username: str
    avatar_url: Optional[str] = None


class AccountResponse(AccountBase):
    id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# Content types
ContentType = Literal["video", "image_text", "article"]
DistributionMode = Literal["broadcast", "one_to_one"]
Visibility = Literal["public", "private", "draft"]


# Per-account config override
class AccountConfig(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    topics: Optional[list[str]] = None


# Task schemas
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: ContentType = "video"
    video_url: Optional[str] = None
    video_urls: list[str] = []
    image_urls: list[str] = []
    article_content: Optional[str] = None
    cover_url: Optional[str] = None
    visibility: Visibility = "public"
    ai_content: bool = False
    topics: list[str] = []
    account_ids: list[str]
    account_configs: dict[str, AccountConfig] = {}
    distribution_mode: DistributionMode = "broadcast"
    scheduled_at: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_content(self):
        has_video = self.video_url or self.video_urls
        if self.content_type == "video" and not has_video:
            raise ValueError("video_url or video_urls required for video content")
        if self.content_type == "image_text" and not self.image_urls:
            raise ValueError("image_urls is required for image_text content")
        if self.content_type == "article" and not self.article_content:
            raise ValueError("article_content is required for article content")
        return self


class TaskAccountResponse(BaseModel):
    account_id: str
    username: str
    avatar_url: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    published_url: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    content_type: ContentType = "video"
    video_url: Optional[str] = None
    image_urls: list[str] = []
    article_content: Optional[str] = None
    cover_url: Optional[str] = None
    visibility: str = "public"
    ai_content: bool = False
    topics: list[str] = []
    distribution_mode: Optional[str] = None
    batch_id: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    share_id: Optional[str] = None
    created_at: datetime
    accounts: list[TaskAccountResponse]

    class Config:
        from_attributes = True


# Draft schemas
class DraftCreate(BaseModel):
    content_type: ContentType = "video"
    title: Optional[str] = None
    description: Optional[str] = None
    video_urls: list[str] = []
    image_urls: list[str] = []
    article_content: Optional[str] = None
    cover_url: Optional[str] = None
    visibility: Visibility = "public"
    ai_content: bool = False
    topics: list[str] = []
    account_ids: list[str] = []
    account_configs: dict[str, AccountConfig] = {}
    distribution_mode: DistributionMode = "broadcast"
    scheduled_at: Optional[datetime] = None


class DraftResponse(BaseModel):
    id: str
    content_type: str
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
    account_configs: dict = {}
    distribution_mode: str = "broadcast"
    scheduled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Share schemas
class ShareSchemaResponse(BaseModel):
    schema_url: str
    share_id: str
```

**Step 2: Verify import**

Run: `cd backend && python -c "from app.models.schemas import *; print('OK')"`
Expected: OK

**Step 3: Commit**

```bash
git add backend/app/models/schemas.py
git commit -m "feat: update schemas for publish redesign (drafts, batch, per-account config)"
```

---

## Task 3: Backend Drafts API

**Files:**
- Create: `backend/app/api/drafts.py`
- Modify: `backend/app/main.py` (add router)

**Step 1: Create drafts.py with full CRUD**

Create `backend/app/api/drafts.py`:

```python
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.core.supabase import supabase_admin
from app.core.auth import get_current_user
from app.models.schemas import DraftCreate, DraftResponse

router = APIRouter(prefix="/api/drafts", tags=["drafts"])


@router.post("", response_model=DraftResponse)
async def create_draft(data: DraftCreate, user_id: str = Depends(get_current_user)):
    result = supabase_admin.table("drafts").insert({
        "user_id": user_id,
        **data.model_dump(mode="json"),
    }).execute()
    return result.data[0]


@router.get("", response_model=list[DraftResponse])
async def list_drafts(user_id: str = Depends(get_current_user)):
    result = supabase_admin.table("drafts").select("*").eq(
        "user_id", user_id
    ).order("updated_at", desc=True).limit(20).execute()
    return result.data


@router.get("/{draft_id}", response_model=DraftResponse)
async def get_draft(draft_id: str, user_id: str = Depends(get_current_user)):
    result = supabase_admin.table("drafts").select("*").eq(
        "id", draft_id
    ).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Draft not found")
    return result.data[0]


@router.put("/{draft_id}", response_model=DraftResponse)
async def update_draft(draft_id: str, data: DraftCreate, user_id: str = Depends(get_current_user)):
    # Verify ownership
    existing = supabase_admin.table("drafts").select("id").eq(
        "id", draft_id
    ).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Draft not found")

    result = supabase_admin.table("drafts").update({
        **data.model_dump(mode="json"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", draft_id).execute()
    return result.data[0]


@router.delete("/{draft_id}")
async def delete_draft(draft_id: str, user_id: str = Depends(get_current_user)):
    existing = supabase_admin.table("drafts").select("id").eq(
        "id", draft_id
    ).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Draft not found")

    supabase_admin.table("drafts").delete().eq("id", draft_id).execute()
    return {"ok": True}
```

**Step 2: Register the router in main.py**

In `backend/app/main.py`, add:
- Import: `from app.api import auth, accounts, tasks, share, drafts`
- Router: `app.include_router(drafts.router)`

**Step 3: Verify import**

Run: `cd backend && python -c "from app.api.drafts import router; print('OK')"`
Expected: OK

**Step 4: Commit**

```bash
git add backend/app/api/drafts.py backend/app/main.py
git commit -m "feat: add drafts CRUD API"
```

---

## Task 4: Backend Batch Task Creation

**Files:**
- Modify: `backend/app/api/tasks.py`

**Step 1: Rewrite create_task to support batch mode**

The `create_task` endpoint needs to handle:
- Single video (existing `video_url`) → single task (current behavior)
- Multiple videos (`video_urls`) + `distribution_mode`:
  - `broadcast`: each video → 1 task with ALL accounts
  - `one_to_one`: each video → 1 task with 1 account (round-robin)

Change the return type to `list[TaskResponse]` and update the endpoint:

Key changes to `backend/app/api/tasks.py`:

1. Change endpoint decorator: `@router.post("", response_model=list[TaskResponse])`
2. After account validation, determine video list:
   ```python
   video_list = data.video_urls if data.video_urls else ([data.video_url] if data.video_url else [])
   ```
3. Generate a `batch_id` (uuid4) when multiple videos
4. Loop over video_list creating one task per video:
   - `broadcast` mode: all account_ids per task
   - `one_to_one` mode: assign accounts round-robin (account index = video index % num_accounts)
5. For each task_account, apply `account_configs` overrides if present
6. Insert per-account `title`/`description`/`topics` into task_accounts table
7. Return list of all created tasks

Also add the new fields to `task_data`: `visibility`, `ai_content`, `cover_url`, `topics`, `distribution_mode`, `batch_id`.

**Step 2: Verify import**

Run: `cd backend && python -c "from app.api.tasks import router; print('OK')"`
Expected: OK

**Step 3: Commit**

```bash
git add backend/app/api/tasks.py
git commit -m "feat: support batch task creation with distribution modes"
```

---

## Task 5: Frontend API Types & Functions

**Files:**
- Modify: `frontend/src/services/api.ts`

**Step 1: Add new types and API functions**

Add these types:

```typescript
export type DistributionMode = 'broadcast' | 'one_to_one'
export type Visibility = 'public' | 'private' | 'draft'

export interface AccountConfig {
  title?: string
  description?: string
  topics?: string[]
}

export interface Draft {
  id: string
  content_type: ContentType
  title: string | null
  description: string | null
  video_urls: string[]
  image_urls: string[]
  article_content: string | null
  cover_url: string | null
  visibility: Visibility
  ai_content: boolean
  topics: string[]
  account_ids: string[]
  account_configs: Record<string, AccountConfig>
  distribution_mode: DistributionMode
  scheduled_at: string | null
  created_at: string
  updated_at: string
}
```

Update `Task` interface to add: `cover_url`, `visibility`, `ai_content`, `topics`, `distribution_mode`, `batch_id`.

Update `createTask` to accept all new fields, return `Task[]` (batch).

Add draft API functions:
```typescript
// Drafts
getDrafts: () => request<Draft[]>('/api/drafts'),
getDraft: (id: string) => request<Draft>(`/api/drafts/${id}`),
createDraft: (data: Omit<Draft, 'id' | 'created_at' | 'updated_at'>) =>
  request<Draft>('/api/drafts', { method: 'POST', body: JSON.stringify(data) }),
updateDraft: (id: string, data: Omit<Draft, 'id' | 'created_at' | 'updated_at'>) =>
  request<Draft>(`/api/drafts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
deleteDraft: (id: string) =>
  request<void>(`/api/drafts/${id}`, { method: 'DELETE' }),
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: add draft API types and batch task support to frontend API"
```

---

## Task 6: Frontend Publish Components (Batch 1 — Simple)

**Files:**
- Create: `frontend/src/components/publish/TitleInput.tsx`
- Create: `frontend/src/components/publish/DescriptionInput.tsx`
- Create: `frontend/src/components/publish/VisibilitySelector.tsx`
- Create: `frontend/src/components/publish/AiContentToggle.tsx`

These are small, self-contained card components with no external deps.

**Step 1: Create TitleInput.tsx**

Props: `{ value: string; onChange: (v: string) => void; placeholder?: string }`
- Card wrapper with label "标题"
- Input with maxLength 100
- Character count in bottom-right corner

**Step 2: Create DescriptionInput.tsx**

Props: `{ value: string; onChange: (v: string) => void; onInsertTopic: (topic: string) => void }`
- Card wrapper with label "描述"
- Textarea with char count
- Two buttons below: "#添加话题" and "常用话题/标签"
- "#添加话题" opens a small inline input to type a topic name, inserts `#topic ` into description
- "常用话题/标签" shows a popover of recently used topics from localStorage key `mediahub_topics`

**Step 3: Create VisibilitySelector.tsx**

Props: `{ value: Visibility; onChange: (v: Visibility) => void }`
- Card wrapper with label "谁可以看"
- Radio buttons: 公开 / 私密/草稿
- Hint text: "不支持：百家号、知乎"

**Step 4: Create AiContentToggle.tsx**

Props: `{ value: boolean; onChange: (v: boolean) => void }`
- Card wrapper with label "包含AI生成内容"
- Checkbox toggle
- Hint: "支持 抖音、快手、小红书 等平台"

**Step 5: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add frontend/src/components/publish/
git commit -m "feat: add TitleInput, DescriptionInput, VisibilitySelector, AiContentToggle components"
```

---

## Task 7: Frontend Publish Components (Batch 2 — Upload)

**Files:**
- Create: `frontend/src/components/publish/ContentUpload.tsx`
- Create: `frontend/src/components/publish/CoverUpload.tsx`

**Step 1: Create ContentUpload.tsx**

Props: `{ contentType: ContentType; videoFiles/imageFiles/articleContent + setters; uploading state }`

This component renders different upload UIs based on content type:
- **Video**: Multi-file upload area. Shows list of selected files with name + size + remove button. "已添加 N 个视频" counter. "添加视频" button. Drag-and-drop support.
- **Image**: Current grid layout (up to 9). Drag-and-drop. Remove per image.
- **Article**: Textarea (10 rows).

Upload to Supabase Storage happens immediately on file select. Component tracks upload progress per file and exposes the resulting URLs.

**Step 2: Create CoverUpload.tsx**

Props: `{ value: string | null; onChange: (url: string | null) => void; imageUrls?: string[] }`

- Collapsible card (default collapsed)
- Upload area with preview thumbnail
- If `imageUrls` provided (image-text mode), show "从已上传图片中选择" option
- Hint: "不设置则平台默认使用第一张图片作为封面"

**Step 3: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend/src/components/publish/ContentUpload.tsx frontend/src/components/publish/CoverUpload.tsx
git commit -m "feat: add ContentUpload and CoverUpload components"
```

---

## Task 8: Frontend Publish Components (Batch 3 — Account & Mode)

**Files:**
- Create: `frontend/src/components/publish/AccountSelector.tsx`
- Create: `frontend/src/components/publish/PublishModeSelector.tsx`
- Create: `frontend/src/components/publish/TopicPicker.tsx`

**Step 1: Create AccountSelector.tsx**

Props: `{ accounts: Account[]; selectedIds: string[]; onToggle; accountConfigs; onConfigChange }`

- Search input at top to filter accounts by username
- Account list with platform icon + avatar + username + status badge
- Expired accounts show red warning with "重新登录" link
- Selected accounts show expand arrow → per-account config panel:
  - Title override input (placeholder: "留空使用全局标题")
  - Description override textarea
  - Topics override input

**Step 2: Create PublishModeSelector.tsx**

Props: `{ isScheduled; onScheduleToggle; scheduledDate/Time + setters; distributionMode; onDistributionChange; showDistribution: boolean; useFilenameAsTitle; onFilenameToggle }`

- Immediate/Scheduled toggle (existing)
- Schedule date/time picker (existing)
- When `showDistribution` is true (video mode with multiple files):
  - Distribution mode cards: "一视频一账号" / "多视频发一账号" with descriptions
  - Checkbox: "生成任务时同步视频文件名为标题"

**Step 3: Create TopicPicker.tsx**

Props: `{ onSelect: (topic: string) => void; onClose: () => void }`

- Modal/overlay with:
  - Text input to type a new topic
  - List of recently used topics from localStorage (`mediahub_topics`)
  - Click topic to select, adds to localStorage if new
  - Close button

**Step 4: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add frontend/src/components/publish/AccountSelector.tsx frontend/src/components/publish/PublishModeSelector.tsx frontend/src/components/publish/TopicPicker.tsx
git commit -m "feat: add AccountSelector, PublishModeSelector, TopicPicker components"
```

---

## Task 9: Frontend Publish Components (Batch 4 — Draft & Preview)

**Files:**
- Create: `frontend/src/components/publish/DraftBar.tsx`
- Create: `frontend/src/components/publish/BatchPreview.tsx`

**Step 1: Create DraftBar.tsx**

Props: `{ drafts: Draft[]; onLoad: (draft: Draft) => void; onDelete: (id: string) => void }`

- Horizontal scroll bar showing recent drafts as small cards
- Each card: content_type icon + title (or "无标题") + updated_at
- Click to load, long-press/swipe to delete
- Shows at top of type selection page

**Step 2: Create BatchPreview.tsx**

Props: `{ videoFiles: {name, url}[]; accounts: Account[]; selectedIds: string[]; distributionMode; useFilenameAsTitle; title: string }`

- Modal showing task generation preview
- Table/list showing: which video → which account(s) → what title
- Summary: "将生成 N 个发布任务"
- Confirm / Cancel buttons

**Step 3: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend/src/components/publish/DraftBar.tsx frontend/src/components/publish/BatchPreview.tsx
git commit -m "feat: add DraftBar and BatchPreview components"
```

---

## Task 10: Rewrite Publish.tsx

**Files:**
- Modify: `frontend/src/pages/Publish.tsx`

**Step 1: Rewrite the main Publish page**

This is the largest change. The page orchestrates all components:

**State management:**
```typescript
// Step control
const [step, setStep] = useState<'select' | 'form' | 'success'>('select')
const [contentType, setContentType] = useState<ContentType>('video')

// Content state
const [videoFiles, setVideoFiles] = useState<{file: File; url: string | null; uploading: boolean}[]>([])
const [imageFiles, setImageFiles] = useState<{file: File; url: string | null}[]>([])
const [articleContent, setArticleContent] = useState('')

// Form state
const [title, setTitle] = useState('')
const [description, setDescription] = useState('')
const [coverUrl, setCoverUrl] = useState<string | null>(null)
const [visibility, setVisibility] = useState<Visibility>('public')
const [aiContent, setAiContent] = useState(false)
const [topics, setTopics] = useState<string[]>([])

// Account state
const [accounts, setAccounts] = useState<Account[]>([])
const [selectedIds, setSelectedIds] = useState<string[]>([])
const [accountConfigs, setAccountConfigs] = useState<Record<string, AccountConfig>>({})

// Publish mode
const [isScheduled, setIsScheduled] = useState(false)
const [scheduledDate, setScheduledDate] = useState('')
const [scheduledTime, setScheduledTime] = useState('')
const [distributionMode, setDistributionMode] = useState<DistributionMode>('broadcast')
const [useFilenameAsTitle, setUseFilenameAsTitle] = useState(false)

// Draft state
const [drafts, setDrafts] = useState<Draft[]>([])
const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)

// Results
const [createdTasks, setCreatedTasks] = useState<Task[]>([])
const [publishing, setPublishing] = useState(false)
```

**Step 1 (select):** Type cards + DraftBar at top
**Step 2 (form):** All card components in order:
1. ContentUpload
2. CoverUpload (image_text and video only)
3. TitleInput
4. DescriptionInput
5. AccountSelector
6. PublishModeSelector (with distribution if video + multiple files)
7. VisibilitySelector
8. AiContentToggle
9. Fixed bottom bar: "保存到草稿" + "创建发布任务"

**Publish flow:**
1. If video files not yet uploaded, upload all to Storage first
2. Build `createTask` payload with all fields
3. Call API (returns `Task[]`)
4. Set `createdTasks` and move to success step

**Draft flow:**
- "保存到草稿" button: calls `api.createDraft()` or `api.updateDraft()` if editing
- Load draft: populates all form fields from draft data
- Video URLs from draft: show as previews (already uploaded)

**Success step:**
- Video single task: SharePanel (existing)
- Everything else: SuccessPanel (existing, with task count for batch)

**Step 2: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/pages/Publish.tsx
git commit -m "feat: rewrite Publish page with all new components and batch support"
```

---

## Task 11: Update Tasks.tsx

**Files:**
- Modify: `frontend/src/pages/Tasks.tsx`

**Step 1: Add new field displays**

- Add visibility badge (公开/私密) next to content type badge
- Add AI content indicator if `ai_content` is true
- Show topics as small tag pills below description
- Group batch tasks: if multiple tasks share the same `batch_id`, collapse them under a "批量任务 (N)" header that can be expanded
- ShareButton: only show for video tasks with `content_type === 'video'` (already done)

**Step 2: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/pages/Tasks.tsx
git commit -m "feat: update Tasks page with visibility, AI, topics, and batch grouping"
```

---

## Task 12: Final Build Verification & Version Bump

**Files:**
- Modify: `frontend/package.json` (version bump to 1.3.0)

**Step 1: Run full frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

**Step 2: Verify backend imports**

Run: `cd backend && python -c "from app.main import app; print('OK')"`
Expected: OK

**Step 3: Bump version**

Update `frontend/package.json` version to `"1.3.0"`.

**Step 4: Commit and tag**

```bash
git add -A
git commit -m "feat: publish system redesign v1.3.0 — batch upload, drafts, per-account config"
git tag -a v1.3.0 -m "v1.3.0: publish system redesign"
```

**Step 5: Push**

```bash
git push origin master --tags
```

---

## Task Dependencies

```
Task 1 (DB migration) ─── no deps, do first
Task 2 (Backend schemas) ─── no deps, parallel with Task 1
Task 3 (Drafts API) ─── depends on Task 2
Task 4 (Batch tasks API) ─── depends on Task 2
Task 5 (Frontend API types) ─── depends on Task 2
Task 6 (Components batch 1) ─── depends on Task 5
Task 7 (Components batch 2) ─── depends on Task 5
Task 8 (Components batch 3) ─── depends on Task 5
Task 9 (Components batch 4) ─── depends on Task 5
Task 10 (Publish.tsx rewrite) ─── depends on Tasks 6-9
Task 11 (Tasks.tsx update) ─── depends on Task 5
Task 12 (Verification) ─── depends on all above
```

**Parallelizable groups:**
- Group A: Tasks 1, 2 (parallel)
- Group B: Tasks 3, 4, 5 (parallel after Task 2)
- Group C: Tasks 6, 7, 8, 9, 11 (parallel after Task 5)
- Group D: Task 10 (after Group C)
- Group E: Task 12 (after all)
