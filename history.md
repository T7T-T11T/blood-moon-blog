# 版本历史

## v1.15.0 (2026-08-05)

- refactor: 不破坏功能前提下精简代码，删除死代码并提取重复工具函数
  - 删除 functions/ 死代码代理层（前端生产环境已直连 Workers，注释明确说明不用 Functions 代理）
  - 删除 backend/server.js 中 3 个未使用的限流器（loginLimiter/uploadLimiter/searchLimiter，实际定义在各路由模块内）
  - 删除 backend/middleware/logAction.js 中未被调用的 logLogout 函数
  - 删除前端 stores/dashboard.js（死模块，全项目无引用，AdminLayout 自行实现评论统计轮询）
  - 删除前端 stores/settings.js 并修复 App.vue（原读取 settingsStore.settings 不存在的字段导致 JSON-LD 永远用默认值，改为直接使用 api/settings.js 的 settingsState 共享状态）
  - 删除前端孤立视图 views/admin/Friends.vue 及 api/friends.js（未挂载路由、无入口，LinkList.vue 已承担友链管理）
  - 提取 utils/format.js 统一 formatDate/formatDateTime，消除 NotFound/Home/ArticleDetail/Archive/CategoryList/TagList/Search/CommentSection/LogList 等 9 个文件中的重复定义
  - 移除 pinia-plugin-persistedstate 死依赖（user/theme store 各自手动 localStorage 持久化，插件从未被使用）
- docs: 同步文档与代码不一致处
  - README.md 技术栈表 MySQL → PostgreSQL（Supabase），补充本地开发（Express+pg）与生产（Hono+Supabase SDK）双后端说明
  - README.md 项目结构补充 workers-backend/ 目录
  - README.md 数据库初始化改为 Supabase SQL Editor 执行迁移脚本
  - DEPLOY.md 架构图更新为前端直连 Workers + Supabase，标注 backend/ 仅用于本地开发
- chore: 前后端 + workers 版本号统一升级至 1.15.0

## v1.14.3 (2026-08-01)

- fix(comments): 修复登录用户评论 500 错误
  - 根因：comments.avatar_url 为 VARCHAR(500)，登录用户头像（base64 data URL）超长导致插入失败
  - comments.js：POST 评论时从 users 表读取头像写入 comments（登录态走 token 验证分支）
  - 007_comments_avatar_text.sql：ALTER TABLE comments ALTER COLUMN avatar_url TYPE TEXT（彻底解决）

- fix(article-detail): 修复文章详情页渲染崩溃与音视频不显示
  - ArticleDetail.vue：article 由 ref 改为 shallowRef，避免深度响应式触发 marked 栈溢出
  - ArticleDetail.vue：DOMPurify 配置允许 video/source 标签与 data: URL，修复音视频被过滤
  - ArticleDetail.vue：移除与 DOMPurify 冲突的懒加载逻辑

- fix(home): 修复首页分类数据为空
  - Home.vue：categories 由 computed 改为 ref，直接调用 /api/categories 获取

- fix(trash): 修复清空回收站 404
  - trash.js：静态路由 DELETE /clear 注册在动态 DELETE /:id 之前，避免 clear 被当作 id
  - trash.js：/:id 路由增加 isNaN(id) 校验

- fix(articles): 公开与管理端文章接口返回 category_slug 字段

- feat(cache): 前端版本检测与缓存控制
  - version.js：新增版本检查工具，定时对比 meta app-version 检测更新
  - App.vue：检测到新版本时弹出刷新提示
  - vite.config.js：构建时注入时间戳版本号到 index.html
  - index.html：增加 app-version meta 标签
  - _headers：Cloudflare Pages 缓存策略（index.html no-cache，带 hash 资源长缓存）

## v1.14.2 (2026-08-01)

- fix(upload): 修复上传接口在无 Storage 环境下全部失败的问题
  - upload.js: 重构 handleUpload()，Storage 失败立即降级为 base64（不再阻塞）
  - upload.js: tryUploadToStorage() 非阻塞，失败返回 null 而非抛异常
  - upload.js: MIME 类型检查改为前缀匹配（['image/', 'audio/', 'video/']）
  - upload.js: 删除接口在 Storage 不可用时返回成功（base64 模式无需删除）
  - upload.js: GET /list 在 Storage 不可用时返回空列表而非 500

- fix(draft): 使用 IndexedDB 解决 localStorage 5MB 配额限制
  - ArticleEdit.vue: 新增 getDraftDB/saveDraftToIndexedDB/loadDraftFromIndexedDB/deleteDraftFromIndexedDB
  - ArticleEdit.vue: saveDraft() 优先级 localStorage → IndexedDB → sessionStorage
  - ArticleEdit.vue: QuotaExceededError 自动降级到 IndexedDB（上限 500MB+）
  - ArticleEdit.vue: getDraftRaw/restoreDraft/clearDraft 均支持 IndexedDB

- fix(schema): 数据库字段类型修复
  - init_postgres.sql: articles.cover_image VARCHAR(500) → TEXT
  - fix_schema.sql: 新增 ALTER TABLE articles ALTER COLUMN cover_image TYPE TEXT

## v1.14.1 (2026-07-31)

- fix(music): 修复播放时长始终 00:00 + 状态开关自动回跳
  - MusicPlayer.vue: 增加 preload="metadata" + @durationchange + @canplay 事件
  - MusicPlayer.vue: onLoadedMetadata 兼容 duration=Infinity 情况（base64 data URL）
  - MusicPlayer.vue: 新增 onAudioError 自动跳过坏音频
  - MusicPlayer.vue: onUnmounted 增加 destroyed=true + audio.src=''
  - MusicList.vue: 状态开关从 is_active(0/1) 改为 status(已通过/已下架)
  - music.js: PUT allowedFields 增加 status 字段

## v1.14.0 (2026-07-31)

- fix(music-player): 修复音乐播放器无法播放 + AbortError 崩溃
  - MusicPlayer.vue: audioUrl 从 currentMusic.value.file_path 改为 currentMusic.value.url（后端返回字段名为 url）
  - MusicPlayer.vue: 增加 destroyed 标志位，防止组件卸载后异步 play() 继续执行
  - MusicPlayer.vue: playCurrent() 区分 AbortError/NotAllowedError/其他错误分别处理
  - MusicPlayer.vue: play() 被中断不再抛出未捕获的 promise rejection

## v1.13.9 (2026-07-31)

- fix(music): 修复音乐上传 500 错误
  - music.js POST: 移除手动 created_at（表有默认值 NOW()），移除 fileName 无用变量
  - music.js POST/GET/DELETE: 所有错误返回 error.message 便于调试
  - music.js GET /all: 改用 db.select() 封装替代裸 db.supabase 调用
  - music.js DELETE /:id: 增加 error 检查
  - init_postgres.sql: music 表 url/cover_url 改为 TEXT（存储 base64）
  - fix_schema.sql: 新增 ALTER TABLE music ALTER COLUMN url/cover_url TYPE TEXT

## v1.13.8 (2026-07-31)

- fix(articles): 修复管理端文章列表 500 错误
  - db.js: select() 方法新增 IN 查询支持（{ id: { in: [1,2,3] } }）
  - articles.js: 标签预加载改用 db.select() 封装替代裸 db.supabase 调用
  - articles.js: 分类/标签预加载增加 try-catch 容错，失败不影响文章列表
  - articles.js: 修复关键词过滤同时搜索 title 和 summary

## v1.13.7 (2026-07-31)

- perf(articles): 大幅优化管理端文章列表加载速度
  - articles.js(后端): 管理端 GET /articles 增加 category_name + tags 批量预加载（3次查询完成，不再 N+1）
  - articles.js(后端): 管理端列表改为只查询必要字段（排除 content 大字段，加速传输）
  - articles.js(后端): 关键词过滤同时搜索 title 和 summary
  - articles.js(前端): getArticles() 新增 30s defaultCache 缓存，避免重复网络请求
  - articles.js(前端): addArticle/updateArticle/deleteArticle/toggleTop 自动清理缓存
  - cache.js: MemoryCache 新增 deleteByPrefix() 方法，支持按前缀批量清除

## v1.13.6 (2026-07-31)

- fix(avatar): 修复头像上传保存失败 + 前端体验优化
  - Profile.vue: handleAvatarChange 修复 catch 变量名冲突（e → err）
  - Profile.vue: 新增文件输入重置，支持重复选择同一文件
  - Profile.vue: 新增图片类型和大小校验（< 2MB）
  - Profile.vue: 新增上传中 loading 状态，头像上传时有视觉反馈
  - Profile.vue: 新增 Loading 图标导入
  - auth.js: PUT /profile 返回实际错误信息便于调试
  - fix_schema.sql: 新增 ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT（需手动执行）
  - init_postgres.sql: avatar_url 字段改为 TEXT 类型
  - 新增 diag.js 诊断路由（/api/diag/storage 检查 Storage 状态）

## v1.13.5 (2026-07-31)

- perf(workers-backend): 修复首页加载慢 / 500 错误的三大根因
  - articles.js: 修复 N+1 查询问题，批量预加载 categories，避免每篇文章单独查 category
  - db.js: Supabase 客户端改为 Worker 级缓存（Map 复用），不再每次请求重建
  - settings.js PUT: 修复 insert 时写入不存在的 created_at 字段（改为 updated_at）
  - settings.js GET: 错误信息直接返回便于调试
  - settings.js: 缓存命中时返回与网络请求一致的 { code, data } 结构，修复 admin Settings 页数据读取

## v1.13.4 (2026-07-31)

- perf(frontend): 大幅优化首页加载速度，消除重复 API 调用
  - settings.js: getSettings() 新增 defaultCache(30s TTL) 缓存，防止重复请求
  - settings.js: 新增模块级 settingsState reactive 共享状态，所有组件共用同一份数据
  - settings.js: 新增 clearSettingsCache() 供管理端更新后手动失效缓存
  - Home.vue: 移除 loadSettings() 调用，改用共享 settingsState（原与 FrontLayout 重复调用 getSettings）
  - FrontLayout.vue: 移除本地 settings ref，改用共享 settingsState
  - Settings.vue: 保存设置后调用 clearSettingsCache() 确保数据一致性

## v1.13.3 (2026-07-31)

- fix(frontend): 修复文章保存超时 + 草稿存储超限 + 首页网络错误提示
  - request.js: axios timeout 从 10s 延长到 60s，解决含 base64 大图的文章/文件上传超时
  - ArticleEdit.vue: saveDraft() 增加三级降级（完整→无 content→sessionStorage）
    - 捕获 QuotaExceededError，避免 localStorage 超限时整页报错
    - 新增 getDraftRaw()：按优先级读取 localStorage → sessionStorage
    - clearDraft() 同时清理两个 Storage 的草稿
- fix(workers-backend): 修复音乐上传及所有管理接口写操作卡顿/超时问题
  - music.js POST: 替换 reduce 风格 base64 编码为分块高效 uint8ToBase64
  - music.js: 改用 c.req.raw.formData()，放宽 file instanceof File 兼容 Blob
- 版本统一升级至 v1.13.3（已构建 dist，前端可直接重新发布到 Pages）

## v1.13.2 (2026-07-31)

- fix(workers-backend): 修复所有上传接口返回 500 的问题
  - 原因：Supabase Storage bucket（uploads）不存在或不可用
    - 大文件（>512KB）直接返回 500，小文件走 base64 降级但编码性能差
  - 修复1：移除 512KB 降级限制，所有文件均支持 base64 data URL 降级
  - 修复2：新增高效 base64 编码函数 uint8ToBase64（分块处理，避免 O(n²) 性能问题）
  - 修复3：放宽 File 类型检查（兼容 Workers 环境的 Blob/File 对象）
  - 修复4：调整降级上限为 75MB（Workers 响应大小限制 100MB + base64 膨胀 33%）
  - 修复5：Storage 失败时不再直接报错，自动降级为 base64
- fix(workers-backend): 修复友链 avatar → avatar_url 字段映射
  - links.js GET /api/links 和 /api/links/all：新增 avatar_url 映射
  - friends.js GET /api/friends 和 /api/friends/all：同步新增 avatar_url 映射
  - 解决前端 Links.vue / LinkList.vue 使用 avatar_url 字段但后端返回 avatar 的兼容性问题

## v1.13.1 (2026-07-31)

- fix(workers-backend): 修复归档页面「明明有文章却不显示」的 Bug
  - 原因1：GET /articles/public/archives 接口返回格式与本地 backend 不一致
    - 本地返回：数组 [{ year, month, label, articles: [] }]
    - workers 后端返回：对象 { "YYYY-MM": [articles...] }
    - 前端 Archive.vue 只兼容数组或 {list:[]}，导致结果被判为 []
  - 修复1：重写 workers-backend 归档接口分组逻辑，返回格式与 articleService.getArchives() 对齐
  - 原因2：Supabase 查询 null 值误用 .eq('deleted_at', null)，应使用 .is('deleted_at', null)
    - 导致归档、热门、最新、相关文章、Dashboard 统计等接口查询失败或返回空
  - 修复2：批量替换 articles.js / dashboard.js / tags.js 中所有 .eq('deleted_at', null) → .is('deleted_at', null)
  - 新增：归档接口查询补充 summary 字段，增加 Supabase error 捕获
- 前后端 + workers 版本号统一升级至 1.13.1

## v1.13.0 (2026-07-31)

- feat(release): 首次发布至 GitHub 开源社区
- feat(test): 完成全项目自测，201 项测试用例全部通过
- feat(doc): 新增完整测试文档 TEST_PLAN.md
- fix(doc): 更新 README.md 文档描述为博客系统
- chore: 前后端版本号统一升级至 1.13.0

## v1.12.1 (2026-07-31)

- fix(database): 修复 MySQL 预处理语句 LIMIT/OFFSET 占位符问题（8处SQL查询，涉及5个文件）
- fix(database): 修改文件：articleService.js、commentService.js、logService.js、routes/favorites.js、routes/music.js
- fix(ui): 修复 getActionTagType 返回空字符串导致 Element Plus prop 验证警告
- fix(ui): Dashboard 文章状态为 null 时显示兜底文案「草稿」
- 前后端版本号统一升级至 1.12.1

## v1.12.0 (2026-07-31)

- feat(editor): 文章编辑器新增自动保存功能（草稿恢复 + 30秒自动保存）
- feat(dashboard): Dashboard增强（活动流展示 + 统计图表 + 快捷入口优化）
- feat(comments): 评论通知增强（后台评论提醒 + 待审核标记）
- feat(export): 文章导出功能（支持 Markdown/HTML 格式导出）
- feat(top): 文章置顶功能（后台置顶切换 + 首页置顶文章优先展示）
- feat(lightbox): 图片灯箱功能（文章详情页点击图片放大预览，支持ESC关闭）
- feat(codeblock): 代码块增强（一键复制 + 语言标注 + 复制反馈动画）
- feat(interaction): 微交互动效增强（按钮涟漪效果 + 悬浮发光 + 按压反馈 + 闪光扫过）
- feat(interaction): 首页文章列表添加点击涟漪效果
- fix(lint): 修复 ESLint 警告（未使用变量 resolve、Link 导入）
- 前后端版本号统一升级至 1.12.0

## v1.11.2 (2026-07-30)

- feat(log): 登录接口添加 logLogin 日志记录
- feat(log): 文章管理路由添加 logAction 中间件（创建/更新/删除文章）
- feat(log): 分类管理路由添加 logAction 中间件（创建/更新/删除分类）
- feat(log): 标签管理路由添加 logAction 中间件（创建/更新/删除标签）
- feat(log): 评论管理路由添加 logAction 中间件（审核/删除评论）
- feat(log): 回收站路由添加 logAction 中间件（恢复/永久删除/清空回收站）

## v1.11.1 (2026-07-30)

- fix(api): 修复 logs.js 和 trash.js 中 request 导入路径错误（../utils/request → ./request）
- feat(backend): 回收站 getTrashArticles 接口支持分页查询
- feat(backend): 新增 clearAllTrash 接口，支持批量永久删除回收站文章
- feat(backend): 新增 clearAllTrash 路由 DELETE /api/trash/clear
- fix(front): TrashList.vue 和 LogList.vue 响应解析逻辑对齐项目规范

## v1.11.0 (2026-07-30)

- refactor: 移除收藏功能（单管理员博客收藏自己的文章无意义）
- feat(admin): 新增回收站页面（/admin/trash），支持查看、恢复和永久删除已删除文章
- feat(admin): 新增操作日志页面（/admin/logs），支持按操作类型、资源类型和日期筛选
- feat(api): 新增回收站前端API模块（trash.js）
- feat(api): 新增操作日志前端API模块（logs.js）
- fix(admin): 文章删除改为软删除，移至回收站而非直接删除
- fix(layout): 后台侧边栏添加回收站和操作日志入口
- 前后端版本号统一升级至 1.11.0

## v1.10.0 (2026-07-30)

- feat(front): 新增标签云页面（/tags），动态展示所有标签并按文章数量调整大小
- feat(front): 新增收藏夹页面（/favorites），登录用户可查看和取消收藏文章
- feat(front): 文章详情页新增相关文章推荐模块，按同分类或同标签智能推荐5篇相关文章
- feat(front): 新增独立返回顶部按钮组件（BackToTop），提升长页面浏览体验
- feat(front): 文章详情页新增阅读时间预估功能（按400字/分钟计算）
- feat(seo): 新增 sitemap.xml 自动生成接口（/api/sitemap.xml），动态生成站点地图
- feat(seo): 新增 robots.txt 文件，配置搜索引擎爬虫规则
- feat(seo): index.html 添加 Open Graph 和 Twitter Card 元数据，优化社交分享效果
- feat(seo): index.html 添加 JSON-LD 结构化数据（WebSite/Person/Blog），提升搜索引擎理解
- feat(admin): 新增回收站功能，已删除文章可在回收站恢复或永久删除
- feat(admin): 新增操作日志记录功能，记录文章/评论/分类/标签的增删改操作
- feat(admin): 新增数据导出功能，支持导出文章和评论数据为JSON格式
- fix(front): 修复 FrontLayout.vue 缺少 userStore 导入导致 ESLint 报错
- fix(backend): 清理 exportController.js 未使用的导入，符合 ESLint 规范
- feat(front): 路由新增 /tags、/favorites、/admin/trash 路径
- feat(api): 后端新增相关文章推荐接口 GET /api/articles/public/related/:id
- feat(api): 后端新增 sitemap 生成路由和接口
- feat(api): 后端新增回收站相关接口（GET /api/trash、POST /api/trash/:id/restore、DELETE /api/trash/:id）
- feat(api): 后端新增操作日志接口 GET /api/logs
- feat(api): 后端新增数据导出接口（GET /api/export/articles、GET /api/export/comments）
- feat(db): 新增软删除迁移脚本（004_soft_delete.sql），为文章表添加 deleted_at 字段
- feat(db): 新增操作日志表迁移脚本（005_operation_logs.sql）
- 前后端版本号统一升级至 1.10.0

## v1.9.0 (2026-07-30)

- fix(security): 放宽 Helmet CSP 策略，支持前后端分离部署（connectSrc/imgSrc/mediaSrc 允许 http/https）
- fix(security): 搜索接口添加专用限流（10 次/分钟），防止恶意搜索消耗数据库资源
- fix(security): SQL LIKE 查询转义用户输入中的 %、_、\ 通配符，防止搜索逻辑注入
- perf(backend): 优化 attachTags 从 N+1 查询改为单次批量查询，文章列表查询性能大幅提升
- refactor(backend): 重构 uploadController，使用工厂方法消除 4 个上传函数的重复代码
- feat(backend): 新增 ESLint 配置（.eslintrc.cjs），后端代码纳入自动化 lint 检查
- fix(frontend): 清理 ESLint 警告，删除未使用变量和导入，v-html 指令添加安全注释
- 前后端版本号统一升级至 1.9.0

## v1.8.0 (2026-07-30)

- fix(db): 修复数据库初始化脚本(001_init.sql)中文乱码问题，重写全部 SQL 语句
- fix(db): 新增评论表、友情链接表、点赞记录表、收藏记录表、访问统计表、音乐表、系统设置表
- refactor(frontend): 清理 ArticleEdit.vue 中冗余的 md-editor 样式代码（项目已改用 TipTap 编辑器）
- refactor(backend): 修复 uploadService.js 函数导出顺序，将 module.exports 移至文件末尾
- feat(backend): 增强健康检查接口 /api/health，新增数据库连接状态检测、上传目录状态检测、响应时间统计
- feat(backend): 健康检查接口返回服务器运行时长、版本号等额外信息
- chore: 完善 .gitignore 配置，补充临时脚本、TypeScript 缓存、日志文件等忽略项
- 前后端版本号统一升级至 1.8.0

## v1.7.1 (2026-07-30)

- fix(ui): 登录页主题统一为黑红血月风格，与全站暗黑哥特风一致
  - 左侧品牌区：青绿色渐变 → 深黑渐变 + 血色光晕 + 血月装饰
  - 右侧表单区：白色背景 → 暗色主题卡片 + 血月红聚焦态
  - 品牌名：「个人博客」→「寿冬与秋」
  - 文案：「思想留痕 文字长存」→「暗夜之下 笔墨不灭」
  - 按钮：青绿渐变 → 血月红渐变
- fix(ui): FrontLayout 默认站点名更新为「寿冬与秋」

## v1.7.0 (2026-07-30)

- 安全加固与部署准备（为生产环境部署做准备）
- fix(security): 修复 ArticleDetail/Search 页面 XSS 漏洞
  - ArticleDetail 引入 DOMPurify 对 Markdown 渲染结果消毒
  - Search 新增 escapeHtml 函数，关键词高亮前先转义防 XSS
- feat(security): 后端添加 helmet 安全响应头（CSP/X-Frame-Options/HSTS 等）
- feat(security): CORS 改为白名单模式，支持通过 CORS_ORIGIN 环境变量配置生产域名
- feat(security): 登录/评论/上传接口添加 express-rate-limit 限流
  - 登录 5 次/15 分钟（防暴力破解）
  - 评论 3 次/分钟（防刷屏）
  - 上传 10 次/分钟（防恶意上传）
- feat(security): 上传接口按文件类型设置大小限制（图片5MB/音频50MB/视频200MB/文件20MB）
- feat(security): JWT_SECRET 强制从环境变量读取，缺失时拒绝启动
- feat(security): 请求体大小限制 10MB，防止 body 炸弹
- feat(seo): index.html 添加完整 meta 标签（description/keywords/OG/Twitter Card）
- feat(seo): index.html 添加首屏 loading 占位动画，避免白屏
- feat(seo): 新增 favicon（blood-moon-logo.jpg）
- chore(deploy): 完善 backend/.env.example，补充 CORS_ORIGIN 配置说明
- 前后端版本号统一升级至 1.7.0

## v1.6.0 (2026-07-30)

- feat(music): 新增音乐管理功能，支持后台上传、编辑、删除音乐
- feat(music): 前台新增全局浮动音乐播放器，自动循环播放，支持播放/暂停/上下首/进度跳转
- feat(music): 新增音乐数据库表（music）及完整后端CRUD API
- feat(music): 新增前端音乐管理页面（/admin/music）及音乐API模块
- fix(comments): 增强后台评论消息提示机制，添加手动刷新按钮、加载状态指示器、调试日志
- fix(comments): 评论默认状态改为"待审核"，需后台审核发布
- fix(comments): 移除评论表单中的邮箱字段，简化用户评论流程
- fix(ui): 所有前台页面（Archive/About/Links/Search/CategoryList/TagList）背景图半透明化，共享固定血月背景
- fix(ui): 前台页面添加毛玻璃效果与淡入过渡动画
- style: AdminLayout导航添加音乐管理入口及图标
- 前后端版本号统一升级至 1.6.0

## v1.5.2 (2026-07-30)

- fix(ui): 彻底移除所有页面闪烁效果（粒子动画、发光动画、shimmer骨架屏动画）
- fix(ui): 首页背景层提升至全局层级，使用fixed固定定位确保滚动时背景完全不动
- fix(ui): 替换Logo为黑色血月风格图片，提升暗色主题视觉一致性
- fix(ui): 移除FrontLayout.vue中未使用的brandInitial变量
- fix(animation): 全局animate-glow改为单次播放，shimmer改为静态显示
- fix(theme): 所有前台页面（Search/TagList/CategoryList/Archive/Links）骨架屏移除闪烁动画
- 前后端版本号统一升级至 1.5.2

## v1.5.1 (2026-07-30)

- fix(ui): 移除所有页面 Hero 区域的 moonPulse 动画，彻底消除闪烁效果
- fix(ui): 关于页/友链页/归档页 Hero 区域改用纯 CSS 渐变背景，不再依赖图片加载
- fix(ui): 首页背景图改为固定背景不随页面滚动移动
- fix(ui): 前台导航 Logo 更换为血月风格图片
- feat(admin): 评论管理侧边栏添加待审核数量红色徽章
- feat(api): 新增 GET /api/comments/stats 评论统计接口
- fix(theme): 全局 el-select 下拉选择器暗色主题适配（选项、悬停、选中、多选标签）
- fix(theme): 全局 el-button 按钮暗色主题适配（default/primary/success/warning/danger）
- fix(theme): 全局 el-checkbox/el-radio/el-switch 暗色主题适配
- fix(theme): 全局 el-pagination 分页器暗色主题适配
- fix(editor): 文章编辑页 Markdown 编辑器深度暗色主题覆盖（工具栏/内容区/预览区）
- fix(editor): 文章编辑页标签状态改用 dark 效果，聚焦环改为主色调
- fix(editor): 文章编辑页右侧面板背景色统一为暗色卡片
- 前后端版本号统一升级至 1.5.1

## v1.5.0 (2026-07-30)

- fix(theme): 全局对话框暗色主题适配
  - el-dialog 头部/主体/底部统一使用暗色背景与边框
  - 修复分类/标签/友链新增编辑对话框背景为白色的问题
- fix(theme): 全局下拉菜单、消息盒子、消息提示、抽屉、弹出框暗色适配
- fix(theme): 数字输入器（+/- 按钮）暗色适配
- fix(theme): 字数统计（show-word-limit）暗色适配
- fix(theme): 登录页输入框暗色主题优化
- fix(ui): 友链页蝙蝠背景改为右下角淡入装饰，避免遮挡血月与文字
- feat(editor): Markdown 编辑器启用 dark 主题
- 前后端版本号统一升级至 1.5.0

## v1.4.9 (2026-07-30)

- fix(ui): 移除首页粒子特效闪烁效果，背景图固定不随滚动变化
- feat(ui): 前台导航 Logo 替换为血月风格图片图标
- feat(theme): 登录页输入框适配暗色主题（背景/文字/占位符/焦点状态）
- feat(theme): 关于页 Hero 区域添加哥特庄园背景图
- feat(theme): 友链页 Hero 区域添加蝙蝠装饰背景图
- fix(db): 删除 admin2 账号及其所有关联数据（4 篇文章），修复文章统计不准确问题
- 前后端版本号统一升级至 1.4.9

## v1.4.8 (2026-07-30)

- feat(ui): 移除前台导航栏"个人博客"品牌文字，仅保留 Logo 图标
- feat(theme): 归档/友链/关于/搜索页面 Hero 统一为黑红血月主题
  - 背景改为深黑渐变（#060912 -> #0a0e1a -> #121828）
  - 标题使用渐变文字（白 -> 粉红 -> 红）+ 红色光晕 drop-shadow
  - 添加血月脉动背景光晕动画（moonPulse）
  - 骨架屏统一为暗色渐变
- feat(effects): 增强首页火星粒子系统复杂度
  - 三层粒子：背景微光 40 个 + 中景火星 60 个 + 前景火花 30 个
  - 轨迹拖尾：每层粒子带渐隐历史点拖尾
  - 风力漂移：正弦波动模拟自然风向
  - 大小闪烁：持续周期性亮度/大小变化
  - 火花爆发：3% 概率生成高速金黄火花粒子
  - 半透明清除产生运动残影效果
- feat(theme): 后台管理界面统一为黑红暗色主题
  - AdminLayout 变量改为暗色（admin-bg: #0a0e1a / admin-text: #f1f5f9）
  - 侧边栏激活态、Logo、指示条改为红色系
  - 面包屑文字颜色适配暗色
  - 全局 el-table 暗色覆盖增强（行文字/悬停/空状态）
- 前后端版本号统一升级至 1.4.8

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
