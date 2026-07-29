<!--
  注册页面
  作用：用户注册入口，提交后调用注册接口并跳转登录页
  设计：左右分栏（与登录页镜像）—— 左侧注册表单，右侧深色青绿渐展示区
  动画：表单缩放淡入、右栏滑入、装饰球浮动（纯 CSS 实现）
-->
<template>
  <div class="register-page">
    <!-- 左侧注册表单区 -->
    <main class="form-panel">
      <div class="form-card animate-scale-in">
        <header class="form-header">
          <h2 class="form-title">创建账号</h2>
          <p class="form-subtitle">加入我们，开启你的创作之旅</p>
        </header>

        <el-form ref="formRef" :model="form" :rules="rules" size="large" class="register-form">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>
          <el-form-item prop="email">
            <el-input
              v-model="form.email"
              placeholder="请输入邮箱"
              :prefix-icon="Message"
              clearable
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码（至少6位）"
              show-password
              :prefix-icon="Lock"
            />
          </el-form-item>
          <el-form-item prop="confirm">
            <el-input
              v-model="form.confirm"
              type="password"
              placeholder="请再次输入密码"
              show-password
              :prefix-icon="Lock"
              @keyup.enter="handleRegister"
            />
          </el-form-item>

          <el-button type="primary" :loading="loading" class="submit-btn" @click="handleRegister">
            {{ loading ? '注册中...' : '立即注册' }}
          </el-button>
        </el-form>

        <p class="switch-link">
          已有账号？
          <router-link to="/login" class="link">立即登录</router-link>
        </p>
      </div>
    </main>

    <!-- 右侧品牌展示区 -->
    <aside class="brand-panel animate-fade-in-right">
      <!-- 浮动装饰球（纯 CSS 动画） -->
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>

      <div class="brand-inner">
        <div class="brand-mark">
          <span class="brand-dot"></span>
          <span class="brand-name">个人博客</span>
        </div>
        <h1 class="brand-title">书写此刻<br />连接未来</h1>
        <p class="brand-tagline">在这里安放你的文字与思考，与世界分享你的视角</p>
      </div>
    </aside>
  </div>
</template>

<script setup>
/**
 * 注册页面逻辑
 * - 表单校验（用户名、邮箱格式、密码长度、两次密码一致）
 * - 调用 registerAPI 提交注册
 * - 注册成功后跳转登录页
 */
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, Message } from '@element-plus/icons-vue';
import { registerAPI } from '../api/auth';

const router = useRouter();
const formRef = ref();
const loading = ref(false);

/** 表单数据：confirm 仅用于前端校验，不提交后端 */
const form = reactive({
  username: '',
  email: '',
  password: '',
  confirm: ''
});

/**
 * 自定义校验：确认密码必须与密码一致
 * @param {Object} rule - 校验规则对象
 * @param {string} value - 当前输入值
 * @param {Function} callback - 校验结果回调
 */
function validateConfirm(rule, value, callback) {
  // 两次输入不一致时返回错误提示
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
}

/** 表单校验规则 */
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少需要6位', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
};

/**
 * 处理注册提交
 * @description 校验通过后调用注册接口，仅提交 username/email/password，成功后跳转登录页
 */
async function handleRegister() {
  // 校验表单，校验失败会抛出异常终止后续流程
  await formRef.value.validate();
  loading.value = true;
  try {
    // confirm 仅为前端校验字段，不发送给后端
    await registerAPI({
      username: form.username,
      email: form.email,
      password: form.password
    });
    ElMessage.success('注册成功，请登录');
    router.push('/login');
  } catch (err) {
    // 错误信息已在 request 拦截器中统一提示，此处无需重复处理
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* ========== 页面容器：左右分栏 ========== */
.register-page {
  display: flex;
  min-height: 100vh;
  background: var(--bg-body);
}

/* ========== 左侧表单区 ========== */
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

/* ========== 表单输入样式覆盖 ========== */
.register-form :deep(.el-input__wrapper) {
  padding: 10px 16px;
  background: #f8fafc;
  border-radius: 12px;
  box-shadow: none;
  border: 1.5px solid transparent;
  transition: all 0.3s var(--ease-out);
}

.register-form :deep(.el-input__wrapper:hover) {
  border-color: var(--border);
  background: #fff;
}

.register-form :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.1);
}

.register-form :deep(.el-input__inner) {
  height: 44px;
  font-size: 15px;
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

/* ========== 切换链接 ========== */
.switch-link {
  margin-top: 32px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.switch-link .link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.switch-link .link:hover {
  opacity: 0.75;
}

/* ========== 右侧品牌展示区 ========== */
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

/* ========== 响应式：移动端隐藏右侧品牌区 ========== */
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
