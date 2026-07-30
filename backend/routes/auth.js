/**
 * 用户认证路由
 * 作用：处理用户登录、个人资料查询和更新接口
 *
 * 接口列表：
 * POST /api/auth/login          - 用户登录
 * GET  /api/auth/profile        - 获取当前登录用户完整信息
 * PUT  /api/auth/profile        - 更新当前登录用户资料（头像、简介、社交链接等）
 * PUT  /api/auth/password       - 修改当前登录用户密码
 *
 * 注意：个人博客仅设一个管理员，不开放注册。
 *       管理员账号通过 scripts/init-admin.js 种子脚本初始化。
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { logLogin } = require('../middleware/logAction');

const router = express.Router();

/**
 * 登录接口限流：5 次/15 分钟/IP
 * 防止暴力破解管理员密码
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { code: 429, message: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/auth/login - 用户登录
 * 请求体：{ username, password }
 * 逻辑：查询用户 → 验证密码 → 生成 JWT token 返回
 * 限流：5次/15分钟，防止暴力破解
 */
router.post('/login', loginLimiter, async (req, res) => {
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

        // 异步记录登录日志（不阻塞响应）
        logLogin(req, { id: user.id, username: user.username }).catch(err => {
            console.error('记录登录日志失败：', err);
        });

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
 * GET /api/auth/profile - 获取当前登录用户完整信息
 * 需要：Authorization: Bearer <token>
 * 返回：{ id, username, avatar_url, bio, email, github_url, qq_url, wechat }
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, username, avatar_url, bio, email, github_url, qq_url, wechat FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        res.json({ code: 200, data: rows[0] });
    } catch (err) {
        console.error('获取用户资料失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误' });
    }
});

/**
 * PUT /api/auth/profile - 更新当前登录用户资料
 * 需要：Authorization: Bearer <token>
 * 请求体：{ avatar_url, bio, email, github_url, qq_url, wechat }
 */
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { avatar_url, bio, email, github_url, qq_url, wechat } = req.body;

        // 仅更新提供的字段
        const fields = [];
        const values = [];

        if (avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(avatar_url || null); }
        if (bio !== undefined) { fields.push('bio = ?'); values.push(bio || null); }
        if (email !== undefined) { fields.push('email = ?'); values.push(email || null); }
        if (github_url !== undefined) { fields.push('github_url = ?'); values.push(github_url || null); }
        if (qq_url !== undefined) { fields.push('qq_url = ?'); values.push(qq_url || null); }
        if (wechat !== undefined) { fields.push('wechat = ?'); values.push(wechat || null); }

        if (fields.length === 0) {
            return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
        }

        values.push(req.user.id);
        await pool.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        res.json({ code: 200, message: '更新成功' });
    } catch (err) {
        console.error('更新用户资料失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误' });
    }
});

/**
 * PUT /api/auth/password - 修改当前登录用户密码
 * 需要：Authorization: Bearer <token>
 * 请求体：{ old_password, new_password }
 */
router.put('/password', authMiddleware, async (req, res) => {
    try {
        const { old_password, new_password } = req.body;

        // 校验参数
        if (!old_password || !new_password) {
            return res.status(400).json({ code: 400, message: '请填写原密码和新密码' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ code: 400, message: '新密码至少需要6位' });
        }

        // 查询当前用户
        const [rows] = await pool.execute(
            'SELECT id, password_hash FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        // 验证原密码
        const isMatch = await bcrypt.compare(old_password, rows[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ code: 400, message: '原密码不正确' });
        }

        // 加密新密码并更新
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(new_password, salt);
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newHash, req.user.id]
        );

        res.json({ code: 200, message: '密码修改成功' });
    } catch (err) {
        console.error('修改密码失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误' });
    }
});

module.exports = router;
