/**
 * RSS 2.0 订阅路由
 * 作用：生成 RSS 2.0 XML，供 RSS 阅读器订阅
 *
 * GET /api/rss - 返回最近 20 篇已发布文章的 RSS XML
 */

const express = require('express');
const pool = require('../config/db');

const router = express.Router();

/**
 * 从 settings 表获取站点配置（带缓存，首次加载后缓存 10 分钟）
 */
let cachedSettings = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

async function getSiteSettings() {
  const now = Date.now();
  if (cachedSettings && now - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }
  try {
    const [rows] = await pool.execute(
      'SELECT siteName, siteDescription, siteUrl FROM settings LIMIT 1'
    );
    cachedSettings = rows[0] || {};
    cacheTime = now;
    return cachedSettings;
  } catch {
    return cachedSettings || {};
  }
}

/**
 * GET /api/rss
 * 返回 RSS 2.0 XML
 */
router.get('/', async (req, res) => {
  try {
    const settings = await getSiteSettings();
    const siteName = settings.siteName || '寿冬与秋';
    const siteDescription = settings.siteDescription || '分享技术，记录成长';
    const siteUrl = settings.siteUrl || `${req.protocol}://${req.get('host')}`;

    // 获取最近 20 篇已发布文章
    const [articles] = await pool.execute(
      `SELECT id, title, summary, content, created_at, updated_at
       FROM articles
       WHERE status = '已发布'
       ORDER BY created_at DESC
       LIMIT 20`
    );

    // 生成 RSS XML
    let itemsXml = '';
    for (const article of articles) {
      const articleUrl = `${siteUrl}/article/${article.id}`;
      const pubDate = new Date(article.created_at).toUTCString();
      const description = article.summary
        ? `<![CDATA[${article.summary}]]>`
        : (article.content
          ? `<![CDATA[${article.content.replace(/<[^>]+>/g, '').substring(0, 300)}...]]>`
          : '');

      itemsXml += `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
    }

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${siteName}]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[${siteDescription}]]></description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(rssXml);
  } catch (e) {
    console.error('生成 RSS 失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
