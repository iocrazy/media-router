from datetime import datetime, timedelta
from fastapi import APIRouter, Request, HTTPException
from app.core.supabase import supabase_admin
from app.models.schemas import AccountResponse
from app.services import douyin

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def get_user_id(request: Request) -> str:
    """Extract user_id from request (simplified - use proper auth in production)."""
    user_id = request.cookies.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


@router.get("", response_model=list[AccountResponse])
async def list_accounts(request: Request):
    """Get all accounts for the current user."""
    user_id = get_user_id(request)

    result = supabase_admin.table("social_accounts").select(
        "id, platform, platform_user_id, username, avatar_url, status, created_at"
    ).eq("user_id", user_id).order("created_at", desc=True).execute()

    return result.data


@router.delete("/{account_id}")
async def delete_account(account_id: str, request: Request):
    """Delete (unbind) an account."""
    user_id = get_user_id(request)

    # Verify ownership
    result = supabase_admin.table("social_accounts").select("id").eq(
        "id", account_id
    ).eq("user_id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    supabase_admin.table("social_accounts").delete().eq("id", account_id).execute()

    return {"message": "Account deleted"}


@router.post("/{account_id}/refresh", response_model=AccountResponse)
async def refresh_account(account_id: str, request: Request):
    """Refresh expired account token."""
    user_id = get_user_id(request)

    # Get account with refresh token
    result = supabase_admin.table("social_accounts").select("*").eq(
        "id", account_id
    ).eq("user_id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    account = result.data[0]

    if not account.get("refresh_token"):
        raise HTTPException(status_code=400, detail="No refresh token available")

    try:
        # Refresh the token
        token_data = await douyin.refresh_access_token(account["refresh_token"])

        # Update account
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
