/**
 * Vite 配置文件
 * 作用：配置 Vite 构建工具，包括 Vue 插件、路径别名和开发服务器代理
 *
 * proxy 代理：把 /api 开头的请求转发到后端 3000 端口，解决跨域问题
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

/** @type {string} 构建版本号：使用时间戳确保每次构建唯一 */
const BUILD_VERSION = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);

export default defineConfig({
  // 全局常量定义：前端代码中可通过 import.meta.env.APP_VERSION 访问
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION)
  },
  plugins: [
    vue(),
    // 版本注入插件：将构建版本号写入 index.html 的 meta 标签
    {
      name: 'version-injector',
      transformIndexHtml(html) {
        return html.replace('__APP_VERSION__', BUILD_VERSION);
      }
    }
  ],
  // 路径别名：@ 指向 src 目录，简化导入路径
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173, // 前端开发服务器端口
    open: true, // 启动时自动打开浏览器
    // 代理配置：前端请求自动转发到后端 http://localhost:3000
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 500, // chunk 体积警告阈值（KB）
    // 禁用 HTML 内联以避免构建错误
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // 代码分割：将大型第三方库拆分为独立 chunk，提升缓存命中率
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) {
              return 'vendor-echarts';
            }
            if (id.includes('md-editor-v3') || id.includes('codemirror')) {
              return 'vendor-editor';
            }
            if (id.includes('element-plus')) {
              return 'vendor-element';
            }
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vendor-vue';
            }
            return 'vendor'; // 其他第三方库统一打包
          }
        }
      }
    }
  }
});
