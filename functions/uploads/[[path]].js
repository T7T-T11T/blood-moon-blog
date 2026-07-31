/**
 * Cloudflare Pages Functions - 上传文件代理
 * 
 * 功能：将前端发往 /uploads/* 的请求代理到后端服务器
 * 用于展示用户上传的图片、音乐等资源
 * 
 * 注意：
 *   上传文件通过 /api/upload/* 路由处理（已在 api proxy 中覆盖）
 *   此函数仅负责静态文件的读取代理
 * 
 * 配置：
 *   BACKEND_URL 环境变量指向后端服务地址
 */

/**
 * 处理上传文件的代理函数
 * 
 * @param {Request} request - 原始 HTTP 请求
 * @param {Object} env - Cloudflare 环境变量
 * @param {Object} ctx - 执行上下文
 * @returns {Promise<Response>} 代理后的响应
 */
export async function onRequest(request, env, ctx) {
  const backendUrl = env.BACKEND_URL;

  if (!backendUrl) {
    return new Response('Backend not configured', { status: 500 });
  }

  // 获取请求路径
  const url = new URL(request.url);
  const path = url.pathname;
  const queryString = url.search;

  // 构造后端文件 URL（uploads 目录）
  const targetUrl = `${backendUrl}${path}${queryString}`;

  try {
    // 从后端获取文件
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        // 添加缓存控制头
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

    // 检查是否为有效响应
    if (!response.ok) {
      return new Response('File not found', { status: 404 });
    }

    // 返回文件，保留原始 Content-Type
    const headers = new Headers(response.headers);
    // 添加长缓存（上传文件不常变更）
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(response.body, {
      status: response.status,
      headers: headers
    });
  } catch (error) {
    return new Response('Failed to fetch file', { status: 502 });
  }
}
