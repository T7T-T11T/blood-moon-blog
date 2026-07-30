/**
 * 文章 Controller 层
 * 职责：处理 HTTP 请求和响应，调用 Service 层获取数据
 */
const articleService = require('../services/articleService');

// ==================== 公开接口 ====================

exports.getPublicArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const { category_id, tag_id, keyword } = req.query;

    const result = await articleService.getPublishedArticles({ page, pageSize, category_id, tag_id, keyword });
    res.json({ code: 200, data: result });
  } catch (e) {
    console.error('获取文章列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.getLatestArticles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const data = await articleService.getLatestArticles(limit);
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取最新文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.getHotArticles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const data = await articleService.getHotArticles(limit);
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取热门文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.getArticlesByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const result = await articleService.getArticlesByCategory({ slug: req.params.slug, page, pageSize });

    if (!result.category) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }
    res.json({ code: 200, data: result });
  } catch (e) {
    console.error('获取分类文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.getArticlesByTag = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const result = await articleService.getArticlesByTag({ slug: req.params.slug, page, pageSize });

    if (!result.tag) {
      return res.status(404).json({ code: 404, message: '标签不存在' });
    }
    res.json({ code: 200, data: result });
  } catch (e) {
    console.error('获取标签文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.search = async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    if (!keyword) {
      return res.json({ code: 200, data: { keyword: '', list: [], pagination: { page: 1, page_size: 10, total: 0, total_pages: 0 } } });
    }

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;

    const result = await articleService.searchArticles({ keyword, page, pageSize });
    res.json({ code: 200, data: result });
  } catch (e) {
    console.error('搜索文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.getArchives = async (req, res) => {
  try {
    const data = await articleService.getArchives();
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取文章归档失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * 获取相关文章（按同分类或同标签推荐）
 * GET /api/articles/public/related/:id
 */
exports.getRelatedArticles = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    const data = await articleService.getRelatedArticles(id, limit);
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取相关文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.getArticleDetail = async (req, res) => {
  try {
    const article = await articleService.getPublishedArticleDetail(req.params.id);
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }
    res.json({ code: 200, data: article });
  } catch (e) {
    console.error('获取文章详情失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// ==================== 管理接口 ====================

exports.getAdminArticles = async (req, res) => {
  try {
    const { status, category_id, keyword } = req.query;
    const data = await articleService.getAdminArticles({
      userId: req.user.id,
      status,
      category_id,
      keyword
    });
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取文章列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.getAdminArticleDetail = async (req, res) => {
  try {
    const article = await articleService.getAdminArticleDetail({
      id: req.params.id,
      userId: req.user.id
    });
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }
    res.json({ code: 200, data: article });
  } catch (e) {
    console.error('获取文章详情失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.createArticle = async (req, res) => {
  try {
    const { title, content, summary, cover_image, status, category_id, tag_ids } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ code: 400, message: '标题不能为空' });
    }
    if (!content) {
      return res.status(400).json({ code: 400, message: '内容不能为空' });
    }

    const articleId = await articleService.createArticle({
      title, content, summary, cover_image, status, category_id, tag_ids,
      userId: req.user.id
    });

    res.json({ code: 200, message: '创建成功', data: { id: articleId } });
  } catch (e) {
    console.error('新增文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.updateArticle = async (req, res) => {
  try {
    const { title, content, summary, cover_image, status, category_id, tag_ids } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ code: 400, message: '标题不能为空' });
    }

    const result = await articleService.updateArticle({
      id: req.params.id,
      title, content, summary, cover_image, status, category_id, tag_ids,
      userId: req.user.id
    });

    if (result === null) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }
    res.json({ code: 200, message: '更新成功' });
  } catch (e) {
    console.error('更新文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    const deleted = await articleService.deleteArticle({
      id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }
    res.json({ code: 200, message: '已删除' });
  } catch (e) {
    console.error('删除文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// ==================== 回收站接口 ====================

/**
 * 获取回收站文章列表
 * GET /api/trash
 */
exports.getTrashArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;
    const data = await articleService.getTrashArticles({
      userId: req.user.id,
      page,
      pageSize
    });
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取回收站文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * 恢复文章
 * POST /api/trash/:id/restore
 */
exports.restoreArticle = async (req, res) => {
  try {
    const restored = await articleService.restoreArticle({
      id: req.params.id,
      userId: req.user.id
    });

    if (!restored) {
      return res.status(404).json({ code: 404, message: '文章不存在或已恢复' });
    }
    res.json({ code: 200, message: '恢复成功' });
  } catch (e) {
    console.error('恢复文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * 永久删除文章
 * DELETE /api/trash/:id
 */
exports.permanentDeleteArticle = async (req, res) => {
  try {
    const deleted = await articleService.permanentDeleteArticle({
      id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }
    res.json({ code: 200, message: '已永久删除' });
  } catch (e) {
    console.error('永久删除文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * 清空回收站
 * DELETE /api/trash/clear
 */
exports.clearAllTrash = async (req, res) => {
  try {
    const count = await articleService.clearAllTrash({
      userId: req.user.id
    });
    res.json({ code: 200, message: `已清空回收站，共删除 ${count} 篇文章` });
  } catch (e) {
    console.error('清空回收站失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};
