/**
 * 文章评论路由
 * 作用：提供博客文章评论的公开发布、浏览和后台管理接口
 * 架构：路由层（本文件）→ Controller 层（controllers/commentsController.js）→ Service 层（services/commentService.js）
 *
 * 接口列表：
 * 【公开接口】（无需登录）
 *   GET    /api/comments/:articleId        - 获取文章的已通过评论（返回树形结构）
 *   POST   /api/comments/:articleId        - 发表评论（status 默认"待审核"）
 *
 * 【管理接口】（需要登录）
 *   GET    /api/comments/stats             - 获取评论统计（待审核数量）
 *   GET    /api/comments                   - 获取所有评论列表（支持分页与筛选）
 *   PUT    /api/comments/:id/status        - 更新评论状态（待审核/已通过/已拒绝）
 *   DELETE /api/comments/:id               - 删除评论
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const commentsController = require('../controllers/commentsController');

const router = express.Router();

/**
 * 评论提交限流：3 次/分钟/IP（仅用于 POST 发表评论接口）
 */
const commentPostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { code: 429, message: '评论提交过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
});

// ==================== 管理接口（必须在公开参数路由之前注册） ====================

router.get('/stats', commentsController.getStats);
router.get('/', authMiddleware, commentsController.getComments);

// ==================== 公开接口 ====================

router.get('/:articleId', commentsController.getArticleComments);
router.post('/:articleId', commentPostLimiter, commentsController.createComment);

// ==================== 管理接口（参数路由） ====================

router.put('/:id/status', authMiddleware, commentsController.updateStatus);
router.delete('/:id', authMiddleware, commentsController.deleteComment);

module.exports = router;
