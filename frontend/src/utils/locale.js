import { ref } from 'vue';
import { english } from './messages.js';
export const locale = ref('zh-CN');
try { if (localStorage.getItem('site-language') === 'en') locale.value = 'en'; } catch { /* Use Chinese when storage is unavailable. */ }
export function t(text) { return locale.value === 'en' ? (english[text] ?? text) : text; }
export function setLocale(value) {
  locale.value = value === 'en' ? 'en' : 'zh-CN';
  try { localStorage.setItem('site-language', locale.value); } catch { /* The selection still works for this session. */ }
}
