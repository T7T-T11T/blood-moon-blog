<!--
  登录页面
  作用：管理员登录入口，提交后获取 token 存入 store 并跳转目标页
  设计：左右分栏 —— 左侧深色青绿渐展示区（品牌 + 浮动装饰球），右侧登录表单
  动画：左栏滑入、表单缩放淡入、装饰球浮动（纯 CSS 实现）
-->
<template>
  <div class="login-page">
    <!-- 左侧品牌展示区 -->
    <aside class="brand-panel animate-fade-in-left">
      <!-- 浮动装饰球（纯 CSS 动画） -->
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>

      <div class="brand-inner">
        <div class="brand-mark">
          <span class="brand-dot"></span>
          <span class="brand-name">个人博客</span>
        </div>
        <h1 class="brand-title">思想留痕<br />文字长存</h1>
        <p class="brand-tagline">记录生活，分享所思，让每一刻灵感都有归处</p>
      </div>
    </aside>

    <!-- 右侧登录表单区 -->
    <main class="form-panel">
      <div class="form-card animate-scale-in">
        <header class="form-header">
          <h2 class="form-title">管理员登录</h2>
          <p class="form-subtitle">登录账号，进入后台管理</p>
        </header>

        <el-form ref="formRef" :model="form" :rules="rules" size="large" class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
              :prefix-icon="Lock"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-button type="primary" :loading="loading" class="submit-btn" @click="handleLogin">
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form>
      </div>
    </main>
  </div>
</template>

<script setup>
/**
 * 登录页面逻辑
 * - 表单校验（用户名、密码必填）
 * - 调用 loginAPI 获取 token
 * - 使用 userStore 持久化登录状态（token + 用户名）
 * - 登录成功后跳转 redirect 查询参数指向的地址，缺省跳转后台 /admin
 */
import { ref, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { loginAPI } from '../api/auth';
import { useUserStore } from '../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const formRef = ref();
const loading = ref(false);

/** 表单数据 */
const form = reactive({
  username: '',
  password: ''
});

/** 表单校验规则 */
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

/**
 * 处理登录提交
 * @description 校验表单后调用登录接口，成功后保存 token 并跳转
 */
async function handleLogin() {
  loading.value = true;
  try {
    // 校验表单，失败会抛出校验错误对象
    await formRef.value.validate();

    const res = await loginAPI({
      username: form.username,
      password: form.password
    });
    const data = res.data || res;

    // 保存 token 和用户名到 store（同时写入 localStorage）
    userStore.setLogin(data.token, data.user?.username || form.username);
    ElMessage.success('登录成功');

    // 异步获取完整用户资料（含头像），同步到 store
    try {
      const { getProfile } = await import('@/api/profile');
      const profileRes = await getProfile();
      if (profileRes.code === 200 && profileRes.data?.avatar_url) {
        userStore.setAvatar(profileRes.data.avatar_url);
      }
    } catch {
      // 头像同步失败不影响登录流程
    }

    // 跳转到 redirect 指定页面，默认 /admin
    const redirect = route.query.redirect || '/admin';
    router.push(redirect);
  } catch (err) {
    // 表单校验错误：Element Plus 已自动显示提示，无需处理
    // API 错误：request 拦截器已统一提示
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* ========== 页面容器：左右分栏 ========== */
.login-page {
  display: flex;
  min-height: 100vh;
  background: var(--bg-body);
}

/* ========== 左侧品牌展示区 ========== */
.brand-panel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #134e4a 100%);
}

/* 品牌内容层（位于装饰球之上） */
.brand-inner {
  position: relative;
  z-index: 2;
  max-width: 420px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 56px;
}

.brand-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 16px #5eead4;
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  opacity: 0.9;
}

.brand-title {
  font-size: 52px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -1px;
  margin: 0 0 24px;
}

.brand-tagline {
  font-size: 16px;
  line-height: 1.7;
  opacity: 0.8;
  margin: 0;
}

/* ========== 浮动装饰球 ========== */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  z-index: 1;
}

.blob-1 {
  width: 360px;
  height: 360px;
  background: #14b8a6;
  top: -80px;
  left: -80px;
  animation: floatBlob 18s ease-in-out infinite;
}

.blob-2 {
  width: 280px;
  height: 280px;
  background: #5eead4;
  bottom: -60px;
  right: -40px;
  animation: floatBlob 22s ease-in-out infinite reverse;
}

.blob-3 {
  width: 200px;
  height: 200px;
  background: #99f6e4;
  top: 45%;
  left: 25%;
  opacity: 0.35;
  animation: floatBlob 26s ease-in-out infinite;
}

/* ========== 浮动动画关键帧 ========== */
@keyframes floatBlob {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -20px) scale(1.05);
  }
  66% {
    transform: translate(-20px, 25px) scale(0.97);
  }
}

/* ========== 右侧表单区 ========== */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%);
}

.form-card {
  width: 100%;
  max-width: 400px;
}

.form-header {
  margin-bottom: 36px;
}

.form-title {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 10px;
  letter-spacing: -0.5px;
}

.form-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

/* ========== 表单输入样式覆盖（暗色主题适配） ========== */
.login-form :deep(.el-input__wrapper) {
  padding: 10px 16px;
  background: var(--bg-hover);
  border-radius: 12px;
  box-shadow: none;
  border: 1.5px solid var(--border);
  transition: all 0.3s var(--ease-out);
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: var(--primary);
  background: var(--bg-hover);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  background: var(--bg-hover);
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.15);
}

.login-form :deep(.el-input__inner) {
  height: 44px;
  font-size: 15px;
  color: var(--text-primary);
}

.login-form :deep(.el-input__inner::placeholder) {
  color: var(--text-tertiary);
}

/* ========== 提交按钮 ========== */
.submit-btn {
  width: 100%;
  height: 50px;
  margin-top: 8px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  border: none;
  border-radius: 12px;
  transition: all 0.3s var(--ease-out);
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(13, 148, 136, 0.35);
}

.submit-btn:active {
  transform: translateY(0) scale(0.98);
}

/* ========== 响应式：移动端隐藏左侧品牌区 ========== */
@media (max-width: 900px) {
  .brand-panel {
    display: none;
  }

  .form-panel {
    padding: 32px 20px;
  }

  .form-title {
    font-size: 26px;
  }
}
</style>
