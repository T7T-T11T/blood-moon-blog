/**
 * 任务管理路由
 * 作用：处理任务的增删改查接口
 *
 * 接口列表：
 * GET    /api/tasks          - 获取任务列表（支持按状态筛选）
 * POST   /api/tasks          - 新增任务
 * PUT    /api/tasks/:id      - 编辑任务
 * DELETE /api/tasks/:id      - 删除任务
 * PATCH  /api/tasks/:id/status - 快捷修改任务状态
 *
 * 所有接口都需要登录（通过 authMiddleware 验证 token）
 * 所有查询都带 user_id 过滤，确保用户只能操作自己的任务
 */
const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有任务路由都需要登录
router.use(authMiddleware);

/**
 * GET /api/tasks - 获取任务列表
 * 查询参数：status（可选，筛选状态：待办/进行中/已完成）
 * 返回：当前用户的所有任务，按创建时间倒序
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        let sql = 'SELECT * FROM tasks WHERE user_id = ?';
        let params = [userId];

        // 如果传了 status 参数，追加筛选条件
        if (status && status !== '全部') {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC';

        const [rows] = await pool.execute(sql, params);
        res.json({ code: 200, data: rows });
    } catch (err) {
        console.error('获取任务列表失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误' });
    }
});

/**
 * POST /api/tasks - 新增任务
 * 请求体：{ title, description, status, priority, due_date }
 */
router.post('/', async (req, res) => {
    try {
        const { title, description, status, priority, due_date } = req.body;
        const userId = req.user.id;

        // 校验：标题不能为空
        if (!title || !title.trim()) {
            return res.status(400).json({ code: 400, message: '任务标题不能为空' });
        }

        // 插入数据库（用参数化查询防止 SQL 注入）
        const [result] = await pool.execute(
            `INSERT INTO tasks (title, description, status, priority, due_date, user_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                description || null,
                status || '待办',
                priority || '中',
                due_date || null,
                userId
            ]
        );

        res.json({ code: 200, message: '任务创建成功', data: { id: result.insertId } });
    } catch (err) {
        console.error('创建任务失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误' });
    }
});

/**
 * PUT /api/tasks/:id - 编辑任务
 * 请求体：{ title, description, status, priority, due_date }
 */
router.put('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const { title, description, status, priority, due_date } = req.body;

        // 校验：标题不能为空
        if (!title || !title.trim()) {
            return res.status(400).json({ code: 400, message: '任务标题不能为空' });
        }

        // 更新任务（WHERE 带 user_id 确保只能改自己的任务）
        const [result] = await pool.execute(
            `UPDATE tasks
             SET title = ?, description = ?, status = ?, priority = ?, due_date = ?
             WHERE id = ? AND user_id = ?`,
            [
                title.trim(),
                description || null,
                status || '待办',
                priority || '中',
                due_date || null,
                taskId,
                userId
            ]
        );

        // affectedRows === 0 说明任务不存在或不属于当前用户
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, message: '任务不存在或无权操作' });
        }

        res.json({ code: 200, message: '任务更新成功' });
    } catch (err) {
        console.error('更新任务失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误' });
    }
});

/**
 * DELETE /api/tasks/:id - 删除任务
 */
router.delete('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;

        const [result] = await pool.execute(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?',
            [taskId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, message: '任务不存在或无权操作' });
        }

        res.json({ code: 200, message: '任务已删除' });
    } catch (err) {
        console.error('删除任务失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误' });
    }
});

/**
 * PATCH /api/tasks/:id/status - 快捷修改任务状态
 * 请求体：{ status }
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const { status } = req.body;

        // 校验状态值是否合法
        const validStatuses = ['待办', '进行中', '已完成'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ code: 400, message: '无效的任务状态' });
        }

        const [result] = await pool.execute(
            'UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?',
            [status, taskId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, message: '任务不存在或无权操作' });
        }

        res.json({ code: 200, message: `任务状态已更新为「${status}」` });
    } catch (err) {
        console.error('更新任务状态失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误' });
    }
});

module.exports = router;
