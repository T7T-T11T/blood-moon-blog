<template>
  <article class="privacy-page">
    <h1>{{ t('隐私与访问统计') }}</h1>
    <p>{{ t('访问统计默认关闭。开启后，我们记录页面路径、访问时间，以及由 IP 计算的每日变化标识，用于统计阅读量和当日访客数量。新统计记录不保存原始 IP，不记录搜索词或来源页面。') }}</p>
    <p>{{ t('统计记录每天清理一次，保留约 30 天。关闭统计后不再上报新访问；浏览器发送“不跟踪”或全局隐私控制信号时，也不会上报。') }}</p>
    <label><input v-model="enabled" type="checkbox" @change="save" /> {{ t('允许此浏览器参与访问统计') }}</label>
    <p role="status">{{ t(message) }}</p>
    <h2>{{ t('评论与基础服务') }}</h2>
    <p>{{ t('评论的昵称、头像和正文会公开展示，请勿填写私人信息。评论 IP 用于反垃圾和管理，不向读者公开；历史邮箱也不公开返回。评论相关记录随评论的管理与删除处理。') }}</p>
    <p>{{ t('网站由 Cloudflare 和 Supabase 提供页面、接口及存储服务，连接服务时它们会接收到 IP 等必要网络信息。文章中的外部图片或媒体也可能连接第三方服务。') }}</p>
    <p>{{ t('浏览器本地会保存登录状态、页面资源缓存及你选择的统计偏好；后台写作还会保存草稿。你可以通过浏览器设置清除这些数据。') }}</p>
  </article>
</template>
<script setup>
import { t } from '@/utils/locale';
import { ref } from 'vue';
const enabled = ref(false);
const message = ref('');
try { enabled.value = localStorage.getItem('visit-statistics') === 'enabled'; } catch { /* Storage denied: tracking remains off. */ }
function save() {
  try {
    localStorage.setItem('visit-statistics', enabled.value ? 'enabled' : 'disabled');
    message.value = enabled.value ? '已保存。浏览器的隐私信号仍优先于此设置。' : '已关闭访问统计。';
  } catch { enabled.value = false; message.value = '浏览器不允许保存设置，访问统计保持关闭。'; }
}
</script>
<style scoped>
.privacy-page { max-width: 760px; margin: 0 auto; padding: 48px 20px; line-height: 1.9; }
label { display: flex; align-items: center; gap: 10px; }
</style>
