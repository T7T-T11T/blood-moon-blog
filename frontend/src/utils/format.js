/**
 * 日期时间格式化工具
 * 作用：统一项目中重复的日期/时间格式化函数，消除各组件内多次重复定义
 *
 * 提供函数：
 * - formatDate(dateStr)     日期 → YYYY-MM-DD
 * - formatDateTime(dateStr) 日期时间 → YYYY-MM-DD HH:mm:ss
 *
 * 注意：
 * - Dashboard.vue 的 formatDate（toLocaleDateString "X月Y日"）与 formatTime（相对时间）语义不同，不使用本工具
 * - MusicPlayer.vue 的 formatTime（秒数 → mm:ss）语义不同，不使用本工具
 * - ArticleEdit/CommentList/ArticleList 使用 toLocaleString 格式，依赖运行环境，保留本地实现
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {string|number|Date} dateStr - 日期字符串 / 时间戳 / Date 对象
 * @returns {string} 格式化后的日期（如 2026-08-05），空值或无效日期返回空字符串
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  // 兼容无效日期（如 Invalid Date），避免展示 NaN-NaN-NaN
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 * @param {string|number|Date} dateStr - 日期字符串 / 时间戳 / Date 对象
 * @returns {string} 格式化后的日期时间（如 2026-08-05 14:30:00），空值或无效日期返回空字符串
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}
