/**
 * 文件上传 API
 * 作用：封装各类文件上传请求
 */
import request from './request';

/**
 * 上传图片
 * @param {File} file - 图片文件
 * @returns {Promise} - 返回 { url, originalName, size }
 */
export function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

/**
 * 上传音频
 * @param {File} file - 音频文件
 */
export function uploadAudio(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/upload/audio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

/**
 * 上传视频
 * @param {File} file - 视频文件
 */
export function uploadVideo(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

/**
 * 上传普通文件
 * @param {File} file - 文件
 */
export function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/upload/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

/**
 * 删除已上传的文件
 * @param {string} url - 文件的相对路径
 */
export function deleteUpload(url) {
  return request.delete('/upload', { data: { url } });
}
