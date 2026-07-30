/**
 * 数据导出路由
 * 作用：提供数据导出接口，支持导出文章和评论数据为 JSON 格式
 * 架构：路由层（本文件）→ Controller 层（controllers/exportController.js）
 *
 * 接口列表：
 * 【管理接口】（需要登录）
 *   GET /api/export/articles  - 导出文章为 JSON
 *   GET /api/export/comments  - 导出评论为 JSON
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const exportController = require('../controllers/exportController');

const router = express.Router();

// ==================== 数据导出接口 ====================

/**
 * 导出文章数据
 * @route GET /api/export/articles
 * @access Private（需要登录）
 * @query {string} [status] - 状态筛选（已发布/草稿/全部）
 * @query {number} [category_id] - 分类筛选
 * @query {string} [keyword] - 关键词筛选
 * @returns {Object} JSON 格式的文章数据
 */
router.get('/articles', authMiddleware, exportController.exportArticles);

/**
 * 导出评论数据
 * @route GET /api/export/comments
 * @access Private（需要登录）
 * @query {string} [status] - 状态筛选（待审核/已通过/已拒绝/全部）
 * @query {number} [article_id] - 文章ID筛选
 * @returns {Object} JSON 格式的评论数据
 */
router.get('/comments', authMiddleware, exportController.exportComments);

module.exports = router;