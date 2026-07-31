<template>
  <div class="settings-page animate-fade-in-up">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2 class="page-title">网站设置</h2>
      <div class="header-actions">
        <el-button :loading="loading" @click="loadSettings">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存设置</el-button>
      </div>
    </div>

    <!-- 设置表单（分组 Tab） -->
    <div v-loading="loading" class="settings-container">
      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- Tab1：站点信息 -->
        <el-tab-pane label="站点信息" name="site">
          <el-form :model="settings" label-position="top" class="settings-form">
            <el-form-item v-for="field in siteFields" :key="field.key" :label="field.label">
              <el-input
                v-model="settings[field.key]"
                :type="field.type || 'text'"
                :rows="field.rows || 2"
                :placeholder="field.placeholder"
              />
              <p class="field-tip">{{ field.tip }}</p>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Tab2：博主信息 -->
        <el-tab-pane label="博主信息" name="author">
          <el-form :model="settings" label-position="top" class="settings-form">
            <el-form-item v-for="field in authorFields" :key="field.key" :label="field.label">
              <el-input
                v-model="settings[field.key]"
                :type="field.type || 'text'"
                :rows="field.rows || 2"
                :placeholder="field.placeholder"
              />
              <p class="field-tip">{{ field.tip }}</p>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
/**
 * @file Settings.vue
 * @description 网站设置页面（管理端）
 * 作用：分组展示网站设置项（站点信息 / 博主信息），通过 ElTabs 切换分组，
 *       页面加载时调用 getSettings() 拉取全部设置，保存时调用 updateSettings() 批量更新。
 * 依赖 API：getSettings / updateSettings
 */
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getSettings, updateSettings, clearSettingsCache } from '@/api/settings';

/** 当前激活的 Tab（site=站点信息，author=博主信息） */
const activeTab = ref('site');

/** 加载状态 */
const loading = ref(false);

/** 保存状态 */
const saving = ref(false);

/**
 * 站点信息字段配置
 * @type {Array<{key:string,label:string,type?:string,rows?:number,placeholder?:string,tip:string}>}
 */
const siteFields = [
  {
    key: 'site_name',
    label: '站点名称',
    placeholder: '请输入站点名称',
    tip: '显示在网站顶部和浏览器标签页'
  },
  {
    key: 'site_description',
    label: '站点描述',
    type: 'textarea',
    rows: 3,
    placeholder: '请输入站点描述',
    tip: '用于 SEO 和分享预览'
  },
  {
    key: 'site_url',
    label: '站点网址',
    placeholder: 'https://example.com',
    tip: '站点完整访问地址'
  },
  {
    key: 'site_keywords',
    label: '站点关键词',
    placeholder: '多个关键词用英文逗号分隔',
    tip: '用于 SEO，多个关键词用逗号分隔'
  },
  {
    key: 'site_icp',
    label: '备案号',
    placeholder: '如：京ICP备12345678号',
    tip: '显示在网站底部'
  },
  {
    key: 'footer_text',
    label: '底部文案',
    type: 'textarea',
    rows: 3,
    placeholder: '请输入底部自定义文案',
    tip: '网站底部的自定义版权或说明文字'
  }
];

/**
 * 博主信息字段配置
 * @type {Array<{key:string,label:string,type?:string,rows?:number,placeholder?:string,tip:string}>}
 */
const authorFields = [
  {
    key: 'author_name',
    label: '博主名称',
    placeholder: '请输入博主名称',
    tip: '在文章作者信息中显示'
  },
  {
    key: 'author_bio',
    label: '个人简介',
    type: 'textarea',
    rows: 3,
    placeholder: '请输入个人简介',
    tip: '在关于页面展示'
  },
  {
    key: 'author_github',
    label: 'GitHub',
    placeholder: 'https://github.com/username',
    tip: 'GitHub 主页链接'
  },
  {
    key: 'author_email',
    label: '联系邮箱',
    placeholder: 'your@email.com',
    tip: '用于读者联系作者'
  },
  {
    key: 'author_avatar',
    label: '头像 URL',
    placeholder: 'https://example.com/avatar.png',
    tip: '博主头像的图片地址'
  },
  { key: 'author_qq', label: 'QQ 号', placeholder: '请输入 QQ 号', tip: '用于读者联系作者' },
  { key: 'author_wechat', label: '微信号', placeholder: '请输入微信号', tip: '用于读者联系作者' }
];

/** 所有设置项的键集合，用于初始化空值与提交时过滤 */
const allKeys = [...siteFields, ...authorFields].map((f) => f.key);

/** 设置数据（响应式对象，初始化为空字符串） */
const settings = reactive(
  allKeys.reduce((acc, key) => {
    acc[key] = '';
    return acc;
  }, {})
);

/**
 * 加载所有设置项
 * 调用 getSettings() 获取后端键值对，逐项写入响应式对象
 */
async function loadSettings() {
  loading.value = true;
  try {
    const res = await getSettings();
    if (res.code === 200) {
      const data = res.data;
      // 仅写入已声明的 key，避免注入未知字段
      allKeys.forEach((key) => {
        if (data && Object.prototype.hasOwnProperty.call(data, key)) {
          settings[key] = data[key] ?? '';
        }
      });
    }
  } catch (e) {
    console.error('加载设置失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 保存设置（批量提交所有设置项） */
async function handleSave() {
  saving.value = true;
  try {
    // 组装当前所有设置项提交给后端
    const payload = {};
    allKeys.forEach((key) => {
      payload[key] = settings[key];
    });

    await updateSettings(payload);
    clearSettingsCache();
    ElMessage.success('保存成功');
  } catch (e) {
    console.error('保存设置失败:', e);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* ========== 设置容器 ========== */
.settings-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24px 32px;
  box-shadow: var(--shadow-sm);
}

.settings-form {
  max-width: 640px;
  padding-top: 8px;
}

.field-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 4px 0 0;
  line-height: 1.5;
}

/* 覆盖 Element Plus Tab 主题色为青绿色 */
.settings-tabs :deep(.el-tabs__item.is-active) {
  color: var(--primary);
}

.settings-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--primary);
}

.settings-tabs :deep(.el-tabs__item:hover) {
  color: var(--primary);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-container {
    padding: 16px;
  }
}
</style>
