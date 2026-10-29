/**
 * Service Worker - 预缓存与离线支持
 * 策略：
 * - /assets/*（带 hash 的构建资源）：缓存优先（immutable）
 * - 页面导航：网络优先，失败回退缓存（离线可访问）
 * - 其他同源静态资源：stale-while-revalidate
 */
const CACHE_PREFIX = 'blood-moon-blog';
const SHELL_CACHE = CACHE_PREFIX + '-shell-v3';
const ASSET_CACHE = CACHE_PREFIX + '-assets-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add('/')).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE && key !== ASSET_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 构建资源（带 hash，不可变）：缓存优先
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 页面导航：网络优先，失败回退缓存页面（兜底永不返回 undefined）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          const exact = await caches.match(event.request);
          if (exact) return exact;
          const shell = await caches.match('/');
          if (shell) return shell;
          return new Response(
            '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>网络异常</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;color:#333"><div style="text-align:center"><h1 style="font-size:28px;margin-bottom:8px">网络异常</h1><p>页面加载失败，请检查网络后重试。</p></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 文章封面/配图/上传图片：缓存优先（图片不常变，重复访问秒开）
  if (
    url.pathname.startsWith('/article-covers/') ||
    url.pathname.startsWith('/article-assets/') ||
    url.pathname.startsWith('/uploads/') ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match(request));
      })
    );
    return;
  }

  // 其他同源静态资源：stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request));
      return cached || network;
    })
  );
});