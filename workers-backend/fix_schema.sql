-- ============================================
-- 血月博客 Workers 部署 - 数据库 Schema 修正
-- 目的：对齐 PostgreSQL 结构与原 Express 后端 / Workers 代码期望
-- 注意：执行前请在 Supabase SQL Editor 先备份
-- ============================================

-- 1. operation_logs 表结构修正
-- 1.1 重命名 actions -> action，details -> detail
ALTER TABLE operation_logs RENAME COLUMN actions TO action;
ALTER TABLE operation_logs RENAME COLUMN details TO detail;

-- 1.2 补充缺失字段
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500);

-- 1.3 修复 user_id 外键为 nullable（系统操作等场景可空）
-- 如果原约束为 NOT NULL，先放宽（保留数据完整性由业务保证）
ALTER TABLE operation_logs ALTER COLUMN user_id DROP NOT NULL;

-- 2. articles 状态值校正
-- 把 status 统一为中文值：已发布 / 草稿
UPDATE articles SET status = '已发布' WHERE status = 'published' OR status = 'Published';
UPDATE articles SET status = '草稿' WHERE status = 'draft' OR status = 'Draft';
ALTER TABLE articles ALTER COLUMN status SET DEFAULT '已发布';

-- 3. friends 状态值校正
UPDATE friends SET status = '已通过' WHERE status = 'approved' OR status = 'Published';
UPDATE friends SET status = '待审核' WHERE status = 'pending';
UPDATE friends SET status = '已拒绝' WHERE status = 'rejected';

-- 补充缺失字段
ALTER TABLE friends ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- 4. comments 状态值校正
UPDATE comments SET status = '已通过' WHERE status = 'approved';
UPDATE comments SET status = '待审核' WHERE status = 'pending';
UPDATE comments SET status = '已拒绝' WHERE status = 'rejected';

-- 5. music 表补充字段
ALTER TABLE music ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- 6. 为 admin 用户重置密码到 PBKDF2（由 reset-password.cjs 生成）
-- 注意：以下哈希每次运行脚本都不同，请用脚本最新输出替换
UPDATE users 
SET password_hash = 'pbkdf2$100000$2a27fc2a6c2c245e3323d877310b18e8$917a44d70238c3b36ef7958f3e9a395e04c26862f0687e8038b227cfe072064a'
WHERE username = 'admin';

-- 7. 必要时重新禁用 RLS（确保匿名读取公共数据）
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE music DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE article_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE article_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 8. 修复 users.avatar_url 字段类型
-- 原因：VARCHAR(500) 无法存储 base64 data URL（通常 10KB+）
-- 修复：改为 TEXT 类型，支持任意长度 URL
ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;

-- 9. 修复 site_settings.setting_value 字段类型
-- 原因：存储长文章内容或配置值时可能超出 VARCHAR 限制
ALTER TABLE site_settings ALTER COLUMN setting_value TYPE TEXT;
