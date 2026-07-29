/**
 * 用户认证路由
 * 作用：处理用户注册、登录相关接口
 *
 * 接口列表：
 * POST /api/auth/register  - 用户注册
 * POST /api/auth/login     - 用户登录
 * GET  /api/auth/profile   - 获取当前登录用户信息
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register - 用户注册
 * 请求体：{ username, password, confirm }
 * 逻辑：校验输入 → 检查用户名是否重复 → 密码加密 → 存入数据库
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password, confirm } = req.body;

        // --- 表单校验 ---
        // 校验1：用户名不能为空
        if (!username || !username.trim()) {
            return res.status(400).json({ code: 400, message: '用户名不能为空' });
        }
        // 校验2：密码长度至少6位
        if (!password || password.length < 6) {
            return res.status(400).json({ code: 400, message: '密码至少需要6位' });
        }
        // 校验3：两次密码必须一致
        if (password !== confirm) {
            return res.status(400).json({ code: 400, message: '两次输入的密码不一致' });
        }
        // 校验4：检查用户名是否已存在
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE username = ?',
            [username.trim()]
        );
        if (existing.length > 0) {
            return res.status(400).json({ code: 400, message: '该用户名已被注册' });
        }

        // --- 密码加密 + 存入数据库 ---
        // bcrypt 加密：10 是加密轮数，数值越大越安全但越慢
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await pool.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            [username.trim(), passwordHash]
        );

        res.json({ code: 200, message: '注册成功，请登录' });
    } catch (err) {
        console.error('注册失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误，注册失败' });
    }
});

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
