/**
 * 回收站路由
 * 作用：提供回收站文章的查看、恢复和永久删除接口
 * 架构：路由层（本文件）→ Controller 层（controllers/articlesController.js）→ Service 层（services/articleService.js）
 *
 * 接口列表：
 * 【管理接口】（需要登录）
 *   GET    /api/trash             - 获取回收站文章列表
 *   POST   /api/trash/:id/restore - 恢复文章
 *   DELETE /api/trash/:id         - 永久删除文章
 *   DELETE /api/trash/clear      - 清空回收站
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const articlesController = require('../controllers/articlesController');

const router = express.Router();

// ==================== 回收站接口 ====================

/**
 * 获取回收站文章列表
 * @route GET /api/trash
 * @access Private（需要登录）
 */
router.get('/', authMiddleware, articlesController.getTrashArticles);

/**
 * 恢复文章
 * @route POST /api/trash/:id/restore
 * @access Private（需要登录）
 */
router.post('/:id/restore', authMiddleware, articlesController.restoreArticle);

/**
 * 清空回收站（必须在 /:id 路由之前，避免被 :id 匹配）
 * @route DELETE /api/trash/clear
 * @access Private（需要登录）
 */
router.delete('/clear', authMiddleware, articlesController.clearAllTrash);

/**
 * 永久删除文章
 * @route DELETE /api/trash/:id
 * @access Private（需要登录）
 */
router.delete('/:id', authMiddleware, articlesController.permanentDeleteArticle);

module.exports = router;