-- ============================================
-- 迁移 007: 将 comments.avatar_url 改为 TEXT
-- 日期: 2026-08-01
-- 背景:
--   users.avatar_url 已迁移为 TEXT，可存储 base64 data URL（Supabase Storage 不可用时的回退方案）。
--   但 comments.avatar_url 仍为 VARCHAR(500)，登录用户评论时后端会把 user 的大 base64 头像
--   复制到 comments.avatar_url，超出 500 字符限制，导致 PostgreSQL 抛错，接口返回 500。
-- 作用:
--   将 comments.avatar_url 列改为 TEXT，彻底支持内联头像存储。
--   执行此迁移后，可移除 comments.js 中对 data: URL 的置空逻辑（临时兜底）。
-- 执行方式（需用户确认后，在 Supabase SQL Editor 中运行）:
--   ALTER TABLE comments ALTER COLUMN avatar_url TYPE TEXT;
--   COMMENT ON COLUMN comments.avatar_url IS '评论者头像URL（支持外链或 base64 data URL）';
-- ============================================

ALTER TABLE comments ALTER COLUMN avatar_url TYPE TEXT;
COMMENT ON COLUMN comments.avatar_url IS '评论者头像URL（支持外链或 base64 data URL）';
