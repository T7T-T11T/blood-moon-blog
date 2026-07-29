<!--
  登录页面
  作用：管理员登录入口，提交后获取 token 存入 store 并跳转目标页
  设计：左右分栏 —— 左侧血月暗黑品牌展示区（深黑渐变 + 血色光晕 + 血月Logo），右侧暗色登录表单
  主题：统一黑红血月主题，与全站风格一致
-->
<template>
  <div class="login-page">
    <!-- 左侧品牌展示区 -->
    <aside class="brand-panel">
      <!-- 血色光晕装饰 -->
      <div class="glow glow-1"></div>
      <div class="glow glow-2"></div>
      <div class="glow glow-3"></div>

      <!-- 血月装饰 -->
      <div class="blood-moon"></div>

      <div class="brand-inner">
        <div class="brand-mark">
          <div class="moon-icon"></div>
          <span class="brand-name">血月博客</span>
        </div>
        <h1 class="brand-title">
          暗夜之下<br />
          笔墨不灭
        </h1>
        <p class="brand-tagline">在血月的光辉下，记录属于你的思考与故事</p>
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

        <p class="form-footer">© 2026 血月博客 · 暗夜哥特风</p>
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px;
  overflow: hidden;
  color: #f1f5f9;
  background: linear-gradient(160deg, #060912 0%, #0a0e1a 50%, #121828 100%);
}

/* 血色光晕 */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
}

.glow-1 {
  width: 400px;
  height: 400px;
  background: rgba(220, 38, 38, 0.18);
  top: -100px;
  left: -80px;
}

.glow-2 {
  width: 320px;
  height: 320px;
  background: rgba(239, 68, 68, 0.12);
  bottom: -80px;
  right: -60px;
}

.glow-3 {
  width: 240px;
  height: 240px;
  background: rgba(185, 28, 28, 0.1);
  top: 50%;
  right: 15%;
}

/* 血月装饰 */
.blood-moon {
  position: absolute;
  top: 50%;
  right: -60px;
  transform: translateY(-50%);
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fca5a5, #dc2626 45%, #7f1d1d 80%);
  box-shadow:
    0 0 60px rgba(220, 38, 38, 0.4),
    0 0 120px rgba(220, 38, 38, 0.2),
    0 0 200px rgba(185, 28, 28, 0.12);
  z-index: 1;
}

/* 品牌内容层 */
.brand-inner {
  position: relative;
  z-index: 2;
  max-width: 420px;
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
  color: #94a3b8;
  margin: 0;
}

/* ========== 右侧表单区 ========== */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: #0a0e1a;
}

.form-card {
  width: 100%;
  max-width: 400px;
  padding: 48px 40px;
  background: linear-gradient(180deg, #121828 0%, #0e1424 100%);
  border: 1px solid #1e293b;
  border-radius: 16px;
  box-shadow:
    0 0 40px rgba(220, 38, 38, 0.08),
    0 20px 60px rgba(0, 0, 0, 0.5);
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

/* ========== 表单输入样式（暗色主题） ========== */
.login-form :deep(.el-input__wrapper) {
  padding: 8px 16px;
  background: #0a0e1a;
  border-radius: 10px;
  box-shadow: none;
  border: 1px solid #1e293b;
  transition: all 0.3s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: #475569;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  background: #0a0e1a;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.login-form :deep(.el-input__inner) {
  height: 42px;
  font-size: 15px;
  color: #f1f5f9;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: #475569;
}

.login-form :deep(.el-input__prefix .el-icon) {
  color: #475569;
}

.login-form :deep(.el-input__suffix .el-icon),
.login-form :deep(.el-input__suffix-icon) {
  color: #475569;
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
