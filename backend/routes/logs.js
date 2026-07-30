/**
 * 操作日志路由
 * 作用：提供操作日志查询接口
 * 架构：路由层（本文件）→ Controller 层（controllers/logsController.js）→ Service 层（services/logService.js）
 *
 * 接口列表：
 * 【管理接口】（需要登录）
 *   GET /api/logs        - 获取操作日志列表（支持筛选）
 *   GET /api/logs/my     - 获取当前用户的操作日志
 *   GET /api/logs/stats  - 获取操作统计
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const logsController = require('../controllers/logsController');

const router = express.Router();

// ==================== 日志查询接口 ====================

/**
 * 获取操作日志列表
 * @route GET /api/logs
 * @access Private（需要登录）
 * @query {number} [user_id] - 用户ID
 * @query {string} [action] - 操作类型
 * @query {string} [resource_type] - 资源类型
 * @query {number} [resource_id] - 资源ID
 * @query {string} [start_date] - 开始日期（YYYY-MM-DD）
 * @query {string} [end_date] - 结束日期（YYYY-MM-DD）
 * @query {number} [page=1] - 页码
 * @query {number} [page_size=20] - 每页数量
 */
router.get('/', authMiddleware, logsController.getLogs);

/**
 * 获取当前用户的操作日志
 * @route GET /api/logs/my
 * @access Private（需要登录）
 */
router.get('/my', authMiddleware, logsController.getMyLogs);

/**
 * 获取操作统计
 * @route GET /api/logs/stats
 * @access Private（需要登录）
 */
router.get('/stats', authMiddleware, logsController.getActionStats);

module.exports = router;