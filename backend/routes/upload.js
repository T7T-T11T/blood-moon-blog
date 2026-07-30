/**
 * 文件上传路由
 * 作用：处理图片、音频、视频、普通文件的上传，返回可访问的 URL
 * 架构：路由层（本文件）→ Controller 层（controllers/uploadController.js）→ Service 层（services/uploadService.js）
 *
 * 依赖：multer（Express 中间件，处理 multipart/form-data）
 *
 * 文件存储：
 * - 存储路径：backend/uploads/
 * - 分类子目录：images/、audios/、videos/、files/
 * - 访问 URL：http://localhost:3000/uploads/xxx
 *
 * 安全限制：
 * - 需要登录（authMiddleware）
 * - 文件类型白名单
 * - 文件大小限制
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// 所有上传接口需要登录
router.use(authMiddleware);

/**
 * 上传接口限流：10 次/分钟/IP
 * 仅对 POST 上传路由生效，GET 列表和 DELETE 删除不受限
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: 429, message: '上传请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
});

// ========== 路由定义 ==========

router.post('/image', uploadLimiter, uploadController.uploadImage);
router.post('/audio', uploadLimiter, uploadController.uploadAudio);
router.post('/video', uploadLimiter, uploadController.uploadVideo);
router.post('/file', uploadLimiter, uploadController.uploadFile);
router.delete('/', authMiddleware, uploadController.deleteFile);
router.get('/list', authMiddleware, uploadController.listFiles);
router.delete('/:filename', authMiddleware, uploadController.deleteByFilename);

module.exports = router;
