<template>
  <div class="settings-page">
    <div class="settings-container">
      <!-- 基本设置 -->
      <div class="settings-section">
        <h2 class="section-title">基本设置</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <h3>站点名称</h3>
              <p>显示在网站顶部和浏览器标签页</p>
            </div>
            <el-input v-model="settings.siteName" class="setting-input" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <h3>站点描述</h3>
              <p>用于SEO和分享预览</p>
            </div>
            <el-input
              v-model="settings.siteDescription"
              type="textarea"
              :rows="3"
              class="setting-input"
            />
          </div>
        </div>
      </div>

      <!-- 个人信息 -->
      <div class="settings-section">
        <h2 class="section-title">个人信息</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <h3>显示名称</h3>
              <p>在文章作者信息中显示</p>
            </div>
            <el-input v-model="settings.authorName" class="setting-input" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <h3>个人简介</h3>
              <p>在关于页面展示</p>
            </div>
            <el-input
              v-model="settings.authorBio"
              type="textarea"
              :rows="3"
              class="setting-input"
            />
          </div>
        </div>
      </div>

      <!-- 社交链接 -->
      <div class="settings-section">
        <h2 class="section-title">社交链接</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <h3>GitHub</h3>
              <p>你的 GitHub 主页链接</p>
            </div>
            <el-input
              v-model="settings.githubUrl"
              class="setting-input"
              placeholder="https://github.com/username"
            />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <h3>邮箱</h3>
              <p>联系邮箱</p>
            </div>
            <el-input v-model="settings.email" class="setting-input" placeholder="your@email.com" />
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="actions-section">
        <el-button type="primary" size="large" :loading="saving" @click="handleSave">
          保存设置
        </el-button>
        <el-button size="large" @click="loadSettings">重置</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

/** 保存中 */
const saving = ref(false);

/** 设置数据 */
const settings = ref({
  siteName: '个人博客',
  siteDescription: '分享技术，记录成长',
  authorName: '全栈开发者',
  authorBio: '热爱技术，喜欢分享',
  githubUrl: 'https://github.com',
  email: 'example@email.com'
});

/** 加载设置 */
function loadSettings() {
  // 从本地存储加载设置
  const saved = localStorage.getItem('blog_settings');
  if (saved) {
    try {
      settings.value = { ...settings.value, ...JSON.parse(saved) };
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  }
}

/** 保存设置 */
async function handleSave() {
  saving.value = true;
  try {
    // 保存到本地存储
    localStorage.setItem('blog_settings', JSON.stringify(settings.value));
    ElMessage.success('保存成功');
  } catch (e) {
    console.error('保存设置失败:', e);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.settings-page {
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.settings-container {
  max-width: 800px;
}

.settings-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 16px;
}

.settings-card {
  background: #fff;
  border-radius: 16px;
  padding: 8px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 0;
  border-bottom: 1px solid #f1f5f9;
  gap: 24px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-info h3 {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 4px;
}

.setting-info p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.setting-input {
  width: 320px;
}

.setting-input :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.actions-section {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

/* 响应式 */
@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: stretch;
  }

  .setting-input {
    width: 100%;
  }
}
</style>
