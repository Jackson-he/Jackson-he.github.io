<script setup>
import { RouterLink } from 'vue-router'
import { watchEffect } from 'vue'

watchEffect(() => {
  document.title = '工具应用'
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
    icon: '🛰️',
    title: 'Twitter Monitor',
    description: '连接 twitter-monitor 后端的推文监控工作台，可在浏览器里配置目标、规则和同步动作。',
    to: '/projects/twitter-monitor',
  },
  {
    icon: '🖨️',
    title: '小悄印拼图打印',
    description: '为富士小悄印 2 Pro 准备的 6 寸图片上传、拼版预览和排版保存工具。',
    to: '/projects/fuji-print-studio',
  },
  {
    icon: '🗺️',
    title: 'Italy Trip Map',
    description: '把意大利婚纱照行程可视化到高德地图里，支持点位筛选、路线查看和每日节奏概览。',
    to: '/projects/italy-trip-map',
  },
  {
    icon: '🇮🇹',
    title: '意大利出行工具',
    description: '偏个人使用的意大利旅行动线页，含 Today、Map、Tickets、Transport、Trip 五个核心入口。',
    to: '/projects/italy-1',
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
