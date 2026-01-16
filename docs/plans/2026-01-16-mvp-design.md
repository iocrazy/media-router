# 蚁小二 MVP 设计文档

## 概述

**目标**：内部使用的多平台社交媒体发布工具
**核心需求**：一键多平台发布 + 多账号统一管理
**MVP 范围**：极简版 - 抖音单平台，只做账号绑定 + 发布 + 记录查看

---

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 后端 | FastAPI (Python) |
| 数据库 | Supabase PostgreSQL |
| 认证 | Supabase Auth |
| 存储 | Supabase Storage（视频文件） |
| 部署 | 前端 Vercel / 后端 Railway |

---

## 架构图

```
┌─────────────────────────────────────────────────────┐
│                    前端 (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ 账号管理  │  │ 发布页面  │  │    发布记录      │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  后端 (FastAPI)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ OAuth流程 │  │ 视频上传  │  │  调用抖音API发布  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                   Supabase                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ PostgreSQL│  │  Auth    │  │     Storage      │  │
│  │ (账号/任务)│  │ (登录)   │  │   (视频文件)      │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 数据模型

### 表结构

```sql
-- 1. 社交账号表
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL DEFAULT 'douyin',
  platform_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  access_token TEXT,  -- 加密存储
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',  -- active / expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- 2. 发布任务表
CREATE TABLE publish_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  cover_url TEXT,
  status VARCHAR(20) DEFAULT 'publishing',  -- publishing / completed / failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 任务-账号关联表
CREATE TABLE task_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES publish_tasks(id) ON DELETE CASCADE,
  account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',  -- pending / success / failed
  error_message TEXT,
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own accounts" ON social_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks" ON publish_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own task_accounts" ON task_accounts
  FOR ALL USING (
    task_id IN (SELECT id FROM publish_tasks WHERE user_id = auth.uid())
  );
```

---

## 核心流程

### 流程1：抖音账号绑定（OAuth）

```
用户点击"添加抖音账号"
        │
        ▼
前端跳转 → GET /api/auth/douyin
        │
        ▼
后端生成授权URL → 302重定向到 open.douyin.com
        │
        ▼
用户在抖音页面扫码授权
        │
        ▼
抖音回调 → GET /api/auth/douyin/callback?code=xxx
        │
        ▼
后端用 code 换 token → 获取用户信息 → 存入 social_accounts
        │
        ▼
重定向回前端 /accounts 页面
```

### 流程2：视频发布

```
用户上传视频 + 填写标题 + 选择账号
        │
        ▼
前端上传视频到 Supabase Storage → 获得 video_url
        │
        ▼
POST /api/tasks 创建发布任务
        │
        ▼
后端遍历选中账号，调用抖音发布API
        │
        ▼
更新每个 task_account 状态（success/failed）
        │
        ▼
前端轮询 GET /api/tasks/{id} 获取发布结果
```

---

## 前端页面

### 路由结构

```
/login      → 登录页
/accounts   → 账号管理
/publish    → 发布页面
/tasks      → 发布记录
```

### 页面原型

#### `/accounts` 账号管理
```
┌────────────────────────────────────────┐
│  [+ 添加抖音账号]                       │
├────────────────────────────────────────┤
│  ┌──────┐  抖音昵称A        ✅ 正常    │
│  │ 头像  │  @douyin_id                 │
│  └──────┘                    [删除]    │
├────────────────────────────────────────┤
│  ┌──────┐  抖音昵称B        ⚠️ 已过期  │
│  │ 头像  │  @douyin_id      [重新授权] │
│  └──────┘                    [删除]    │
└────────────────────────────────────────┘
```

#### `/publish` 发布页面
```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │      拖拽或点击上传视频          │  │
│  └──────────────────────────────────┘  │
│                                        │
│  标题: [________________________]      │
│  描述: [________________________]      │
│                                        │
│  选择发布账号:                         │
│  ☑️ 抖音昵称A   ☑️ 抖音昵称B           │
│                                        │
│           [发布到选中账号]             │
└────────────────────────────────────────┘
```

#### `/tasks` 发布记录
```
┌────────────────────────────────────────┐
│  视频标题A          2024-01-15 14:30   │
│  ├─ 抖音昵称A       ✅ 成功  [查看]    │
│  └─ 抖音昵称B       ❌ 失败  [重试]    │
├────────────────────────────────────────┤
│  视频标题B          2024-01-15 10:00   │
│  └─ 抖音昵称A       ✅ 成功  [查看]    │
└────────────────────────────────────────┘
```

---

## 后端 API

### 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/douyin` | 跳转抖音授权页 |
| GET | `/api/auth/douyin/callback` | 抖音回调处理 |
| GET | `/api/accounts` | 获取账号列表 |
| DELETE | `/api/accounts/{id}` | 删除账号 |
| POST | `/api/accounts/{id}/refresh` | 刷新过期token |
| POST | `/api/tasks` | 创建并执行发布任务 |
| GET | `/api/tasks` | 获取发布记录列表 |
| GET | `/api/tasks/{id}` | 获取任务详情 |

### 接口详情

#### `POST /api/tasks`

请求：
```json
{
  "title": "视频标题",
  "description": "视频描述 #话题",
  "video_url": "https://xxx.supabase.co/storage/v1/...",
  "account_ids": ["uuid1", "uuid2"]
}
```

响应：
```json
{
  "task_id": "uuid",
  "status": "publishing",
  "accounts": [
    {"account_id": "uuid1", "status": "pending"},
    {"account_id": "uuid2", "status": "pending"}
  ]
}
```

#### `GET /api/tasks/{id}`

响应：
```json
{
  "id": "uuid",
  "title": "视频标题",
  "status": "completed",
  "created_at": "2024-01-15T14:30:00Z",
  "accounts": [
    {"account_id": "uuid1", "username": "抖音A", "status": "success", "published_url": "..."},
    {"account_id": "uuid2", "username": "抖音B", "status": "failed", "error": "发布频率限制"}
  ]
}
```

---

## 项目目录结构

```
meida-router/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Accounts.tsx
│   │   │   ├── Publish.tsx
│   │   │   └── Tasks.tsx
│   │   ├── components/
│   │   │   ├── AccountCard.tsx
│   │   │   ├── VideoUploader.tsx
│   │   │   └── TaskItem.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── lib/
│   │   │   └── supabase.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── accounts.py
│   │   │   └── tasks.py
│   │   ├── services/
│   │   │   └── douyin.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── supabase.py
│   │   ├── models/
│   │   │   └── schemas.py
│   │   └── main.py
│   └── requirements.txt
│
├── docs/
│   └── plans/
├── CLAUDE.md
└── 需求.md
```

---

## MVP 交付物清单

| 模块 | 交付内容 |
|------|----------|
| 数据库 | 3张表 + RLS 策略 |
| 后端 | 8个API接口 + 抖音OAuth/发布封装 |
| 前端 | 4个页面 + 视频上传组件 |
| 部署 | 前端Vercel + 后端Railway |

---

## 抖音开放平台接入说明

### 前置条件
1. 注册抖音开放平台账号：https://open.douyin.com
2. 创建应用，获取 `client_key` 和 `client_secret`
3. 配置回调地址：`https://your-domain.com/api/auth/douyin/callback`
4. 申请权限：`user_info`, `video.create`

### OAuth 流程代码示例

```python
# backend/app/services/douyin.py

import httpx
from app.core.config import settings

DOUYIN_AUTH_URL = "https://open.douyin.com/platform/oauth/connect/"
DOUYIN_TOKEN_URL = "https://open.douyin.com/oauth/access_token/"
DOUYIN_USER_URL = "https://open.douyin.com/oauth/userinfo/"

def get_auth_url(state: str) -> str:
    return (
        f"{DOUYIN_AUTH_URL}"
        f"?client_key={settings.DOUYIN_CLIENT_KEY}"
        f"&response_type=code"
        f"&scope=user_info,video.create"
        f"&redirect_uri={settings.DOUYIN_REDIRECT_URI}"
        f"&state={state}"
    )

async def exchange_token(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(DOUYIN_TOKEN_URL, data={
            "client_key": settings.DOUYIN_CLIENT_KEY,
            "client_secret": settings.DOUYIN_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code"
        })
        return resp.json()["data"]

async def get_user_info(access_token: str, open_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            DOUYIN_USER_URL,
            params={"access_token": access_token, "open_id": open_id}
        )
        return resp.json()["data"]
```

---

## 后续扩展方向

MVP 完成后，可按需扩展：

1. **更多平台**：快手、B站、视频号
2. **定时发布**：APScheduler 定时任务
3. **数据统计**：接入各平台创作者数据 API
4. **团队协作**：多用户 + 角色权限
5. **素材库**：视频/图片管理
