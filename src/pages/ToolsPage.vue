<script setup>
import { RouterLink } from 'vue-router'
import { watchEffect } from 'vue'

watchEffect(() => {
  document.title = '工具应用 - Jackson He'
})

const toolProjects = [
  {
    icon: '📈',
    title: 'Stock Transition',
    description: '部署到 GitHub Pages 的股票趋势突破面板，可连接独立后端 API。',
    to: '/projects/stock-transition',
  },
  {
    icon: '📉',
    title: 'Futures Monitor',
    description: '期货实时监控前端，支持 K 线、指标、信号和资金面板，后续可接入 Python 后端。',
    to: '/projects/futures-monitor',
  },
  {
    icon: '⌘',
    title: 'Codex Chat',
    description: '连接本地 Codex 服务的简洁聊天界面，支持多会话历史与项目级问答。',
    to: '/projects/codex-chat',
  },
]
</script>

<template>
  <main class="page page--emerald">
    <div class="page-container page-grid">
      <RouterLink to="/" class="back-link">← 返回首页</RouterLink>

      <section class="hero hero--center">
        <div class="big-emoji">🛠️</div>
        <h1 class="hero-title">工具应用</h1>
        <p class="hero-subtitle">这里集中放独立可部署的小工具页，适合 GitHub Pages 或静态站点托管。</p>
      </section>

      <section class="project-grid">
        <RouterLink
          v-for="project in toolProjects"
          :key="project.to"
          :to="project.to"
          class="project-card"
        >
          <div class="project-icon">{{ project.icon }}</div>
          <h2 class="project-title">{{ project.title }}</h2>
          <p class="project-description">{{ project.description }}</p>
          <span class="project-link">打开工具 →</span>
        </RouterLink>
      </section>
    </div>
  </main>
</template>
