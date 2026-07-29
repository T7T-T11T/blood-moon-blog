# 版本历史

## v1.4.7 (2026-07-30)

- fix(theme): 修复后台管理文字颜色适配问题
  - AdminLayout 使用独立浅色主题变量（admin-bg/admin-text），与前台暗色主题解耦
- feat(home): Hero 区域去除默认"个人博客"字样，改为动态站点名
- feat(effects): 火星粒子特效改为全页面覆盖（position: fixed），80 个粒子持续上升
- fix(theme): ArticleDetail/Search 页面颜色统一适配暗色主题
- 前后端版本号统一升级至 1.4.7

## v1.4.6 (2026-07-30)

- feat(theme): 前台改为暗夜哥特主题（Deep Navy + Ember Red）
  - Hero 区域：血月背景图 + Canvas 火星粒子上升动画 + 血月光晕脉动
  - 全站 CSS 变量切换为暗色主题（深色背景 + 红色强调色）
  - FrontLayout 导航栏/页脚改为暗色毛玻璃风格
  - Home.vue 文章列表/侧边栏改为暗色编辑风格
  - ArticleDetail 评论表单适配暗色主题
- 前后端版本号统一升级至 1.4.6

## v1.4.5 (2026-07-30)

- fix(profile): 修复头像上传后右上角导航栏头像未同步的问题
  - userStore 新增 avatar_url 状态和 setAvatar 方法，持久化到 localStorage
  - AdminLayout 右上角优先显示头像图片，无头像时回退到用户名首字母
  - Profile.vue 上传头像和加载资料时同步更新全局 store
  - Login.vue 登录成功后异步获取用户资料并同步头像到 store
- 前后端版本号统一升级至 1.4.5

## v1.4.4 (2026-07-30)

- feat(profile): 新增个人中心页面，支持修改头像、简介、邮箱、GitHub/QQ/微信链接及密码
- feat(profile): 后端新增 GET/PUT /api/auth/profile 和 PUT /api/auth/password 接口
- feat(profile): 管理后台系统菜单新增「个人中心」入口，右上角用户下拉可跳转
- fix(dashboard): 修复文章状态饼图数据不正确
  - categories/tags 表无 user_id 字段，移除错误的 WHERE 过滤条件
  - 聚合查询字段（COUNT/SUM）BigInt 返回字符串，在响应中统一转为 Number 类型
- fix(dialog): 分类/标签/友链管理对话框添加 append-to-body，解决被侧边栏遮挡问题
- 前后端版本号统一升级至 1.4.4

## v1.4.3 (2026-07-30)

- fix(login): 修复登录按钮无反应 bug
  - 将 `formRef.value.validate()` 移入 try 块，避免表单校验异常未被捕获导致事件处理器崩溃
  - 将 `userStore.setToken()` / `setUser()` 改为实际存在的 `userStore.setLogin()`
- 前后端版本号统一升级至 1.4.3

## v1.4.2 (2026-07-30)

- fix(auth): 修复注册接口 confirm 字段缺失导致"两次密码不一致"的 bug
- feat(auth): 移除公开注册页面/路由/API/后端接口，个人博客仅设单管理员
- feat(auth): 新增种子脚本 backend/scripts/init-admin.js，用于初始化或重置管理员账号
- feat(login): 登录页标题改为"管理员登录"，移除注册链接
- 前后端版本号统一升级至 1.4.2

## v1.4.1 (2026-07-30)

- fix(ui): 修复分类管理对话框未限制最大高度导致内容溢出显示不全的问题
- fix(editor): MdEditor 工具栏强制横向排列，解决纵向太挤的问题
- feat(editor): 文章编辑器右侧设置面板新增音频/视频上传入口，无大小限制，上传后自动插入编辑器
- feat(article): 文章详情页新增分享栏，支持微信（复制链接）、微博（跳转分享）、复制链接三种方式
- 前后端版本号统一升级至 1.4.1

## v1.4.0 (2026-07-30)

- feat: 删除任务管理和番茄钟功能，专注博客系统
- feat(ui): 使用 frontend-skill 设计原则全面重写所有页面 UI
- feat(front): 全屏 Hero 首页 + 滚动揭示动画 + 卡片化舍弃的杂志风布局
- feat(front): 文章详情页增加阅读进度条、滚动揭示、返回顶部浮动按钮
- feat(front): 归档时间线、关于页、友链列表、搜索结果、分类/标签归档全部重写
- feat(admin): Linear 风格后台，统一青绿色主题，交错入场动画
- feat(admin): 新建数据统计页（仅博客数据，echarts 三图）
- feat(auth): 登录/注册分屏设计，404 弹性入场 + 粒子动画
- fix(backend): 重写 dashboard.js，移除 tasks/pomodoro 表查询
- 前后端版本号统一升级至 1.4.0

## v1.3.2 (2026-07-30)

- fix(route): 修复 Vite 路径别名(@)未配置导致的模块解析失败，所有页面正常加载
- fix(editor): 修复文章编辑器图标包名错误(@element-plus/icons-v3 → @element-plus/icons-vue)
- fix(route): 添加旧路径重定向(/task/add 等 → /admin/tasks)，解决历史链接 404
- refactor(ArticleEdit): 重写文章编辑器 UI，优化布局和交互体验
- 前后端版本号统一升级至 1.3.2

## v1.3.1 (2026-07-29)

- chore: 删除冗余文档和文件，清理项目结构
- 删除 DEVELOPMENT.md（内容严重过时且与 README.md 重复）
- 删除 database/upgrade.sql 和 upgrade_v2.sql（init.sql 已是全量最新建表脚本）
- 更新 README.md 中对已删除文件的引用，避免断链
- 前后端版本号统一升级至 1.3.1

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
