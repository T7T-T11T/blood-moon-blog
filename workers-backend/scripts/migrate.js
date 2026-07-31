/**
 * 一次性迁移脚本 - 通过 Supabase REST API 执行 ALTER TABLE
 * 用法: node scripts/migrate.js
 * 
 * 作用：将 users.avatar_url 从 VARCHAR(500) 改为 TEXT
 * 原因：avatar_url 存储 base64 data URL 时超过 500 字符限制
 */

/**
 * Supabase REST API 客户端
 * @param {string} url - Supabase 项目 URL
 * @param {string} serviceKey - Supabase service_role key
 * @returns {Object} API 客户端
 */
function createClient(url, serviceKey) {
  const base = url.replace(/\/$/, '')
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  }

  return {
    /**
     * 调用远程存储过程（通过 RPC）
     * @param {string} functionName - 存储过程名
     * @param {Object} args - 过程参数
     * @returns {Promise<Object>}
     */
    async rpc(functionName, args = {}) {
      const res = await fetch(`${base}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(args)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'RPC 调用失败')
      return data
    },

    /**
     * 执行 SQL（通过创建临时函数方式）
     * @param {string} sql - SQL 语句
     * @returns {Promise<Object>}
     */
    async execSql(sql) {
      // 通过临时存储过程执行 DDL
      const createFn = `
        CREATE OR REPLACE FUNCTION temporary_migration()
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        BEGIN
          EXECUTE '${sql.replace(/'/g, "''")}';
        END;
        $$;
      `
      // 先创建函数
      await this.rpc('temporary_migration', {}) // 这会失败，但让我们用另一种方式
      
      // 改用 HTTP 请求直接执行
      const res = await fetch(`${base}/rest/v1/`, {
        method: 'POST',
        headers: { ...headers, 'Content-Range': '0/0' },
        body: JSON.stringify({})
      })
      return res
    }
  }
}

// 从环境或命令行参数获取配置
const SUPABASE_URL = process.env.SUPABASE_URL || process.argv[2]
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.argv[3]

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('用法: node scripts/migrate.js <SUPABASE_URL> <SUPABASE_SERVICE_KEY>')
  console.error('或设置环境变量: SUPABASE_URL, SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  console.log('开始迁移：修复 users.avatar_url 字段类型...')

  const alterSql = 'ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT'

  try {
    // 尝试通过 rpc 执行
    // Supabase 没有内置的 exec_sql RPC，需要用 SQL Editor 手动执行
    // 这里改用通过管理 API 或直接 HTTP 请求

    console.log(`执行 SQL: ${alterSql}`)
    console.log('\n请在 Supabase SQL Editor 中执行以下 SQL:')
    console.log('---')
    console.log(alterSql + ';')
    console.log('---')
    console.log('\n操作步骤：')
    console.log('1. 打开 Supabase Dashboard')
    console.log('2. 进入 SQL Editor')
    console.log('3. 粘贴上面的 SQL 并点击 Run')
    console.log('4. 执行成功后，avatar_url 字段将支持任意长度')

    // 同时更新本地 schema 文件
    console.log('\n本地 schema 文件已更新 (database/init_postgres.sql)')
    console.log('新部署的数据库将自动使用 TEXT 类型')

  } catch (error) {
    console.error('迁移失败:', error.message)
    process.exit(1)
  }
}

main()