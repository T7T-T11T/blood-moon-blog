-- 数据库升级脚本
USE task_manager;

-- ============================================
-- 1. 分类表（文章分类管理）
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '分类ID',
    name        VARCHAR(100) NOT NULL UNIQUE    COMMENT '分类名称',
    slug        VARCHAR(100) NOT NULL UNIQUE    COMMENT '分类标识（URL用）',
    description VARCHAR(500)                   COMMENT '分类描述',
    sort_order  INT          NOT NULL DEFAULT 0 COMMENT '排序（数字越小越靠前）',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章分类表';

-- ============================================
-- 2. 标签表（文章标签管理）
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '标签ID',
    name        VARCHAR(100) NOT NULL UNIQUE    COMMENT '标签名称',
    slug        VARCHAR(100) NOT NULL UNIQUE    COMMENT '标签标识（URL用）',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章标签表';

-- ============================================
-- 3. 博客文章表（升级：增加 category_id 字段）
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '文章ID',
    title VARCHAR(200) NOT NULL COMMENT '标题',
    content LONGTEXT NOT NULL COMMENT '内容',
    summary VARCHAR(500) COMMENT '摘要',
    tags VARCHAR(200) COMMENT '标签',
    status VARCHAR(20) NOT NULL DEFAULT '已发布' COMMENT '状态',
    view_count INT NOT NULL DEFAULT 0 COMMENT '浏览量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    user_id INT NOT NULL COMMENT '用户ID',
    CONSTRAINT fk_article_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客文章表';

-- 为已存在的 articles 表添加 category_id 字段
ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS category_id INT COMMENT '分类ID（外键）' AFTER view_count,
    ADD CONSTRAINT IF NOT EXISTS fk_article_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- ============================================
-- 4. 文章-标签关联表（多对多关系）
-- ============================================
CREATE TABLE IF NOT EXISTS article_tags (
    article_id INT NOT NULL COMMENT '文章ID',
    tag_id     INT NOT NULL COMMENT '标签ID',
    PRIMARY KEY (article_id, tag_id),
    CONSTRAINT fk_at_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_at_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章-标签关联表';

-- ============================================
-- 5. 番茄钟记录表
-- ============================================
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
    duration INT NOT NULL DEFAULT 25 COMMENT '专注时长(分钟)',
    task_name VARCHAR(200) COMMENT '任务名称',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
    completed TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否完成',
    user_id INT NOT NULL COMMENT '用户ID',
    CONSTRAINT fk_pomodoro_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='番茄钟记录表';

-- ============================================
-- 6. 初始化示例数据
-- ============================================
INSERT INTO categories (name, slug, description, sort_order) VALUES
('前端开发', 'frontend', 'Vue、React、TypeScript 等前端技术分享', 1),
('后端开发', 'backend', 'Node.js、Python、数据库等后端技术', 2),
('项目实践', 'project', '实际项目开发经验与总结', 3),
('生活随笔', 'life', '生活感悟与日常记录', 4)
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO tags (name, slug) VALUES
('Vue 3', 'vue3'),
('React', 'react'),
('JavaScript', 'javascript'),
('TypeScript', 'typescript'),
('Node.js', 'nodejs'),
('Express', 'express'),
('MySQL', 'mysql'),
('全栈', 'fullstack'),
('项目总结', 'project-summary'),
('效率工具', 'productivity')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO articles (title, content, summary, tags, status, user_id) VALUES
('Vue3学习笔记', '# Vue3学习笔记\n\n## Composition API\n\nVue3引入了组合式API，让代码组织更加灵活。\n\n### 主要特性\n- ref 和 reactive 响应式数据\n- setup 函数\n- 生命周期钩子\n\n## 总结\n\nVue3相比Vue2有更好的TypeScript支持和性能优化。', '记录Vue3学习心得', 'Vue,前端', '已发布', 1),
('Express入门', '# Express入门指南\n\n## 什么是Express\n\nExpress是Node.js的Web应用框架。\n\n### 核心概念\n1. 路由（Routing）\n2. 中间件（Middleware）\n3. 请求和响应\n\n```js\nconst express = require(''express'');\nconst app = express();\napp.get(''/'', (req, res) => res.send(''Hello''));\n```', 'Express基础知识', 'Express,后端', '已发布', 1);

INSERT INTO pomodoro_sessions (duration, task_name, started_at, completed, user_id) VALUES
(25, '学习Vue3', DATE_SUB(NOW(), INTERVAL 2 DAY), 1, 1),
(25, '写文章', DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 1),
(15, '复习MySQL', DATE_SUB(NOW(), INTERVAL 1 DAY), 0, 1),
(25, '项目重构', NOW(), 1, 1);
