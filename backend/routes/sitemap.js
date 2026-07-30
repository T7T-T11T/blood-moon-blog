/**
 * Sitemap 路由
 * 作用：生成 sitemap.xml，供搜索引擎爬虫索引
 *
 * GET /api/sitemap.xml - 返回包含所有已发布文章 URL 的 sitemap XML
 */

const express = require('express');
const pool = require('../config/db');

const router = express.Router();

/**
 * 从 settings 表获取站点配置（带缓存，首次加载后缓存 10 分钟）
 * @returns {Promise<Object>} 站点配置对象
 */
let cachedSettings = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟缓存

async function getSiteSettings() {
  const now = Date.now();
  // 如果缓存存在且未过期，直接返回缓存
  if (cachedSettings && now - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }
  try {
    // 从数据库查询站点配置
    const [rows] = await pool.execute(
      'SELECT siteName, siteDescription, siteUrl FROM settings LIMIT 1'
    );
    cachedSettings = rows[0] || {};
    cacheTime = now;
    return cachedSettings;
  } catch {
    // 查询失败时返回缓存或空对象
    return cachedSettings || {};
  }
}

/**
 * 格式化日期为 ISO 8601 格式（sitemap 要求格式）
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} ISO 8601 格式日期字符串
 */
function formatDate(date) {
  return new Date(date).toISOString();
}

/**
 * GET /api/sitemap.xml
 * 返回 sitemap 0.9 XML
 * 包含：
 * - 首页
 * - 所有已发布文章页面
 * - 分类页面
 * - 标签页面
 * - 归档页面
 */
router.get('/', async (req, res) => {
  try {
    const settings = await getSiteSettings();
    // 站点 URL，优先从数据库获取，否则使用请求的 host
    const siteUrl = settings.siteUrl || `${req.protocol}://${req.get('host')}`;

    // 1. 获取所有已发布文章（id、更新时间）
    const [articles] = await pool.execute(
      `SELECT id, title, updated_at, created_at
       FROM articles
       WHERE status = '已发布'
       ORDER BY created_at DESC`
    );

    // 2. 获取所有分类
    const [categories] = await pool.execute(
      `SELECT id, slug, updated_at
       FROM categories
       ORDER BY id ASC`
    );

    // 3. 获取所有标签
    const [tags] = await pool.execute(
      `SELECT id, slug
       FROM tags
       ORDER BY id ASC`
    );

    // 4. 构建 URL 列表
    let urlset = '';

    // 首页（最高优先级，更新频率：每日）
    urlset += `
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // 文章详情页（更新频率：每周，优先级：0.8）
    for (const article of articles) {
      const lastmod = article.updated_at || article.created_at;
      urlset += `
  <url>
    <loc>${siteUrl}/article/${article.id}</loc>
    <lastmod>${formatDate(lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // 分类页面（更新频率：每周，优先级：0.6）
    for (const category of categories) {
      urlset += `
  <url>
    <loc>${siteUrl}/category/${category.slug}</loc>
    <lastmod>${formatDate(category.updated_at || new Date())}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    // 标签页面（更新频率：每周，优先级：0.6）
    for (const tag of tags) {
      urlset += `
  <url>
    <loc>${siteUrl}/tag/${tag.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    // 归档页面（更新频率：每日，优先级：0.5）
    urlset += `
  <url>
    <loc>${siteUrl}/archives</loc>
    <changefreq>daily</changefreq>
    <priority>0.5</priority>
  </url>`;

    // 生成完整的 sitemap XML
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;

    // 设置响应头并返回 XML
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(sitemapXml);
  } catch (error) {
    console.error('生成 sitemap 失败：', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;