-- ============================================
-- 文章置顶功能迁移脚本
-- 添加 is_top 字段支持文章置顶
-- ============================================

USE task_manager;

-- 添加 is_top 字段
ALTER TABLE articles 
ADD COLUMN is_top TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶：0=否 1=是' 
AFTER status;

-- 添加索引提升查询性能
CREATE INDEX idx_articles_is_top ON articles (is_top);
