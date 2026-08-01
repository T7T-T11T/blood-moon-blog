/**
 * 版本检查工具
 * 作用：检测前端是否有新版本可用，提示用户刷新页面
 * 原理：
 *   1. 构建时在 index.html 中注入 app-version meta 标签
 *   2. 应用启动时保存当前版本号到 localStorage
 *   3. 定时检查 index.html 中的版本号是否变化
 *   4. 检测到新版本时提示用户刷新
 */

/** @type {string} localStorage 存储版本号的 key */
const VERSION_KEY = 'app_version';

/** @type {number} 版本检查间隔（毫秒），默认 5 分钟 */
const CHECK_INTERVAL = 5 * 60 * 1000;

/**
 * 获取当前页面的版本号
 * @returns {string} 版本号字符串
 */
export function getCurrentVersion() {
  const meta = document.querySelector('meta[name="app-version"]');
  return meta?.content || 'unknown';
}

/**
 * 获取已保存的版本号
 * @returns {string|null} 已保存的版本号
 */
export function getSavedVersion() {
  try {
    return localStorage.getItem(VERSION_KEY);
  } catch {
    return null;
  }
}

/**
 * 保存当前版本号到 localStorage
 * @param {string} version - 版本号
 */
export function saveVersion(version) {
  try {
    localStorage.setItem(VERSION_KEY, version);
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 检查是否有新版本
 * 通过 fetch index.html（禁止缓存）获取最新版本号
 * @returns {Promise<{hasNew: boolean, newVersion: string, oldVersion: string}>}
 */
export async function checkForUpdate() {
  const currentVersion = getCurrentVersion();
  const savedVersion = getSavedVersion();

  try {
    // 随机参数绕过缓存
    const response = await fetch(`${window.location.pathname}?v=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      return { hasNew: false, newVersion: currentVersion, oldVersion: savedVersion };
    }

    const html = await response.text();
    const versionMatch = html.match(/<meta\s+name="app-version"\s+content="([^"]+)"[^>]*>/i);
    const latestVersion = versionMatch?.[1] || currentVersion;

    return {
      hasNew: latestVersion !== currentVersion,
      newVersion: latestVersion,
      oldVersion: currentVersion
    };
  } catch {
    return { hasNew: false, newVersion: currentVersion, oldVersion: savedVersion };
  }
}

/**
 * 启动版本检查
 * @param {Object} options - 配置选项
 * @param {Function} [options.onUpdate] - 检测到新版本时的回调函数
 * @param {number} [options.interval] - 检查间隔（毫秒）
 * @returns {Function} 停止检查的函数
 */
export function startVersionCheck({ onUpdate, interval = CHECK_INTERVAL } = {}) {
  // 启动时保存版本号
  const currentVersion = getCurrentVersion();
  saveVersion(currentVersion);

  // 异步检查一次
  checkForUpdate().then(({ hasNew, newVersion }) => {
    if (hasNew && onUpdate) {
      onUpdate(newVersion);
    }
  });

  // 定时检查
  const timer = setInterval(() => {
    checkForUpdate().then(({ hasNew, newVersion }) => {
      if (hasNew && onUpdate) {
        onUpdate(newVersion);
      }
    });
  }, interval);

  // 返回停止函数
  return () => clearInterval(timer);
}
