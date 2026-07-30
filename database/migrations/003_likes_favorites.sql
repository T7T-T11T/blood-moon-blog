-- 003_likes_favorites.sql
-- 文章点赞、收藏、访问统计相关表
-- 执行前请确保已选择正确的数据库：USE task_manager;

-- ==================== 点赞表 ====================
CREATE TABLE IF NOT EXISTS article_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  user_id INT DEFAULT NULL COMMENT '登录用户ID，未登录为NULL',
  ip VARCHAR(45) DEFAULT NULL COMMENT '未登录用户IP（IPv4/IPv6兼容）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_article_id (article_id),
  INDEX idx_user_id (user_id),
  INDEX idx_ip (ip),
  UNIQUE KEY uk_article_user (article_id, user_id),
  UNIQUE KEY uk_article_ip (article_id, ip),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 收藏表 ====================
CREATE TABLE IF NOT EXISTS article_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  user_id INT NOT NULL COMMENT '收藏用户ID（需登录）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_article_id (article_id),
  INDEX idx_user_id (user_id),
  UNIQUE KEY uk_article_user (article_id, user_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 文章点赞数字段（articles 表扩展） ====================
-- 如果 articles 表已存在 like_count 字段则跳过
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'articles' AND COLUMN_NAME = 'like_count');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE articles ADD COLUMN like_count INT NOT NULL DEFAULT 0 COMMENT ''点赞数'' AFTER view_count',
  'SELECT ''like_count 字段已存在'' AS msg');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==================== 访问统计表 ====================
CREATE TABLE IF NOT EXISTS site_visits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  page_path VARCHAR(500) NOT NULL COMMENT '访问页面路径',
  visitor_ip VARCHAR(45) NOT NULL COMMENT '访问者IP',
  user_agent TEXT COMMENT '浏览器 User-Agent',
  referrer VARCHAR(1000) DEFAULT NULL COMMENT '来源页面',
  visit_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visit_time (visit_time),
  INDEX idx_page_path (page_path(255)),
  INDEX idx_visitor_ip (visitor_ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
