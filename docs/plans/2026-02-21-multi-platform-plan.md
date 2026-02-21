# Multi-Platform Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor MediaHub from Douyin-only to a multi-platform architecture supporting Douyin, Kuaishou, and Xiaohongshu.

**Architecture:** Extract all Douyin-specific code into a platform adapter pattern. Each platform implements a `PlatformAdapter` base class. API routes become platform-agnostic, selecting adapters by `platform` parameter. Frontend uses a platform config map for icons/colors.

**Tech Stack:** Python/FastAPI (backend), React/TypeScript (frontend), Supabase (database)

---

### Task 1: Create PlatformAdapter base class and registry

**Files:**
- Create: `backend/app/services/platforms/__init__.py`
- Create: `backend/app/services/platforms/base.py`
- Create: `backend/app/services/platforms/registry.py`

**Step 1: Create the base adapter class**

Create `backend/app/services/platforms/base.py`:

```python
from abc import ABC, abstractmethod
from typing import Optional


class PlatformAdapter(ABC):
    """Base class for all platform adapters."""

    platform_name: str

    @abstractmethod
    def get_auth_url(self, state: str) -> str:
        """Generate OAuth authorization URL."""

    @abstractmethod
    async def exchange_token(self, code: str) -> dict:
        """Exchange auth code for tokens. Returns {access_token, refresh_token, open_id, expires_in}."""

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> dict:
        """Refresh access token. Returns same format as exchange_token."""

    @abstractmethod
    async def get_user_info(self, access_token: str, open_id: str) -> dict:
        """Get user info. Returns {username, avatar_url}."""

    @abstractmethod
    async def publish_video(
        self,
        access_token: str,
        open_id: str,
        video_url: str,
        title: str,
        description: Optional[str] = None,
    ) -> str:
        """Publish video. Returns item_id or published URL."""

    async def generate_share_url(self, **kwargs) -> Optional[str]:
        """Generate share/redirect URL (optional, Douyin H5 share only)."""
        return None
```

**Step 2: Create the registry**

Create `backend/app/services/platforms/registry.py`:

```python
from app.services.platforms.base import PlatformAdapter

_adapters: dict[str, PlatformAdapter] = {}


def register(adapter: PlatformAdapter):
    _adapters[adapter.platform_name] = adapter


def get_adapter(platform: str) -> PlatformAdapter:
    adapter = _adapters.get(platform)
    if not adapter:
        raise ValueError(f"Unsupported platform: {platform}")
    return adapter


def get_all_platforms() -> list[str]:
    return list(_adapters.keys())
```

**Step 3: Create `__init__.py`**

Create `backend/app/services/platforms/__init__.py`:

```python
from app.services.platforms.registry import get_adapter, get_all_platforms, register
```

**Step 4: Commit**

```bash
git add backend/app/services/platforms/
git commit -m "feat: add PlatformAdapter base class and registry"
```

---

### Task 2: Migrate Douyin code to adapter pattern

**Files:**
- Create: `backend/app/services/platforms/douyin.py`
- Modify: `backend/app/services/platforms/registry.py` (add auto-registration)

**Step 1: Create Douyin adapter**

Create `backend/app/services/platforms/douyin.py` — wraps the existing `backend/app/services/douyin.py` functions into the adapter interface:

```python
import hashlib
import secrets
import time
from typing import Optional
from urllib.parse import quote

import httpx

from app.core.config import settings
from app.services.platforms.base import PlatformAdapter

DOUYIN_AUTH_URL = "https://open.douyin.com/platform/oauth/connect/"
DOUYIN_TOKEN_URL = "https://open.douyin.com/oauth/access_token/"
DOUYIN_REFRESH_URL = "https://open.douyin.com/oauth/refresh_token/"
DOUYIN_USER_URL = "https://open.douyin.com/oauth/userinfo/"
DOUYIN_VIDEO_CREATE_URL = "https://open.douyin.com/api/douyin/v1/video/create/"
DOUYIN_VIDEO_UPLOAD_URL = "https://open.douyin.com/api/douyin/v1/video/upload/"
DOUYIN_CLIENT_TOKEN_URL = "https://open.douyin.com/oauth/client_token/"
DOUYIN_TICKET_URL = "https://open.douyin.com/open/getticket/"

# H5 Share: token/ticket cache
_client_token_cache: dict = {"token": None, "expires_at": 0}
_ticket_cache: dict = {"ticket": None, "expires_at": 0}


class DouyinAdapter(PlatformAdapter):
    platform_name = "douyin"

    def get_auth_url(self, state: str) -> str:
        return (
            f"{DOUYIN_AUTH_URL}"
            f"?client_key={settings.DOUYIN_CLIENT_KEY}"
            f"&response_type=code"
            f"&scope=trial.whitelist,user_info"
            f"&redirect_uri={settings.DOUYIN_REDIRECT_URI}"
            f"&state={state}"
        )

    async def exchange_token(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DOUYIN_TOKEN_URL,
                data={
                    "client_key": settings.DOUYIN_CLIENT_KEY,
                    "client_secret": settings.DOUYIN_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                },
            )
            data = response.json()
            if data.get("data", {}).get("error_code", 0) != 0:
                raise Exception(data.get("data", {}).get("description", "Token exchange failed"))
            return data["data"]

    async def refresh_token(self, refresh_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DOUYIN_REFRESH_URL,
                data={
                    "client_key": settings.DOUYIN_CLIENT_KEY,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            data = response.json()
            if data.get("data", {}).get("error_code", 0) != 0:
                raise Exception(data.get("data", {}).get("description", "Token refresh failed"))
            return data["data"]

    async def get_user_info(self, access_token: str, open_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                DOUYIN_USER_URL,
                params={"access_token": access_token, "open_id": open_id},
            )
            data = response.json()
            if data.get("data", {}).get("error_code", 0) != 0:
                raise Exception(data.get("data", {}).get("description", "Get user info failed"))
            return {
                "username": data["data"].get("nickname", "Unknown"),
                "avatar_url": data["data"].get("avatar", None),
            }

    async def publish_video(
        self,
        access_token: str,
        open_id: str,
        video_url: str,
        title: str,
        description: Optional[str] = None,
    ) -> str:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Download video
            video_response = await client.get(video_url)
            video_content = video_response.content

            # Upload to Douyin
            upload_resp = await client.post(
                DOUYIN_VIDEO_UPLOAD_URL,
                params={"access_token": access_token, "open_id": open_id},
                files={"video": ("video.mp4", video_content, "video/mp4")},
            )
            upload_data = upload_resp.json()
            if upload_data.get("data", {}).get("error_code", 0) != 0:
                raise Exception(upload_data.get("data", {}).get("description", "Video upload failed"))
            video_id = upload_data["data"]["video"]["video_id"]

            # Create post
            text = title
            if description:
                text = f"{title}\n{description}"
            create_resp = await client.post(
                DOUYIN_VIDEO_CREATE_URL,
                params={"access_token": access_token, "open_id": open_id},
                json={"video_id": video_id, "text": text},
            )
            create_data = create_resp.json()
            if create_data.get("data", {}).get("error_code", 0) != 0:
                raise Exception(create_data.get("data", {}).get("description", "Video create failed"))
            return create_data["data"]["item_id"]

    async def generate_share_url(self, **kwargs) -> Optional[str]:
        """Generate H5 share schema URL for Douyin."""
        video_url = kwargs.get("video_url", "")
        title = kwargs.get("title", "")
        share_id = kwargs.get("share_id", "")

        ticket = await self._get_ticket()
        timestamp = int(time.time())
        nonce_str = secrets.token_hex(16)
        signature = self._generate_signature(ticket, timestamp, nonce_str)

        params = {
            "client_key": settings.DOUYIN_CLIENT_KEY,
            "nonce_str": nonce_str,
            "timestamp": str(timestamp),
            "signature": signature,
            "state": share_id,
            "video_url": video_url,
            "title": title,
        }
        if kwargs.get("hashtag_list"):
            params["hashtag_list"] = kwargs["hashtag_list"]

        query = "&".join(f"{k}={quote(str(v), safe='')}" for k, v in params.items())
        return f"snssdk1128://openplatform/share?{query}"

    # ── Private helpers ──

    async def _get_client_token(self) -> str:
        now = time.time()
        if _client_token_cache["token"] and now < _client_token_cache["expires_at"] - 60:
            return _client_token_cache["token"]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                DOUYIN_CLIENT_TOKEN_URL,
                json={
                    "client_key": settings.DOUYIN_CLIENT_KEY,
                    "client_secret": settings.DOUYIN_CLIENT_SECRET,
                    "grant_type": "client_credential",
                },
            )
            data = response.json()
            if data.get("data", {}).get("error_code", 0) != 0:
                raise Exception(data.get("data", {}).get("description", "Failed to get client_token"))

            token = data["data"]["access_token"]
            expires_in = data["data"]["expires_in"]
            _client_token_cache["token"] = token
            _client_token_cache["expires_at"] = now + expires_in
            return token

    async def _get_ticket(self) -> str:
        now = time.time()
        if _ticket_cache["ticket"] and now < _ticket_cache["expires_at"] - 60:
            return _ticket_cache["ticket"]

        client_token = await self._get_client_token()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                DOUYIN_TICKET_URL,
                params={"access_token": client_token},
            )
            data = response.json()
            if data.get("data", {}).get("error_code", 0) != 0:
                raise Exception(data.get("data", {}).get("description", "Failed to get ticket"))

            ticket = data["data"]["ticket"]
            expires_in = data["data"]["expires_in"]
            _ticket_cache["ticket"] = ticket
            _ticket_cache["expires_at"] = now + expires_in
            return ticket

    @staticmethod
    def _generate_signature(ticket: str, timestamp: int, nonce_str: str) -> str:
        sign_str = f"nonce_str={nonce_str}&ticket={ticket}&timestamp={timestamp}"
        return hashlib.md5(sign_str.encode()).hexdigest()
```

**Step 2: Add auto-registration in registry**

Update `backend/app/services/platforms/registry.py` — add at the bottom:

```python
def _register_all():
    from app.services.platforms.douyin import DouyinAdapter
    register(DouyinAdapter())

_register_all()
```

**Step 3: Verify import works**

Run: `cd backend && /opt/anaconda3/bin/python -c "from app.services.platforms import get_adapter; a = get_adapter('douyin'); print(a.platform_name)"`

Expected: `douyin`

**Step 4: Commit**

```bash
git add backend/app/services/platforms/
git commit -m "feat: implement DouyinAdapter with full API coverage"
```

---

### Task 3: Create Kuaishou and Xiaohongshu skeleton adapters

**Files:**
- Create: `backend/app/services/platforms/kuaishou.py`
- Create: `backend/app/services/platforms/xiaohongshu.py`
- Modify: `backend/app/services/platforms/registry.py`

**Step 1: Create Kuaishou skeleton**

Create `backend/app/services/platforms/kuaishou.py`:

```python
from typing import Optional
from app.services.platforms.base import PlatformAdapter


class KuaishouAdapter(PlatformAdapter):
    platform_name = "kuaishou"

    def get_auth_url(self, state: str) -> str:
        raise NotImplementedError("Kuaishou OAuth not yet configured")

    async def exchange_token(self, code: str) -> dict:
        raise NotImplementedError("Kuaishou token exchange not yet configured")

    async def refresh_token(self, refresh_token: str) -> dict:
        raise NotImplementedError("Kuaishou token refresh not yet configured")

    async def get_user_info(self, access_token: str, open_id: str) -> dict:
        raise NotImplementedError("Kuaishou user info not yet configured")

    async def publish_video(
        self,
        access_token: str,
        open_id: str,
        video_url: str,
        title: str,
        description: Optional[str] = None,
    ) -> str:
        raise NotImplementedError("Kuaishou video publish not yet configured")
```

**Step 2: Create Xiaohongshu skeleton**

Create `backend/app/services/platforms/xiaohongshu.py` — same structure, replace "Kuaishou" with "Xiaohongshu" and platform_name = "xiaohongshu".

**Step 3: Register both in registry**

Update `_register_all()` in `registry.py`:

```python
def _register_all():
    from app.services.platforms.douyin import DouyinAdapter
    from app.services.platforms.kuaishou import KuaishouAdapter
    from app.services.platforms.xiaohongshu import XiaohongshuAdapter
    register(DouyinAdapter())
    register(KuaishouAdapter())
    register(XiaohongshuAdapter())
```

**Step 4: Commit**

```bash
git add backend/app/services/platforms/
git commit -m "feat: add Kuaishou and Xiaohongshu skeleton adapters"
```

---

### Task 4: Refactor auth API routes to use adapters

**Files:**
- Modify: `backend/app/api/auth.py` (full rewrite)

**Step 1: Rewrite auth.py to be platform-agnostic**

Replace the entire content of `backend/app/api/auth.py`:

```python
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.core.supabase import supabase_admin, supabase
from app.services.platforms import get_adapter

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory state storage (use Redis in production)
oauth_states: dict[str, dict] = {}


@router.get("/{platform}")
async def platform_auth(platform: str, token: str = Query(..., description="Supabase access token")):
    """Redirect to platform OAuth page."""
    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

    adapter = get_adapter(platform)

    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "user_id": user_id,
        "platform": platform,
        "created_at": datetime.now(),
    }

    auth_url = adapter.get_auth_url(state)
    return RedirectResponse(url=auth_url)


@router.get("/{platform}/callback")
async def platform_callback(platform: str, code: str, state: str = ""):
    """Handle platform OAuth callback."""
    if not state:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/accounts?error=请通过应用内按钮进行授权"
        )

    state_data = oauth_states.pop(state, None)
    if not state_data:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/accounts?error=授权已过期，请重新绑定"
        )

    if datetime.now() - state_data["created_at"] > timedelta(minutes=10):
        raise HTTPException(status_code=400, detail="State expired")

    user_id = state_data["user_id"]
    adapter = get_adapter(platform)

    try:
        token_data = await adapter.exchange_token(code)
        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]
        open_id = token_data["open_id"]
        expires_in = token_data["expires_in"]

        user_info = await adapter.get_user_info(access_token, open_id)
        token_expires_at = datetime.now() + timedelta(seconds=expires_in)

        existing = supabase_admin.table("social_accounts").select("id").eq(
            "user_id", user_id
        ).eq("platform", platform).eq("platform_user_id", open_id).execute()

        account_data = {
            "user_id": user_id,
            "platform": platform,
            "platform_user_id": open_id,
            "username": user_info["username"],
            "avatar_url": user_info.get("avatar_url"),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expires_at": token_expires_at.isoformat(),
            "status": "active",
            "updated_at": datetime.now().isoformat(),
        }

        if existing.data:
            supabase_admin.table("social_accounts").update(account_data).eq(
                "id", existing.data[0]["id"]
            ).execute()
        else:
            supabase_admin.table("social_accounts").insert(account_data).execute()

        return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts")

    except Exception as e:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/accounts?error={str(e)}"
        )
```

**Step 2: Verify the old `/api/auth/douyin` route still works**

The new route is `/api/auth/{platform}` so `/api/auth/douyin` and `/api/auth/douyin/callback` still match.

**Step 3: Commit**

```bash
git add backend/app/api/auth.py
git commit -m "refactor: make auth routes platform-agnostic"
```

---

### Task 5: Refactor accounts API to use adapters

**Files:**
- Modify: `backend/app/api/accounts.py`

**Step 1: Update refresh_account to use adapter**

In `backend/app/api/accounts.py`, replace the `from app.services import douyin` import and update `refresh_account` to use the adapter:

```python
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.core.supabase import supabase_admin
from app.core.auth import get_current_user
from app.models.schemas import AccountResponse
from app.services.platforms import get_adapter

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountResponse])
async def list_accounts(user_id: str = Depends(get_current_user)):
    result = supabase_admin.table("social_accounts").select(
        "id, platform, platform_user_id, username, avatar_url, status, created_at"
    ).eq("user_id", user_id).order("created_at", desc=True).execute()
    return result.data


@router.delete("/{account_id}")
async def delete_account(account_id: str, user_id: str = Depends(get_current_user)):
    result = supabase_admin.table("social_accounts").select("id").eq(
        "id", account_id
    ).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    supabase_admin.table("social_accounts").delete().eq("id", account_id).execute()
    return {"message": "Account deleted"}


@router.post("/{account_id}/refresh", response_model=AccountResponse)
async def refresh_account(account_id: str, user_id: str = Depends(get_current_user)):
    result = supabase_admin.table("social_accounts").select("*").eq(
        "id", account_id
    ).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    account = result.data[0]
    if not account.get("refresh_token"):
        raise HTTPException(status_code=400, detail="No refresh token available")

    try:
        adapter = get_adapter(account["platform"])
        token_data = await adapter.refresh_token(account["refresh_token"])
        token_expires_at = datetime.now() + timedelta(seconds=token_data["expires_in"])

        updated = supabase_admin.table("social_accounts").update({
            "access_token": token_data["access_token"],
            "refresh_token": token_data["refresh_token"],
            "token_expires_at": token_expires_at.isoformat(),
            "status": "active",
            "updated_at": datetime.now().isoformat(),
        }).eq("id", account_id).execute()

        return updated.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**Step 2: Commit**

```bash
git add backend/app/api/accounts.py
git commit -m "refactor: use platform adapter for account refresh"
```

---

### Task 6: Refactor tasks and share APIs to use adapters

**Files:**
- Modify: `backend/app/api/tasks.py` (lines 1, 14-16)
- Modify: `backend/app/api/share.py` (lines 10, 48-53)
- Modify: `backend/app/core/scheduler.py` (lines 46-50)

**Step 1: Update tasks.py**

In `backend/app/api/tasks.py`, replace:
- `from app.services import douyin` → `from app.services.platforms import get_adapter`
- In `publish_to_account()`, change `await douyin.publish_video(...)` to:

```python
adapter = get_adapter(account["platform"])
item_id = await adapter.publish_video(
    access_token=account["access_token"],
    open_id=account["platform_user_id"],
    video_url=video_url,
    title=title,
    description=description,
)
```

**Step 2: Update share.py**

In `backend/app/api/share.py`, replace:
- `from app.services import douyin` → `from app.services.platforms import get_adapter`
- In `get_share_schema()`, change `await douyin.generate_share_schema(...)` to:

```python
adapter = get_adapter("douyin")  # H5 share is Douyin-specific
schema_url = await adapter.generate_share_url(
    video_url=task["video_url"],
    title=title,
    share_id=share_id,
)
```

**Step 3: Update scheduler.py**

In `backend/app/core/scheduler.py`, the `publish_to_account` import stays the same (it's imported from tasks.py which now uses adapters internally). No change needed.

**Step 4: Verify backend starts without errors**

Restart uvicorn and check for import errors.

**Step 5: Commit**

```bash
git add backend/app/api/tasks.py backend/app/api/share.py
git commit -m "refactor: use platform adapters in tasks and share APIs"
```

---

### Task 7: Clean up old douyin.py

**Files:**
- Delete: `backend/app/services/douyin.py` (all code moved to platforms/douyin.py)

**Step 1: Check no remaining imports**

Search for `from app.services import douyin` or `from app.services.douyin` — should find zero matches after Tasks 4-6.

**Step 2: Delete old file**

```bash
rm backend/app/services/douyin.py
```

**Step 3: Verify backend still starts**

Restart uvicorn, confirm no import errors.

**Step 4: Commit**

```bash
git add -A backend/app/services/douyin.py
git commit -m "refactor: remove old douyin.py, fully migrated to platform adapter"
```

---

### Task 8: Add platform config and icons to frontend

**Files:**
- Create: `frontend/src/config/platforms.tsx`

**Step 1: Create platform config with SVG icons**

Create `frontend/src/config/platforms.tsx`:

```tsx
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
```

**Step 2: Commit**

```bash
git add frontend/src/config/platforms.tsx
git commit -m "feat: add platform config with icons for multi-platform support"
```

---

### Task 9: Update frontend api.ts for multi-platform auth

**Files:**
- Modify: `frontend/src/services/api.ts`

**Step 1: Change getDouyinAuthUrl to getPlatformAuthUrl**

In `frontend/src/services/api.ts`, replace:

```typescript
getDouyinAuthUrl: async () => {
    const token = await getAccessToken()
    return `${API_BASE}/api/auth/douyin?token=${token}`
},
```

with:

```typescript
getPlatformAuthUrl: async (platform: string) => {
    const token = await getAccessToken()
    return `${API_BASE}/api/auth/${platform}?token=${token}`
},
```

**Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: make auth URL generation platform-agnostic"
```

---

### Task 10: Update Accounts page for multi-platform

**Files:**
- Modify: `frontend/src/pages/Accounts.tsx`

**Step 1: Full rewrite of Accounts.tsx**

Key changes:
- Import `PLATFORMS, getPlatform` from config
- Remove hardcoded `DouyinIcon`
- Account card shows platform icon/name dynamically based on `account.platform`
- "添加账号" button becomes a dropdown showing all platforms
- `handleAddDouyin` → `handleAddAccount(platform: string)` using `api.getPlatformAuthUrl(platform)`

The full file should replace the existing content. Key sections:

- Account card: use `getPlatform(account.platform)` for icon and label
- Add account dropdown: map over `Object.entries(PLATFORMS)` to show options
- `handleAddAccount`: calls `api.getPlatformAuthUrl(platform)` and redirects

**Step 2: Commit**

```bash
git add frontend/src/pages/Accounts.tsx
git commit -m "feat: accounts page supports multiple platforms"
```

---

### Task 11: Update Publish page for multi-platform display

**Files:**
- Modify: `frontend/src/pages/Publish.tsx`

**Step 1: Add platform icons to account selection**

In the account selection area (around line 327-354), add platform icon next to each account name:

```tsx
import { getPlatform } from '../config/platforms'

// Inside the account label:
const platform = getPlatform(account.platform)
const PlatformIcon = platform.icon
// Show: <PlatformIcon /> + avatar + username
```

This is a small change — just add the platform icon before each account's avatar in the selection list.

**Step 2: Commit**

```bash
git add frontend/src/pages/Publish.tsx
git commit -m "feat: show platform icons in publish account selection"
```

---

### Task 12: Update Tasks page for multi-platform display

**Files:**
- Modify: `frontend/src/pages/Tasks.tsx`

**Step 1: Add platform icons to task account list**

Similar to Task 11 — in the per-account status display, add platform icon. Import `getPlatform` and show the icon next to each account name in task detail.

**Step 2: Commit**

```bash
git add frontend/src/pages/Tasks.tsx
git commit -m "feat: show platform icons in task records"
```

---

### Task 13: Database migration for platform_config

**Files:**
- Modify: `supabase/migrations/001_initial_schema.sql`

**Step 1: Add platform_config column**

Add to the end of the migration file:

```sql
-- Multi-platform support: store platform-specific data
ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS platform_config jsonb DEFAULT '{}';
```

**Step 2: Run in Supabase SQL Editor**

Execute the ALTER TABLE statement in the Supabase dashboard SQL editor.

**Step 3: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add platform_config jsonb column for multi-platform data"
```

---

### Task 14: End-to-end verification

**Step 1: Restart backend**

Kill and restart: `/opt/anaconda3/bin/python -m uvicorn app.main:app --reload --port 8599 --host 0.0.0.0`

**Step 2: Verify backend health**

```bash
curl -s https://mediarouterserver.heygo.cn:88/health
```
Expected: `{"status":"healthy"}`

**Step 3: Test in browser**

Open `https://media.heytime.cc`:
1. Login with test@mediahub.dev / test123456
2. Go to Accounts page — should see multi-platform add button
3. Existing Douyin accounts should display with Douyin icon
4. Click add Kuaishou/Xiaohongshu — should show "not yet configured" error (expected)
5. Go to Publish — account selection should show platform icons
6. Go to Tasks — task records should show platform icons

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete multi-platform architecture (phase 1)"
```
