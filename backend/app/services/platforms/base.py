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
