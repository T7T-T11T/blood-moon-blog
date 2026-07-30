/**
 * 上传 Controller 层
 * 职责：处理 HTTP 请求和响应，调用 Service 层的 multer 工厂和文件操作
 */
const uploadService = require('../services/uploadService');

/**
 * 生成通用上传处理函数的工厂方法
 * @param {string} type - 上传类型：image | audio | video | file
 * @param {string} label - 类型中文名称，用于错误提示
 * @returns {Function} Express 路由处理函数
 */
function createUploadHandler(type, label) {
  /**
   * Express 路由处理函数
   * @param {import('express').Request} req - 请求对象
   * @param {import('express').Response} res - 响应对象
   */
  return (req, res) => {
    uploadService.ensureDir(uploadService.DIRS[type]);
    const upload = uploadService.createUploadMiddleware(type);

    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ code: 400, message: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ code: 400, message: `请选择要上传的${label}` });
      }

      const url = uploadService.buildFileUrl(req.file.path);
      res.json({
        code: 200,
        message: '上传成功',
        data: { url, originalName: req.file.originalname, size: req.file.size }
      });
    });
  };
}

/**
 * POST /api/upload/image - 上传图片
 */
exports.uploadImage = createUploadHandler('image', '图片');

/**
 * POST /api/upload/audio - 上传音频
 */
exports.uploadAudio = createUploadHandler('audio', '音频');

/**
 * POST /api/upload/video - 上传视频
 */
exports.uploadVideo = createUploadHandler('video', '视频');

/**
 * POST /api/upload/file - 上传普通文件
 */
exports.uploadFile = createUploadHandler('file', '文件');

/**
 * DELETE /api/upload - 删除已上传的文件
 */
exports.deleteFile = (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ code: 400, message: '缺少文件路径' });
    }

    const result = uploadService.deleteFile(url);
    if (result.success) {
      res.json({ code: 200, message: '删除成功' });
    } else {
      res.status(result.message === '非法路径' ? 400 : 404).json({
        code: result.message === '非法路径' ? 400 : 404,
        message: result.message
      });
    }
  } catch (e) {
    console.error('删除文件失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * GET /api/upload/list - 获取上传目录文件列表
 * 支持查询参数：dir（子目录，默认全部）、page、page_size
 */
exports.listFiles = (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 50;
    const dir = req.query.dir || null;

    const result = uploadService.listFiles(dir, page, pageSize);
    res.json({ code: 200, data: result });
  } catch (e) {
    console.error('获取文件列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * DELETE /api/upload/:filename - 按文件名删除文件
 */
exports.deleteByFilename = (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ code: 400, message: '缺少文件名' });
    }

    const result = uploadService.deleteByFilename(filename);
    if (result.success) {
      res.json({ code: 200, message: '删除成功' });
    } else {
      res.status(404).json({ code: 404, message: result.message });
    }
  } catch (e) {
    console.error('删除文件失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};