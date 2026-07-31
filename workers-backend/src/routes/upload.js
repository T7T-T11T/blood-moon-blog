/**
 * 上传路由模块
 *
 * 功能：
 * - POST /api/upload/image - 上传图片
 * - POST /api/upload/audio - 上传音频
 * - POST /api/upload/video - 上传视频
 * - POST /api/upload/file - 上传普通文件
 * - GET /api/upload/list - 获取上传文件列表
 * - DELETE /api/upload - 删除上传文件
 * - DELETE /api/upload/:filename - 按文件名删除
 *
 * 存储方案：Supabase Storage bucket（默认 bucket: uploads）
 * 如未配置 Storage，返回 base64 data URL 作为降级方案
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'

const uploadsRouter = new Hono()

/**
 * 生成唯一文件名（时间戳 + 随机数 + 扩展名）
 * @param {string} originalName - 原始文件名
 * @returns {string} 唯一文件名
 */
function generateFileName(originalName) {
  const ext = originalName.split('.').pop() || 'bin'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${random}.${ext}`
}

/**
 * 将 Uint8Array 高效转为 base64 字符串
 * 使用分块处理避免大文件 O(n²) 性能问题
 * @param {Uint8Array} bytes - 字节数组
 * @returns {string} base64 编码字符串
 */
function uint8ToBase64(bytes) {
  const CHUNK_SIZE = 0x8000 // 32KB 分块，防止栈溢出
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE)
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

/**
 * 将文件保存到 Supabase Storage
 * @param {Object} supabase - Supabase 客户端
 * @param {string} bucketName - bucket 名称
 * @param {string} filePath - 存储路径
 * @param {Buffer|Uint8Array} fileData - 文件数据
 * @param {string} contentType - MIME 类型
 * @returns {Promise<{url: string, path: string}>} 访问 URL 和存储路径
 */
async function uploadToStorage(supabase, bucketName, filePath, fileData, contentType) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileData, {
      contentType,
      upsert: false
    })

  if (error) throw error

  // 获取公开访问 URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath)

  return {
    url: urlData?.publicUrl || '',
    path: filePath
  }
}

/**
 * 通用文件上传处理函数
 * 优先上传到 Supabase Storage；若 Storage 不可用则降级为 base64 data URL
 * @param {Object} c - Hono 上下文
 * @param {string} dir - 存储子目录（images/audio/video/files）
 * @param {Array<string>} allowedMimes - 允许的 MIME 类型
 * @param {number} maxSizeMB - 最大文件大小（MB）
 * @returns {Promise<Response>}
 */
async function handleUpload(c, dir, allowedMimes, maxSizeMB) {
  const db = getDatabase(c.env)

  try {
    // 解析 multipart/form-data
    const formData = await c.req.raw.formData()
    const file = formData.get('file')

    // Workers 环境下 file 可能是 File 或 Blob 类型，放宽 instanceof 检查
    if (!file || !(file instanceof File || file.type)) {
      return c.json({ code: 400, message: '请上传文件' }, 400)
    }

    // 检查文件类型
    const mimeType = file.type || 'application/octet-stream'
    if (allowedMimes.length > 0 && !allowedMimes.some(m => mimeType.startsWith(m))) {
      return c.json({ code: 400, message: `不支持的文件类型：${mimeType}` }, 400)
    }

    // 检查文件大小
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      return c.json({ code: 400, message: `文件大小不能超过 ${maxSizeMB}MB` }, 400)
    }

    // 生成存储路径
    const fileName = generateFileName(file.name || 'unnamed')
    const filePath = `${dir}/${fileName}`

    // 读取文件数据
    const fileBuffer = await file.arrayBuffer()

    // 尝试上传到 Supabase Storage
    let storageOk = false
    try {
      const bucketName = c.env.STORAGE_BUCKET || 'uploads'
      const { url, path } = await uploadToStorage(
        db.supabase,
        bucketName,
        filePath,
        fileBuffer,
        mimeType
      )
      storageOk = true

      return c.json({
        code: 200,
        data: {
          url,
          path,
          originalName: file.name,
          size: file.size,
          mimeType
        },
        message: '上传成功'
      })
    } catch (storageErr) {
      // Storage 不可用，走降级逻辑
      console.warn('[Upload] Supabase Storage 不可用，降级为 base64:', storageErr?.message)
    }

    // 降级方案：转换为 base64 data URL（适用于所有文件大小）
    // 限制 base64 文件上限：Workers 响应最大 100MB，base64 编码增大约 33%
    const MAX_BASE64_SIZE = 75 * 1024 * 1024 // 75MB 原始数据 ≈ 100MB base64
    if (file.size > MAX_BASE64_SIZE) {
      return c.json({
        code: 413,
        message: `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），Storage 不可用时无法上传超过 75MB 的文件`,
        error: '请配置 Supabase Storage 或使用更小的文件'
      }, 413)
    }

    const bytes = new Uint8Array(fileBuffer)
    const base64 = uint8ToBase64(bytes)
    const dataUrl = `data:${mimeType};base64,${base64}`

    return c.json({
      code: 200,
      data: {
        url: dataUrl,
        path: filePath,
        originalName: file.name,
        size: file.size,
        mimeType,
        degraded: true
      },
      message: '上传成功（降级模式：文件以 base64 格式存储）'
    })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ code: 500, message: '上传失败', error: error.message }, 500)
  }
}

/**
 * POST /api/upload/image
 * 上传图片（jpg, png, gif, webp, svg）
 */
uploadsRouter.post('/image', authMiddleware, adminMiddleware, async (c) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  return handleUpload(c, 'images', allowedMimes, 10)
})

/**
 * POST /api/upload/audio
 * 上传音频（mp3, wav, ogg, m4a）
 */
uploadsRouter.post('/audio', authMiddleware, adminMiddleware, async (c) => {
  const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
  return handleUpload(c, 'audio', allowedMimes, 50)
})

/**
 * POST /api/upload/video
 * 上传视频（mp4, webm, mov）
 */
uploadsRouter.post('/video', authMiddleware, adminMiddleware, async (c) => {
  const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime']
  return handleUpload(c, 'video', allowedMimes, 200)
})

/**
 * POST /api/upload/file
 * 上传普通文件
 */
uploadsRouter.post('/file', authMiddleware, adminMiddleware, async (c) => {
  return handleUpload(c, 'files', [], 50)
})

/**
 * GET /api/upload/list
 * 获取上传文件列表（管理端）
 */
uploadsRouter.get('/list', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const bucketName = c.env.STORAGE_BUCKET || 'uploads'
    const { data, error } = await db.supabase.storage
      .from(bucketName)
      .list()

    if (error) {
      return c.json({ code: 500, message: '获取文件列表失败', error: error.message }, 500)
    }

    return c.json({
      code: 200,
      data: data || []
    })
  } catch (error) {
    console.error('List uploads error:', error)
    return c.json({ code: 500, message: '获取文件列表失败' }, 500)
  }
})

/**
 * DELETE /api/upload
 * 删除上传文件
 */
uploadsRouter.delete('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const body = await c.req.json()
    const { url } = body

    if (!url) {
      return c.json({ code: 400, message: '请提供文件 URL' }, 400)
    }

    // 从 URL 中提取存储路径
    const bucketName = c.env.STORAGE_BUCKET || 'uploads'
    const urlObj = new URL(url)
    const pathPart = urlObj.pathname.replace(`/storage/v1/object/public/${bucketName}/`, '')

    const { error } = await db.supabase.storage
      .from(bucketName)
      .remove([pathPart])

    if (error) {
      return c.json({ code: 500, message: '删除文件失败', error: error.message }, 500)
    }

    return c.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete upload error:', error)
    return c.json({ code: 500, message: '删除文件失败' }, 500)
  }
})

/**
 * DELETE /api/upload/:filename
 * 按文件名删除上传文件
 */
uploadsRouter.delete('/:filename', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const filename = c.req.param('filename')
    const bucketName = c.env.STORAGE_BUCKET || 'uploads'

    const { error } = await db.supabase.storage
      .from(bucketName)
      .remove([filename])

    if (error) {
      return c.json({ code: 500, message: '删除文件失败', error: error.message }, 500)
    }

    return c.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete upload error:', error)
    return c.json({ code: 500, message: '删除文件失败' }, 500)
  }
})

export default uploadsRouter
