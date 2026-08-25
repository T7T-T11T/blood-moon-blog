/** 公开文章列表的最小字段集：正文只能在详情、搜索内部读取，不能返回给读者列表。 */
export const PUBLIC_CARD_COLUMNS =
  'id, title, summary, cover_image, category_id, is_top, view_count, like_count, created_at, updated_at';

export function textExcerpt(html, limit = 180) {
  const text = String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

export function toPublicCard(article) {
  return {
    id: article.id,
    title: article.title,
    summary: article.summary || textExcerpt(article.content),
    cover_image: article.cover_image || '',
    category_id: article.category_id || null,
    category_name: article.category_name || '',
    category_slug: article.category_slug || '',
    is_top: article.is_top || 0,
    view_count: article.view_count || 0,
    like_count: article.like_count || 0,
    created_at: article.created_at,
    updated_at: article.updated_at
  };
}
