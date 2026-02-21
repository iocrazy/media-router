from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.core.supabase import supabase_admin
from app.core.auth import get_current_user
from app.models.schemas import DraftCreate, DraftResponse

router = APIRouter(prefix="/api/drafts", tags=["drafts"])


@router.post("", response_model=DraftResponse)
async def create_draft(data: DraftCreate, user_id: str = Depends(get_current_user)):
    result = supabase_admin.table("drafts").insert({
        "user_id": user_id,
        **data.model_dump(mode="json"),
    }).execute()
    return result.data[0]


@router.get("", response_model=list[DraftResponse])
async def list_drafts(user_id: str = Depends(get_current_user)):
    result = supabase_admin.table("drafts").select("*").eq(
        "user_id", user_id
    ).order("updated_at", desc=True).limit(20).execute()
    return result.data


@router.get("/{draft_id}", response_model=DraftResponse)
async def get_draft(draft_id: str, user_id: str = Depends(get_current_user)):
    result = supabase_admin.table("drafts").select("*").eq(
        "id", draft_id
    ).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Draft not found")
    return result.data[0]


@router.put("/{draft_id}", response_model=DraftResponse)
async def update_draft(draft_id: str, data: DraftCreate, user_id: str = Depends(get_current_user)):
    existing = supabase_admin.table("drafts").select("id").eq(
        "id", draft_id
    ).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Draft not found")

    result = supabase_admin.table("drafts").update({
        **data.model_dump(mode="json"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", draft_id).execute()
    return result.data[0]


@router.delete("/{draft_id}")
async def delete_draft(draft_id: str, user_id: str = Depends(get_current_user)):
    existing = supabase_admin.table("drafts").select("id").eq(
        "id", draft_id
    ).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Draft not found")

    supabase_admin.table("drafts").delete().eq("id", draft_id).execute()
    return {"ok": True}
