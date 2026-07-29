# 版本历史

## v1.3.0 (2026-07-29)

- feat: 重构为个人博客系统，参考 GitHub 热门开源博客项目进行模仿创新
- feat(db): 新增 comments(树形评论)、links(友链)、site_settings(网站设置) 表，扩展 users/articles 字段
- feat(api): 新增评论管理、友链管理、网站设置后端接口，支持树形评论与审核流程
- feat(front): 重构前台为杂志风布局，新增首页 Hero 区、文章归档、友链、关于我、搜索结果页
- feat(admin): 后台新增评论管理、友链管理、网站设置页面，扩展侧边栏菜单
- fix(api): 移除前端 API 调用中重复的 /api 前缀，与 request.js baseURL 统一
- chore(lint): 修复 ESLint 与 Prettier 的 indent 规则冲突，格式化规则统一交由 Prettier 管理
- 前后端版本号统一升级至 1.3.0

## v1.2.2 (2026-07-29)

- fix(router): 将路由模式从 history 改为 hash，彻底解决刷新页面 404 问题

## v1.2.1 (2026-07-29)

- fix(db): 给 articles 表增加 cover_image 字段，补充 upgrade.sql 升级脚本
- fix(articles): 修复 /api/articles/public 系列接口中 LIMIT/OFFSET 传 number 类型导致 ER_WRONG_ARGUMENTS 错误
- fix(categories): 修复 ORDER BY 子句引用了 SELECT 中没有的别名 c.sort_order 导致的 500 错误

## v1.2.0 (2026-07-29)

- 修复 backend `dotenv` 版本号错误（^17.4.2 -> ^16.4.5），解决 npm install 失败问题
- 补充数据库升级脚本，增加 `categories` / `tags` / `article_tags` 表及 `articles.category_id` 字段
- 清理前端废弃文件（BlogList / BlogEdit / BlogDetail / Dashboard / TaskForm / RichEditor.vue）
- 前端补全 ESLint + Prettier 工具链，增加 lint / format 脚本
- Vite 构建优化：配置 manualChunks 代码分割，减小单文件体积
- 增加生产环境 API 配置（.env.production / .env.development）
- 前后端版本号统一升级至 1.2.0

## v1.1.0 (2026-07-28)

- 新增仪表盘、博客、番茄钟、数据统计四大模块
- 前端 UI 全面美化，建立设计令牌体系
- 集成全局动画系统（路由过渡、页面入场、悬浮效果）
- 博客编辑器升级为全屏沉浸式布局
- 登录页增加 Canvas 粒子动效
- 番茄钟状态持久化（pinia-plugin-persistedstate）
- 项目整体配色改为青绿色系

## v1.0.0 (2026-07-28)

- 初始版本：任务管理 + 用户认证
- 技术栈：Vue 3 + Vite + Element Plus + Express + MySQL
- 功能：用户注册/登录、JWT 认证、任务增删改查
