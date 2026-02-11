import hashlib
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.supabase import supabase_admin
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.schemas import ShareSchemaResponse
from app.services import douyin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/share", tags=["share"])


@router.get("/douyin/{task_id}", response_model=ShareSchemaResponse)
async def get_share_schema(task_id: str, user_id: str = Depends(get_current_user)):
    """Generate (or regenerate) the Douyin H5 share Schema URL for a task."""

    # Get task and verify ownership
    task_result = supabase_admin.table("publish_tasks").select("*").eq(
        "id", task_id
    ).eq("user_id", user_id).execute()

    if not task_result.data:
        raise HTTPException(status_code=404, detail="Task not found")

    task = task_result.data[0]

    if task["status"] not in ("pending_share", "scheduled"):
        raise HTTPException(status_code=400, detail="Task is not in a shareable state")

    # Use existing share_id or generate one
    share_id = task.get("share_id")
    if not share_id:
        import secrets
        share_id = secrets.token_urlsafe(16)
        supabase_admin.table("publish_tasks").update({
            "share_id": share_id,
        }).eq("id", task_id).execute()

    # Build title text
    title = task["title"]
    if task.get("description"):
        title = f"{title} {task['description']}"

    # Generate Schema URL (signature is fresh each call)
    schema_url = await douyin.generate_share_schema(
        video_url=task["video_url"],
        title=title,
        share_id=share_id,
    )

    return ShareSchemaResponse(schema_url=schema_url, share_id=share_id)


@router.post("/webhook/douyin")
async def douyin_webhook(request: Request):
    """
    Receive Douyin event callbacks (create_video, etc.).
    Douyin sends this after user publishes via H5 share.
    """
    body = await request.body()
    body_str = body.decode("utf-8")

    # Verify signature: SHA1(app_secret + body)
    expected_sig = request.headers.get("x-douyin-signature", "")
    computed_sig = hashlib.sha1(
        (settings.DOUYIN_CLIENT_SECRET + body_str).encode()
    ).hexdigest()

    if computed_sig != expected_sig:
        logger.warning("Webhook signature mismatch")
        raise HTTPException(status_code=403, detail="Invalid signature")

    data = await request.json()
    event = data.get("event", "")

    # Handle webhook verification
    if event == "verify_webhook":
        logger.info("Webhook verification request received")
        return {"challenge": data.get("challenge", 0)}

    # Handle video creation event
    if event == "create_video":
        content = data.get("content", "{}")
        if isinstance(content, str):
            import json
            content = json.loads(content)

        share_id = content.get("share_id", "")
        item_id = content.get("item_id", "")

        if not share_id:
            logger.warning("Webhook create_video missing share_id")
            return {"msg": "ok"}

        # Find task by share_id
        task_result = supabase_admin.table("publish_tasks").select("id").eq(
            "share_id", share_id
        ).execute()

        if not task_result.data:
            logger.warning("Webhook: no task found for share_id=%s", share_id)
            return {"msg": "ok"}

        task_id = task_result.data[0]["id"]

        # Update task status
        published_url = f"https://www.douyin.com/video/{item_id}" if item_id else None
        supabase_admin.table("publish_tasks").update({
            "status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", task_id).execute()

        # Update all task_accounts to success
        update_data = {"status": "success", "published_at": datetime.now(timezone.utc).isoformat()}
        if published_url:
            update_data["published_url"] = published_url
        supabase_admin.table("task_accounts").update(update_data).eq(
            "task_id", task_id
        ).execute()

        logger.info("Webhook: task %s completed via H5 share, item_id=%s", task_id, item_id)

    return {"msg": "ok"}
