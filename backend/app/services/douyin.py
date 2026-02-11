import hashlib
import logging
import secrets
import time
from typing import Optional
from urllib.parse import quote

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

DOUYIN_AUTH_URL = "https://open.douyin.com/platform/oauth/connect/"
DOUYIN_TOKEN_URL = "https://open.douyin.com/oauth/access_token/"
DOUYIN_REFRESH_URL = "https://open.douyin.com/oauth/refresh_token/"
DOUYIN_USER_URL = "https://open.douyin.com/oauth/userinfo/"
DOUYIN_VIDEO_CREATE_URL = "https://open.douyin.com/api/douyin/v1/video/create/"
DOUYIN_VIDEO_UPLOAD_URL = "https://open.douyin.com/api/douyin/v1/video/upload/"
DOUYIN_CLIENT_TOKEN_URL = "https://open.douyin.com/oauth/client_token/"
DOUYIN_TICKET_URL = "https://open.douyin.com/open/getticket/"

# ── H5 Share: token/ticket cache ──────────────────────────────
_client_token_cache: dict = {"token": None, "expires_at": 0}
_ticket_cache: dict = {"ticket": None, "expires_at": 0}


async def get_client_token() -> str:
    """Get client_token (cached, auto-refresh)."""
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
        logger.info("Douyin client_token refreshed, expires_in=%d", expires_in)
        return token


async def get_ticket() -> str:
    """Get jsapi ticket for H5 share signature (cached, valid 2h)."""
    now = time.time()
    if _ticket_cache["ticket"] and now < _ticket_cache["expires_at"] - 60:
        return _ticket_cache["ticket"]

    client_token = await get_client_token()
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
        logger.info("Douyin ticket refreshed, expires_in=%d", expires_in)
        return ticket


def _generate_signature(ticket: str, timestamp: int, nonce_str: str) -> str:
    """Generate MD5 signature for H5 share Schema URL."""
    # Parameters sorted by key in ASCII order
    sign_str = f"nonce_str={nonce_str}&ticket={ticket}&timestamp={timestamp}"
    return hashlib.md5(sign_str.encode()).hexdigest()


async def generate_share_schema(
    video_url: str,
    title: str,
    share_id: str,
    hashtag_list: str = "",
) -> str:
    """
    Generate the Schema URL for H5 share to Douyin.
    User scans QR code or taps link → Douyin app opens → publish page with content pre-filled.
    """
    ticket = await get_ticket()
    timestamp = int(time.time())
    nonce_str = secrets.token_hex(16)
    signature = _generate_signature(ticket, timestamp, nonce_str)

    params = {
        "client_key": settings.DOUYIN_CLIENT_KEY,
        "nonce_str": nonce_str,
        "timestamp": str(timestamp),
        "signature": signature,
        "state": share_id,
        "video_url": video_url,
        "title": title,
    }
    if hashtag_list:
        params["hashtag_list"] = hashtag_list

    query = "&".join(f"{k}={quote(str(v), safe='')}" for k, v in params.items())
    return f"snssdk1128://openplatform/share?{query}"


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
