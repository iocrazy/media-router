-- Migration: Add multi-content type support (video / image-text / article)

-- 1. Add content_type column with default 'video' for backward compatibility
ALTER TABLE publish_tasks
  ADD COLUMN IF NOT EXISTS content_type varchar(20) NOT NULL DEFAULT 'video';

-- 2. Add image_urls for image-text posts (array of storage URLs)
ALTER TABLE publish_tasks
  ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Add article_content for article posts
ALTER TABLE publish_tasks
  ADD COLUMN IF NOT EXISTS article_content text;

-- 4. Make video_url nullable (image-text and article posts don't need it)
ALTER TABLE publish_tasks
  ALTER COLUMN video_url DROP NOT NULL;

-- 5. Create images storage bucket (mirrors the videos bucket RLS pattern)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

-- Allow public read access to images
CREATE POLICY "Public read access for images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'images');
