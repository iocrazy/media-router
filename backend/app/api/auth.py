import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.core.supabase import supabase_admin, supabase
from app.services import douyin

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory state storage (use Redis in production)
oauth_states: dict[str, dict] = {}


@router.get("/douyin")
async def douyin_auth(token: str = Query(..., description="Supabase access token")):
    """Redirect to Douyin OAuth page."""
    # Verify token and get user_id
    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "user_id": user_id,
        "created_at": datetime.now(),
    }

    auth_url = douyin.get_auth_url(state)
    return RedirectResponse(url=auth_url)


@router.get("/douyin/callback")
async def douyin_callback(code: str, state: str = ""):
    """Handle Douyin OAuth callback."""
    # Validate state
    if not state:
        # state is empty — user likely authorized via direct URL, not through the app
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/accounts?error=请通过应用内「绑定抖音账号」按钮进行授权"
        )

    state_data = oauth_states.pop(state, None)
    if not state_data:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/accounts?error=授权已过期，请重新绑定"
        )

    # Check state expiry (10 minutes)
    if datetime.now() - state_data["created_at"] > timedelta(minutes=10):
        raise HTTPException(status_code=400, detail="State expired")

    user_id = state_data["user_id"]

    try:
        # Exchange code for token
        token_data = await douyin.exchange_code_for_token(code)
        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]
        open_id = token_data["open_id"]
        expires_in = token_data["expires_in"]

        # Get user info
        user_info = await douyin.get_user_info(access_token, open_id)

        # Calculate token expiry
        token_expires_at = datetime.now() + timedelta(seconds=expires_in)

        # Check if account already exists
        existing = supabase_admin.table("social_accounts").select("id").eq(
            "user_id", user_id
        ).eq("platform", "douyin").eq("platform_user_id", open_id).execute()

        account_data = {
            "user_id": user_id,
            "platform": "douyin",
            "platform_user_id": open_id,
            "username": user_info.get("nickname", "Unknown"),
            "avatar_url": user_info.get("avatar", None),
            "access_token": access_token,  # TODO: encrypt in production
            "refresh_token": refresh_token,
            "token_expires_at": token_expires_at.isoformat(),
            "status": "active",
            "updated_at": datetime.now().isoformat(),
        }

        if existing.data:
            # Update existing account
            supabase_admin.table("social_accounts").update(account_data).eq(
                "id", existing.data[0]["id"]
            ).execute()
        else:
            # Create new account
            supabase_admin.table("social_accounts").insert(account_data).execute()

        # Redirect back to frontend
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts")

    except Exception as e:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/accounts?error={str(e)}"
        )
