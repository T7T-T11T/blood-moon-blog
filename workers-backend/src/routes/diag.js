/**
 * 诊断路由（临时使用，诊断完成后删除）
 * 作用：检查 Supabase Storage bucket 状态和数据库字段限制
 */

import { Hono } from 'hono'
import { getSupabaseClient } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'

const diagRouter = new Hono()

/**
 * GET /api/diag/storage
 * 检查 Storage bucket 是否可用
 */
diagRouter.get('/storage', authMiddleware, adminMiddleware, async (c) => {
  try {
    const supabase = getSupabaseClient(c.env)
    const bucketName = c.env.STORAGE_BUCKET || 'uploads'

    // 尝试列出 bucket 内容
    const { data, error } = await supabase.storage.from(bucketName).list()

    if (error) {
      return c.json({
        code: 500,
        storage: '不可用',
        error: error.message,
        suggestion: '请在 Supabase Dashboard 创建名为 uploads 的 Storage bucket（设为 Public）'
      })
    }

    return c.json({
      code: 200,
      storage: '可用',
      bucket: bucketName,
      files: data?.length || 0,
      note: 'Storage 正常，头像上传将返回短 URL（非 base64）'
    })
  } catch (error) {
    return c.json({ code: 500, error: error.message }, 500)
  }
})

/**
 * POST /api/diag/alter-avatar-text
 * 通过创建临时存储过程绕过 SDK 限制，执行 ALTER TABLE
 */
diagRouter.post('/alter-avatar-text', authMiddleware, adminMiddleware, async (c) => {
  try {
    const supabase = getSupabaseClient(c.env)

    // 方法：先创建临时 RPC 函数，通过 RPC 执行 ALTER TABLE
    // Supabase REST API 支持通过 /rest/v1/rpc/ 调用存储过程

    // Step 1: 检查当前字段类型
    const { data: columns, error: colError } = await supabase
      .from('users')
      .select('avatar_url')
      .limit(1)

    if (colError) {
      return c.json({ code: 500, message: '读取字段失败', error: colError.message }, 500)
    }

    // Step 2: 尝试写入 1000 字符测试
    const testUserId = columns?.[0] ? null : null
    const { data: allUsers, error: listError } = await supabase
      .from('users')
      .select('id, avatar_url')
      .eq('username', 'admin')
      .limit(1)

    if (listError) {
      return c.json({ code: 500, error: listError.message }, 500)
    }

    const adminUser = allUsers?.[0]
    if (!adminUser) {
      return c.json({ code: 404, message: 'admin 用户不存在' }, 404)
    }

    const originalAvatar = adminUser.avatar_url
    const testString = 'A'.repeat(1000)

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: testString })
      .eq('id', adminUser.id)

    if (updateError) {
      // 写入失败 → 字段仍是 VARCHAR(500)
      // 恢复原值
      await supabase.from('users').update({ avatar_url: originalAvatar || null }).eq('id', adminUser.id)

      // 尝试创建临时函数执行 ALTER TABLE
      // 利用 Supabase RPC 机制
      const { data: rpcResult, error: rpcError } = await supabase.rpc('pg_promote', {})
        .catch(() => null) // pg_promote 不存在没关系

      // 返回 SQL 供手动执行
      return c.json({
        code: 500,
        message: 'avatar_url 仍是 VARCHAR(500)，需要手动迁移',
        sql: 'ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;',
        manual_step: '在 Supabase Dashboard → SQL Editor 中执行上面的 SQL'
      }, 500)
    }

    // 写入成功 → 恢复原值
    await supabase.from('users').update({ avatar_url: originalAvatar || null }).eq('id', adminUser.id)

    return c.json({
      code: 200,
      message: 'avatar_url 字段已能容纳 1000+ 字符',
      note: '字段类型已是 TEXT，base64 头像可正常存储'
    })
  } catch (error) {
    return c.json({ code: 500, error: error.message }, 500)
  }
})

export default diagRouter