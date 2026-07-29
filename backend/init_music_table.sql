-- 音乐表（博客背景音乐）
CREATE TABLE IF NOT EXISTS music (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '音乐ID',
  title VARCHAR(200) NOT NULL COMMENT '歌曲标题',
  artist VARCHAR(100) DEFAULT NULL COMMENT '艺术家',
  file_path VARCHAR(500) NOT NULL COMMENT '音频文件路径',
  cover_image VARCHAR(500) DEFAULT NULL COMMENT '封面图片路径',
  duration INT DEFAULT NULL COMMENT '时长（秒）',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用（1=启用，0=停用）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_is_active (is_active),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='音乐播放列表';
