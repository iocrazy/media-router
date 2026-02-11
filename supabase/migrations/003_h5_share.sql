-- H5 分享发布功能：添加 share_id 列，扩展 status 约束

-- 1. 添加 share_id 列（用于关联抖音 Webhook 回调）
ALTER TABLE publish_tasks
  ADD COLUMN IF NOT EXISTS share_id TEXT;

-- 2. 扩展 status CHECK 约束：新增 pending_share
ALTER TABLE publish_tasks
  DROP CONSTRAINT IF EXISTS publish_tasks_status_check;

ALTER TABLE publish_tasks
  ADD CONSTRAINT publish_tasks_status_check
  CHECK (status IN ('pending_share', 'scheduled', 'publishing', 'completed', 'failed', 'cancelled'));

-- 3. 索引 share_id 用于 Webhook 快速查找
CREATE INDEX IF NOT EXISTS idx_publish_tasks_share_id
  ON publish_tasks (share_id)
  WHERE share_id IS NOT NULL;
