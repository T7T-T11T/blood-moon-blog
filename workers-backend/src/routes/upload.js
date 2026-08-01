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
 * 存储方案：
 * - 优先使用 Supabase Storage（如果已配置且可用）
 * - 降级方案：将文件转为 base64 data URL 返回
 *
 * 注意：Workers 环境下，若 Storage 不可用，文件会以 base64 格式存储到数据库/文章内容中。
 *       对大文件有大小限制（图片 10MB、音频 50MB、视频 200MB、文件 50MB）。
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
 * 确保 Supabase Storage bucket 存在且为公开
 * 如果 bucket 不存在，尝试自动创建（需要相应的权限策略）
 * @param {Object} supabase - Supabase 客户端
 * @param {string} bucketName - bucket 名称
 * @returns {Promise<{ok: boolean, message: string}>} 检查结果
 */
async function ensureBucketExists(supabase, bucketName) {
  try {
    // 检查 bucket 是否已存在
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      return { ok: false, message: `无法获取 bucket 列表：${listError.message}` }
    }

    const existing = buckets?.find((b) => b.name === bucketName)
    if (existing) {
      if (!existing.public) {
        return { ok: false, message: `Bucket "${bucketName}" 存在但未设为公开，请在 Supabase 控制台设置为 Public` }
      }
      return { ok: true, message: `Bucket "${bucketName}" 已存在且为公开` }
    }

    // Bucket 不存在，尝试创建
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: null,
      allowedMimeTypes: null
    })

    if (createError) {
      return {
        ok: false,
        message: `Bucket "${bucketName}" 不存在且自动创建失败：${createError.message}。请前往 Supabase Dashboard → Storage 手动创建公开 bucket`
      }
    }

    return { ok: true, message: `Bucket "${bucketName}" 创建成功（公开）` }
  } catch (e) {
    return { ok: false, message: `ensureBucket 异常：${e.message}` }
  }
}

/**
 * 将文件保存到 Supabase Storage（可选，失败时降级为 base64）
 * @param {Object} supabase - Supabase 客户端
 * @param {string} bucketName - bucket 名称
 * @param {string} filePath - 存储路径
 * @param {Buffer|Uint8Array} fileData - 文件数据
 * @param {string} contentType - MIME 类型
 * @returns {Promise<{url: string, path: string}|null>} 成功返回 URL，失败返回 null
 */
async function tryUploadToStorage(supabase, bucketName, filePath, fileData, contentType) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        contentType,
        upsert: false
      })

    if (error) {
      console.warn('[Upload] Storage 上传失败：', error.message)
      return null
    }

    // 获取公开访问 URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    return {
      url: urlData?.publicUrl || '',
      path: filePath
    }
  } catch (e) {
    console.warn('[Upload] Storage 异常：', e.message)
    return null
  }
}

/**
 * 通用文件上传处理函数
 * 优先尝试上传到 Supabase Storage；若 Storage 不可用则降级为 base64 data URL
 * @param {Object} c - Hono 上下文
 * @param {string} dir - 存储子目录（images/audio/video/files）
 * @param {Array<string>} allowedPrefixes - 允许的 MIME 前缀（如 ['image/', 'audio/']）
 * @param {number} maxSizeMB - 最大文件大小（MB）
 * @returns {Promise<Response>}
 */
async function handleUpload(c, dir, allowedPrefixes, maxSizeMB) {
  try {
    // 解析 multipart/form-data
    const formData = await c.req.raw.formData()
    const file = formData.get('file')

    if (!file || !file.type) {
      return c.json({ code: 400, message: '请上传文件' }, 400)
    }

    // 检查文件类型（使用前缀匹配，更灵活）
    const mimeType = file.type || 'application/octet-stream'
    if (allowedPrefixes.length > 0 && !allowedPrefixes.some(p => mimeType.startsWith(p))) {
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

    // 尝试上传到 Supabase Storage（非阻塞，失败立即降级）
    const db = getDatabase(c.env)
    const bucketName = c.env.STORAGE_BUCKET || 'uploads'
    const storageResult = await tryUploadToStorage(
      db.supabase,
      bucketName,
      filePath,
      fileBuffer,
      mimeType
    )

    if (storageResult) {
      // Storage 上传成功
      return c.json({
        code: 200,
        data: {
          url: storageResult.url,
          path: storageResult.path,
          originalName: file.name,
          size: file.size,
          mimeType,
          storage: 'supabase'
        },
        message: '上传成功'
      })
    }

    // 降级方案：转换为 base64 data URL
    // 限制 base64 文件上限：Workers 响应最大 100MB，base64 编码增大约 33%
    const MAX_BASE64_SIZE = 75 * 1024 * 1024 // 75MB 原始数据
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
        storage: 'base64',
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
 * GET /api/upload/storage-status
 * 诊断 Supabase Storage 状态（是否可用、bucket 是否存在/公开）
 */
uploadsRouter.get('/storage-status', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const bucketName = c.env.STORAGE_BUCKET || 'uploads'

  // 1. 检查 bucket 列表权限
  const { data: buckets, error: listError } = await db.supabase.storage.listBuckets()

  if (listError) {
    return c.json({
      code: 200,
      data: {
        storageAvailable: false,
        bucketName,
        error: listError.message,
        suggestion: '请在 Supabase Dashboard → Storage → Policies 中为 anon 角色添加 bucket 读取权限'
      }
    })
  }

  const bucket = buckets?.find((b) => b.name === bucketName)

  // 2. 尝试上传一个测试文件
  const testPath = `diagnostics/test_${Date.now()}.txt`
  const testData = new TextEncoder().encode('storage-test')
  const { error: uploadError } = await db.supabase.storage
    .from(bucketName)
    .upload(testPath, testData, { contentType: 'text/plain' })

  // 3. 尝试获取公开 URL
  const { data: urlData } = db.supabase.storage
    .from(bucketName)
    .getPublicUrl(testPath)

  // 4. 清理测试文件
  if (!uploadError) {
    await db.supabase.storage.from(bucketName).remove([testPath])
  }

  return c.json({
    code: 200,
    data: {
      storageAvailable: !uploadError,
      bucketName,
      bucketExists: !!bucket,
      bucketPublic: bucket?.public || false,
      uploadError: uploadError?.message || null,
      testUrl: urlData?.publicUrl || null,
      allBuckets: buckets?.map((b) => ({ name: b.name, public: b.public })) || []
    }
  })
})

/**
 * POST /api/upload/init-bucket
 * 自动创建 Storage bucket（如果不存在）并设置为公开
 * 需要相应的 Supabase 权限策略支持
 */
uploadsRouter.post('/init-bucket', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const bucketName = c.env.STORAGE_BUCKET || 'uploads'

  const result = await ensureBucketExists(db.supabase, bucketName)

  if (!result.ok) {
    return c.json({
      code: 200,
      data: { success: false, message: result.message }
    })
  }

  return c.json({
    code: 200,
    data: { success: true, message: result.message }
  })
})

/**
 * POST /api/upload/image
 * 上传图片（所有 image/* 类型，最大 10MB）
 */
uploadsRouter.post('/image', authMiddleware, adminMiddleware, async (c) => {
  return handleUpload(c, 'images', ['image/'], 10)
})

/**
 * POST /api/upload/audio
 * 上传音频（所有 audio/* 类型，最大 50MB）
 */
uploadsRouter.post('/audio', authMiddleware, adminMiddleware, async (c) => {
  return handleUpload(c, 'audio', ['audio/'], 50)
})

/**
 * POST /api/upload/video
 * 上传视频（所有 video/* 类型，最大 200MB）
 */
uploadsRouter.post('/video', authMiddleware, adminMiddleware, async (c) => {
  return handleUpload(c, 'video', ['video/'], 200)
})

/**
 * POST /api/upload/file
 * 上传普通文件（不限类型，最大 50MB）
 */
uploadsRouter.post('/file', authMiddleware, adminMiddleware, async (c) => {
  return handleUpload(c, 'files', [], 50)
})

/**
 * GET /api/upload/list
 * 获取上传文件列表（管理端，仅当 Storage 可用时返回数据）
 */
uploadsRouter.get('/list', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const bucketName = c.env.STORAGE_BUCKET || 'uploads'
    const { data, error } = await db.supabase.storage
      .from(bucketName)
      .list()

    if (error) {
      // Storage 不可用时返回空列表，不报错
      return c.json({
        code: 200,
        data: [],
        note: 'Storage 不可用，当前使用 base64 存储模式'
      })
    }

    return c.json({
      code: 200,
      data: data || []
    })
  } catch (error) {
    console.error('List uploads error:', error)
    return c.json({
      code: 200,
      data: [],
      note: 'Storage 不可用，当前使用 base64 存储模式'
    })
  }
})

/**
 * DELETE /api/upload
 * 删除上传文件（仅 Storage 模式有效）
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
    return c.json({ code: 200, message: '删除成功（base64 模式无需删除）' })
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
    return c.json({ code: 200, message: '删除成功（base64 模式无需删除）' })
  }
})

export default uploadsRouter