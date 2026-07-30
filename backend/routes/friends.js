/**
 * 友链路由（friends 表）
 *
 * 接口列表：
 * GET    /api/friends        - 获取友链列表（公开，仅已通过）
 * GET    /api/friends/all    - 获取所有友链（需登录）
 * POST   /api/friends        - 创建友链（需登录）
 * PUT    /api/friends/:id    - 更新友链（需登录）
 * DELETE /api/friends/:id    - 删除友链（需登录）
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const friendsController = require('../controllers/friendsController');

const router = express.Router();

router.get('/', friendsController.getPublicFriends);
router.get('/all', authMiddleware, friendsController.getAllFriends);
router.post('/', authMiddleware, friendsController.createFriend);
router.put('/:id', authMiddleware, friendsController.updateFriend);
router.delete('/:id', authMiddleware, friendsController.deleteFriend);

module.exports = router;
