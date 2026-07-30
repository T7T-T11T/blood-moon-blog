# 数据库迁移

本目录存放数据库迁移脚本，按版本顺序递增编号。

## 命名规范

文件名格式：`NNN_description.sql`

- `NNN`：三位数字序号，从 001 开始递增
- `description`：简短的英文描述，使用下划线分隔

示例：
```
001_init.sql          # 初始建表
002_add_user_roles.sql # 新增用户角色表
003_seed_data.sql      # 插入初始数据
```

## 使用规范

1. **按序号顺序执行**：迁移脚本必须按 `NNN` 序号从小到大依次执行，不可跳过或乱序。
2. **不可修改已有迁移**：已执行的迁移脚本不应再修改。如需变更表结构，应新增一条迁移脚本。
3. **幂等性**：所有迁移脚本应使用 `CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 等幂等语句，确保重复执行不会出错。
4. **备份先行**：执行迁移前应对数据库进行备份，特别是涉及 DROP / ALTER 等高危操作时。
5. **事务包裹**：每条迁移脚本应尽量在一个事务中完成，保证原子性。

## 当前迁移列表

| 序号 | 文件名 | 说明 |
|------|--------|------|
| 001 | 001_init.sql | 初始建表：articles、categories、tags、article_tags、comments、users、site_settings、friend_links、friendly_links |

## 执行方式

使用 MySQL 客户端执行：

```bash
mysql -u root -p task_manager < database/migrations/001_init.sql
```

或通过后端项目的 `init_music_table.sql` 及迁移工具统一管理。
