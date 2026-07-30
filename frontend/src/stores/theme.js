/**
 * 主题状态管理 (Pinia Store)
 * 管理 dark/light 主题切换，持久化到 localStorage
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(localStorage.getItem('theme') || 'dark');

  function setTheme(newTheme) {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
  }

  // 初始化时应用主题
  applyTheme(theme.value);

  return { theme, setTheme, toggleTheme };
});
