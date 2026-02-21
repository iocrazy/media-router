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
