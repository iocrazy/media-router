-- MediaHub MVP 数据库初始化脚本
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 社交账号表
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL DEFAULT 'douyin',
  platform_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- 2. 发布任务表
CREATE TABLE IF NOT EXISTS publish_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  cover_url TEXT,
  status VARCHAR(20) DEFAULT 'publishing' CHECK (status IN ('publishing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 任务-账号关联表
CREATE TABLE IF NOT EXISTS task_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES publish_tasks(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_publish_tasks_user_id ON publish_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_accounts_task_id ON task_accounts(task_id);

-- 启用 RLS
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_accounts ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can manage own accounts"
  ON social_accounts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks"
  ON publish_tasks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own task_accounts"
  ON task_accounts FOR ALL
  USING (
    task_id IN (SELECT id FROM publish_tasks WHERE user_id = auth.uid())
  );

-- 创建 Storage bucket 用于视频存储
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS：允许认证用户上传和读取视频
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Anyone can view videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'videos');

CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Multi-platform support: store platform-specific data
ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS platform_config jsonb DEFAULT '{}';
