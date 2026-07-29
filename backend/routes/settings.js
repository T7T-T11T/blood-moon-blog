/**
 * 网站设置路由
 * 作用：提供网站设置项的查询与批量更新接口
 *
 * 接口列表：
 * GET /api/settings        - 获取所有设置项（公开，返回键值对对象）
 * GET /api/settings/:key   - 获取单个设置项（公开）
 * PUT /api/settings        - 批量更新设置（需登录）
 */

const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/settings - 获取所有设置项
 * 公开接口，无需登录
 * 返回键值对对象，格式如 { siteName: 'xxx', siteDesc: 'xxx', ... }
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT setting_key, setting_value, description, updated_at FROM site_settings'
    );

    // 将数组转换为键值对对象，便于前端直接使用
    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }

    res.json({ code: 200, data: settings });
  } catch (e) {
    console.error('获取设置项失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/settings/:key - 获取单个设置项
 * 公开接口，无需登录
 * 路径参数：
 *   - key: 设置项的键名
 */
router.get('/:key', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT setting_key, setting_value, description, updated_at FROM site_settings WHERE setting_key = ?',
      [req.params.key]
    );

    if (!rows.length) {
      return res.status(404).json({ code: 404, message: '设置项不存在' });
    }

    res.json({ code: 200, data: rows[0] });
  } catch (e) {
    console.error('获取单个设置项失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * PUT /api/settings - 批量更新设置项
 * 需要登录
 * 请求体：{ settings: { key1: 'value1', key2: 'value2' } }
 * 使用 INSERT ... ON DUPLICATE KEY UPDATE 语法实现存在则更新、不存在则插入
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { settings } = req.body;

    // 校验：settings 必须是对象且非空
    if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
      return res.status(400).json({ code: 400, message: 'settings 不能为空' });
    }

    // 遍历所有键值对，使用 INSERT ... ON DUPLICATE KEY UPDATE 逐条写入
    for (const [key, value] of Object.entries(settings)) {
      await pool.execute(
        `INSERT INTO site_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value !== null && value !== undefined ? String(value) : null]
      );
    }

    res.json({ code: 200, message: '更新成功' });
  } catch (e) {
    console.error('批量更新设置项失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
