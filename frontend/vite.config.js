/**
 * Vite 配置文件
 * 作用：配置 Vite 构建工具，包括 Vue 插件、路径别名和开发服务器代理
 *
 * proxy 代理：把 /api 开头的请求转发到后端 3000 端口，解决跨域问题
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';

/** @type {string} 构建版本号：使用时间戳确保每次构建唯一 */
const BUILD_VERSION = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);

/**
 * Element Plus 按需解析器
 * 直接指向单组件入口（element-plus/es/components/<name>/index.mjs），
 * 避免从 element-plus/es 整包入口导入导致无法摇树、打包进全部组件。
 */
function elementPlusResolver() {
  const toKebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  // 无独立入口的子组件 -> 由父包导出（如 ElFormItem 由 form 包导出）
  const nestedParent = {
    'form-item': 'form',
    'option': 'select',
    'option-group': 'select',
    'radio-button': 'radio',
    'radio-group': 'radio',
    'checkbox-button': 'checkbox',
    'checkbox-group': 'checkbox',
    'tab-pane': 'tabs',
    'step': 'steps',
    'table-column': 'table',
    'sub-menu': 'menu',
    'menu-item': 'menu',
    'menu-item-group': 'menu',
    'breadcrumb-item': 'breadcrumb',
    'carousel-item': 'carousel',
    'collapse-item': 'collapse',
    'skeleton-item': 'skeleton',
    'descriptions-item': 'descriptions',
    'timeline-item': 'timeline',
    'dropdown-item': 'dropdown',
    'dropdown-menu': 'dropdown'
  };
  const resolveComponent = (name) => {
    if (name === 'ElIcon') {
      return {
        name,
        from: 'element-plus/es/components/icon/index.mjs',
        sideEffects: 'element-plus/es/components/icon/style/css'
      };
    }
    if (name.startsWith('ElIcon')) {
      return { name: name.slice(5), from: '@element-plus/icons-vue' };
    }
    if (!/^El[A-Z]/.test(name)) return;
    const partial = toKebab(name.slice(2));
    const pkg = nestedParent[partial] || partial;
    return {
      name,
      from: `element-plus/es/components/${pkg}/index.mjs`,
      sideEffects: `element-plus/es/components/${partial}/style/css`
    };
  };
  const resolveDirective = (name) => {
    const map = {
      Loading: { importName: 'ElLoadingDirective', partial: 'loading' },
      Popover: { importName: 'ElPopoverDirective', partial: 'popover' },
      InfiniteScroll: { importName: 'ElInfiniteScroll', partial: 'infinite-scroll' }
    };
    const d = map[name];
    if (!d) return;
    return {
      name: d.importName,
      from: `element-plus/es/components/${d.partial}/index.mjs`,
      sideEffects: `element-plus/es/components/${d.partial}/style/css`
    };
  };
  return [
    { type: 'component', resolve: resolveComponent },
    { type: 'directive', resolve: resolveDirective }
  ];
}

export default defineConfig({
  // 全局常量定义：前端代码中可通过 import.meta.env.APP_VERSION 访问
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION)
  },
  plugins: [
    vue(),
    // Element Plus 按需自动引入（首屏体积优化）
    AutoImport({ resolvers: [elementPlusResolver()] }),
    Components({ resolvers: [elementPlusResolver()], directives: true }),
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

            if (id.includes('@element-plus/icons-vue')) {
              return 'vendor-icons';
            }
            if (id.includes('element-plus')) {
              return 'vendor-element';
            }
            if (id.includes('vue-router') || id.includes('pinia') || id.includes('@vue/') || id.includes('node_modules/vue/')) {
              return 'vendor-vue';
            }
            // 其余依赖交给 Rollup 按真实依赖自动分包（懒加载代码不会进首屏）
          }
        }
      }
    }
  }
});