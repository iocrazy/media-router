-- Migration: Publish system redesign - drafts table + extended columns

-- 1. Create drafts table
create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type varchar(20) not null default 'video',
  title text,
  description text,
  video_urls jsonb not null default '[]'::jsonb,
  image_urls jsonb not null default '[]'::jsonb,
  article_content text,
  cover_url text,
  visibility varchar(20) not null default 'public',
  ai_content boolean not null default false,
  topics jsonb not null default '[]'::jsonb,
  account_ids jsonb not null default '[]'::jsonb,
  account_configs jsonb not null default '{}'::jsonb,
  distribution_mode varchar(20) not null default 'broadcast',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table drafts enable row level security;

create policy "Users manage own drafts"
  on drafts for all using (auth.uid() = user_id);

-- 2. Extend publish_tasks
alter table publish_tasks
  add column if not exists visibility varchar(20) not null default 'public',
  add column if not exists ai_content boolean not null default false,
  add column if not exists cover_url text,
  add column if not exists topics jsonb not null default '[]'::jsonb,
  add column if not exists distribution_mode varchar(20),
  add column if not exists batch_id uuid;

-- 3. Extend task_accounts with per-account overrides
alter table task_accounts
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists topics jsonb;
