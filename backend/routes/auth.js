/**
 * 用户认证路由
 * 作用：处理用户登录接口
 *
 * 接口列表：
 * POST /api/auth/login     - 用户登录
 * GET  /api/auth/profile   - 获取当前登录用户信息
 *
 * 注意：个人博客仅设一个管理员，不开放注册。
 *       管理员账号通过 scripts/init-admin.js 种子脚本初始化。
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login - 用户登录
 * 请求体：{ username, password }
 * 逻辑：查询用户 → 验证密码 → 生成 JWT token 返回
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 校验：用户名和密码不能为空
        if (!username || !password) {
            return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
        }

        // 根据用户名查询用户
        const [rows] = await pool.execute(
            'SELECT id, username, password_hash FROM users WHERE username = ?',
            [username.trim()]
        );

        // 用户不存在
        if (rows.length === 0) {
            return res.status(400).json({ code: 400, message: '用户名或密码错误' });
        }

        const user = rows[0];

        // 验证密码（bcrypt 对比明文和哈希）
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ code: 400, message: '用户名或密码错误' });
        }

        // 登录成功，生成 JWT token
        const token = generateToken({ id: user.id, username: user.username });

        res.json({
            code: 200,
            message: '登录成功',
            data: {
                token,
                user: { id: user.id, username: user.username }
            }
        });
    } catch (err) {
        console.error('登录失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误，登录失败' });
    }
});

/**
 * GET /api/auth/profile - 获取当前登录用户信息
 * 需要：Authorization: Bearer <token>
 */
router.get('/profile', authMiddleware, async (req, res) => {
    res.json({
        code: 200,
        data: { id: req.user.id, username: req.user.username }
    });
});

module.exports = router;
