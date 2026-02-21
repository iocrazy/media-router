# 多平台扩展设计文档

## 概述

**目标**：将 MediaHub 从抖音单平台扩展为支持抖音 + 快手 + 小红书的多平台内容管理和发布系统。
**核心需求**：一键多平台分发 + 统一账号管理。
**策略**：先搭架构（平台抽象层），用抖音验证，等快手/小红书开发者账号批下来后直接填入 adapter。

---

## 后端：平台抽象层

### 目录结构

```
backend/app/services/
├── platforms/
│   ├── __init__.py
│   ├── base.py            # PlatformAdapter 抽象基类
│   ├── registry.py        # 平台注册表，按名字获取 adapter
│   ├── douyin.py           # 抖音实现（从现有 douyin.py 迁移）
│   ├── kuaishou.py         # 快手实现（骨架）
│   └── xiaohongshu.py      # 小红书实现（骨架）
```

### PlatformAdapter 抽象基类

```python
# base.py
from abc import ABC, abstractmethod
from typing import Optional

class PlatformAdapter(ABC):
    """所有平台 adapter 的统一接口。"""

    platform_name: str  # "douyin" / "kuaishou" / "xiaohongshu"

    @abstractmethod
    def get_auth_url(self, state: str) -> str:
        """生成 OAuth 授权链接。"""

    @abstractmethod
    async def exchange_token(self, code: str) -> dict:
        """用授权码换取 access_token。返回 {access_token, refresh_token, open_id, expires_in}。"""

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> dict:
        """刷新 access_token。返回与 exchange_token 相同格式。"""

    @abstractmethod
    async def get_user_info(self, access_token: str, open_id: str) -> dict:
        """获取用户信息。返回 {username, avatar_url}。"""

    @abstractmethod
    async def publish_video(
        self,
        access_token: str,
        open_id: str,
        video_url: str,
        title: str,
        description: Optional[str] = None,
    ) -> str:
        """发布视频。返回 item_id 或发布后的 URL。"""

    async def generate_share_url(self, **kwargs) -> Optional[str]:
        """生成分享跳转链接（可选，仅抖音 H5 分享需要）。"""
        return None
```

### 平台注册表

```python
# registry.py
from app.services.platforms.douyin import DouyinAdapter
from app.services.platforms.kuaishou import KuaishouAdapter
from app.services.platforms.xiaohongshu import XiaohongshuAdapter

_adapters = {
    "douyin": DouyinAdapter(),
    "kuaishou": KuaishouAdapter(),
    "xiaohongshu": XiaohongshuAdapter(),
}

def get_adapter(platform: str):
    adapter = _adapters.get(platform)
    if not adapter:
        raise ValueError(f"Unsupported platform: {platform}")
    return adapter
```

### API 路由改造

现有路由（auth.py、accounts.py、tasks.py）中硬编码抖音的地方改为：

```python
# 示例：auth.py
from app.services.platforms.registry import get_adapter

@router.get("/{platform}")
async def oauth_redirect(platform: str, ...):
    adapter = get_adapter(platform)
    url = adapter.get_auth_url(state=...)
    return RedirectResponse(url)

@router.get("/{platform}/callback")
async def oauth_callback(platform: str, code: str, ...):
    adapter = get_adapter(platform)
    token_data = await adapter.exchange_token(code)
    user_info = await adapter.get_user_info(...)
    # 存入 social_accounts，platform 字段 = platform
```

---

## 数据库变更

```sql
-- social_accounts 表：加平台特有数据字段
ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS platform_config jsonb DEFAULT '{}';
```

- 核心字段（access_token、username、avatar_url、status）所有平台通用，保持不变
- 平台差异（如小红书的 user_type、快手的 ks_uid）放 `platform_config` jsonb

---

## 前端多平台支持

### 平台配置表

```typescript
// frontend/src/config/platforms.ts
export const PLATFORMS = {
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
    icon: XhsIcon,
    color: "#FF2442",
    bgColor: "#FF2442",
  },
} as const;
```

### 账号页改造

- 账号卡片：根据 `account.platform` 动态显示平台图标和名称
- "添加账号"按钮：改为下拉选择平台，点击后跳转对应平台 OAuth
- 布局不变，卡片样式不变

### 发布页改造

- 账号选择列表：每个账号前加平台图标区分
- 用户可同时勾选不同平台账号，一次创建分发到多个平台
- 标题/描述统一一套，不做每平台独立定制

### 任务/记录页改造

- 每条记录里的账号状态加平台图标区分
- 结构不变

### 视频和数据页

- 暂保持 mock 状态，不改

---

## 实施顺序

### 第一阶段：搭架构（现在做）

1. 后端：创建 `PlatformAdapter` 基类 + 平台注册表
2. 后端：把现有抖音代码迁移到 `platforms/douyin.py` adapter
3. 后端：快手/小红书写骨架 adapter（方法抛 NotImplementedError）
4. 后端：API 路由改成动态选择 adapter
5. 前端：平台配置表 + 平台图标组件
6. 前端：账号页支持多平台显示和添加
7. 前端：发布页账号选择加平台图标
8. 数据库：加 `platform_config` jsonb 字段

### 第二阶段：接入新平台（拿到开发者账号后）

9. 实现 `platforms/kuaishou.py` adapter
10. 实现 `platforms/xiaohongshu.py` adapter

### 不做的事（YAGNI）

- 不搞平台插件系统，直接硬编码三个平台
- 不做每平台独立标题/描述，先统一一套
- 视频/数据页暂不改
