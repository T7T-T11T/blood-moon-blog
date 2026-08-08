/**
 * 博客 API 冒烟测试（生产环境）
 * 用法：node tests/smoke-test.mjs
 * 覆盖：健康检查、公开接口、RSS/站点地图、防垃圾拦截、前端首页
 * 环境变量：SMOKE_API_BASE / SMOKE_SITE（默认指向生产环境）
 */
const API_BASE = process.env.SMOKE_API_BASE || 'https://blood-moon-blog-api.2198789717.workers.dev/api';
const SITE = process.env.SMOKE_SITE || 'https://blood-moon-blog.pages.dev';

let failed = 0;
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`);
  } catch (e) {
    failed += 1;
    results.push(`❌ ${name}: ${e.message}`);
  }
}

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function main() {
  await check('健康检查', async () => {
    const r = await (await fetch(`${API_BASE}/health`)).json();
    expect(r.status === 'ok' && r.database === 'connected', `health 异常: ${JSON.stringify(r)}`);
  });

  await check('文章列表', async () => {
    const r = await (await fetch(`${API_BASE}/articles/public?page=1&page_size=3`)).json();
    expect(r.code === 200 && Array.isArray(r.data?.list), '文章列表格式异常');
  });

  for (const [name, path] of [
    ['分类', 'categories'],
    ['标签', 'tags'],
    ['友链', 'links'],
    ['设置', 'settings'],
    ['音乐', 'music']
  ]) {
    await check(`${name}接口`, async () => {
      const r = await (await fetch(`${API_BASE}/${path}`)).json();
      expect(r.code === 200, `${path} 返回异常`);
    });
  }

  await check('RSS 订阅源', async () => {
    const res = await fetch(`${API_BASE}/rss`);
    const text = await res.text();
    expect(res.headers.get('content-type')?.includes('xml') && text.includes('<rss'), 'RSS 不是 XML');
  });

  await check('站点地图', async () => {
    const res = await fetch(`${API_BASE}/sitemap.xml`);
    const text = await res.text();
    expect(text.includes('<urlset'), '站点地图异常');
  });

  await check('垃圾评论拦截', async () => {
    const res = await fetch(`${API_BASE}/comments/30`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 't', content: '加微信 刷单兼职' })
    });
    expect(res.status === 400, `垃圾评论未拦截（HTTP ${res.status}）`);
  });

  await check('前端首页', async () => {
    const res = await fetch(`${SITE}/`);
    const text = await res.text();
    expect(res.status === 200 && text.includes('寿冬与秋'), '首页加载异常');
  });

  console.log(results.join('\n'));
  console.log(failed === 0 ? '\n🎉 全部通过' : `\n❌ ${failed} 项失败`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});