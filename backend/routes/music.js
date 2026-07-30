/**
 * 音乐管理路由
 * 作用：提供博客背景音乐的增删改查接口
 *
 * 接口列表：
 * 【公开接口】（无需登录）
 *   GET    /api/music           - 获取启用的音乐列表（前台播放用）
 *
 * 【管理接口】（需要登录）
 *   GET    /api/music/all       - 获取所有音乐列表（含停用）
 *   POST   /api/music           - 上传音乐文件并创建记录
 *   PUT    /api/music/:id       - 更新音乐信息（标题/艺术家/排序等）
 *   DELETE /api/music/:id       - 删除音乐
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * 配置音乐文件上传存储
 * 上传目录：backend/uploads/music/
 * 文件命名：时间戳 + 原始扩展名
 */
const musicUploadDir = path.join(__dirname, '../uploads/music');
if (!fs.existsSync(musicUploadDir)) {
  fs.mkdirSync(musicUploadDir, { recursive: true });
}

/** multer 磁盘存储配置 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, musicUploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, `music_${timestamp}${ext}`);
  }
});

/** 允许的音频 MIME 类型 */
const ALLOWED_MIME = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/webm'
];

/** 文件大小限制：50MB */
const MAX_SIZE = 50 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的音频格式: ${file.mimetype}`));
    }
  }
});

/**
 * GET /api/music - 获取启用的音乐列表（公开）
 * 按 sort_order 升序返回所有 is_active=1 的音乐
 *
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，data 为音乐数组
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, artist, file_path, cover_image, duration, sort_order FROM music WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    );
    res.json({ code: 200, data: rows, message: '获取音乐列表成功' });
  } catch (e) {
    console.error('获取音乐列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/music/all - 获取所有音乐列表（管理端，含停用）
 * 需要登录
 * 查询参数：
 *   - page: 页码，默认1
 *   - page_size: 每页数量，默认20
 *
 * @param {Object} req - Express 请求对象，req.query 携带分页参数
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，data 包含 list 和 pagination
 */
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;

    // 查询总数
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM music');
    const total = countResult[0].total;

    // 查询分页数据
    const offset = (page - 1) * pageSize;
    const safePageSize = Math.max(1, parseInt(pageSize, 10) || 10);
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
    const [rows] = await pool.execute(
      `SELECT id, title, artist, file_path, cover_image, duration, sort_order, is_active, created_at, updated_at
       FROM music ORDER BY sort_order ASC, id ASC LIMIT ${safePageSize} OFFSET ${safeOffset}`
    );

    res.json({
      code: 200,
      data: {
        list: rows,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize)
        }
      },
      message: '获取音乐列表成功'
    });
  } catch (e) {
    console.error('获取音乐列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/music - 上传音乐文件并创建记录（管理端）
 * 需要登录
 * 请求体（multipart/form-data）：
 *   - file: 音频文件（必填）
 *   - title: 标题（可选，默认取文件名）
 *   - artist: 艺术家（可选）
 *   - sort_order: 排序（可选，默认0）
 *
 * @param {Object} req - Express 请求对象，req.file 为上传的音频文件
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，data 包含新音乐的 id
 */
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传音频文件' });
    }

    const { title, artist, sort_order } = req.body;
    const originalName = req.file.originalname.replace(/\.[^.]+$/, '');
    const finalTitle = title?.trim() || originalName;
    const finalArtist = artist?.trim() || '未知艺术家';
    const fileUrl = `/uploads/music/${req.file.filename}`;
    const finalSortOrder = parseInt(sort_order) || 0;

    // 插入数据库
    const [result] = await pool.execute(
      `INSERT INTO music (title, artist, file_path, duration, sort_order, is_active)
       VALUES (?, ?, ?, NULL, ?, 1)`,
      [finalTitle, finalArtist, fileUrl, finalSortOrder]
    );

    res.json({
      code: 200,
      data: { id: result.insertId },
      message: '音乐上传成功'
    });
  } catch (e) {
    console.error('上传音乐失败：', e);
    res.status(500).json({ code: 500, message: '上传失败: ' + (e.message || '服务器错误') });
  }
});

/**
 * PUT /api/music/:id - 更新音乐信息（管理端）
 * 需要登录
 * 请求体：{ title?, artist?, sort_order?, is_active? }
 *
 * @param {Object} req - Express 请求对象，req.params.id 为音乐ID
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，提示更新结果
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, sort_order, is_active } = req.body;

    // 查询是否存在
    const [check] = await pool.execute('SELECT id FROM music WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ code: 404, message: '音乐不存在' });
    }

    // 动态构建更新字段
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (artist !== undefined) {
      updates.push('artist = ?');
      params.push(artist.trim());
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(parseInt(sort_order) || 0);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
    }

    params.push(id);
    await pool.execute(`UPDATE music SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ code: 200, message: '更新成功' });
  } catch (e) {
    console.error('更新音乐失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * DELETE /api/music/:id - 删除音乐（管理端）
 * 需要登录，同时删除物理文件
 *
 * @param {Object} req - Express 请求对象，req.params.id 为音乐ID
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，提示删除结果
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 查询音乐信息（获取文件路径以删除物理文件）
    const [rows] = await pool.execute('SELECT file_path FROM music WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '音乐不存在' });
    }

    const filePath = rows[0].file_path;

    // 删除数据库记录
    const [result] = await pool.execute('DELETE FROM music WHERE id = ?', [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ code: 404, message: '音乐不存在' });
    }

    // 尝试删除物理文件（不阻塞删除操作）
    if (filePath) {
      const absolutePath = path.join(__dirname, '..', filePath);
      fs.unlink(absolutePath, (err) => {
        if (err) console.warn('删除音乐文件失败:', absolutePath);
      });
    }

    res.json({ code: 200, message: '删除成功' });
  } catch (e) {
    console.error('删除音乐失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/** 处理 multer 上传错误 */
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: 400, message: '文件大小超出限制（最大50MB）' });
    }
    return res.status(400).json({ code: 400, message: '上传错误: ' + err.message });
  }
  if (err.message && err.message.startsWith('不支持')) {
    return res.status(400).json({ code: 400, message: err.message });
  }
  console.error('音乐路由错误：', err);
  res.status(500).json({ code: 500, message: '服务器错误' });
});

module.exports = router;