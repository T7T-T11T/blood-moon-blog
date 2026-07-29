/**
 * Vue 应用入口文件
 * 作用：创建 Vue 应用实例，注册插件（路由、状态管理、UI库），挂载到 DOM
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);

// 注册 Pinia 状态管理
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

// 注册 Vue Router 路由
app.use(router);

// 注册 Element Plus UI 组件库
app.use(ElementPlus);

// 注册 Element Plus 图标（全局组件）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 挂载到 #app 元素
app.mount('#app');
