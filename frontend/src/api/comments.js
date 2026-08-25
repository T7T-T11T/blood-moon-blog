/**
 * 评论 API 模块
 * 作用：封装评论相关的所有接口请求
 *
 * 接口列表：
 * - getComments(articleId)          获取文章评论
 * - postComment(articleId, data)    发表评论
 * - getCommentList(params)          获取评论列表（管理端）
 * - deleteComment(id)               删除评论（管理端）
 */
import request from './request';
/**
 * 获取文章评论（公开接口）
 * 静默模式：接口异常时不弹窗，返回空数组确保正常渲染空状态
 * @param {number} articleId - 文章ID
 * @returns {Promise} 评论树形列表
 */
export async function getComments(articleId) {
  try {
    const visibleRequest = request.get(`/comments/${articleId}`, { silent: true });
    // 兼容尚未发布新版 Worker 的本地预览：旧接口把历史待审核评论单独过滤。
    // 新版接口会忽略这个状态参数并返回相同数据，后续通过 id 去重即可。
    const legacyPendingRequest = request.get(`/comments/${articleId}`, {
      params: { status: '待审核' },
      silent: true
    });
    const [visibleResult, pendingResult] = await Promise.allSettled([
      visibleRequest,
      legacyPendingRequest
    ]);

    const getList = (result) => {
      if (result.status !== 'fulfilled') return [];
      const data = result.value?.data;
      return Array.isArray(data) ? data : (data?.list || []);
    };
    const merged = [...getList(visibleResult), ...getList(pendingResult)];
    const list = [...new Map(merged.map((comment) => [comment.id, comment])).values()];

    return { code: 200, data: { list } };
  } catch (e) {
    console.warn('[评论API] 获取评论失败，返回空列表:', e?.response?.data?.message || e?.message);
    return { code: 200, data: [] };
  }
}

/**
 * 发表评论（公开接口）
 * @param {number} articleId - 文章ID
 * @param {Object} data - 评论数据 { nickname, email, content, parent_id }
 * @returns {Promise} 发表结果
 */
export function postComment(articleId, data) {
  return request.post(`/comments/${articleId}`, data);
}

/**
 * 获取评论列表（管理端，需登录）
 * @param {Object} params - 查询参数 { article_id, page, page_size }
 * @returns {Promise} 分页评论列表
 */
export function getCommentList(params) {
  return request.get('/comments', { params });
}

/**
 * 删除评论（管理端）
 * @param {number} id - 评论ID
 * @returns {Promise} 删除结果
 */
export function deleteComment(id) {
  return request.delete(`/comments/${id}`);
}
