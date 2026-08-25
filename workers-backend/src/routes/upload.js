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
 * - 优先使用 Cloudflare R2（适合图片、音频和视频）
 * - 其次使用 Supabase Storage（兼容已有部署）
 *
 * 注意：绝不把文件降级为 base64 data URL。这样会把媒体复制进文章字段，
 *       使列表接口、备份和数据库迅速膨胀；存储未配置时会直接给出可操作的提示。
 */

import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';

const uploadsRouter = new Hono();

/**
 * 生成唯一文件名（时间戳 + 随机数 + 扩展名）
 * @param {string} originalName - 原始文件名
 * @returns {string} 唯一文件名
 */
function generateFileName(originalName) {
  const ext = originalName.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}.${ext}`;
}

/** R2 公开域名末尾不带 / 时拼接媒体路径。 */
function getR2PublicUrl(env, filePath) {
  const baseUrl = String(env.MEDIA_PUBLIC_URL || '').replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}/${filePath}` : '';
}

/**
 * 上传到 Cloudflare R2。R2 binding 及 MEDIA_PUBLIC_URL 均可选，
 * 因此旧的 Supabase Storage 部署不会被破坏。
 */
async function tryUploadToR2(env, filePath, fileData, contentType, originalName) {
  if (!env.MEDIA_BUCKET || !env.MEDIA_PUBLIC_URL) return null;

  try {
    await env.MEDIA_BUCKET.put(filePath, fileData, {
      httpMetadata: { contentType },
      customMetadata: { originalName: originalName || '' }
    });
    return { url: getR2PublicUrl(env, filePath), path: filePath, storage: 'r2' };
  } catch (error) {
    console.warn('[Upload] R2 上传失败：', error.message);
    return null;
  }
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
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      return { ok: false, message: `无法获取 bucket 列表：${listError.message}` };
    }

    const existing = buckets?.find((b) => b.name === bucketName);
    if (existing) {
      if (!existing.public) {
        return {
          ok: false,
          message: `Bucket "${bucketName}" 存在但未设为公开，请在 Supabase 控制台设置为 Public`
        };
      }
      return { ok: true, message: `Bucket "${bucketName}" 已存在且为公开` };
    }

    // Bucket 不存在，尝试创建
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: null,
      allowedMimeTypes: null
    });

    if (createError) {
      return {
        ok: false,
        message: `Bucket "${bucketName}" 不存在且自动创建失败：${createError.message}。请前往 Supabase Dashboard → Storage 手动创建公开 bucket`
      };
    }

    return { ok: true, message: `Bucket "${bucketName}" 创建成功（公开）` };
  } catch (e) {
    return { ok: false, message: `ensureBucket 异常：${e.message}` };
  }
}

/**
 * 将文件保存到 Supabase Storage（R2 不可用时的兼容方案）
 * @param {Object} supabase - Supabase 客户端
 * @param {string} bucketName - bucket 名称
 * @param {string} filePath - 存储路径
 * @param {Buffer|Uint8Array} fileData - 文件数据
 * @param {string} contentType - MIME 类型
 * @returns {Promise<{url: string, path: string}|null>} 成功返回 URL，失败返回 null
 */
async function tryUploadToStorage(supabase, bucketName, filePath, fileData, contentType) {
  try {
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, fileData, {
      contentType,
      upsert: false
    });

    if (error) {
      console.warn('[Upload] Storage 上传失败：', error.message);
      return null;
    }

    // 获取公开访问 URL
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return {
      url: urlData?.publicUrl || '',
      path: filePath
    };
  } catch (e) {
    console.warn('[Upload] Storage 异常：', e.message);
    return null;
  }
}

/**
 * 通用文件上传处理函数
 * 优先尝试上传到 R2，其次尝试 Supabase Storage；未配置可用存储时直接失败。
 * @param {Object} c - Hono 上下文
 * @param {string} dir - 存储子目录（images/audio/video/files）
 * @param {Array<string>} allowedPrefixes - 允许的 MIME 前缀（如 ['image/', 'audio/']）
 * @param {number} maxSizeMB - 最大文件大小（MB）
 * @returns {Promise<Response>}
 */
async function handleUpload(c, dir, allowedPrefixes, maxSizeMB) {
  try {
    // 解析 multipart/form-data
    const formData = await c.req.raw.formData();
    const file = formData.get('file');

    if (!file || !file.type) {
      return c.json({ code: 400, message: '请上传文件' }, 400);
    }

    // 检查文件类型（使用前缀匹配，更灵活）
    const mimeType = file.type || 'application/octet-stream';
    if (allowedPrefixes.length > 0 && !allowedPrefixes.some((p) => mimeType.startsWith(p))) {
      return c.json({ code: 400, message: `不支持的文件类型：${mimeType}` }, 400);
    }

    // 检查文件大小
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ code: 400, message: `文件大小不能超过 ${maxSizeMB}MB` }, 400);
    }

    // 生成存储路径
    const fileName = generateFileName(file.name || 'unnamed');
    const filePath = `${dir}/${fileName}`;

    // 读取文件数据
    const fileBuffer = await file.arrayBuffer();

    // 优先上传到 R2。适合媒体大文件，且与 Cloudflare Pages/Workers 同一生态。
    const r2Result = await tryUploadToR2(c.env, filePath, fileBuffer, mimeType, file.name);
    if (r2Result) {
      return c.json({
        code: 200,
        data: {
          url: r2Result.url,
          path: r2Result.path,
          originalName: file.name,
          size: file.size,
          mimeType,
          storage: r2Result.storage
        },
        message: '上传成功'
      });
    }

    // 兼容已配置 Supabase Storage 的部署。
    const db = getDatabase(c.env);
    const bucketName = c.env.STORAGE_BUCKET || 'uploads';
    const storageResult = await tryUploadToStorage(
      db.supabase,
      bucketName,
      filePath,
      fileBuffer,
      mimeType
    );

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
      });
    }

    return c.json(
      {
        code: 503,
        message:
          '媒体存储尚未配置，文件没有保存。请配置 Cloudflare R2（推荐）或 Supabase Storage 后重试。',
        error: 'MEDIA_STORAGE_UNAVAILABLE'
      },
      503
    );
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ code: 500, message: '上传失败', error: error.message }, 500);
  }
}

/**
 * GET /api/upload/storage-status
 * 诊断 Supabase Storage 状态（是否可用、bucket 是否存在/公开）
 */
uploadsRouter.get('/storage-status', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env);
  const bucketName = c.env.STORAGE_BUCKET || 'uploads';

  // 1. 检查 bucket 列表权限
  const { data: buckets, error: listError } = await db.supabase.storage.listBuckets();

  if (listError) {
    return c.json({
      code: 200,
      data: {
        storageAvailable: false,
        bucketName,
        error: listError.message,
        suggestion:
          '请在 Supabase Dashboard → Storage → Policies 中为 anon 角色添加 bucket 读取权限'
      }
    });
  }

  const bucket = buckets?.find((b) => b.name === bucketName);

  // 2. 尝试上传一个测试文件
  const testPath = `diagnostics/test_${Date.now()}.txt`;
  const testData = new TextEncoder().encode('storage-test');
  const { error: uploadError } = await db.supabase.storage
    .from(bucketName)
    .upload(testPath, testData, { contentType: 'text/plain' });

  // 3. 尝试获取公开 URL
  const { data: urlData } = db.supabase.storage.from(bucketName).getPublicUrl(testPath);

  // 4. 清理测试文件
  if (!uploadError) {
    await db.supabase.storage.from(bucketName).remove([testPath]);
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
  });
});

/**
 * POST /api/upload/init-bucket
 * 自动创建 Storage bucket（如果不存在）并设置为公开
 * 需要相应的 Supabase 权限策略支持
 */
uploadsRouter.post('/init-bucket', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env);
  const bucketName = c.env.STORAGE_BUCKET || 'uploads';

  const result = await ensureBucketExists(db.supabase, bucketName);

  if (!result.ok) {
    return c.json({
      code: 200,
      data: { success: false, message: result.message }
    });
  }

  return c.json({
    code: 200,
    data: { success: true, message: result.message }
  });
});

/**
 * POST /api/upload/image
 * 上传图片（所有 image/* 类型，最大 10MB）
 */
uploadsRouter.post('/image', authMiddleware, adminMiddleware, async (c) => {
  return handleUpload(c, 'images', ['image/'], 10);
});

/**
 * POST /api/upload/audio
 * 上传音频（所有 audio/* 类型，最大 25MB）
 */
uploadsRouter.post('/audio', authMiddleware, adminMiddleware, async (c) => {
  return handleUpload(c, 'audio', ['audio/'], 25);
});

/**
 * POST /api/upload/video
 * 上传视频（所有 video/* 类型，最大 95MB，留出 Workers 请求限制余量）
 */
uploadsRouter.post('/video', authMiddleware, adminMiddleware, async (c) => {
  return handleUpload(c, 'video', ['video/'], 95);
});

/**
 * POST /api/upload/file
 * 上传普通文件（不限类型，最大 50MB）
 */
uploadsRouter.post('/file', authMiddleware, adminMiddleware, async (c) => {
  return handleUpload(c, 'files', [], 50);
});

/**
 * GET /api/upload/list
 * 获取上传文件列表（管理端，仅当 Storage 可用时返回数据）
 */
uploadsRouter.get('/list', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env);

  try {
    const bucketName = c.env.STORAGE_BUCKET || 'uploads';
    const { data, error } = await db.supabase.storage.from(bucketName).list();

    if (error) {
      // Storage 不可用时返回空列表，不报错
      return c.json({
        code: 200,
        data: [],
        note: 'Storage 不可用，当前使用 base64 存储模式'
      });
    }

    return c.json({
      code: 200,
      data: data || []
    });
  } catch (error) {
    console.error('List uploads error:', error);
    return c.json({
      code: 200,
      data: [],
      note: 'Storage 不可用，当前使用 base64 存储模式'
    });
  }
});

/**
 * DELETE /api/upload
 * 删除上传文件（仅 Storage 模式有效）
 */
uploadsRouter.delete('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env);

  try {
    const body = await c.req.json();
    const { url } = body;

    if (!url) {
      return c.json({ code: 400, message: '请提供文件 URL' }, 400);
    }

    // 从 URL 中提取存储路径
    const bucketName = c.env.STORAGE_BUCKET || 'uploads';
    const urlObj = new URL(url);
    const pathPart = urlObj.pathname.replace(`/storage/v1/object/public/${bucketName}/`, '');

    const { error } = await db.supabase.storage.from(bucketName).remove([pathPart]);

    if (error) {
      return c.json({ code: 500, message: '删除文件失败', error: error.message }, 500);
    }

    return c.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('Delete upload error:', error);
    return c.json({ code: 200, message: '删除成功（base64 模式无需删除）' });
  }
});

/**
 * DELETE /api/upload/:filename
 * 按文件名删除上传文件
 */
uploadsRouter.delete('/:filename', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env);

  try {
    const filename = c.req.param('filename');
    const bucketName = c.env.STORAGE_BUCKET || 'uploads';

    const { error } = await db.supabase.storage.from(bucketName).remove([filename]);

    if (error) {
      return c.json({ code: 500, message: '删除文件失败', error: error.message }, 500);
    }

    return c.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('Delete upload error:', error);
    return c.json({ code: 200, message: '删除成功（base64 模式无需删除）' });
  }
});

export default uploadsRouter;
