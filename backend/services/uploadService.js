/**
 * 上传 Service 层
 * 职责：封装文件存储、类型检测、文件名生成等底层逻辑
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========== 配置常量 ==========

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const DIRS = {
  image: path.join(UPLOAD_DIR, 'images'),
  audio: path.join(UPLOAD_DIR, 'audios'),
  video: path.join(UPLOAD_DIR, 'videos'),
  file: path.join(UPLOAD_DIR, 'files')
};

const MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-m4a'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska', 'video/quicktime', 'video/x-msvideo'],
  file: [
    'application/pdf', 'application/zip', 'application/json',
    'text/plain', 'text/csv', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]
};

const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  file: 20 * 1024 * 1024
};

// ========== 工具函数 ==========

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateFileName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}_${random}${ext}`;
}

function detectFileType(mimetype, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const extMap = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    audio: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'],
    video: ['.mp4', '.webm', '.ogv', '.mkv', '.mov', '.avi'],
    file: ['.pdf', '.zip', '.rar', '.7z', '.json', '.txt', '.csv',
           '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.md',
           '.js', '.ts', '.vue', '.html', '.css']
  };

  for (const [type, exts] of Object.entries(extMap)) {
    if (exts.includes(ext)) return type;
  }
  for (const [type, mimes] of Object.entries(MIME_TYPES)) {
    if (mimes.includes(mimetype)) return type;
  }
  return null;
}

function buildFileUrl(filePath) {
  return '/uploads/' + path.relative(UPLOAD_DIR, filePath).replace(/\\/g, '/');
}

// ========== Multer 工厂 ==========

function createStorage(fileType) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const detectedType = detectFileType(file.mimetype, file.originalname);
      const typeDir = detectedType || fileType || 'file';
      ensureDir(DIRS[typeDir]);
      cb(null, DIRS[typeDir]);
    },
    filename: (req, file, cb) => {
      cb(null, generateFileName(file.originalname));
    }
  });
}

function createFileFilter(fileType) {
  return (req, file, cb) => {
    const allowedMimes = MIME_TYPES[fileType] || MIME_TYPES.file;
    if (allowedMimes.includes(file.mimetype) || detectFileType(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型：${file.mimetype}`));
    }
  };
}

function createUploadMiddleware(fileType) {
  return multer({
    storage: createStorage(fileType),
    fileFilter: createFileFilter(fileType),
    limits: { fileSize: FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.file }
  }).single('file');
}

// ========== 文件删除 ==========

/**
 * 删除已上传的文件
 * @param {string} url - 文件相对路径，如 /uploads/images/xxx.jpg
 */
function deleteFile(url) {
  const relative = url.replace(/^\/uploads\//, '');
  const filePath = path.join(UPLOAD_DIR, relative);
  const normalizedPath = path.normalize(filePath);

  // 安全检查：确保路径在 uploads 目录内
  if (!normalizedPath.startsWith(UPLOAD_DIR)) {
    return { success: false, message: '非法路径' };
  }

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return { success: true };
  }
  return { success: false, message: '文件不存在' };
}

// ========== 文件列表 ==========

/**
 * 递归获取 uploads 目录下的所有文件
 * @param {string|null} subDir - 子目录名（image/audio/video/file），null 表示全部
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 */
function listFiles(subDir, page, pageSize) {
  const dirs = subDir ? [path.join(UPLOAD_DIR, subDir + 's')] : Object.values(DIRS);

  let allFiles = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    walkDir(dir, allFiles);
  }

  // 按修改时间倒序
  allFiles.sort((a, b) => b.mtime - a.mtime);

  const total = allFiles.length;
  const start = (page - 1) * pageSize;
  const items = allFiles.slice(start, start + pageSize);

  return {
    list: items.map(f => ({
      name: f.name,
      path: f.relPath,
      url: buildFileUrl(f.absPath),
      size: f.size,
      type: getFileCategory(f.name),
      mtime: f.mtime
    })),
    total,
    page,
    page_size: pageSize
  };
}

function walkDir(dir, result) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isFile()) {
      const stat = fs.statSync(absPath);
      result.push({
        name: entry.name,
        absPath,
        relPath: path.relative(UPLOAD_DIR, absPath).replace(/\\/g, '/'),
        size: stat.size,
        mtime: stat.mtimeMs
      });
    }
  }
}

function getFileCategory(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const videoExts = ['.mp4', '.webm', '.mkv', '.mov', '.avi'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'];
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  return 'file';
}

/**
 * 按文件名删除文件（在 uploads 目录内搜索）
 */
function deleteByFilename(filename) {
  // 安全校验
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { success: false, message: '非法文件名' };
  }

  // 在所有子目录中搜索
  for (const dir of Object.values(DIRS)) {
    if (!fs.existsSync(dir)) continue;
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      // 二次安全校验
      const normalized = path.normalize(filePath);
      if (!normalized.startsWith(UPLOAD_DIR)) {
        return { success: false, message: '非法路径' };
      }
      fs.unlinkSync(filePath);
      return { success: true };
    }
  }
  return { success: false, message: '文件不存在' };
}

module.exports = {
  UPLOAD_DIR,
  DIRS,
  MIME_TYPES,
  FILE_SIZE_LIMITS,
  ensureDir,
  generateFileName,
  detectFileType,
  buildFileUrl,
  createUploadMiddleware,
  deleteFile,
  listFiles,
  deleteByFilename
};
