import asyncio
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.supabase import supabase_admin

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def execute_scheduled_tasks():
    """Poll for due scheduled tasks and trigger publishing."""
    from app.api.tasks import publish_to_account

    try:
        now = datetime.now(timezone.utc).isoformat()

        # Find due tasks with optimistic lock: only update if still scheduled
        due_tasks = supabase_admin.table("publish_tasks").select("*").eq(
            "status", "scheduled"
        ).lte("scheduled_at", now).execute()

        for task in due_tasks.data:
            task_id = task["id"]

            # Optimistic lock: update status to publishing only if still scheduled
            update_result = supabase_admin.table("publish_tasks").update({
                "status": "publishing",
                "updated_at": now,
            }).eq("id", task_id).eq("status", "scheduled").execute()

            if not update_result.data:
                # Another worker already picked this up
                continue

            logger.info(f"Executing scheduled task {task_id}: {task['title']}")

            # Get task accounts
            task_accounts = supabase_admin.table("task_accounts").select(
                "*, social_accounts(*)"
            ).eq("task_id", task_id).execute()

            # Trigger publishing for each account
            for ta in task_accounts.data:
                account = ta.get("social_accounts")
                if not account:
                    continue
                asyncio.create_task(
                    publish_to_account(
                        task_id,
                        ta["id"],
                        account,
                        task["video_url"],
                        task["title"],
                        task.get("description"),
                    )
                )

    except Exception as e:
        logger.error(f"Scheduler error: {e}")


def start_scheduler():
    scheduler.add_job(
        execute_scheduled_tasks,
        "interval",
        seconds=30,
        id="scheduled_publish",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started: polling every 30s for scheduled tasks")


def stop_scheduler():
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
