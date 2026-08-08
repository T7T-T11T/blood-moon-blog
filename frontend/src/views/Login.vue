<!--
  登录页面
  作用：管理员登录入口，提交后获取 token 存入 store 并跳转目标页
  设计：左右分栏 —— 左侧黑猫血月背景图 + 暗色渐变遮罩 + 品牌文字，右侧暗色登录表单
  主题：统一黑红血月主题，与全站暗黑哥特风一致
-->
<template>
  <div class="login-page">
    <!-- 左侧品牌展示区（黑猫血月背景） -->
    <aside class="brand-panel">
      <!-- 背景图 -->
      <div class="brand-bg"></div>
      <!-- 渐变遮罩（确保文字可读性） -->
      <div class="brand-overlay"></div>
      <!-- 右侧血月红光延伸 -->
      <div class="brand-glow"></div>

      <div class="brand-inner">
        <div class="brand-mark">
          <div class="moon-icon"></div>
        </div>
        <h1 class="brand-title">
          暗夜之下<br />
          笔墨不灭
        </h1>
        <p class="brand-tagline">在深夜的光辉下，记录属于你的思考与故事</p>
      </div>
    </aside>

    <!-- 右侧登录表单区 -->
    <main class="form-panel">
      <div class="form-card">
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

        <p class="form-footer">© 2026 管理后台 · 暗夜</p>
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
/* ========== 页面容器 ========== */
.login-page {
  display: flex;
  min-height: 100vh;
  background: #060912;
  color: #f1f5f9;
}

/* ========== 左侧品牌展示区 ========== */
.brand-panel {
  position: relative;
  flex: 0.85;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px;
  overflow: hidden;
  color: #f1f5f9;
}

/* 黑猫背景图 */
.brand-bg {
  position: absolute;
  inset: 0;
  background: url('@/assets/login-black-cat.webp') center/cover no-repeat;
  z-index: 0;
}

/* 渐变遮罩：左上深黑 → 右下透，确保文字可读 */
.brand-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(6, 9, 18, 0.92) 0%,
    rgba(10, 14, 26, 0.78) 35%,
    rgba(18, 24, 40, 0.45) 70%,
    rgba(18, 24, 40, 0.15) 100%
  );
  z-index: 1;
}

/* 血月红光延伸（从右侧边缘渗入） */
.brand-glow {
  position: absolute;
  top: 50%;
  right: -40px;
  transform: translateY(-50%);
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    rgba(220, 38, 38, 0.2) 0%,
    rgba(220, 38, 38, 0.08) 40%,
    transparent 70%
  );
  z-index: 1;
  pointer-events: none;
}

/* 品牌内容层 */
.brand-inner {
  position: relative;
  z-index: 2;
  max-width: 440px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 56px;
}

/* 血月图标 */
.moon-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fca5a5, #dc2626 50%, #7f1d1d);
  box-shadow: 0 0 20px rgba(220, 38, 38, 0.5);
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 3px;
  color: #f1f5f9;
}

.brand-title {
  font-size: 52px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -1px;
  margin: 0 0 24px;
  background: linear-gradient(135deg, #f1f5f9 0%, #fca5a5 50%, #dc2626 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 20px rgba(220, 38, 38, 0.3));
}

.brand-tagline {
  font-size: 16px;
  line-height: 1.7;
  color: #cbd5e1;
  margin: 0;
}

/* ========== 右侧表单区 ========== */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: linear-gradient(180deg, #0a0e1a 0%, #060912 100%);
}

.form-card {
  width: 100%;
  max-width: 460px;
  padding: 48px 40px;
  background: linear-gradient(180deg, rgba(18, 24, 40, 0.9) 0%, rgba(14, 20, 36, 0.9) 100%);
  border: 1px solid rgba(226, 232, 240, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  box-shadow:
    0 0 40px rgba(220, 38, 38, 0.06),
    0 20px 60px rgba(0, 0, 0, 0.6);
}

.form-header {
  margin-bottom: 36px;
  text-align: center;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.form-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* ========== 表单输入样式（暗夜血月主题） ========== */

/* 关键：强制覆盖 Element Plus 默认亮色样式 */
.login-form :deep(.el-input) {
  --el-input-bg-color: #0f1624;
  --el-input-text-color: #f1f5f9;
  --el-input-placeholder-text-color: #475569;
  --el-input-border-color: #1e293b;
  --el-input-hover-border-color: #475569;
  --el-input-focus-border-color: #dc2626;
}

/* 输入框容器：暗色渐变背景 + 微妙内发光 */
.login-form :deep(.el-input__wrapper) {
  padding: 8px 16px;
  background: linear-gradient(180deg, #101824 0%, #0d1320 100%) !important;
  background-image: none !important;
  border-radius: 10px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 1px 3px rgba(0, 0, 0, 0.4) !important;
  border: 1px solid rgba(226, 232, 240, 0.08);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

/* hover：边框微微提亮 */
.login-form :deep(.el-input__wrapper:hover) {
  border-color: rgba(220, 38, 38, 0.25);
  background: linear-gradient(180deg, #111a28 0%, #0e1522 100%) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(220, 38, 38, 0.06) !important;
}

/* 聚焦态：血月红光晕 + 边框点亮 */
.login-form :deep(.el-input__wrapper.is-focus) {
  background: linear-gradient(180deg, #111a28 0%, #0e1522 100%) !important;
  border-color: #dc2626;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 0 12px rgba(220, 38, 38, 0.25),
    0 0 0 4px rgba(220, 38, 38, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.5) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 输入框内部文字：强制亮色 */
.login-form :deep(.el-input__inner) {
  height: 42px;
  font-size: 15px;
  color: #f8fafc !important;
  background: transparent !important;
  -webkit-text-fill-color: #f8fafc !important;
  caret-color: #dc2626;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: #475569 !important;
  -webkit-text-fill-color: #475569;
  transition: color 0.3s ease;
}

.login-form :deep(.el-input__wrapper input) {
  color: #f8fafc !important;
  -webkit-text-fill-color: #f8fafc !important;
}

/* Chrome 自动填充时保持暗色 */
.login-form :deep(.el-input__wrapper input:-webkit-autofill),
.login-form :deep(.el-input__wrapper input:-webkit-autofill:hover),
.login-form :deep(.el-input__wrapper input:-webkit-autofill:focus) {
  -webkit-box-shadow: 0 0 0 1000px #101824 inset !important;
  -webkit-text-fill-color: #f8fafc !important;
}

/* 前缀图标：默认暗灰，聚焦时染红 */
.login-form :deep(.el-input__prefix .el-icon),
.login-form :deep(.el-input__prefix .el-input__icon) {
  color: #475569 !important;
  transition:
    color 0.35s ease,
    filter 0.35s ease;
}

.login-form :deep(.el-input__wrapper.is-focus .el-input__prefix .el-icon),
.login-form :deep(.el-input__wrapper.is-focus .el-input__prefix .el-input__icon) {
  color: #dc2626 !important;
  filter: drop-shadow(0 0 6px rgba(220, 38, 38, 0.5));
}

/* 后缀图标 + 密码切换图标 */
.login-form :deep(.el-input__suffix .el-icon),
.login-form :deep(.el-input__suffix-icon) {
  color: #475569 !important;
  transition: color 0.35s ease;
}

.login-form :deep(.el-input__wrapper.is-focus .el-input__suffix .el-icon),
.login-form :deep(.el-input__wrapper.is-focus .el-input__suffix-icon) {
  color: #b91c1c !important;
}

/* 清除按钮 */
.login-form :deep(.el-input__clear) {
  color: #64748b !important;
  transition: color 0.25s ease;
}

.login-form :deep(.el-input__clear:hover) {
  color: #dc2626 !important;
}

/* 密码可见切换图标 */
.login-form :deep(.el-input__password) {
  color: #475569 !important;
  transition: color 0.35s ease;
}

.login-form :deep(.el-input__wrapper.is-focus .el-input__password) {
  color: #b91c1c !important;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

/* ========== 提交按钮 ========== */
.submit-btn {
  width: 100%;
  height: 50px;
  margin-top: 8px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  transition: all 0.3s ease;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(220, 38, 38, 0.35);
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.submit-btn:active {
  transform: translateY(0) scale(0.98);
}

/* ========== 页脚 ========== */
.form-footer {
  margin-top: 32px;
  font-size: 12px;
  color: #334155;
  text-align: center;
}

/* ========== 响应式：移动端隐藏左侧品牌区 ========== */
@media (max-width: 900px) {
  .brand-panel {
    display: none;
  }

  .form-panel {
    padding: 32px 20px;
  }

  .form-card {
    padding: 36px 28px;
  }

  .form-title {
    font-size: 24px;
  }
}
</style>
