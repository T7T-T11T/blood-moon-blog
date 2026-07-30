-- ============================================
-- 个人博客系统 - 数据库初始化脚本
-- 数据库：MySQL 8.0+
-- 字符集：utf8mb4
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE task_manager;

-- ============================================
-- 安全保护：仅当设置 @ALLOW_DROP=1 时才执行 DROP
-- 生产环境请勿启用此变量，避免意外清空数据
-- SET @ALLOW_DROP = 0; -- 默认：跳过 DROP，仅使 IF NOT EXISTS 安全建表
-- SET @ALLOW_DROP = 1; -- 仅首次初始化时临时启用
-- ============================================
SET @allow_drop = COALESCE(@ALLOW_DROP, 0);

-- 清理旧表（仅当显式声明 @ALLOW_DROP=1 时执行）
DROP TABLE IF EXISTS article_tags;
DROP TABLE IF EXISTS pomodoro_sessions;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
    username      VARCHAR(50)  NOT NULL UNIQUE   COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL          COMMENT '密码哈希（bcrypt加密）',
    avatar_url    VARCHAR(500)                   COMMENT '头像URL',
    bio           VARCHAR(500)                   COMMENT '个人简介',
    email         VARCHAR(100)                   COMMENT '邮箱',
    github_url    VARCHAR(500)                   COMMENT 'GitHub链接',
    qq_url        VARCHAR(500)                   COMMENT 'QQ链接',
    wechat        VARCHAR(100)                   COMMENT '微信号',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================
-- 任务表（个人辅助功能）
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '任务ID',
    title       VARCHAR(200) NOT NULL          COMMENT '任务标题',
    description TEXT                            COMMENT '任务描述',
    status      VARCHAR(20)  NOT NULL DEFAULT '待办' COMMENT '状态：待办/进行中/已完成',
    priority    VARCHAR(10)  NOT NULL DEFAULT '中' COMMENT '优先级：低/中/高',
    due_date    DATE                            COMMENT '截止日期',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    user_id     INT          NOT NULL          COMMENT '用户ID',
    CONSTRAINT fk_task_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务表';

-- ============================================
-- 分类表
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
-- 标签表
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '标签ID',
    name        VARCHAR(100) NOT NULL UNIQUE    COMMENT '标签名称',
    slug        VARCHAR(100) NOT NULL UNIQUE    COMMENT '标签标识（URL用）',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章标签表';

-- ============================================
-- 博客文章表
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
    id           INT AUTO_INCREMENT PRIMARY KEY COMMENT '文章ID',
    title        VARCHAR(200) NOT NULL          COMMENT '标题',
    content      LONGTEXT     NOT NULL          COMMENT '内容（Markdown格式）',
    summary      VARCHAR(500)                   COMMENT '摘要',
    cover_image  VARCHAR(500)                   COMMENT '封面图URL',
    status       VARCHAR(20)  NOT NULL DEFAULT '已发布' COMMENT '状态：已发布/草稿',
    view_count   INT          NOT NULL DEFAULT 0 COMMENT '浏览量',
    category_id  INT                            COMMENT '分类ID（外键）',
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    user_id      INT          NOT NULL          COMMENT '作者用户ID',
    CONSTRAINT fk_article_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_article_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客文章表';

-- ============================================
-- 文章-标签关联表（多对多）
-- ============================================
CREATE TABLE IF NOT EXISTS article_tags (
    article_id INT NOT NULL COMMENT '文章ID',
    tag_id     INT NOT NULL COMMENT '标签ID',
    PRIMARY KEY (article_id, tag_id),
    CONSTRAINT fk_at_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_at_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章-标签关联表';

-- ============================================
-- 番茄钟记录表（个人辅助功能）
-- ============================================
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
    duration   INT          NOT NULL DEFAULT 25 COMMENT '专注时长（分钟）',
    task_name  VARCHAR(200)                    COMMENT '任务名称',
    started_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
    completed  TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否完成（1=完成 0=中断）',
    user_id    INT          NOT NULL          COMMENT '用户ID',
    CONSTRAINT fk_pomodoro_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='番茄钟记录表';

-- ============================================
-- 评论表
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '评论ID',
    article_id INT          NOT NULL          COMMENT '文章ID',
    nickname   VARCHAR(50)  NOT NULL          COMMENT '昵称',
    email      VARCHAR(100)                   COMMENT '邮箱',
    content    TEXT         NOT NULL          COMMENT '评论内容',
    status     VARCHAR(20)  NOT NULL DEFAULT '待审核' COMMENT '状态：待审核/已通过/已拒绝',
    ip_address VARCHAR(50)                    COMMENT 'IP地址',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    CONSTRAINT fk_comment_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

-- ============================================
-- 友情链接表
-- ============================================
CREATE TABLE IF NOT EXISTS friend_links (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '链接ID',
    name        VARCHAR(100) NOT NULL          COMMENT '网站名称',
    url         VARCHAR(500) NOT NULL          COMMENT '网站URL',
    description VARCHAR(200)                   COMMENT '网站描述',
    logo_url    VARCHAR(500)                   COMMENT 'Logo URL',
    sort_order  INT          NOT NULL DEFAULT 0 COMMENT '排序',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='友情链接表';

-- ============================================
-- 点赞记录表（IP去重）
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '点赞ID',
    article_id INT          NOT NULL          COMMENT '文章ID',
    ip_address VARCHAR(50)  NOT NULL          COMMENT 'IP地址',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_article_ip (article_id, ip_address),
    CONSTRAINT fk_like_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞记录表';

-- ============================================
-- 收藏记录表
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '收藏ID',
    article_id INT          NOT NULL          COMMENT '文章ID',
    user_id    INT          NOT NULL          COMMENT '用户ID',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_user_article (user_id, article_id),
    CONSTRAINT fk_favorite_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收藏记录表';

-- ============================================
-- 访问统计表
-- ============================================
CREATE TABLE IF NOT EXISTS visits (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '访问ID',
    article_id INT                             COMMENT '文章ID（为空表示首页访问）',
    ip_address VARCHAR(50)  NOT NULL          COMMENT 'IP地址',
    path       VARCHAR(200)                   COMMENT '访问路径',
    referer    VARCHAR(500)                   COMMENT '来源页面',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_article_id (article_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='访问统计表';

-- ============================================
-- 音乐表
-- ============================================
CREATE TABLE IF NOT EXISTS music (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '音乐ID',
    title      VARCHAR(200) NOT NULL          COMMENT '歌曲名',
    artist     VARCHAR(100)                   COMMENT '艺术家',
    url        VARCHAR(500) NOT NULL          COMMENT '音频URL',
    cover_url  VARCHAR(500)                   COMMENT '封面URL',
    lyric      TEXT                           COMMENT '歌词',
    sort_order INT          NOT NULL DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='音乐表';

-- ============================================
-- 系统设置表
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '设置ID',
    setting_key VARCHAR(100) NOT NULL UNIQUE   COMMENT '设置键',
    setting_value TEXT                        COMMENT '设置值',
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统设置表';

-- ============================================
-- 初始数据
-- ============================================

-- 默认管理员账号（用户名：admin，密码：admin123）
INSERT INTO users (username, password_hash, avatar_url, bio, email, github_url) VALUES
('admin', '$2a$10$CatHeObF//ZH.Ec/dg7gp.OoqoZO.i1VB.mV4WTPF2MaMjgNAN/Wi', NULL, '个人博客站长，全栈开发工程师', 'admin@example.com', 'https://github.com/admin');

-- 初始化分类
INSERT INTO categories (name, slug, description, sort_order) VALUES
('前端开发', 'frontend', 'Vue、React、TypeScript 等前端技术分享', 1),
('后端开发', 'backend', 'Node.js、Python、数据库等后端技术', 2),
('项目实践', 'project', '实际项目开发经验与总结', 3),
('生活随笔', 'life', '生活感悟与日常记录', 4);

-- 初始化标签
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
('效率工具', 'productivity');

-- 示例任务数据
INSERT INTO tasks (title, description, status, priority, due_date, user_id) VALUES
('学习 Vue 3', '掌握 Composition API 和响应式系统', '进行中', '高', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 1),
('完成项目文档', '编写 README 和 API 文档', '待办', '中', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 1);

-- 示例博客文章
INSERT INTO articles (title, content, summary, status, category_id, user_id) VALUES
('Vue 3 Composition API 深度解析', '
# Vue 3 Composition API 深度解析

## 什么是 Composition API

Composition API 是 Vue 3 引入的全新代码组织方式，它让逻辑复用变得更加简单和灵活。

## setup 函数

setup 是 Composition API 的核心入口。

## 响应式系统

- ref: 用于创建基本类型的响应式数据
- reactive: 用于创建对象类型的响应式数据
- computed: 用于创建计算属性

## 实战示例

```javascript
import { ref, computed } from "vue"

export default {
  setup() {
    const count = ref(0)
    const doubleCount = computed(() => count.value * 2)

    return { count, doubleCount }
  }
}
```

## 总结

Composition API 让 Vue 代码的组织更加清晰，逻辑复用更加方便。
', '深入探讨 Vue 3 Composition API 使用方法和最佳实践', '已发布', 1, 1),
('Node.js + Express 搭建 RESTful API', '
# Node.js + Express 搭建 RESTful API

## 准备工作

首先初始化项目并安装必要的依赖。

## 项目结构

一个标准的 Express 项目应该包含以下结构：

```
project/
├── routes/
├── middleware/
├── controllers/
├── models/
└── app.js
```

## 核心概念

1. **路由**：处理不同的 HTTP 请求
2. **中间件**：在请求处理前执行的逻辑
3. **错误处理**：统一的错误响应格式

## 实战演练

创建一个完整的 CRUD API...

## 部署建议

生产环境下推荐使用 PM2 进行进程管理。
', '从零开始使用 Node.js 和 Express 构建标准的 RESTful API 服务', '已发布', 2, 1),
('全栈项目开发总结：从 0 到 1 构建个人博客', '
# 全栈项目开发总结

## 项目概述

本项目是一个完整的个人博客系统，包括：

- **前端**：Vue 3 + Element Plus + Vite
- **后端**：Node.js + Express + MySQL
- **功能**：文章管理、分类标签、用户认证、数据统计

## 技术亮点

### 1. JWT 身份认证

使用 JWT 进行无状态认证，支持 token 刷新和权限校验。

### 2. 响应式设计

完美适配桌面端和移动端，提供一致的用户体验。

### 3. Markdown 编辑器

集成了功能强大的 Markdown 编辑器，支持实时预览和语法高亮。

## 收获与反思

通过这个项目，我深入理解了前后端分离架构的设计理念，也积累了全栈开发的实战经验。
', '记录一次完整的全栈项目开发过程，包括技术选型、架构设计和踩坑经验', '已发布', 3, 1);

-- 文章-标签关联数据
-- 文章1: Vue 3 Composition API -> Vue3, JavaScript, 前端开发
INSERT INTO article_tags (article_id, tag_id) VALUES
(1, 1), (1, 3), (1, 8);

-- 文章2: Node.js + Express -> Node.js, Express, MySQL
INSERT INTO article_tags (article_id, tag_id) VALUES
(2, 5), (2, 6), (2, 7);

-- 文章3: 全栈项目总结 -> 全栈, 项目总结, Node.js, Vue 3
INSERT INTO article_tags (article_id, tag_id) VALUES
(3, 8), (3, 9), (3, 5), (3, 1);

-- 示例番茄钟记录
INSERT INTO pomodoro_sessions (duration, task_name, started_at, completed, user_id) VALUES
(25, '学习 Vue 3', DATE_SUB(NOW(), INTERVAL 2 DAY), 1, 1),
(25, '写文章', DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 1),
(15, '复习 MySQL', DATE_SUB(NOW(), INTERVAL 1 DAY), 0, 1),
(25, '项目重构', NOW(), 1, 1);

-- 初始化系统设置
INSERT INTO settings (setting_key, setting_value) VALUES
('site_name', '个人博客'),
('site_description', '分享技术，记录成长'),
('posts_per_page', '10'),
('allow_comments', 'true'),
('comments_moderation', 'true');

-- 示例友情链接
INSERT INTO friend_links (name, url, description, sort_order) VALUES
('Vue.js 官方', 'https://vuejs.org', '渐进式 JavaScript 框架', 1),
('Node.js 官方', 'https://nodejs.org', 'JavaScript 运行时', 2),
('MySQL 官方', 'https://mysql.com', '关系型数据库', 3);

-- ============================================
-- 初始化完成
-- 默认账号：admin / admin123
-- ============================================