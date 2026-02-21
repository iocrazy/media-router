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
