/**
 * 路由配置文件
 * 作用：定义前端所有页面路由和路由守卫
 *
 * 路由结构：
 * 【前台路由】（无需登录）
 * - /                      博客首页（杂志风）
 * - /article/:id           文章详情（含评论）
 * - /category/:slug        分类归档
 * - /tag/:slug             标签归档
 * - /archive               文章归档时间线
 * - /links                 友情链接
 * - /about                 关于我
 * - /search                搜索结果
 *
 * 【后台路由】（需要登录）
 * - /admin                 仪表盘
 * - /admin/articles        文章管理
 * - /admin/categories      分类管理
 * - /admin/tags            标签管理
 * - /admin/comments    评论管理
 * - /admin/links       友链管理
 * - /admin/statistics  数据统计
 * - /admin/settings    系统设置
 *
 * 【认证路由】
 * - /login                 管理员登录
 */

import { createRouter, createWebHashHistory } from 'vue-router';
import { useUserStore } from '../stores/user';

const routes = [
  // ========== 认证路由 ==========
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '管理员登录', requiresAuth: false }
  },

  // ========== 前台路由 ==========
  {
    path: '/',
    component: () => import('../layouts/FrontLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/front/Home.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'article/:id',
        name: 'ArticleDetail',
        component: () => import('../views/front/ArticleDetail.vue'),
        meta: { title: '文章详情' }
      },
      {
        path: 'category/:slug',
        name: 'CategoryList',
        component: () => import('../views/front/CategoryList.vue'),
        meta: { title: '分类归档' }
      },
      {
        path: 'tag/:slug',
        name: 'TagList',
        component: () => import('../views/front/TagList.vue'),
        meta: { title: '标签归档' }
      },
      {
        path: 'archive',
        name: 'Archive',
        component: () => import('../views/front/Archive.vue'),
        meta: { title: '文章归档' }
      },
      {
        path: 'links',
        name: 'Links',
        component: () => import('../views/front/Links.vue'),
        meta: { title: '友情链接' }
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('../views/front/About.vue'),
        meta: { title: '关于我' }
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('../views/front/Search.vue'),
        meta: { title: '搜索结果' }
      }
    ]
  },

  // ========== 后台路由 ==========
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/admin/Dashboard.vue'),
        meta: { title: '仪表盘', requiresAuth: true }
      },
      {
        path: 'articles',
        name: 'ArticleList',
        component: () => import('../views/admin/ArticleList.vue'),
        meta: { title: '文章管理', requiresAuth: true }
      },
      {
        path: 'articles/add',
        name: 'ArticleAdd',
        component: () => import('../views/admin/ArticleEdit.vue'),
        meta: { title: '写文章', requiresAuth: true }
      },
      {
        path: 'articles/edit/:id',
        name: 'ArticleEdit',
        component: () => import('../views/admin/ArticleEdit.vue'),
        meta: { title: '编辑文章', requiresAuth: true }
      },
      {
        path: 'categories',
        name: 'CategoryListAdmin',
        component: () => import('../views/admin/CategoryList.vue'),
        meta: { title: '分类管理', requiresAuth: true }
      },
      {
        path: 'tags',
        name: 'TagListAdmin',
        component: () => import('../views/admin/TagList.vue'),
        meta: { title: '标签管理', requiresAuth: true }
      },
      {
        path: 'comments',
        name: 'CommentList',
        component: () => import('../views/admin/CommentList.vue'),
        meta: { title: '评论管理', requiresAuth: true }
      },
      {
        path: 'links',
        name: 'LinkList',
        component: () => import('../views/admin/LinkList.vue'),
        meta: { title: '友链管理', requiresAuth: true }
      },
      {
        path: 'music',
        name: 'MusicList',
        component: () => import('../views/admin/MusicList.vue'),
        meta: { title: '音乐管理', requiresAuth: true }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('../views/admin/Statistics.vue'),
        meta: { title: '数据统计', requiresAuth: true }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/admin/Settings.vue'),
        meta: { title: '系统设置', requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/admin/Profile.vue'),
        meta: { title: '个人中心', requiresAuth: true }
      }
    ]
  },

  // ========== 旧路径重定向（兼容历史链接） ==========
  { path: '/statistics', redirect: '/admin/statistics' },
  { path: '/settings', redirect: '/admin/settings' },

  // ========== 404 页面 ==========
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  }
});

/**
 * 全局前置守卫
 * - 动态设置页面标题
 * - 检查登录状态
 */
router.beforeEach((to, from, next) => {
  // 动态设置页面标题
  const title = to.meta.title ? `${to.meta.title} - 个人博客` : '个人博客';
  document.title = title;

  const store = useUserStore();

  // 需要认证的路由，未登录则跳转登录页
  if (to.meta.requiresAuth && !store.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else if (to.path === '/login' && store.isLoggedIn) {
    // 已登录用户访问登录页，跳转后台首页
    next('/admin');
  } else {
    next();
  }
});

export default router;
