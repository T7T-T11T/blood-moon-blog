/**
 * 文件上传路由
 * 作用：处理图片、音频、视频、普通文件的上传，返回可访问的 URL
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

const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// ========== 配置 ==========

/** 上传根目录（相对于 backend/） */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')

/** 各类型文件的子目录 */
const DIRS = {
  image: path.join(UPLOAD_DIR, 'images'),   // 图片
  audio: path.join(UPLOAD_DIR, 'audios'),   // 音频
  video: path.join(UPLOAD_DIR, 'videos'),   // 视频
  file: path.join(UPLOAD_DIR, 'files')      // 普通文件
}

/**
 * 文件类型白名单
 * key: 文件类别，value: 允许的 MIME 类型数组
 */
const MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-m4a'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska', 'video/quicktime', 'video/x-msvideo'],
  file: [
    'application/pdf', 'application/zip', 'application/json',
    'text/plain', 'text/csv', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]
}

/**
 * 各类型文件大小限制（字节）
 * 图片 5MB / 音频 50MB / 视频 200MB / 普通文件 20MB
 * 防止恶意上传大文件导致磁盘耗尽
 */
const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,     // 5MB
  audio: 50 * 1024 * 1024,    // 50MB
  video: 200 * 1024 * 1024,   // 200MB
  file: 20 * 1024 * 1024      // 20MB
}

/**
 * 确保目录存在，不存在则创建
 * @param {string} dir - 目录路径
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 根据文件 MIME 类型和扩展名判断文件类别
 * @param {string} mimetype - 文件 MIME 类型
 * @param {string} originalName - 原始文件名
 * @returns {string|null} - 文件类别：image/audio/video/file/null(不允许)
 */
function detectFileType(mimetype, originalName) {
  const ext = path.extname(originalName).toLowerCase()
  const extMap = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    audio: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'],
    video: ['.mp4', '.webm', '.ogv', '.mkv', '.mov', '.avi'],
    file: ['.pdf', '.zip', '.rar', '.7z', '.json', '.txt', '.csv',
           '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.md',
           '.js', '.ts', '.vue', '.html', '.css']
  }

  // 优先通过扩展名判断
  for (const [type, exts] of Object.entries(extMap)) {
    if (exts.includes(ext)) return type
  }

  // 通过 MIME 类型判断
  for (const [type, mimes] of Object.entries(MIME_TYPES)) {
    if (mimes.includes(mimetype)) return type
  }

  return null
}

/**
 * 生成唯一文件名
 * @param {string} originalName - 原始文件名
 * @returns {string} - 唯一文件名
 */
function generateFileName(originalName) {
  const ext = path.extname(originalName).toLowerCase()
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `${timestamp}_${random}${ext}`
}

// ========== multer 配置 ==========

/**
 * 动态 multer 存储配置
 * 根据上传路径中的 type 参数自动分类存储
 */
function createStorage(fileType) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      // 根据 MIME 和扩展名判断类型
      const detectedType = detectFileType(file.mimetype, file.originalname)
      const typeDir = detectedType || fileType || 'file'
      ensureDir(DIRS[typeDir])
      cb(null, DIRS[typeDir])
    },
    filename: (req, file, cb) => {
      cb(null, generateFileName(file.originalname))
    }
  })
}

/**
 * 通用文件过滤器
 * 检查 MIME 类型是否在允许列表中
 */
function createFileFilter(fileType) {
  return (req, file, cb) => {
    const allowedMimes = MIME_TYPES[fileType] || MIME_TYPES.file
    if (allowedMimes.includes(file.mimetype) || detectFileType(file.mimetype, file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的文件类型：${file.mimetype}`))
    }
  }
}

// ========== 路由定义 ==========

// 所有上传接口需要登录
router.use(authMiddleware)

/**
 * POST /api/upload/image - 上传图片
 * form-data 字段：file
 */
router.post('/image', (req, res) => {
  ensureDir(DIRS.image)
  const upload = multer({
    storage: createStorage('image'),
    fileFilter: createFileFilter('image'),
    limits: { fileSize: FILE_SIZE_LIMITS.image }
  }).single('file')

  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ code: 400, message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择要上传的图片' })
    }

    // 构建文件的可访问 URL
    const relativePath = path.relative(UPLOAD_DIR, req.file.path).replace(/\\/g, '/')
    const url = `/uploads/${relativePath}`

    res.json({
      code: 200,
      message: '上传成功',
      data: {
        url,
        originalName: req.file.originalname,
        size: req.file.size
      }
    })
  })
})

/**
 * POST /api/upload/audio - 上传音频
 * form-data 字段：file
 */
router.post('/audio', (req, res) => {
  ensureDir(DIRS.audio)
  const upload = multer({
    storage: createStorage('audio'),
    fileFilter: createFileFilter('audio'),
    limits: { fileSize: FILE_SIZE_LIMITS.audio }
  }).single('file')

  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ code: 400, message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择要上传的音频' })
    }

    const relativePath = path.relative(UPLOAD_DIR, req.file.path).replace(/\\/g, '/')
    const url = `/uploads/${relativePath}`

    res.json({
      code: 200,
      message: '上传成功',
      data: { url, originalName: req.file.originalname, size: req.file.size }
    })
  })
})

/**
 * POST /api/upload/video - 上传视频
 * form-data 字段：file
 */
router.post('/video', (req, res) => {
  ensureDir(DIRS.video)
  const upload = multer({
    storage: createStorage('video'),
    fileFilter: createFileFilter('video'),
    limits: { fileSize: FILE_SIZE_LIMITS.video }
  }).single('file')

  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ code: 400, message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择要上传的视频' })
    }

    const relativePath = path.relative(UPLOAD_DIR, req.file.path).replace(/\\/g, '/')
    const url = `/uploads/${relativePath}`

    res.json({
      code: 200,
      message: '上传成功',
      data: { url, originalName: req.file.originalname, size: req.file.size }
    })
  })
})

/**
 * POST /api/upload/file - 上传普通文件
 * form-data 字段：file
 */
router.post('/file', (req, res) => {
  ensureDir(DIRS.file)
  const upload = multer({
    storage: createStorage('file'),
    limits: { fileSize: FILE_SIZE_LIMITS.file }
  }).single('file')

  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ code: 400, message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择要上传的文件' })
    }

    const relativePath = path.relative(UPLOAD_DIR, req.file.path).replace(/\\/g, '/')
    const url = `/uploads/${relativePath}`

    res.json({
      code: 200,
      message: '上传成功',
      data: { url, originalName: req.file.originalname, size: req.file.size }
    })
  })
})

/**
 * DELETE /api/upload - 删除已上传的文件
 * 请求体：{ url }  文件的相对路径（如 /uploads/images/xxx.jpg）
 */
router.delete('/', authMiddleware, (req, res) => {
  try {
    const { url } = req.body
    if (!url) {
      return res.status(400).json({ code: 400, message: '缺少文件路径' })
    }

    // 安全检查：确保路径在 uploads 目录内
    const filePath = path.join(UPLOAD_DIR, url.replace(/^\/uploads\//, ''))
    const normalizedPath = path.normalize(filePath)
    if (!normalizedPath.startsWith(UPLOAD_DIR)) {
      return res.status(400).json({ code: 400, message: '非法路径' })
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      res.json({ code: 200, message: '删除成功' })
    } else {
      res.status(404).json({ code: 404, message: '文件不存在' })
    }
  } catch (e) {
    console.error('删除文件失败：', e)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

module.exports = router
