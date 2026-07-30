-- ============================================
-- 博客系统 - 操作日志迁移脚本
-- 功能：创建操作日志表，记录用户操作行为
-- 数据库：MySQL 8.0+
-- 字符集：utf8mb4
-- ============================================

USE task_manager;

-- ============================================
-- 操作日志表
-- ============================================

CREATE TABLE IF NOT EXISTS operation_logs (
    id            INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    user_id       INT          NOT NULL          COMMENT '操作用户ID',
    username      VARCHAR(50)  NOT NULL          COMMENT '操作用户名（冗余字段，便于查询）',
    action        VARCHAR(50)  NOT NULL          COMMENT '操作类型（如：登录、创建文章、删除文章等）',
    resource_type VARCHAR(50)                    COMMENT '资源类型（如：article、comment、user等）',
    resource_id   INT                            COMMENT '资源ID',
    details       TEXT                           COMMENT '操作详情（JSON格式，记录操作的具体内容）',
    ip_address    VARCHAR(50)                    COMMENT '操作IP地址',
    user_agent    VARCHAR(500)                   COMMENT '用户代理（浏览器信息）',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- ============================================
-- 迁移说明
-- ============================================
-- 此表用于记录用户操作行为，支持：
-- 1. 用户登录/登出记录
-- 2. 文章创建/编辑/删除/恢复操作记录
-- 3. 评论审核操作记录
-- 4. 系统配置修改记录
-- 5. 其他关键操作审计
--
-- 使用方式：
-- 1. 在需要记录操作的路由中添加 logAction 中间件
-- 2. 在 service 层调用 logService.log() 记录日志
-- 3. 提供管理端日志查询接口，支持按用户、操作类型、时间范围筛选
-- ============================================