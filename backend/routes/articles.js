/**
 * 博客文章路由
 * 作用：提供博客文章的公开浏览和后台管理接口
 * 架构：路由层（本文件）→ Controller 层（controllers/articlesController.js）→ Service 层（services/articleService.js）
 *
 * 接口列表：
 * 【公开接口】（无需登录）
 *   GET    /api/articles/public          - 获取已发布文章列表
 *   GET    /api/articles/public/:id      - 获取文章详情（自动增加浏览量）
 *   GET    /api/articles/public/latest   - 获取最新文章
 *   GET    /api/articles/public/hot      - 获取热门文章
 *   GET    /api/articles/public/category/:slug - 按分类获取文章
 *   GET    /api/articles/public/tag/:slug    - 按标签获取文章
 *
 * 【管理接口】（需要登录）
 *   GET    /api/articles           - 获取文章列表（含草稿）
 *   POST   /api/articles           - 新增文章
 *   PUT    /api/articles/:id       - 编辑文章
 *   DELETE /api/articles/:id       - 删除文章
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const { logAction } = require('../middleware/logAction');
const articlesController = require('../controllers/articlesController');

const router = express.Router();

/**
 * 搜索接口限流：10 次/分钟/IP
 * 防止恶意搜索消耗数据库资源（LIKE 模糊查询开销较大）
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: 429, message: '搜索过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
});

// ==================== 公开接口 ====================

router.get('/public', articlesController.getPublicArticles);
router.get('/public/latest', articlesController.getLatestArticles);
router.get('/public/hot', articlesController.getHotArticles);
router.get('/public/category/:slug', articlesController.getArticlesByCategory);
router.get('/public/tag/:slug', articlesController.getArticlesByTag);
router.get('/public/archives', articlesController.getArchives);
router.get('/public/search', searchLimiter, articlesController.search);
router.get('/public/related/:id', articlesController.getRelatedArticles);
router.get('/public/:id', articlesController.getArticleDetail);

// ==================== 管理接口 ====================

router.get('/', authMiddleware, articlesController.getAdminArticles);
router.get('/:id', authMiddleware, articlesController.getAdminArticleDetail);
router.post('/', authMiddleware, logAction('创建文章', { resource_type: 'article' }), articlesController.createArticle);
router.put('/:id', authMiddleware, logAction('更新文章', { resource_type: 'article' }), articlesController.updateArticle);
router.delete('/:id', authMiddleware, logAction('删除文章', { resource_type: 'article' }), articlesController.deleteArticle);

module.exports = router;
