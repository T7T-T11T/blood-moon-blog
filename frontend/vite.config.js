/**
 * Vite 配置文件
 * 作用：配置 Vite 构建工具，包括 Vue 插件、路径别名和开发服务器代理
 *
 * proxy 代理：把 /api 开头的请求转发到后端 3000 端口，解决跨域问题
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  // 路径别名：@ 指向 src 目录，简化导入路径
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,           // 前端开发服务器端口
    open: true,           // 启动时自动打开浏览器
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
