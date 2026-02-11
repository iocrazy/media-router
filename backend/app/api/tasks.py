from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.supabase import supabase_admin
from app.core.auth import get_current_user
from app.models.schemas import TaskCreate, TaskResponse
from app.services import douyin

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


async def publish_to_account(task_id: str, task_account_id: str, account: dict, video_url: str, title: str, description: str | None):
    """Background task to publish video to a single account."""
    try:
        # Publish to Douyin
        item_id = await douyin.publish_video(
            access_token=account["access_token"],
            open_id=account["platform_user_id"],
            video_url=video_url,
            title=title,
            description=description,
        )

        # Update task_account with success
        published_url = f"https://www.douyin.com/video/{item_id}"
        supabase_admin.table("task_accounts").update({
            "status": "success",
            "published_url": published_url,
            "published_at": datetime.now().isoformat(),
        }).eq("id", task_account_id).execute()

    except Exception as e:
        # Update task_account with failure
        supabase_admin.table("task_accounts").update({
            "status": "failed",
            "error_message": str(e)[:500],  # Limit error message length
        }).eq("id", task_account_id).execute()

    # Check if all accounts are done and update task status
    task_accounts = supabase_admin.table("task_accounts").select("status").eq(
        "task_id", task_id
    ).execute()

    statuses = [ta["status"] for ta in task_accounts.data]
    if "pending" not in statuses:
        # All done
        if all(s == "success" for s in statuses):
            task_status = "completed"
        elif all(s == "failed" for s in statuses):
            task_status = "failed"
        else:
            task_status = "completed"  # Partial success

        supabase_admin.table("publish_tasks").update({
            "status": task_status,
            "updated_at": datetime.now().isoformat(),
        }).eq("id", task_id).execute()


@router.post("", response_model=TaskResponse)
async def create_task(data: TaskCreate, user_id: str = Depends(get_current_user)):
    """Create a new publish task (H5 share flow)."""

    # Validate accounts belong to user
    accounts_result = supabase_admin.table("social_accounts").select("*").eq(
        "user_id", user_id
    ).in_("id", data.account_ids).execute()

    if len(accounts_result.data) != len(data.account_ids):
        raise HTTPException(status_code=400, detail="Some accounts not found")

    # Check all accounts are active
    for account in accounts_result.data:
        if account["status"] != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Account {account['username']} is not active"
            )

    # Determine status: scheduled > pending_share (H5 share flow)
    is_scheduled = data.scheduled_at is not None
    initial_status = "scheduled" if is_scheduled else "pending_share"

    # Generate share_id for H5 share tracking
    import secrets as _secrets
    share_id = _secrets.token_urlsafe(16)

    # Create publish task
    task_data = {
        "user_id": user_id,
        "title": data.title,
        "description": data.description,
        "video_url": data.video_url,
        "status": initial_status,
        "share_id": share_id,
    }
    if is_scheduled:
        task_data["scheduled_at"] = data.scheduled_at.isoformat()

    task_result = supabase_admin.table("publish_tasks").insert(task_data).execute()

    task = task_result.data[0]
    task_id = task["id"]

    # Create task_accounts records
    task_accounts = []
    for account in accounts_result.data:
        ta_result = supabase_admin.table("task_accounts").insert({
            "task_id": task_id,
            "account_id": account["id"],
            "status": "pending",
        }).execute()
        task_accounts.append({
            **ta_result.data[0],
            "username": account["username"],
            "avatar_url": account["avatar_url"],
        })

    return {
        **task,
        "accounts": [
            {
                "account_id": ta["account_id"],
                "username": ta["username"],
                "avatar_url": ta["avatar_url"],
                "status": ta["status"],
                "error_message": None,
                "published_url": None,
            }
            for ta in task_accounts
        ],
    }


@router.post("/{task_id}/cancel", response_model=TaskResponse)
async def cancel_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Cancel a scheduled or pending_share task."""

    # Get task and verify ownership
    task_result = supabase_admin.table("publish_tasks").select("*").eq(
        "id", task_id
    ).eq("user_id", user_id).execute()

    if not task_result.data:
        raise HTTPException(status_code=404, detail="Task not found")

    task = task_result.data[0]

    if task["status"] not in ("scheduled", "pending_share"):
        raise HTTPException(status_code=400, detail="Only scheduled or pending tasks can be cancelled")

    # Update task status to cancelled
    supabase_admin.table("publish_tasks").update({
        "status": "cancelled",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", task_id).execute()

    # Get updated task with accounts
    updated_task = supabase_admin.table("publish_tasks").select("*").eq(
        "id", task_id
    ).execute()

    task_accounts_result = supabase_admin.table("task_accounts").select(
        "*, social_accounts(username, avatar_url)"
    ).eq("task_id", task_id).execute()

    accounts = [
        {
            "account_id": ta["account_id"],
            "username": ta["social_accounts"]["username"] if ta.get("social_accounts") else "Unknown",
            "avatar_url": ta["social_accounts"]["avatar_url"] if ta.get("social_accounts") else None,
            "status": ta["status"],
            "error_message": ta.get("error_message"),
            "published_url": ta.get("published_url"),
        }
        for ta in task_accounts_result.data
    ]

    return {**updated_task.data[0], "accounts": accounts}


@router.get("", response_model=list[TaskResponse])
async def list_tasks(user_id: str = Depends(get_current_user)):
    """Get all tasks for the current user."""

    # Get tasks
    tasks_result = supabase_admin.table("publish_tasks").select("*").eq(
        "user_id", user_id
    ).order("created_at", desc=True).limit(50).execute()

    if not tasks_result.data:
        return []

    # Get task_accounts for all tasks
    task_ids = [t["id"] for t in tasks_result.data]
    task_accounts_result = supabase_admin.table("task_accounts").select(
        "*, social_accounts(username, avatar_url)"
    ).in_("task_id", task_ids).execute()

    # Group task_accounts by task_id
    task_accounts_map: dict[str, list] = {}
    for ta in task_accounts_result.data:
        tid = ta["task_id"]
        if tid not in task_accounts_map:
            task_accounts_map[tid] = []
        task_accounts_map[tid].append({
            "account_id": ta["account_id"],
            "username": ta["social_accounts"]["username"] if ta.get("social_accounts") else "Unknown",
            "avatar_url": ta["social_accounts"]["avatar_url"] if ta.get("social_accounts") else None,
            "status": ta["status"],
            "error_message": ta.get("error_message"),
            "published_url": ta.get("published_url"),
        })

    # Build response
    return [
        {
            **task,
            "accounts": task_accounts_map.get(task["id"], []),
        }
        for task in tasks_result.data
    ]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Get a single task with its accounts."""

    # Get task
    task_result = supabase_admin.table("publish_tasks").select("*").eq(
        "id", task_id
    ).eq("user_id", user_id).execute()

    if not task_result.data:
        raise HTTPException(status_code=404, detail="Task not found")

    task = task_result.data[0]

    # Get task_accounts
    task_accounts_result = supabase_admin.table("task_accounts").select(
        "*, social_accounts(username, avatar_url)"
    ).eq("task_id", task_id).execute()

    accounts = [
        {
            "account_id": ta["account_id"],
            "username": ta["social_accounts"]["username"] if ta.get("social_accounts") else "Unknown",
            "avatar_url": ta["social_accounts"]["avatar_url"] if ta.get("social_accounts") else None,
            "status": ta["status"],
            "error_message": ta.get("error_message"),
            "published_url": ta.get("published_url"),
        }
        for ta in task_accounts_result.data
    ]

    return {**task, "accounts": accounts}
