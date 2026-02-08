import httpx
from typing import Optional
from app.core.config import settings

DOUYIN_AUTH_URL = "https://open.douyin.com/platform/oauth/connect/"
DOUYIN_TOKEN_URL = "https://open.douyin.com/oauth/access_token/"
DOUYIN_REFRESH_URL = "https://open.douyin.com/oauth/refresh_token/"
DOUYIN_USER_URL = "https://open.douyin.com/oauth/userinfo/"
DOUYIN_VIDEO_CREATE_URL = "https://open.douyin.com/api/douyin/v1/video/create/"
DOUYIN_VIDEO_UPLOAD_URL = "https://open.douyin.com/api/douyin/v1/video/upload/"


def get_auth_url(state: str) -> str:
    """Generate Douyin OAuth authorization URL."""
    return (
        f"{DOUYIN_AUTH_URL}"
        f"?client_key={settings.DOUYIN_CLIENT_KEY}"
        f"&response_type=code"
        f"&scope=trial.whitelist,user_info"
        f"&redirect_uri={settings.DOUYIN_REDIRECT_URI}"
        f"&state={state}"
    )


async def exchange_code_for_token(code: str) -> dict:
    """Exchange authorization code for access token."""
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


async def refresh_access_token(refresh_token: str) -> dict:
    """Refresh expired access token."""
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


async def get_user_info(access_token: str, open_id: str) -> dict:
    """Get user info from Douyin."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            DOUYIN_USER_URL,
            params={"access_token": access_token, "open_id": open_id},
        )
        data = response.json()
        if data.get("data", {}).get("error_code", 0) != 0:
            raise Exception(data.get("data", {}).get("description", "Get user info failed"))
        return data["data"]


async def upload_video(access_token: str, open_id: str, video_url: str) -> str:
    """
    Upload video to Douyin.
    Returns video_id for creating the post.
    """
    async with httpx.AsyncClient(timeout=300.0) as client:
        # First download the video from Supabase Storage
        video_response = await client.get(video_url)
        video_content = video_response.content

        # Upload to Douyin
        response = await client.post(
            DOUYIN_VIDEO_UPLOAD_URL,
            params={"access_token": access_token, "open_id": open_id},
            files={"video": ("video.mp4", video_content, "video/mp4")},
        )
        data = response.json()
        if data.get("data", {}).get("error_code", 0) != 0:
            raise Exception(data.get("data", {}).get("description", "Video upload failed"))
        return data["data"]["video"]["video_id"]


async def create_video_post(
    access_token: str,
    open_id: str,
    video_id: str,
    title: str,
    description: Optional[str] = None,
) -> str:
    """
    Create a video post on Douyin.
    Returns the published item_id.
    """
    async with httpx.AsyncClient() as client:
        text = title
        if description:
            text = f"{title}\n{description}"

        response = await client.post(
            DOUYIN_VIDEO_CREATE_URL,
            params={"access_token": access_token, "open_id": open_id},
            json={
                "video_id": video_id,
                "text": text,
            },
        )
        data = response.json()
        if data.get("data", {}).get("error_code", 0) != 0:
            raise Exception(data.get("data", {}).get("description", "Video create failed"))
        return data["data"]["item_id"]


async def publish_video(
    access_token: str,
    open_id: str,
    video_url: str,
    title: str,
    description: Optional[str] = None,
) -> str:
    """
    Full flow: upload video and create post.
    Returns the item_id (can be used to construct the video URL).
    """
    video_id = await upload_video(access_token, open_id, video_url)
    item_id = await create_video_post(access_token, open_id, video_id, title, description)
    return item_id
