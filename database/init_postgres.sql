-- ============================================
-- 个人博客系统 - 数据库初始化脚本（PostgreSQL）
-- 基于实际代码使用的表结构生成
-- ============================================

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url    VARCHAR(500),
    bio           VARCHAR(500),
    email         VARCHAR(100),
    github_url    VARCHAR(500),
    qq_url        VARCHAR(500),
    wechat        VARCHAR(100),
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS '用户ID';
COMMENT ON COLUMN users.username IS '用户名';
COMMENT ON COLUMN users.password_hash IS '密码哈希（bcrypt加密）';
COMMENT ON COLUMN users.avatar_url IS '头像URL';
COMMENT ON COLUMN users.bio IS '个人简介';
COMMENT ON COLUMN users.email IS '邮箱';
COMMENT ON COLUMN users.github_url IS 'GitHub链接';
COMMENT ON COLUMN users.qq_url IS 'QQ链接';
COMMENT ON COLUMN users.wechat IS '微信号';
COMMENT ON COLUMN users.created_at IS '创建时间';
COMMENT ON COLUMN users.updated_at IS '更新时间';

-- ============================================
-- 分类表
-- ============================================
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE categories IS '文章分类表';
COMMENT ON COLUMN categories.id IS '分类ID';
COMMENT ON COLUMN categories.name IS '分类名称';
COMMENT ON COLUMN categories.slug IS '分类标识（URL用）';
COMMENT ON COLUMN categories.description IS '分类描述';
COMMENT ON COLUMN categories.sort_order IS '排序（数字越小越靠前）';

-- ============================================
-- 标签表
-- ============================================
CREATE TABLE tags (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE tags IS '文章标签表';
COMMENT ON COLUMN tags.name IS '标签名称';
COMMENT ON COLUMN tags.slug IS '标签标识（URL用）';

-- ============================================
-- 博客文章表
-- ============================================
CREATE TABLE articles (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    content      TEXT         NOT NULL,
    summary      VARCHAR(500),
    cover_image  VARCHAR(500),
    status       VARCHAR(20)  NOT NULL DEFAULT '已发布',
    is_top       SMALLINT     NOT NULL DEFAULT 0,
    view_count   INT          NOT NULL DEFAULT 0,
    like_count   INT          NOT NULL DEFAULT 0,
    category_id  INT,
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW(),
    user_id      INT          NOT NULL,
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT fk_article_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_article_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

COMMENT ON TABLE articles IS '博客文章表';
COMMENT ON COLUMN articles.id IS '文章ID';
COMMENT ON COLUMN articles.title IS '标题';
COMMENT ON COLUMN articles.content IS '内容（Markdown格式）';
COMMENT ON COLUMN articles.status IS '状态：已发布/草稿';
COMMENT ON COLUMN articles.is_top IS '是否置顶：0=否 1=是';
COMMENT ON COLUMN articles.view_count IS '浏览量';
COMMENT ON COLUMN articles.like_count IS '点赞数';
COMMENT ON COLUMN articles.deleted_at IS '删除时间（软删除标记，NULL表示未删除）';

CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_is_top ON articles(is_top);
CREATE INDEX idx_articles_deleted_at ON articles(deleted_at);
CREATE INDEX idx_articles_user_deleted ON articles(user_id, deleted_at);

-- ============================================
-- 文章-标签关联表（多对多）
-- ============================================
CREATE TABLE article_tags (
    article_id INT NOT NULL,
    tag_id     INT NOT NULL,
    PRIMARY KEY (article_id, tag_id),
    CONSTRAINT fk_at_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_at_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

COMMENT ON TABLE article_tags IS '文章-标签关联表';

-- ============================================
-- 评论表（支持嵌套回复）
-- ============================================
CREATE TABLE comments (
    id         SERIAL PRIMARY KEY,
    article_id INT          NOT NULL,
    nickname   VARCHAR(50)  NOT NULL,
    email      VARCHAR(100),
    avatar_url VARCHAR(500),
    content    TEXT         NOT NULL,
    parent_id  INT,
    status     VARCHAR(20)  NOT NULL DEFAULT '待审核',
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT fk_comment_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

COMMENT ON TABLE comments IS '评论表';
COMMENT ON COLUMN comments.parent_id IS '父评论ID（支持嵌套回复）';
COMMENT ON COLUMN comments.status IS '状态：待审核/已通过/已拒绝';

CREATE INDEX idx_comments_article ON comments(article_id);
CREATE INDEX idx_comments_status ON comments(status);

-- ============================================
-- 友链表
-- ============================================
CREATE TABLE friends (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    url         VARCHAR(500) NOT NULL,
    description VARCHAR(500),
    avatar      VARCHAR(500),
    sort_order  INT          NOT NULL DEFAULT 0,
    status      VARCHAR(20)  NOT NULL DEFAULT '已通过',
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE friends IS '友情链接表';
COMMENT ON COLUMN friends.status IS '状态：待审核/已通过/已拒绝';

CREATE INDEX idx_friends_sort ON friends(sort_order, status);

-- ============================================
-- 点赞表（支持登录用户和未登录IP）
-- ============================================
CREATE TABLE article_likes (
    id         SERIAL PRIMARY KEY,
    article_id INT          NOT NULL,
    user_id    INT,
    ip         VARCHAR(45),
    created_at TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (article_id, user_id),
    UNIQUE (article_id, ip),
    CONSTRAINT fk_like_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

COMMENT ON TABLE article_likes IS '点赞记录表';
COMMENT ON COLUMN article_likes.user_id IS '登录用户ID，未登录为NULL';
COMMENT ON COLUMN article_likes.ip IS '未登录用户IP';

-- ============================================
-- 收藏表
-- ============================================
CREATE TABLE article_favorites (
    id         SERIAL PRIMARY KEY,
    article_id INT          NOT NULL,
    user_id    INT          NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (user_id, article_id),
    CONSTRAINT fk_favorite_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE article_favorites IS '收藏记录表';

-- ============================================
-- 访问统计表
-- ============================================
CREATE TABLE site_visits (
    id          BIGSERIAL PRIMARY KEY,
    page_path   VARCHAR(500) NOT NULL,
    visitor_ip  VARCHAR(45)  NOT NULL,
    user_agent  TEXT,
    referrer    VARCHAR(1000),
    visit_time  TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE site_visits IS '访问统计表';
COMMENT ON COLUMN site_visits.page_path IS '访问页面路径';
COMMENT ON COLUMN site_visits.visitor_ip IS '访问者IP';
COMMENT ON COLUMN site_visits.visit_time IS '访问时间';

CREATE INDEX idx_visits_time ON site_visits(visit_time);
CREATE INDEX idx_visits_path ON site_visits(page_path);

-- ============================================
-- 音乐表
-- ============================================
CREATE TABLE music (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    artist     VARCHAR(100),
    url        VARCHAR(500) NOT NULL,
    cover_url  VARCHAR(500),
    lyric      TEXT,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE music IS '音乐表';

-- ============================================
-- 系统设置表
-- ============================================
CREATE TABLE site_settings (
    id            SERIAL PRIMARY KEY,
    setting_key   VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description   VARCHAR(500),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE site_settings IS '系统设置表';
COMMENT ON COLUMN site_settings.setting_key IS '设置键';
COMMENT ON COLUMN site_settings.setting_value IS '设置值';
COMMENT ON COLUMN site_settings.description IS '设置描述';

-- ============================================
-- 操作日志表
-- ============================================
CREATE TABLE operation_logs (
    id            SERIAL PRIMARY KEY,
    user_id       INT          NOT NULL,
    username      VARCHAR(50)  NOT NULL,
    action        VARCHAR(50)  NOT NULL,
    resource_type VARCHAR(50),
    resource_id   INT,
    details      TEXT,
    ip_address    VARCHAR(50),
    user_agent    VARCHAR(500),
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE operation_logs IS '操作日志表';
COMMENT ON COLUMN operation_logs.action IS '操作类型（登录/创建/删除等）';
COMMENT ON COLUMN operation_logs.resource_type IS '资源类型（article/comment/user等）';

CREATE INDEX idx_logs_user ON operation_logs(user_id);
CREATE INDEX idx_logs_action ON operation_logs(action);
CREATE INDEX idx_logs_resource ON operation_logs(resource_type, resource_id);
CREATE INDEX idx_logs_created_at ON operation_logs(created_at);

-- ============================================
-- 初始数据
-- ============================================

-- 默认管理员（admin / admin123）
INSERT INTO users (username, password_hash, avatar_url, bio, email, github_url) VALUES
('admin', '$2a$10$CatHeObF//ZH.Ec/dg7gp.OoqoZO.i1VB.mV4WTPF2MaMjgNAN/Wi', NULL, '个人博客站长，全栈开发工程师', 'admin@example.com', 'https://github.com/admin');

-- 初始化分类
INSERT INTO categories (name, slug, description, sort_order) VALUES
('前端开发', 'frontend', 'Vue、React、TypeScript 等前端技术分享', 1);
INSERT INTO categories (name, slug, description, sort_order) VALUES
('后端开发', 'backend', 'Node.js、Python、数据库等后端技术', 2);
INSERT INTO categories (name, slug, description, sort_order) VALUES
('项目实践', 'project', '实际项目开发经验与总结', 3);
INSERT INTO categories (name, slug, description, sort_order) VALUES
('生活随笔', 'life', '生活感悟与日常记录', 4);

-- 初始化标签
INSERT INTO tags (name, slug) VALUES ('Vue 3', 'vue3');
INSERT INTO tags (name, slug) VALUES ('React', 'react');
INSERT INTO tags (name, slug) VALUES ('JavaScript', 'javascript');
INSERT INTO tags (name, slug) VALUES ('TypeScript', 'typescript');
INSERT INTO tags (name, slug) VALUES ('Node.js', 'nodejs');
INSERT INTO tags (name, slug) VALUES ('Express', 'express');
INSERT INTO tags (name, slug) VALUES ('全栈', 'fullstack');
INSERT INTO tags (name, slug) VALUES ('项目总结', 'project-summary');
INSERT INTO tags (name, slug) VALUES ('效率工具', 'productivity');

-- 示例文章
INSERT INTO articles (title, content, summary, status, category_id, user_id) VALUES
('Vue 3 Composition API 深度解析',
'# Vue 3 Composition API 深度解析

## 什么是 Composition API

Composition API 是 Vue 3 引入的全新代码组织方式。

## setup 函数

setup 是 Composition API 的核心入口。

## 响应式系统

- ref: 用于创建基本类型的响应式数据
- reactive: 用于创建对象类型的响应式数据
- computed: 用于创建计算属性

## 总结

Composition API 让 Vue 代码的组织更加清晰。
', '深入探讨 Vue 3 Composition API 使用方法和最佳实践', '已发布', 1, 1);

INSERT INTO articles (title, content, summary, status, category_id, user_id) VALUES
('Node.js + Express 搭建 RESTful API',
'# Node.js + Express 搭建 RESTful API

## 准备工作

首先初始化项目并安装必要的依赖。

## 项目结构

一个标准的 Express 项目应该包含以下结构。

## 核心概念

1. 路由：处理不同的 HTTP 请求
2. 中间件：在请求处理前执行的逻辑
3. 错误处理：统一的错误响应格式

## 部署建议

生产环境下推荐使用 PM2 进行进程管理。
', '从零开始使用 Node.js 和 Express 构建标准的 RESTful API 服务', '已发布', 2, 1);

-- 文章标签关联
INSERT INTO article_tags (article_id, tag_id) VALUES (1, 1);
INSERT INTO article_tags (article_id, tag_id) VALUES (1, 3);
INSERT INTO article_tags (article_id, tag_id) VALUES (1, 7);
INSERT INTO article_tags (article_id, tag_id) VALUES (2, 5);
INSERT INTO article_tags (article_id, tag_id) VALUES (2, 6);

-- 系统设置
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('site_name', '寿冬与秋', '站点名称');
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('site_description', '分享技术，记录成长', '站点描述');
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('posts_per_page', '10', '每页文章数');
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('allow_comments', 'true', '是否允许评论');
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('comments_moderation', 'true', '是否开启评论审核');

-- 友情链接
INSERT INTO friends (name, url, description, sort_order, status) VALUES
('Vue.js 官方', 'https://vuejs.org', '渐进式 JavaScript 框架', 1, '已通过');
INSERT INTO friends (name, url, description, sort_order, status) VALUES
('Node.js 官方', 'https://nodejs.org', 'JavaScript 运行时', 2, '已通过');

-- ============================================
-- 初始化完成
-- 默认账号：admin / admin123
-- ============================================