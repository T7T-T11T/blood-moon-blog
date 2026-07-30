/**
 * 操作日志 Controller 层
 * 职责：处理 HTTP 请求和响应，调用 Service 层获取数据
 */

const logService = require('../services/logService');

/**
 * 获取操作日志列表
 * GET /api/logs
 */
exports.getLogs = async (req, res) => {
  try {
    const {
      user_id,
      action,
      resource_type,
      resource_id,
      start_date,
      end_date,
      page = 1,
      page_size = 20
    } = req.query;

    const result = await logService.getLogs({
      user_id,
      action,
      resource_type,
      resource_id,
      start_date,
      end_date,
      page: parseInt(page),
      page_size: parseInt(page_size)
    });

    res.json({ code: 200, data: result });
  } catch (e) {
    console.error('获取操作日志失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * 获取当前用户的操作日志
 * GET /api/logs/my
 */
exports.getMyLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const data = await logService.getUserLogs(req.user.id, limit);
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取用户日志失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * 获取操作统计
 * GET /api/logs/stats
 */
exports.getActionStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const data = await logService.getActionStats(start_date, end_date);
    res.json({ code: 200, data });
  } catch (e) {
    console.error('获取操作统计失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};