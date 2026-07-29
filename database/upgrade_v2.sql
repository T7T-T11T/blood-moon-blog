-- ============================================
-- 个人博客系统 - V2.0 数据库升级脚本
-- 作用：为博客重构添加评论、友链、网站设置等新功能表
-- 执行方式：mysql -u root -p < upgrade_v2.sql
-- ============================================

USE task_manager;

-- ============================================
-- 1. 评论表（支持文章评论和回复）
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '评论ID',
    article_id  INT          NOT NULL          COMMENT '文章ID（外键）',
    nickname    VARCHAR(50)  NOT NULL          COMMENT '评论者昵称',
    email       VARCHAR(100)                   COMMENT '评论者邮箱（不公开显示）',
    avatar_url  VARCHAR(500)                   COMMENT '头像URL（可选，默认生成）',
    content     TEXT         NOT NULL          COMMENT '评论内容',
    parent_id   INT          DEFAULT NULL      COMMENT '父评论ID（回复功能，NULL表示顶级评论）',
    status      VARCHAR(20)  NOT NULL DEFAULT '待审核' COMMENT '状态：待审核/已通过/已拒绝',
    ip_address  VARCHAR(45)                    COMMENT '评论者IP地址',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    CONSTRAINT fk_comment_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_parent  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章评论表';

-- ============================================
-- 2. 友情链接表
-- ============================================
CREATE TABLE IF NOT EXISTS links (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '友链ID',
    name        VARCHAR(100) NOT NULL          COMMENT '网站名称',
    url         VARCHAR(500) NOT NULL          COMMENT '网站URL',
    description VARCHAR(500)                   COMMENT '网站描述',
    avatar_url  VARCHAR(500)                   COMMENT '网站头像/Logo URL',
    category    VARCHAR(50)  DEFAULT '友情链接' COMMENT '链接分类：友情链接/推荐站点/工具资源',
    sort_order  INT          NOT NULL DEFAULT 0 COMMENT '排序（数字越小越靠前）',
    status      VARCHAR(20)  NOT NULL DEFAULT '已通过' COMMENT '状态：待审核/已通过/已拒绝',
    email       VARCHAR(100)                   COMMENT '站长邮箱（可选）',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='友情链接表';

-- ============================================
-- 3. 网站设置表（键值对存储，灵活扩展）
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '设置项ID',
    setting_key VARCHAR(100) NOT NULL UNIQUE   COMMENT '设置键名（如 site_name, site_description）',
    setting_value TEXT                         COMMENT '设置值',
    description VARCHAR(200)                   COMMENT '设置项描述',
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网站设置表';

-- ============================================
-- 4. users 表新增字段（个人主页信息）
--    使用安全方式添加，避免字段已存在时报错
-- ============================================

-- 先补齐旧版本缺失的字段
SET @s = CONCAT('SELECT COUNT(*) INTO @cnt FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=''users'' AND column_name=''avatar_url''');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF(@cnt=0, 'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) COMMENT ''头像URL'' AFTER password_hash', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = CONCAT('SELECT COUNT(*) INTO @cnt FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=''users'' AND column_name=''bio''');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF(@cnt=0, 'ALTER TABLE users ADD COLUMN bio VARCHAR(500) COMMENT ''个人简介'' AFTER avatar_url', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 新增博客重构需要的字段
SET @s = CONCAT('SELECT COUNT(*) INTO @cnt FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=''users'' AND column_name=''email''');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF(@cnt=0, 'ALTER TABLE users ADD COLUMN email VARCHAR(100) COMMENT ''邮箱'' AFTER bio', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = CONCAT('SELECT COUNT(*) INTO @cnt FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=''users'' AND column_name=''github_url''');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF(@cnt=0, 'ALTER TABLE users ADD COLUMN github_url VARCHAR(500) COMMENT ''GitHub主页URL'' AFTER email', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = CONCAT('SELECT COUNT(*) INTO @cnt FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=''users'' AND column_name=''qq_url''');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF(@cnt=0, 'ALTER TABLE users ADD COLUMN qq_url VARCHAR(500) COMMENT ''QQ主页URL'' AFTER github_url', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = CONCAT('SELECT COUNT(*) INTO @cnt FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=''users'' AND column_name=''wechat''');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF(@cnt=0, 'ALTER TABLE users ADD COLUMN wechat VARCHAR(100) COMMENT ''微信号'' AFTER qq_url', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 5. articles 表新增字段（杂志风展示用）
--    使用安全方式添加，避免字段已存在时报错
-- ============================================
SET @s = CONCAT('SELECT COUNT(*) INTO @cnt FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=''articles'' AND column_name=''like_count''');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF(@cnt=0, 'ALTER TABLE articles ADD COLUMN like_count INT NOT NULL DEFAULT 0 COMMENT ''点赞数'' AFTER view_count', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = CONCAT('SELECT COUNT(*) INTO @cnt FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=''articles'' AND column_name=''is_top''');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF(@cnt=0, 'ALTER TABLE articles ADD COLUMN is_top TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否置顶：1=是 0=否'' AFTER status', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 6. 初始化网站设置数据
-- ============================================
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('site_name',        '个人博客',           '网站名称'),
('site_description', '记录技术与生活的点滴', '网站描述'),
('site_keywords',    '博客,技术,Vue,Node.js,全栈', '网站SEO关键词'),
('site_icp',         '',                  '网站备案号'),
('author_name',      '博主',              '作者名称'),
('author_bio',       '全栈开发工程师，热爱技术与分享', '作者简介'),
('author_avatar',    '',                  '作者头像URL'),
('author_email',     '',                  '作者邮箱'),
('author_github',    '',                  '作者GitHub'),
('author_qq',        '',                  '作者QQ'),
('author_wechat',    '',                  '作者微信'),
('footer_text',      '© 2026 个人博客. All rights reserved.', '页脚版权文字')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

-- ============================================
-- 7. 初始化友链示例数据
-- ============================================
INSERT INTO links (name, url, description, avatar_url, category, sort_order, status) VALUES
('Vue 官网',     'https://vuejs.org',         'Vue.js 渐进式 JavaScript 框架', '', '推荐站点', 1, '已通过'),
('Element Plus', 'https://element-plus.org',  '基于 Vue 3 的组件库',           '', '推荐站点', 2, '已通过'),
('Vite',         'https://vitejs.dev',        '下一代前端构建工具',             '', '推荐站点', 3, '已通过'),
('Express',      'https://expressjs.com',     'Node.js Web 应用框架',          '', '推荐站点', 4, '已通过'),
('MySQL',        'https://www.mysql.com',     '开源关系型数据库',               '', '推荐站点', 5, '已通过')
ON DUPLICATE KEY UPDATE name = name;

-- ============================================
-- 升级完成
-- ============================================
