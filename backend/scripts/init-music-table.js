const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * 创建音乐表脚本
 * 读取.env配置，检查music表是否存在，不存在则创建
 */
async function initMusicTable() {
  // 加载环境变量
  dotenv.config();

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'task_manager',
    waitForConnections: true
  });

  try {
    // 检查表是否存在
    const [rows] = await pool.execute("SHOW TABLES LIKE 'music'");
    if (rows.length > 0) {
      console.log('音乐表已存在');
      await pool.end();
      return;
    }

    // 读取建表SQL
    const sqlPath = path.join(__dirname, '..', 'init_music_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = sql.split(';').filter((s) => s.trim());

    for (const stmt of statements) {
      if (stmt.trim()) {
        await pool.execute(stmt.trim());
      }
    }
    console.log('音乐表创建成功');
  } catch (e) {
    console.error('音乐表初始化失败:', e.message);
  } finally {
    await pool.end();
  }
}

initMusicTable();