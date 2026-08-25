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
        <!-- Tab1：站点与首页 -->
        <el-tab-pane label="站点与首页" name="site">
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

        <!-- Tab2：读者可见的作者资料 -->
        <el-tab-pane label="公开作者资料" name="author">
          <div class="author-preview">
            <img v-if="settings.author_avatar" :src="settings.author_avatar" alt="作者头像预览" />
            <div v-else class="preview-avatar">{{ (settings.author_name || '我').slice(0, 1) }}</div>
            <div><span>首页与关于页会显示</span><strong>{{ settings.author_name || '你的名字' }}</strong><p>{{ settings.author_bio || '写一句让读者认识你的话。' }}</p></div>
          </div>
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

        <el-tab-pane label="留言" name="comments">
          <el-form :model="settings" label-position="top" class="settings-form">
            <el-form-item label="允许读者评论">
              <el-switch
                v-model="settings.allow_comments"
                active-value="true"
                inactive-value="false"
                active-text="开启"
                inactive-text="关闭"
              />
              <p class="field-tip">开启后，评论发布即显示；如需处理垃圾评论，直接在「评论管理」删除即可。</p>
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
 * 作用：分组展示站点与首页设置、读者可见的作者资料，通过 ElTabs 切换分组，
 *       页面加载时调用 getSettings() 拉取全部设置，保存时调用 updateSettings() 批量更新。
 * 依赖 API：getSettings / updateSettings
 */
import { ref, reactive, onMounted } from 'vue';
import { getSettings, updateSettings } from '@/api/settings';

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
    tip: '显示在首页首屏，同时用于 SEO 和分享预览'
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
    tip: '显示在首页作者卡、关于页与文章作者信息中'
  },
  {
    key: 'author_bio',
    label: '个人简介',
    type: 'textarea',
    rows: 3,
    placeholder: '请输入个人简介',
    tip: '显示在首页作者卡与关于页面'
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
    tip: '显示在首页作者卡；请填写已上传图片的链接'
  },
  { key: 'author_qq', label: 'QQ 号', placeholder: '请输入 QQ 号', tip: '显示在关于页的联系方式中' },
  { key: 'author_wechat', label: '微信号', placeholder: '请输入微信号', tip: '显示在关于页的联系方式中' },
  { key: 'author_skills', label: '喜欢的事', placeholder: '例如：摄影,旅行,阅读', tip: '显示在关于页，多个内容用逗号分隔' }
];

/** 所有设置项的键集合，用于初始化空值与提交时过滤 */
const allKeys = [...siteFields, ...authorFields, { key: 'allow_comments' }].map((f) => f.key);

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
    // 兼容已部署的旧 Worker：保存设置时关闭遗留的审核开关。
    payload.comments_moderation = 'false';

    await updateSettings(payload);
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

.author-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 640px;
  margin: 8px 0 22px;
  padding: 16px;
  background: var(--bg-hover);
  border-radius: var(--radius-md);
}

.author-preview img,
.preview-avatar {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border-radius: 50%;
  object-fit: cover;
}

.preview-avatar {
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--accent-mint));
  font-weight: 700;
}

.author-preview span,
.author-preview strong,
.author-preview p {
  display: block;
}

.author-preview span { color: var(--text-tertiary); font-size: 11px; }
.author-preview strong { margin-top: 2px; color: var(--text-primary); font-size: 15px; }
.author-preview p { margin: 3px 0 0; color: var(--text-secondary); font-size: 12px; }

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
