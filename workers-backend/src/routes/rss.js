/**
 * RSS / Sitemap 路由（生产环境 Cloudflare Workers）
 *
 * GET /api/rss         - RSS 2.0 订阅源（最近 20 篇已发布文章）
 * GET /api/rss.xml     - 同上（兼容 .xml 后缀）
 * GET /api/sitemap.xml - Sitemap 0.9 站点地图
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'

const rssRouter = new Hono()

const DEFAULT_SITE_URL = 'https://blood-moon-blog.pages.dev'

/** 转义 CDATA 中不允许出现的 "]]>" 序列 */
function escapeCdata(value = '') {
  return String(value).replace(/\]\]>/g, ']]]]><![CDATA[>')
}

/** 从 site_settings 键值表读取站点配置 */
async function getSiteSettings(c) {
  const db = getDatabase(c.env)
  const rows = await db.select('site_settings', {}, {
    order: { column: 'setting_key', ascending: true }
  })
  const map = {}
  for (const row of rows) {
    map[row.setting_key] = row.setting_value
  }
  return {
    siteName: map.site_name || '寿冬与秋',
    siteDescription: map.site_description || '分享技术，记录成长',
    siteUrl: (map.site_url || DEFAULT_SITE_URL).replace(/\/+$/, '')
  }
}

/** 把 Markdown 内容粗略转成纯文本摘要 */
function toPlainText(markdown = '') {
  return String(markdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')    // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // 链接只留文字
    .replace(/```[\s\S]*?```/g, ' ')          // 代码块
    .replace(/`([^`]*)`/g, '$1')              // 行内代码
    .replace(/^#{1,6}\s+/gm, '')              // 标题标记
    .replace(/[>*_~|-]+/g, ' ')               // 其他标记
    .replace(/\s+/g, ' ')
    .trim()
}

async function renderRss(c) {
  const db = getDatabase(c.env)
  const settings = await getSiteSettings(c)
  const articles = await db.select(
    'articles',
    { status: '已发布', deleted_at: null },
    { order: { column: 'created_at', ascending: false }, limit: 20 }
  )

  let itemsXml = ''
  for (const article of articles) {
    const articleUrl = `${settings.siteUrl}/article/${article.id}`
    const pubDate = new Date(article.created_at || Date.now()).toUTCString()
    const excerpt = article.summary
      ? article.summary
      : (toPlainText(article.content).slice(0, 300) + (article.content ? '...' : ''))
    itemsXml += `
    <item>
      <title><![CDATA[${escapeCdata(article.title)}]]></title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeCdata(excerpt)}]]></description>
    </item>`
  }

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${escapeCdata(settings.siteName)}]]></title>
    <link>${settings.siteUrl}</link>
    <description><![CDATA[${escapeCdata(settings.siteDescription)}]]></description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${settings.siteUrl}/api/rss" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`

  return c.body(rssXml, 200, {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=600'
  })
}

async function renderSitemap(c) {
  const db = getDatabase(c.env)
  const settings = await getSiteSettings(c)
  const [articles, categories, tags] = await Promise.all([
    db.select('articles', { status: '已发布', deleted_at: null }, { order: { column: 'created_at', ascending: false } }),
    db.select('categories', {}, { order: { column: 'id', ascending: true } }),
    db.select('tags', {}, { order: { column: 'id', ascending: true } })
  ])

  const iso = (d) => new Date(d || Date.now()).toISOString()
  let urlset = `
  <url>
    <loc>${settings.siteUrl}/</loc>
    <lastmod>${iso(new Date())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`

  for (const article of articles) {
    urlset += `
  <url>
    <loc>${settings.siteUrl}/article/${article.id}</loc>
    <lastmod>${iso(article.updated_at || article.created_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  }

  for (const category of categories) {
    if (!category.slug) continue
    urlset += `
  <url>
    <loc>${settings.siteUrl}/category/${category.slug}</loc>
    <lastmod>${iso(category.updated_at || new Date())}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
  }

  for (const tag of tags) {
    if (!tag.slug) continue
    urlset += `
  <url>
    <loc>${settings.siteUrl}/tag/${tag.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
  }

  urlset += `
  <url>
    <loc>${settings.siteUrl}/archive</loc>
    <changefreq>daily</changefreq>
    <priority>0.5</priority>
  </url>`

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`

  return c.body(sitemapXml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  })
}

rssRouter.get('/rss', renderRss)
rssRouter.get('/rss.xml', renderRss)
rssRouter.get('/sitemap.xml', renderSitemap)

export default rssRouter