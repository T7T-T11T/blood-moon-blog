/**
 * 管理员账号初始化脚本
 * 作用：为个人博客系统创建唯一的管理员账号
 *
 * 使用方法：
 *   node scripts/init-admin.js              # 使用默认账号 admin / admin123
 *   node scripts/init-admin.js myuser mypass  # 自定义用户名和密码
 *
 * 说明：
 * - 此脚本会自动检测数据库中是否已有用户
 * - 若没有用户，则创建管理员账号（初始化）
 * - 若已有用户，则重置指定用户名的密码
 * - 个人博客仅设一个管理员，不开放注册
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

/**
 * 主函数：初始化或重置管理员账号
 */
async function main() {
  // 从命令行参数获取用户名和密码
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';

  // 参数校验
  if (!username || !username.trim()) {
    console.error('错误：用户名不能为空');
    process.exit(1);
  }
  if (!password || password.length < 6) {
    console.error('错误：密码至少需要6位');
    process.exit(1);
  }

  try {
    // 查询当前用户数量
    const [users] = await pool.execute('SELECT COUNT(*) AS cnt FROM users');
    const userCount = users[0].cnt;

    // 使用 bcrypt 加密密码
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (userCount === 0) {
      // 首次初始化：创建管理员
      await pool.execute(
        'INSERT INTO users (username, password_hash, bio) VALUES (?, ?, ?)',
        [username.trim(), passwordHash, '个人博客站长']
      );
      console.log('========================================');
      console.log('  管理员账号初始化成功！');
      console.log(`  用户名：${username}`);
      console.log(`  密码：${password}`);
      console.log('  请妥善保存账号信息，首次登录后建议修改密码');
      console.log('========================================');
    } else {
      // 重置密码
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE username = ?',
        [username.trim()]
      );
      if (existing.length > 0) {
        await pool.execute(
          'UPDATE users SET password_hash = ? WHERE username = ?',
          [passwordHash, username.trim()]
        );
        console.log('========================================');
        console.log(`  已重置用户 "${username}" 的密码`);
        console.log(`  新密码：${password}`);
        console.log('========================================');
      } else {
        // 用户名不存在，作为新用户插入
        await pool.execute(
          'INSERT INTO users (username, password_hash, bio) VALUES (?, ?, ?)',
          [username.trim(), passwordHash, '个人博客站长']
        );
        console.log('========================================');
        console.log(`  已创建新管理员账号`);
        console.log(`  用户名：${username}`);
        console.log(`  密码：${password}`);
        console.log('========================================');
      }
    }
  } catch (err) {
    console.error('初始化失败：', err.message);
    process.exit(1);
  } finally {
    // 关闭连接池
    await pool.end();
  }
}

main();
