-- ============================================
-- 友链管理表（friends）
-- 数据库：MySQL 8.0+
-- 字符集：utf8mb4
-- ============================================

USE task_manager;

-- 创建 friends 表
CREATE TABLE IF NOT EXISTS friends (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '友链ID',
    name        VARCHAR(100) NOT NULL          COMMENT '网站名称',
    url         VARCHAR(500) NOT NULL          COMMENT '网站地址',
    description VARCHAR(500)                   COMMENT '网站描述',
    avatar      VARCHAR(500)                   COMMENT '头像URL',
    sort_order  INT          NOT NULL DEFAULT 0 COMMENT '排序（数字越小越靠前）',
    status      VARCHAR(20)  NOT NULL DEFAULT '已通过' COMMENT '状态：待审核/已通过/已拒绝',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='友链管理表';

-- 索引：按排序和状态查询
CREATE INDEX idx_friends_sort ON friends(sort_order, status);
