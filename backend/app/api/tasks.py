from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from app.core.supabase import supabase_admin
from app.models.schemas import TaskCreate, TaskResponse
from app.services import douyin

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def get_user_id(request: Request) -> str:
    """Extract user_id from request."""
    user_id = request.cookies.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


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
async def create_task(data: TaskCreate, request: Request, background_tasks: BackgroundTasks):
    """Create a new publish task and start publishing."""
    user_id = get_user_id(request)

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

    # Create publish task
    task_result = supabase_admin.table("publish_tasks").insert({
        "user_id": user_id,
        "title": data.title,
        "description": data.description,
        "video_url": data.video_url,
        "status": "publishing",
    }).execute()

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

        # Schedule background publishing for each account
        background_tasks.add_task(
            publish_to_account,
            task_id,
            ta_result.data[0]["id"],
            account,
            data.video_url,
            data.title,
            data.description,
        )

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


@router.get("", response_model=list[TaskResponse])
async def list_tasks(request: Request):
    """Get all tasks for the current user."""
    user_id = get_user_id(request)

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
async def get_task(task_id: str, request: Request):
    """Get a single task with its accounts."""
    user_id = get_user_id(request)

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
