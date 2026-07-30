-- ============================================
-- 博客系统 - 回收站功能迁移脚本
-- 功能：为文章表添加软删除字段，支持回收站功能
-- 数据库：MySQL 8.0+
-- 字符集：utf8mb4
-- ============================================

USE task_manager;

-- ============================================
-- 1. 为 articles 表添加软删除字段
-- ============================================

-- 添加 deleted_at 字段，用于软删除标记
-- deleted_at 为 NULL 表示文章正常，非空表示已删除（在回收站）
ALTER TABLE articles
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间（软删除标记，NULL表示未删除）' AFTER updated_at;

-- ============================================
-- 2. 添加索引优化回收站查询性能
-- ============================================

-- 为 deleted_at 添加索引，优化回收站列表查询
CREATE INDEX idx_deleted_at ON articles(deleted_at);

-- 为 user_id + deleted_at 添加复合索引，优化用户回收站查询
CREATE INDEX idx_user_deleted ON articles(user_id, deleted_at);

-- ============================================
-- 迁移说明
-- ============================================
-- 执行此脚本后：
-- 1. articles 表新增 deleted_at 字段，默认值为 NULL
-- 2. 正常文章的 deleted_at 为 NULL，已删除文章为具体时间戳
-- 3. 需要修改 articleService.js 的查询逻辑，添加 deleted_at IS NULL 条件
-- 4. deleteArticle 函数改为 UPDATE deleted_at 而非物理删除
-- 5. 新增 getTrashArticles、restoreArticle、permanentDeleteArticle 函数
-- ============================================