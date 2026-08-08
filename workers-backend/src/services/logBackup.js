/**
 * 操作日志备份服务
 * 功能：把操作日志打包为 JSON 存入 Cloudflare KV，备份成功后清空日志表
 * 触发：每月 15 日 07:00（北京时间）定时任务 / 后台手动"立即备份"
 */

import { getDatabase } from '../db.js'

const BACKUP_TTL = 31536000 // 备份保留 1 年

/**
 * 执行日志备份
 * @param {Object} env - Workers 环境（需绑定 RATE_LIMIT_KV）
 * @returns {Promise<{ok:boolean,count:number,date:string,message:string}>}
 */
export async function runLogBackup(env) {
  const kv = env.RATE_LIMIT_KV
  if (!kv) {
    return { ok: false, count: 0, date: '', message: '未配置 KV 绑定' }
  }
  const db = getDatabase(env)

  // 北京时间日期（YYYY-MM-DD）
  const bj = new Date(Date.now() + 8 * 3600 * 1000)
  const dateKey = bj.toISOString().slice(0, 10)
  const backupKey = `log-backup-${dateKey}`

  const existing = await kv.get(backupKey)
  if (existing) {
    return { ok: true, count: 0, date: dateKey, message: '当日备份已存在，跳过' }
  }

  const logs = await db.select('operation_logs', {}, {
    order: { column: 'id', ascending: true }
  })
  if (!logs || logs.length === 0) {
    return { ok: true, count: 0, date: dateKey, message: '无日志可备份' }
  }

  await kv.put(backupKey, JSON.stringify(logs), { expirationTtl: BACKUP_TTL })

  // 更新备份索引（保留最近 60 条）
  const indexRaw = await kv.get('log-backups-index')
  const index = indexRaw ? JSON.parse(indexRaw) : []
  index.push({
    date: dateKey,
    count: logs.length,
    created_at: new Date().toISOString()
  })
  await kv.put('log-backups-index', JSON.stringify(index.slice(-60)), { expirationTtl: BACKUP_TTL })

  // 备份成功后清空日志表
  await db.supabase.from('operation_logs').delete().gte('id', 0)

  return { ok: true, count: logs.length, date: dateKey, message: `已备份 ${logs.length} 条日志并清空` }
}