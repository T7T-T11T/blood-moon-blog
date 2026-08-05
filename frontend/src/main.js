/**
 * Vue 应用入口文件
 * 作用：创建 Vue 应用实例，注册插件（路由、状态管理、UI库），挂载到 DOM
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

import App from './App.vue';
import router from './router';
import './style.css';
import lazyLoad from './directives/lazyLoad';

const app = createApp(App);

// 注册 Pinia 状态管理（user/theme store 各自手动 localStorage 持久化，无需插件）
const pinia = createPinia();
app.use(pinia);

// 注册 Vue Router 路由
app.use(router);

// 注册 Element Plus UI 组件库
app.use(ElementPlus);

// 注册图片懒加载自定义指令
app.directive('lazy', lazyLoad);

// 挂载到 #app 元素
app.mount('#app');
