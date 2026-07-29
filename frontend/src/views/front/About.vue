<template>
  <div class="about-page">
    <!-- 个人介绍 -->
    <div class="profile-section">
      <div class="avatar">
        <el-icon :size="64"><UserFilled /></el-icon>
      </div>
      <h1 class="name">全栈开发者</h1>
      <p class="title">前端 / 后端 / 全栈</p>
      <p class="bio">
        热爱技术，喜欢分享。专注于 Vue 3、Node.js、MySQL 等技术栈， 致力于打造高质量的 Web 应用。
      </p>
    </div>

    <!-- 技能栈 -->
    <div class="skills-section">
      <h2 class="section-title">技术栈</h2>
      <div class="skills-grid">
        <div v-for="skill in skills" :key="skill.name" class="skill-card">
          <div class="skill-icon" :style="{ background: skill.color }">
            <el-icon :size="24"><component :is="skill.icon" /></el-icon>
          </div>
          <div class="skill-info">
            <h3>{{ skill.name }}</h3>
            <p>{{ skill.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 项目经历 -->
    <div class="projects-section">
      <h2 class="section-title">项目经历</h2>
      <div class="timeline">
        <div v-for="project in projects" :key="project.name" class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="project-header">
              <h3>{{ project.name }}</h3>
              <span class="project-date">{{ project.date }}</span>
            </div>
            <p class="project-desc">{{ project.desc }}</p>
            <div class="project-tags">
              <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 联系方式 -->
    <div class="contact-section">
      <h2 class="section-title">联系我</h2>
      <div class="contact-grid">
        <a href="mailto:example@email.com" class="contact-card">
          <el-icon :size="32"><Message /></el-icon>
          <span>Email</span>
        </a>
        <a href="https://github.com" target="_blank" class="contact-card">
          <el-icon :size="32"><Link /></el-icon>
          <span>GitHub</span>
        </a>
        <a href="https://juejin.cn" target="_blank" class="contact-card">
          <el-icon :size="32"><Reading /></el-icon>
          <span>掘金</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { markRaw } from 'vue';
import {
  UserFilled,
  Monitor,
  Tools,
  Folder,
  DataLine,
  Document,
  Message,
  Link,
  Reading
} from '@element-plus/icons-vue';

/** 技能列表 */
const skills = [
  {
    name: 'Vue 3',
    desc: 'Composition API, Pinia, Vue Router',
    icon: markRaw(Monitor),
    color: 'linear-gradient(135deg, #42b883, #35495e)'
  },
  {
    name: 'Element Plus',
    desc: 'Vue 3 组件库，企业级 UI',
    icon: markRaw(Folder),
    color: 'linear-gradient(135deg, #409eff, #66b1ff)'
  },
  {
    name: 'Node.js',
    desc: 'Express, Koa, RESTful API',
    icon: markRaw(Tools),
    color: 'linear-gradient(135deg, #3c873a, #68a063)'
  },
  {
    name: 'MySQL',
    desc: 'SQL优化, 索引设计, 事务处理',
    icon: markRaw(DataLine),
    color: 'linear-gradient(135deg, #00758f, #00a3e0)'
  },
  {
    name: 'JavaScript',
    desc: 'ES6+, TypeScript, 函数式编程',
    icon: markRaw(Document),
    color: 'linear-gradient(135deg, #f7df1e, #ffd700)'
  },
  {
    name: 'Vite',
    desc: '下一代前端构建工具',
    icon: markRaw(Folder),
    color: 'linear-gradient(135deg, #646cff, #7c3aed)'
  }
];

/** 项目经历 */
const projects = [
  {
    name: '个人博客系统',
    date: '2024',
    desc: '基于 Vue 3 + Node.js + MySQL 的全栈博客系统，支持文章管理、分类标签、Markdown 编辑等功能。',
    tags: ['Vue 3', 'Node.js', 'MySQL', 'Full Stack']
  },
  {
    name: '任务管理平台',
    date: '2024',
    desc: '个人效率工具，集成任务管理、番茄钟、数据统计等功能。',
    tags: ['Vue 3', 'Element Plus', 'ECharts']
  }
];
</script>

<style scoped>
.about-page {
  animation: fade-in 0.5s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 个人介绍 */
.profile-section {
  text-align: center;
  padding: 60px 40px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(8, 145, 178, 0.05));
  border-radius: 24px;
  margin-bottom: 48px;
}

.avatar {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: #fff;
  box-shadow: 0 12px 40px rgba(13, 148, 136, 0.4);
}

.name {
  font-size: 36px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
}

.title {
  font-size: 18px;
  color: #0d9488;
  margin: 0 0 16px;
  font-weight: 500;
}

.bio {
  font-size: 16px;
  color: #475569;
  line-height: 1.8;
  max-width: 600px;
  margin: 0 auto;
}

/* 区块标题 */
.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
}

/* 技能栈 */
.skills-section {
  margin-bottom: 48px;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.skill-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.skill-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.skill-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 4px;
}

.skill-info p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* 项目经历 */
.projects-section {
  margin-bottom: 48px;
}

.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e2e8f0;
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;
}

.timeline-dot {
  position: absolute;
  left: -28px;
  top: 8px;
  width: 16px;
  height: 16px;
  background: #0d9488;
  border: 4px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #0d9488;
}

.timeline-content {
  background: #fff;
  padding: 24px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.project-date {
  font-size: 14px;
  color: #94a3b8;
}

.project-desc {
  font-size: 15px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 16px;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.project-tags .tag {
  font-size: 13px;
  color: #0d9488;
  background: rgba(13, 148, 136, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
}

/* 联系方式 */
.contact-section {
  margin-bottom: 48px;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.contact-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 24px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  text-decoration: none;
  color: #475569;
  transition: all 0.3s ease;
}

.contact-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border-color: #0d9488;
  color: #0d9488;
}

/* 响应式 */
@media (max-width: 768px) {
  .profile-section {
    padding: 40px 24px;
  }

  .avatar {
    width: 96px;
    height: 96px;
  }

  .name {
    font-size: 28px;
  }
}
</style>
