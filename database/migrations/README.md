# 数据库迁移

本目录存放数据库迁移脚本，按版本顺序递增编号。数据库为 PostgreSQL（Supabase 托管）。

## 命名规范

文件名格式：`NNN_description.sql`

- `NNN`：三位数字序号，从 001 开始递增
- `description`：简短的英文描述，使用下划线分隔

## 使用规范

1. **按序号顺序执行**：迁移脚本必须按 `NNN` 序号从小到大依次执行，不可跳过或乱序。
2. **不可修改已有迁移**：已执行的迁移脚本不应再修改。如需变更表结构，应新增一条迁移脚本。
3. **幂等性**：所有迁移脚本应使用 `CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 等幂等语句，确保重复执行不会出错。
4. **备份先行**：执行迁移前应对数据库进行备份，特别是涉及 DROP / ALTER 等高危操作时。

## 执行方式

在 **Supabase Dashboard → SQL Editor** 中粘贴脚本内容并执行：

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 → SQL Editor
3. 粘贴迁移脚本内容，点击 Run

> 也可使用 `database/init_postgres.sql` 一次性执行全量建表（新建库时使用）。

## 当前迁移列表

| 序号 | 文件名 | 说明 |
|------|--------|------|
| 001 | 001_init.sql | 初始建表：users、articles、categories、tags、article_tags、comments、site_settings、friend_links、friendly_links |
| 002 | 002_friends.sql | 友情链接表 |
| 003 | 003_likes_favorites.sql | 点赞与收藏表 |
| 004 | 004_soft_delete.sql | 文章软删除字段（deleted_at） |
| 005 | 005_operation_logs.sql | 操作日志表 |
| 006 | 006_article_top.sql | 文章置顶字段（is_top） |
| 007 | 007_comments_avatar_text.sql | comments.avatar_url 改为 TEXT 类型（容纳 base64） |

> 注意：部分早期迁移脚本（001-005）的注释中仍标注为 MySQL 8.0+，但实际已在 PostgreSQL（Supabase）上执行通过。后续新增迁移应使用 PostgreSQL 语法。
