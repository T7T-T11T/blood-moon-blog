<template>
  <div class="home-page">
    <section class="hero">
      <div class="hero-grid" aria-hidden="true"></div><div class="hero-red-panel" aria-hidden="true"></div>
      <div class="hero-inner">
        <div class="hero-copy-block">
          <p class="eyebrow"><span></span> GG BOND'S NOTEBOOK</p>
          <h1>{{ siteDisplayName }}</h1><p class="hero-copy">{{ siteDescription }}</p>
          <div class="hero-actions"><button class="primary-action" type="button" @click="scrollToArticles">{{ t('开始阅读') }} <el-icon><ArrowDown /></el-icon></button><router-link class="text-action" to="/about">{{ t('认识作者') }} <el-icon><ArrowRight /></el-icon></router-link></div>
          <dl class="site-stats" :aria-label="t('博客概览')"><div><dt>{{ total }}</dt><dd>{{ t('篇记录') }}</dd></div><div><dt>{{ categories.length }}</dt><dd>{{ t('个分类') }}</dd></div><div><dt>NOW</dt><dd>{{ t('持续更新') }}</dd></div></dl>
        </div>
        <div class="hero-art"><span class="hero-note">{{ t('认真记录') }}<br />{{ t('也认真快乐') }}</span><GGBondSticker class="hero-sticker" eager mood="beeKing" size="xl" :caption="t('蜂王今天负责值班')" /><span class="hero-number" aria-hidden="true">01</span></div>
      </div>
    </section>
    <div id="latest" class="content-shell">
      <!-- 友链展示带：置于文章区最上方，入口醒目 -->
      <section class="friends-strip">
        <div class="friends-strip-head"><div><p class="section-kicker">FRIENDS</p><h2>{{ t('友情链接') }}</h2></div><router-link class="strip-more" to="/links">{{ t('查看全部') }} <el-icon><ArrowRight /></el-icon></router-link></div>
        <div v-if="friends.length" class="friends-strip-row"><a v-for="link in friends" :key="link.id" :href="link.url" target="_blank" rel="noopener noreferrer" class="friend-chip"><img v-if="link.avatar_url" :src="link.avatar_url" :alt="link.name" loading="lazy" /><span v-else class="friend-chip-fallback">{{ link.name.slice(0, 1) }}</span><div><strong>{{ link.name }}</strong><small>{{ link.category || t('友情链接') }}</small></div></a><router-link class="friend-chip apply-chip" to="/links">{{ t('去申请') }} <el-icon><ArrowRight /></el-icon></router-link></div>
        <p v-else class="strip-empty">{{ t('暂无友链') }} · <router-link class="side-link" to="/links">{{ t('去申请') }}</router-link></p>
      </section>
      <section v-if="featuredArticle" class="featured-section">
        <div class="section-heading"><div><p class="section-kicker">LATEST NOTE</p><h2>{{ t('最新一篇') }}</h2></div><span>01 / {{ formatDate(featuredArticle.created_at) }}</span></div>
        <article class="featured-card">
          <div v-if="featuredArticle.cover_image" class="featured-image"><img :src="featuredArticle.cover_image" :alt="featuredArticle.title" /></div><div v-else class="featured-art" aria-hidden="true"><span>✦</span><small>NEW NOTE</small></div>
          <div class="featured-content"><span class="card-category">{{ featuredArticle.category_name || t('随笔') }}</span><h3><router-link class="article-link" :to="`/article/${featuredArticle.id}`">{{ featuredArticle.title }}</router-link></h3><p>{{ featuredArticle.summary || '一段值得留下的记录。' }}</p><span class="read-link">{{ t('继续阅读') }} <el-icon><ArrowRight /></el-icon></span></div>
        </article>
      </section>
      <div class="layout-grid">
        <section class="feed" :aria-label="t('最近的文章')">
          <div class="section-heading feed-heading"><div><p class="section-kicker">ALL WRITING</p><h2>{{ t('最近的文章') }}</h2></div><span>{{ total }} {{ t('篇记录') }}</span></div>
          <ArticleSkeleton v-if="loading && articles.length === 0" :count="4" />
          <div v-else-if="feedArticles.length" class="article-grid"><article v-for="(article, index) in feedArticles" :key="article.id" class="article-card"><div class="card-topline"><span>{{ String(index + 2).padStart(2, '0') }}</span><span class="card-category">{{ article.category_name || t('未分类') }}</span></div><h3><router-link class="article-link" :to="`/article/${article.id}`">{{ article.title }}</router-link></h3><p>{{ article.summary || '一段值得留下的记录。' }}</p><footer><time><el-icon><Clock /></el-icon>{{ formatDate(article.created_at) }}</time><span><el-icon><View /></el-icon>{{ article.view_count || 0 }}</span></footer></article></div>
          <div v-else-if="!loading" class="empty-state">{{ t('还没有文章，第一篇会从这里开始。') }}</div>
          <div v-if="total > pageSize" class="pagination-wrapper"><el-pagination :current-page="currentPage" :page-size="pageSize" :total="total" layout="prev, pager, next" background @current-change="handlePageChange" /></div>
        </section>
        <aside class="sidebar">
          <div class="about-card">
            <router-link class="about-main" to="/about"><img v-if="authorAvatar" :src="authorAvatar" :alt="`${authorName}的头像`" /><span v-else class="author-avatar-fallback">{{ authorName.slice(0, 1) }}</span><div><span class="side-label">ABOUT THE AUTHOR</span><strong>{{ authorName }}</strong><p>{{ authorBio }}</p></div></router-link>
            <div v-if="contactItems.length" class="contact-chips"><template v-for="item in contactItems" :key="item.key"><a v-if="item.href" :href="item.href" class="contact-chip" target="_blank" rel="noopener noreferrer">{{ item.label }}</a><span v-else class="contact-chip plain">{{ item.label }}</span></template></div>
            <div v-if="skills.length" class="skill-mini"><span v-for="skill in skills" :key="skill">{{ skill }}</span></div>
            <router-link class="about-link" to="/about">{{ t('认识我') }} <el-icon><ArrowRight /></el-icon></router-link>
          </div>
          <section class="side-block">
            <div class="side-heading"><span class="side-label">POPULAR</span><el-icon><TrendCharts /></el-icon></div><ol v-if="hotArticles.length" class="popular-list"><li v-for="(article, index) in hotArticles" :key="article.id"><span>{{ String(index + 1).padStart(2, '0') }}</span><div><strong><router-link class="article-link" :to="`/article/${article.id}`">{{ article.title }}</router-link></strong><small>{{ article.view_count || 0 }} {{ t('次阅读') }}</small></div></li></ol><p v-else class="side-muted">{{ t('阅读数据正在积累。') }}</p></section>
          <section class="side-block"><div class="side-heading"><span class="side-label">TOPICS</span><el-icon><FolderOpened /></el-icon></div><div class="topic-list"><router-link v-for="category in categories" :key="category.id" :to="`/category/${category.slug}`">{{ category.name }}</router-link></div></section>
          <a class="rss-card" href="/api/rss" target="_blank" rel="noopener"><el-icon><Connection /></el-icon><span>RSS 订阅</span><el-icon><ArrowRight /></el-icon></a>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/utils/locale';
import { scrollBehavior } from '@/utils/motion';
import { computed, onMounted, ref } from 'vue';
import { ArrowDown, ArrowRight, Clock, Connection, FolderOpened, TrendCharts, View } from '@element-plus/icons-vue';
import { formatDate } from '@/utils/format';
import { getPublicArticles, getHotArticles } from '../../api/articles';
import { getCategories } from '../../api/categories';
import { getLinks } from '../../api/links';
import { settingsState } from '../../api/settings';
import ArticleSkeleton from '../../components/front/ArticleSkeleton.vue';
import GGBondSticker from '../../components/common/GGBondSticker.vue';
const articles = ref([]); const hotArticles = ref([]); const categories = ref([]); const friends = ref([]); const loading = ref(false); const currentPage = ref(1); const total = ref(0); const pageSize = 9;
const siteDisplayName = computed(() => settingsState.siteName || '寿冬与秋'); const siteDescription = computed(() => settingsState.siteDescription || '记录生活、成长，以及那些慢慢变好的日子。'); const authorName = computed(() => settingsState.authorName || '幸之'); const authorBio = computed(() => settingsState.authorBio || '在日常里收集故事，也在时间里慢慢长大。'); const authorAvatar = computed(() => settingsState.authorAvatar || '');
/** 联系方式：仅显示后台已配置的项；QQ/微信没有可跳转链接时渲染为纯文本徽标 */
const contactItems = computed(() => {
  const items = [];
  const gh = settingsState.authorGithub || '';
  if (gh) items.push({ key: 'github', label: 'GitHub', href: /^https?:\/\//i.test(gh) ? gh : `https://github.com/${gh}` });
  const email = settingsState.authorEmail || '';
  if (email) items.push({ key: 'email', label: 'Email', href: `mailto:${email}` });
  const qq = settingsState.authorQq || '';
  if (qq) items.push({ key: 'qq', label: 'QQ', href: '' });
  const wechat = settingsState.authorWechat || '';
  if (wechat) items.push({ key: 'wechat', label: t('微信'), href: '' });
  return items;
});
/** 喜欢的事：后台 author_skills 逗号/顿号分隔，最多取 5 个 */
const skills = computed(() => settingsState.authorSkills ? settingsState.authorSkills.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 5) : []);
const featuredArticle = computed(() => articles.value[0] || null); const feedArticles = computed(() => articles.value.slice(1));
function scrollToArticles() { document.querySelector('#latest')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }); }
async function loadArticles(page = 1) { loading.value = true; try { const { data } = await getPublicArticles({ page, page_size: pageSize }); articles.value = data?.list || []; total.value = data?.pagination?.total || 0; } catch (error) { console.error('加载文章失败:', error); articles.value = []; } finally { loading.value = false; } }
async function loadSidebar() { try { const [hotResponse, categoryResponse, linksResponse] = await Promise.all([getHotArticles(5), getCategories(), getLinks()]); hotArticles.value = Array.isArray(hotResponse.data) ? hotResponse.data : hotResponse.data?.list || []; categories.value = Array.isArray(categoryResponse.data) ? categoryResponse.data : []; const linkData = Array.isArray(linksResponse.data) ? linksResponse.data : linksResponse.data?.list || []; friends.value = linkData.slice(0, 6); } catch (error) { console.error('加载首页信息失败:', error); } }
function handlePageChange(page) { currentPage.value = page; loadArticles(page); document.querySelector('#latest')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }); }
onMounted(() => { loadArticles(); loadSidebar(); });
</script>

<style scoped>
.featured-card, .article-card, .popular-list li { position: relative; }
.article-link { color: inherit; text-decoration: none; }
.article-link::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
.article-link:focus-visible::after { outline: 3px solid #3267a8; outline-offset: 3px; }
.home-page { min-height: 100vh; }.hero { position: relative; overflow: hidden; min-height: 610px; color: #29334a; background: #dff2ff; border-bottom: 1px solid #bfd8ea; }.hero-grid { position: absolute; inset: 0; opacity: .5; background-image: linear-gradient(rgba(79,143,220,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(79,143,220,.12) 1px,transparent 1px); background-size: 40px 40px; mask-image: linear-gradient(90deg,#000,transparent 75%); }.hero-red-panel { position: absolute; top: -18%; right: -6%; width: 43%; height: 130%; background: #ffe17a; transform: rotate(8deg); box-shadow: -18px 0 0 rgba(120,200,160,.24); }.hero-inner { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0,1.1fr) minmax(260px,.9fr); align-items: center; gap: 38px; width: min(1160px,calc(100% - 48px)); min-height: 610px; margin: 0 auto; padding: 110px 0 72px; }.hero-copy-block { max-width: 660px; }.eyebrow,.section-kicker,.side-label { margin: 0; color: #3979ba; font-size: 11px; font-weight: 800; letter-spacing: .16em; }.eyebrow { display: flex; align-items: center; gap: 10px; }.eyebrow span { width: 26px; height: 2px; background: currentColor; }.hero h1 { max-width: 680px; margin: 24px 0 20px; color: #29334a; font-family: Impact,Haettenschweiler,'Arial Narrow Bold','Microsoft YaHei',sans-serif; font-size: clamp(58px,9.2vw,118px); font-weight: 400; letter-spacing: -.035em; line-height: .92; text-wrap: balance; }.hero-copy { max-width: 460px; margin: 0; color: #5c6d82; font-size: 16px; line-height: 1.9; }.hero-actions { display: flex; align-items: center; gap: 24px; margin-top: 34px; }.primary-action,.text-action { display: inline-flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 750; text-decoration: none; cursor: pointer; }.primary-action { padding: 13px 19px; color: #fff; background: #4f8fdc; border: 0; border-radius: 999px; transition: transform .2s ease,background .2s ease; }.primary-action:hover { background: #3267a8; transform: translateY(-2px); }.text-action { color: #29334a; }.text-action:hover { color: #3267a8; }.site-stats { display: flex; gap: 34px; margin: 62px 0 0; }.site-stats div { min-width: 65px; padding-left: 13px; border-left: 1px solid rgba(41,51,74,.24); }.site-stats dt { color: #29334a; font-family: Impact,Haettenschweiler,sans-serif; font-size: 26px; line-height: 1; }.site-stats dd { margin: 6px 0 0; color: #68758a; font-size: 11px; }.hero-art { position: relative; min-height: 330px; }.hero-sticker { position: absolute; z-index: 2; right: clamp(8px,2vw,42px); bottom: 0; transform: rotate(4deg); }.hero-note { position: absolute; z-index: 3; top: 12px; right: 10px; padding: 10px 12px; color: #29334a; background: #fffdf7; box-shadow: 4px 4px 0 #78c8a0; font-size: 12px; font-weight: 900; line-height: 1.4; transform: rotate(-8deg); }.hero-number { position: absolute; right: 40%; bottom: -42px; color: rgba(79,143,220,.15); font-family: Impact,Haettenschweiler,sans-serif; font-size: 210px; line-height: 1; }
.content-shell { width: min(1160px,calc(100% - 48px)); margin: 0 auto; padding: 88px 0 80px; }.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }.section-heading h2 { margin: 8px 0 0; color: var(--text-primary); font-family: Impact,Haettenschweiler,'Arial Narrow Bold','Microsoft YaHei',sans-serif; font-size: 34px; font-weight: 400; line-height: 1; }.section-heading > span { color: var(--text-tertiary); font-size: 12px; }.featured-section { margin-bottom: 96px; }.featured-card { display: grid; grid-template-columns: minmax(260px,.85fr) 1.15fr; overflow: hidden; min-height: 350px; background: #fffdf7; border: 1px solid #d7d0bf; border-radius: 24px; cursor: pointer; box-shadow: 12px 14px 0 rgba(79,143,220,.1); transition: transform .25s ease,border-color .25s ease; }.featured-card:hover { border-color: #4f8fdc; transform: translate(-3px,-4px); }.featured-image,.featured-art { min-height: 100%; overflow: hidden; }.featured-image img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .45s ease; }.featured-card:hover .featured-image img { transform: scale(1.05); }.featured-art { display: grid; place-content: center; gap: 8px; color: #29334a; background: linear-gradient(135deg,#ffe17a 0 51%,#c9f0dc 51%); text-align: center; }.featured-art span { font-size: 92px; line-height: .9; }.featured-art small { font-size: 11px; font-weight: 800; letter-spacing: .18em; }.featured-content { align-self: center; padding: clamp(32px,5vw,70px); }.card-category { color: #3979ba; font-size: 12px; font-weight: 750; }.featured-content h3 { margin: 16px 0; color: #29334a; font-family: Impact,Haettenschweiler,'Arial Narrow Bold','Microsoft YaHei',sans-serif; font-size: clamp(28px,3.4vw,46px); font-weight: 400; line-height: 1.15; }.featured-content p { max-width: 510px; margin: 0 0 25px; color: var(--text-secondary); line-height: 1.8; }.read-link { display: inline-flex; align-items: center; gap: 7px; color: #3979ba; font-size: 13px; font-weight: 800; }.layout-grid { display: grid; grid-template-columns: minmax(0,1fr) 290px; gap: 72px; }.feed-heading { padding-bottom: 20px; border-bottom: 1px solid var(--border); }.article-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); border-top: 1px solid var(--border); border-left: 1px solid var(--border); }.article-card { min-height: 230px; padding: 26px; background: rgba(255,253,247,.86); border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); cursor: pointer; transition: background .25s ease,box-shadow .25s ease; }.article-card:hover { background: #eef8ff; box-shadow: inset 0 4px #4f8fdc; }.card-topline { display: flex; justify-content: space-between; color: var(--text-tertiary); font-size: 11px; letter-spacing: .1em; }.article-card h3 { min-height: 55px; margin: 33px 0 10px; color: var(--text-primary); font-size: 21px; font-weight: 800; line-height: 1.32; }.article-card > p { display: -webkit-box; min-height: 47px; margin: 0; overflow: hidden; color: var(--text-secondary); font-size: 13px; line-height: 1.75; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }.article-card footer { display: flex; justify-content: space-between; margin-top: 23px; color: var(--text-tertiary); font-size: 11px; }.article-card footer span,.article-card time { display: inline-flex; align-items: center; gap: 5px; }
.sidebar { display: flex; flex-direction: column; gap: 28px; }.side-block { padding-bottom: 28px; border-bottom: 1px solid var(--border); }.side-heading { display: flex; justify-content: space-between; color: #3979ba; }
.about-card { padding: 24px; color: #29334a; text-decoration: none; background: linear-gradient(150deg, rgba(120,200,160,.34) 0%, rgba(255,225,122,.3) 100%); border-radius: 22px 22px 6px 22px; box-shadow: 6px 6px 0 #78c8a0; }.about-main { display: flex; align-items: flex-start; gap: 14px; color: inherit; text-decoration: none; }.about-card > img, .about-main > img, .author-avatar-fallback { width: 56px; height: 56px; flex: 0 0 auto; border-radius: 50%; object-fit: cover; }.author-avatar-fallback { display: grid; place-items: center; color: #fff; background: linear-gradient(135deg,#4f8fdc,#78c8a0); font-size: 22px; font-weight: 800; }.about-card > div, .about-main > div { min-width: 0; }.about-card .side-label { display: block; margin-bottom: 5px; color: #326b58; }.about-card strong { display: block; color: #29334a; font-size: 18px; }.about-card p { margin: 6px 0 0; color: #526176; font-size: 13px; font-weight: 500; line-height: 1.65; }.about-link { display: inline-flex; align-items: center; gap: 4px; margin-top: 14px; color: #3267a8; font-size: 12px; font-weight: 800; text-decoration: none; }
.contact-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }.contact-chip { padding: 4px 11px; font-size: 11px; font-weight: 700; color: #3267a8; background: rgba(255,253,247,.78); border: 1px solid rgba(79,143,220,.32); border-radius: 999px; text-decoration: none; transition: background .2s,color .2s; }.contact-chip[href]:hover { color: #fff; background: #4f8fdc; border-color: #4f8fdc; }.contact-chip.plain { cursor: default; }
.skill-mini { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }.skill-mini span { padding: 3px 10px; font-size: 11px; color: #326b58; background: rgba(255,255,255,.55); border-radius: 999px; }
/* ===== 友链展示带（hero 下方、文章区上方） ===== */
.friends-strip { margin-bottom: 64px; }
.friends-strip-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.friends-strip-head h2 { margin: 0; font-size: 22px; font-weight: 800; color: #29334a; letter-spacing: -0.5px; }
.strip-more { display: inline-flex; align-items: center; gap: 4px; color: #3267a8; font-size: 13px; font-weight: 800; text-decoration: none; transition: gap .2s var(--ease-out), color .2s; }
.strip-more:hover { color: #4f8fdc; gap: 7px; }
.friends-strip-row { display: flex; gap: 14px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: thin; }
.friend-chip { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; min-width: 200px; padding: 14px 18px; background: rgba(255, 253, 247, .94); border: 1px solid #d9d2c2; border-radius: 18px; text-decoration: none; color: inherit; box-shadow: 0 6px 18px rgba(79, 113, 143, .06); transition: transform .25s var(--ease-spring), border-color .25s var(--ease-out), box-shadow .25s var(--ease-out); }
.friend-chip:hover { border-color: #4f8fdc; transform: translateY(-3px); box-shadow: 0 12px 26px rgba(79, 143, 220, .16); }
.friend-chip img, .friend-chip-fallback { width: 42px; height: 42px; flex: 0 0 auto; border-radius: 13px; object-fit: cover; }
.friend-chip-fallback { display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #78c8a0, #4f8fdc); font-size: 15px; font-weight: 800; }
.friend-chip > div { min-width: 0; }
.friend-chip strong { display: block; overflow: hidden; color: #29334a; font-size: 14px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.friend-chip small { display: block; margin-top: 2px; color: var(--text-tertiary); font-size: 11px; }
.apply-chip { justify-content: center; min-width: 128px; border-style: dashed; color: #3267a8; font-weight: 800; font-size: 13px; }
.strip-empty { margin: 0; font-size: 13px; color: var(--text-tertiary); }
.side-link { color: #3267a8; }.popular-list { margin: 17px 0 0; padding: 0; list-style: none; }.popular-list li { display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 10px; padding: 13px 0; border-bottom: 1px solid rgba(79,143,220,.12); cursor: pointer; }.popular-list li:last-child { border-bottom: 0; }.popular-list > li > span { color: #3979ba; font-family: Impact,Haettenschweiler,sans-serif; font-size: 15px; }.popular-list strong { display: -webkit-box; overflow: hidden; color: var(--text-primary); font-size: 13px; line-height: 1.45; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }.popular-list small { display: block; margin-top: 4px; color: var(--text-tertiary); font-size: 11px; }.topic-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 17px; }.topic-list a { padding: 6px 10px; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 999px; font-size: 12px; text-decoration: none; transition: color .2s,border-color .2s; }.topic-list a:hover { color: #3267a8; border-color: #4f8fdc; }.rss-card { display: flex; align-items: center; gap: 9px; padding: 15px; color: var(--text-primary); background: var(--bg-hover); border: 1px solid var(--border); border-radius: 14px; font-size: 13px; text-decoration: none; }.rss-card span { flex: 1; }.rss-card:hover { color: #3267a8; border-color: #4f8fdc; }.side-muted,.empty-state { color: var(--text-tertiary); font-size: 13px; }.pagination-wrapper { display: flex; justify-content: center; margin-top: 42px; }
@media (max-width:900px) { .hero-inner { grid-template-columns: 1fr 260px; }.layout-grid { grid-template-columns: 1fr; gap: 58px; }.sidebar { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }.rss-card { grid-column: span 2; } } @media (max-width:640px) { .hero { min-height: 650px; }.hero-inner,.content-shell { width: min(100% - 36px,1160px); }.hero-inner { display: block; padding-top: 94px; }.hero h1 { font-size: clamp(52px,17vw,82px); }.hero-art { min-height: 185px; margin-top: 24px; }.hero-sticker { right: 10px; bottom: 0; }.hero-number { right: 42%; bottom: -9px; font-size: 130px; }.hero-note { top: 6px; right: 0; }.site-stats { gap: 18px; margin-top: 46px; }.featured-card { grid-template-columns: 1fr; }.featured-image,.featured-art { min-height: 195px; }.featured-content { padding: 30px 25px 34px; }.content-shell { padding: 60px 0; }.article-grid { grid-template-columns: 1fr; }.article-card { min-height: 210px; }.article-card h3 { min-height: 0; margin-top: 25px; }.sidebar { grid-template-columns: 1fr; }.rss-card { grid-column: auto; }.section-heading h2 { font-size: 29px; } }
</style>
