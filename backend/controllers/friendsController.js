/**
 * 友链 Controller 层
 * 职责：处理 HTTP 请求和响应，调用 Service 层
 */
const friendService = require('../services/friendService');

/** 获取已通过友链列表（公开） */
exports.getPublicFriends = async (req, res) => {
  try {
    const data = await friendService.getPublicFriends();
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取友链列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/** 获取所有友链（管理端） */
exports.getAllFriends = async (req, res) => {
  try {
    const data = await friendService.getAllFriends();
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取所有友链失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/** 创建友链 */
exports.createFriend = async (req, res) => {
  try {
    const { name, url, description, avatar, sort_order, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: '网站名称不能为空' });
    }
    if (!url || !url.trim()) {
      return res.status(400).json({ code: 400, message: '网站URL不能为空' });
    }

    const id = await friendService.createFriend({ name, url, description, avatar, sort_order, status });
    res.json({ code: 200, message: '创建成功', data: { id } });
  } catch (e) {
    console.error('创建友链失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/** 更新友链 */
exports.updateFriend = async (req, res) => {
  try {
    const { name, url, description, avatar, sort_order, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: '网站名称不能为空' });
    }
    if (!url || !url.trim()) {
      return res.status(400).json({ code: 400, message: '网站URL不能为空' });
    }

    const result = await friendService.updateFriend(req.params.id, { name, url, description, avatar, sort_order, status });
    if (result === null) {
      return res.status(404).json({ code: 404, message: '友链不存在' });
    }
    res.json({ code: 200, message: '更新成功' });
  } catch (e) {
    console.error('更新友链失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/** 删除友链 */
exports.deleteFriend = async (req, res) => {
  try {
    const deleted = await friendService.deleteFriend(req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 404, message: '友链不存在' });
    }
    res.json({ code: 200, message: '删除成功' });
  } catch (e) {
    console.error('删除友链失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};
