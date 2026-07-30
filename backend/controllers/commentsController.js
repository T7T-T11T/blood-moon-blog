/**
 * 评论 Controller 层
 * 职责：处理 HTTP 请求和响应，调用 Service 层获取数据
 */
const commentService = require('../services/commentService');

/**
 * GET /api/comments/stats - 获取评论统计数据
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await commentService.getCommentStats();
    res.json({ code: 200, data: stats });
  } catch (e) {
    console.error('获取评论统计失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * GET /api/comments - 获取所有评论列表（管理端）
 */
exports.getComments = async (req, res) => {
  try {
    const { status, article_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;

    const result = await commentService.getCommentsList({ status, article_id, page, pageSize });
    res.json({ code: 200, data: result, message: '获取评论列表成功' });
  } catch (e) {
    console.error('获取评论列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * GET /api/comments/:articleId - 获取文章已通过评论（树形结构）
 */
exports.getArticleComments = async (req, res) => {
  try {
    const { articleId } = req.params;

    const id = Number(articleId);
    if (!articleId || isNaN(id) || id < 1) {
      return res.json({ code: 200, data: [], message: '文章ID无效' });
    }

    const tree = await commentService.getArticleComments(id);
    res.json({ code: 200, data: tree, message: '获取评论成功' });
  } catch (e) {
    console.error('获取评论列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * POST /api/comments/:articleId - 发表评论
 */
exports.createComment = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { nickname, content, parent_id } = req.body;

    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ code: 400, message: '昵称不能为空' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ code: 400, message: '评论内容不能为空' });
    }

    const ipAddress = req.ip || null;
    const newId = await commentService.createComment({ articleId, nickname, content, parent_id, ipAddress });

    res.json({ code: 200, data: { id: newId }, message: '评论成功，等待审核' });
  } catch (e) {
    console.error('发表评论失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * PUT /api/comments/:id/status - 更新评论状态
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['待审核', '已通过', '已拒绝'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ code: 400, message: '状态值不合法（可选：待审核/已通过/已拒绝）' });
    }

    const updated = await commentService.updateCommentStatus({ id, status });
    if (!updated) {
      return res.status(404).json({ code: 404, message: '评论不存在' });
    }
    res.json({ code: 200, message: '状态更新成功' });
  } catch (e) {
    console.error('更新评论状态失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * DELETE /api/comments/:id - 删除评论
 */
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await commentService.deleteComment(id);
    if (!deleted) {
      return res.status(404).json({ code: 404, message: '评论不存在' });
    }
    res.json({ code: 200, message: '已删除' });
  } catch (e) {
    console.error('删除评论失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};
