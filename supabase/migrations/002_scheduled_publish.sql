-- 定时发布功能：添加 scheduled_at 列，扩展 status 约束

-- 1. 添加 scheduled_at 列
ALTER TABLE publish_tasks
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- 2. 扩展 status CHECK 约束：新增 scheduled、cancelled
ALTER TABLE publish_tasks
  DROP CONSTRAINT IF EXISTS publish_tasks_status_check;

ALTER TABLE publish_tasks
  ADD CONSTRAINT publish_tasks_status_check
  CHECK (status IN ('scheduled', 'publishing', 'completed', 'failed', 'cancelled'));

-- 3. 创建部分索引，加速调度器查询到期任务
CREATE INDEX IF NOT EXISTS idx_publish_tasks_scheduled
  ON publish_tasks (scheduled_at)
  WHERE status = 'scheduled';
