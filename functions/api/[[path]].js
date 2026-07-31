/**
 * Cloudflare Pages Functions - API 代理
 *
 * 功能：将前端发往 /api/* 的请求代理到 Cloudflare Workers 后端
 * 支持所有 HTTP 方法（GET/POST/PUT/PATCH/DELETE/OPTIONS）
 *
 * 配置：
 *   BACKEND_URL - 后端 Workers 的基础地址（在 Cloudflare Pages Dashboard 设置）
 *
 * 路径：dist/.functions/api/[[path]].js  或  项目根 functions/api/[[path]].js
 * Cloudflare Pages 自动将此文件作为 /api/* 的路由处理器
 *
 * 注意：wrangler 4.x 的 pages deploy 只识别 dist/.functions/ 目录！
 */

/**
 * 处理 API 请求的主函数
 *
 * Cloudflare Pages Functions onRequest 签名（wrangler 4.x）：
 *   onRequest(context) 或 onRequest(request, context)
 *   - context.request 或第一个参数 request 为原始请求
 *   - context.env 包含环境变量
 *
 * @param {Request} [request] - 原始 HTTP 请求（若有）
 * @param {Object} context - Cloudflare Pages 上下文
 * @param {Object} context.env - 环境变量（BACKEND_URL 等）
 * @returns {Promise<Response>} 代理后的响应
 */
export async function onRequest(request, context) {
  // 兼容 wrangler 4.x 的两种签名：onRequest(context) 或 onRequest(request, context)
  const req = request instanceof Request ? request : context.request;
  const env = request instanceof Request ? context.env : request.env;

  // 从 context.env 获取后端地址
  const backendUrl = env.BACKEND_URL;

  // 检查后端地址是否配置
  if (!backendUrl) {
    return new Response(
      JSON.stringify({
        code: 500,
        message: 'BACKEND_URL 环境变量未配置',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 从原始请求中提取路径和查询参数
  const url = new URL(req.url);
  // 保留 /api 前缀路径
  const path = url.pathname;
  const queryString = url.search;

  // 构造目标 URL
  const targetUrl = `${backendUrl}${path}${queryString}`;

  // 复制原始请求的 Headers
  const headers = new Headers(req.headers);
  // 移除可能导致问题的头
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');

  // 对于非 GET/HEAD/DELETE 请求，读取请求体
  // Cloudflare Functions 中 body 是 ReadableStream，需要先读取
  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') {
    try {
      body = await req.clone().text();
      if (!body) body = undefined;
    } catch (_) {
      body = undefined;
    }
  }

  // 构造代理请求
  const proxyRequest = new Request(targetUrl, {
    method: req.method,
    headers: headers,
    body: body,
  });

  // 添加 Cloudflare 转发头（后端可获取客户端真实 IP）
  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for') ||
    '';
  proxyRequest.headers.set('X-Forwarded-For', clientIp);
  proxyRequest.headers.set('X-Forwarded-Proto', 'https');

  // 发送请求到后端
  try {
    const response = await fetch(proxyRequest);

    // 复制响应头
    const responseHeaders = new Headers(response.headers);

    // 添加 CORS 相关头
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    responseHeaders.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );

    // 返回响应给前端
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    // 后端不可达时返回友好错误
    return new Response(
      JSON.stringify({
        code: 502,
        message: '后端服务暂时不可用，请稍后重试',
        error: error.message,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
