from typing import Optional

from app.services.platforms.base import PlatformAdapter


class XiaohongshuAdapter(PlatformAdapter):
    platform_name = "xiaohongshu"

    def get_auth_url(self, state: str) -> str:
        raise NotImplementedError("Xiaohongshu OAuth not yet configured")

    async def exchange_token(self, code: str) -> dict:
        raise NotImplementedError("Xiaohongshu token exchange not yet configured")

    async def refresh_token(self, refresh_token: str) -> dict:
        raise NotImplementedError("Xiaohongshu token refresh not yet configured")

    async def get_user_info(self, access_token: str, open_id: str) -> dict:
        raise NotImplementedError("Xiaohongshu user info not yet configured")

    async def publish_video(
        self,
        access_token: str,
        open_id: str,
        video_url: str,
        title: str,
        description: Optional[str] = None,
    ) -> str:
        raise NotImplementedError("Xiaohongshu video publish not yet configured")
