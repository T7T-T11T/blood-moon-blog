<template>
  <div class="profile-page animate-fade-in-up">
    <!-- 顶部信息卡片 -->
    <div class="profile-header">
      <div class="avatar-section">
        <div class="avatar-wrapper" @click="uploading ? null : triggerAvatarUpload()">
          <el-icon v-if="!form.avatar_url && !uploading" :size="32" color="#fff"><User /></el-icon>
          <img v-else-if="form.avatar_url" :src="form.avatar_url" alt="头像" class="avatar-img" />
          <div v-if="uploading" class="avatar-loading">
            <el-icon :size="24" color="#fff" class="is-loading"><Loading /></el-icon>
          </div>
          <div class="avatar-overlay" v-if="!uploading">
            <el-icon :size="20" color="#fff"><Camera /></el-icon>
          </div>
        </div>
        <input
          ref="avatarInputRef"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleAvatarChange"
        />
        <h2 class="username">{{ form.username }}</h2>
        <p class="user-bio">{{ form.bio || '这个人很懒，什么都没留下~' }}</p>
      </div>

      <!-- 统计摘要 -->
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-value">{{ blogStats.articles }}</span>
          <span class="stat-label">文章</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ blogStats.views }}</span>
          <span class="stat-label">阅读</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ blogStats.comments }}</span>
          <span class="stat-label">评论</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ blogStats.draft }}</span>
          <span class="stat-label">草稿</span>
        </div>
      </div>
    </div>

    <!-- 资料编辑表单 -->
    <div class="form-section">
      <div class="section-card animate-fade-in-up delay-100">
        <h3 class="section-title">基本信息</h3>
        <el-form
          ref="profileFormRef"
          :model="form"
          :rules="profileRules"
          label-position="top"
          class="profile-form"
        >
          <div class="form-grid">
            <el-form-item label="昵称" prop="username">
              <el-input v-model="form.username" disabled />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="your@email.com" />
            </el-form-item>
          </div>
          <el-form-item label="个人简介">
            <el-input
              v-model="form.bio"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="介绍一下自己吧..."
            />
          </el-form-item>
        </el-form>
        <div class="form-actions">
          <el-button type="primary" :loading="saving" @click="saveProfile">保存修改</el-button>
        </div>
      </div>

      <div class="section-card animate-fade-in-up delay-200">
        <h3 class="section-title">社交链接</h3>
        <el-form :model="form" label-position="top" class="profile-form">
          <div class="form-grid">
            <el-form-item label="GitHub">
              <el-input v-model="form.github_url" placeholder="https://github.com/yourname">
                <template #prefix
                  ><el-icon><Link /></el-icon
                ></template>
              </el-input>
            </el-form-item>
            <el-form-item label="QQ">
              <el-input v-model="form.qq_url" placeholder="QQ号码或链接">
                <template #prefix
                  ><el-icon><ChatDotRound /></el-icon
                ></template>
              </el-input>
            </el-form-item>
          </div>
          <el-form-item label="微信">
            <el-input v-model="form.wechat" placeholder="微信号">
              <template #prefix
                ><el-icon><ChatLineSquare /></el-icon
              ></template>
            </el-input>
          </el-form-item>
        </el-form>
        <div class="form-actions">
          <el-button type="primary" :loading="savingSocial" @click="saveSocial">保存链接</el-button>
        </div>
      </div>

      <!-- 修改密码 -->
      <div class="section-card animate-fade-in-up delay-300">
        <h3 class="section-title">修改密码</h3>
        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-position="top"
          class="profile-form"
        >
          <el-form-item label="原密码" prop="oldPassword">
            <el-input
              v-model="passwordForm.oldPassword"
              type="password"
              show-password
              placeholder="输入当前密码"
            />
          </el-form-item>
          <div class="form-grid">
            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                show-password
                placeholder="至少6位"
              />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                show-password
                placeholder="再次输入新密码"
              />
            </el-form-item>
          </div>
        </el-form>
        <div class="form-actions">
          <el-button type="primary" :loading="changingPwd" @click="handleChangePassword"
            >修改密码</el-button
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * @file Profile.vue
 * @description 个人中心页面（管理端）
 * 作用：展示和修改管理员个人资料，包括头像、简介、社交链接和密码修改。
 *       同时展示博客相关统计摘要（文章数、阅读量等）。
 * 依赖 API：getProfile / updateProfile / changePassword
 */
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { User, Camera, Loading, Link, ChatDotRound, ChatLineSquare } from '@element-plus/icons-vue';
import { getProfile, updateProfile, changePassword } from '@/api/profile';
import { getDashboardStatsAPI } from '@/api/dashboard';
import { uploadImage } from '@/api/upload';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

/** 表单数据 */
const form = reactive({
  username: '',
  avatar_url: '',
  bio: '',
  email: '',
  github_url: '',
  qq_url: '',
  wechat: ''
});

/** 密码表单数据 */
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

/** 博客统计摘要 */
const blogStats = reactive({
  articles: 0,
  views: 0,
  comments: 0,
  draft: 0
});

/** 加载状态 */
const saving = ref(false);
const savingSocial = ref(false);
const changingPwd = ref(false);

/** 表单引用 */
const profileFormRef = ref(null);
const passwordFormRef = ref(null);
const avatarInputRef = ref(null);

/** 基本信息校验规则 */
const profileRules = {
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }]
};

/** 密码校验规则 */
const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
};

/**
 * 加载用户资料和博客统计
 */
async function loadData() {
  try {
    const [profileRes, statsRes] = await Promise.allSettled([getProfile(), getDashboardStatsAPI()]);

    // 加载用户资料
    if (profileRes.status === 'fulfilled' && profileRes.value.code === 200) {
      const data = profileRes.value.data;
      Object.assign(form, {
        username: data.username || '',
        avatar_url: data.avatar_url || '',
        bio: data.bio || '',
        email: data.email || '',
        github_url: data.github_url || '',
        qq_url: data.qq_url || '',
        wechat: data.wechat || ''
      });
      // 同步头像到全局 store，确保右上角头像与资料一致
      if (data.avatar_url) {
        userStore.setAvatar(data.avatar_url);
      }
    }

    // 加载博客统计
    if (statsRes.status === 'fulfilled' && statsRes.value.code === 200) {
      const data = statsRes.value.data;
      blogStats.articles = data.articleStats?.total || 0;
      blogStats.views = data.articleStats?.total_views || 0;
      blogStats.comments = data.commentCount || 0;
      blogStats.draft = data.articleStats?.draft || 0;
    }
  } catch (e) {
    console.error('加载个人资料失败:', e);
  }
}

/**
 * 保存基本信息
 */
async function saveProfile() {
  if (!profileFormRef.value) return;
  try {
    await profileFormRef.value.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    await updateProfile({
      bio: form.bio,
      email: form.email
    });
    ElMessage.success('保存成功');
  } catch (e) {
    console.error('保存失败:', e);
  } finally {
    saving.value = false;
  }
}

/**
 * 保存社交链接
 */
async function saveSocial() {
  savingSocial.value = true;
  try {
    await updateProfile({
      github_url: form.github_url,
      qq_url: form.qq_url,
      wechat: form.wechat
    });
    ElMessage.success('链接已更新');
  } catch (e) {
    console.error('保存失败:', e);
  } finally {
    savingSocial.value = false;
  }
}

/**
 * 修改密码
 */
async function handleChangePassword() {
  if (!passwordFormRef.value) return;
  try {
    await passwordFormRef.value.validate();
  } catch {
    return;
  }

  changingPwd.value = true;
  try {
    await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    ElMessage.success('密码修改成功');
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } catch (e) {
    console.error('修改密码失败:', e);
  } finally {
    changingPwd.value = false;
  }
}

/**
 * 触发头像选择
 */
function triggerAvatarUpload() {
  avatarInputRef.value?.click();
}

/** 上传中状态 */
const uploading = ref(false);

/**
 * 处理头像上传
 * @param {Event} e - 文件选择事件
 */
async function handleAvatarChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  // 重置文件输入，确保同一文件可重复选择
  e.target.value = '';

  // 简单的类型校验
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    return;
  }

  // 简单的大小校验（头像建议 < 2MB）
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('头像不能超过 2MB');
    return;
  }

  uploading.value = true;
  try {
    const res = await uploadImage(file);
    const url = res?.data?.url || res?.url || res;
    if (url) {
      form.avatar_url = url;
      // 同步更新全局 store，使右上角头像立即生效
      userStore.setAvatar(url);
      // 持久化到数据库
      await updateProfile({ avatar_url: url });
      ElMessage.success('头像更新成功');
    } else {
      ElMessage.error('上传响应无 URL，保存失败');
    }
  } catch (err) {
    console.error('头像上传失败:', err);
    // 错误信息由 request.js 拦截器统一处理
  } finally {
    uploading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* ========== 顶部信息卡片 ========== */
.profile-header {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, #0891b2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 0.25s var(--ease-out);
}

.avatar-wrapper:hover {
  transform: scale(1.05);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-loading {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-loading .is-loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.username {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.user-bio {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  max-width: 320px;
  line-height: 1.5;
}

/* 统计摘要 */
.stats-section {
  display: flex;
  gap: 8px;
  background: var(--bg-body);
  border-radius: var(--radius-md);
  padding: 8px;
}

.stat-item {
  text-align: center;
  padding: 12px 20px;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.stat-item:hover {
  background: var(--bg-hover);
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ========== 表单区域 ========== */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 28px 32px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.profile-form {
  max-width: 600px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.form-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .avatar-section {
    width: 100%;
  }

  .stats-section {
    width: 100%;
    justify-content: space-between;
  }

  .stat-item {
    padding: 8px 12px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .section-card {
    padding: 20px;
  }
}
</style>
