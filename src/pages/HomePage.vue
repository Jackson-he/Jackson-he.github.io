<script setup>
const year = new Date().getFullYear()

const projects = [
  {
    icon: '🔍',
    title: '内容合规检测',
    description: '基于 AI 模型的文本合规检测页，支持单条和批量检测。',
    to: '/projects/game',
  },
  {
    icon: '📚',
    title: '英语积累系统',
    description: '五大英语表达模式，支持模式浏览、例句展示与快速定位。',
    to: '/projects/data-viz',
  },
  {
    icon: '⚽',
    title: '赛事预测查询',
    description: '连接预测 API 的足球赛事看板，涵盖比赛、推荐、历史与对比。',
    to: '/projects/creative',
  },
  {
    icon: '📈',
    title: 'Stock Transition',
    description: '部署到 GitHub Pages 的美股趋势突破监控面板，连接独立后端 API。',
    to: '/projects/stock-transition',
  },
  {
    icon: '🛠️',
    title: '工具应用',
    description: '为后续更多工具页预留的模块化入口。',
    to: '/projects/tools',
  },
]
</script>

<template>
  <main class="page page--dark">
    <div class="page-container">
      <section class="hero hero--center">
        <p class="eyebrow">Project Showcase</p>
        <h1 class="hero-title hero-title--gradient">Jay He</h1>
      </section>

      <section class="project-grid">
        <RouterLink
          v-for="project in projects"
          :key="project.to"
          :to="project.to"
          class="project-card"
        >
          <div class="project-icon">{{ project.icon }}</div>
          <h2 class="project-title">{{ project.title }}</h2>
          <p class="project-description">{{ project.description }}</p>
          <span class="project-link">查看项目 →</span>
        </RouterLink>
      </section>

      <footer class="page-footer">
        <p>© {{ year }} Jackson He</p>
        <p>
          <a href="https://github.com/Jackson-he" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
      </footer>
    </div>
  </main>
</template>
