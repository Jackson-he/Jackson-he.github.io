<script setup>
import { computed, watchEffect } from 'vue'
import { modesData } from '../../projects/data-viz/data.js'

watchEffect(() => {
  document.title = '英语积累系统 - Jackson He'
})

const modes = computed(() =>
  Object.entries(modesData).map(([id, mode]) => ({
    id,
    ...mode,
  })),
)
</script>

<template>
  <main class="page page--violet">
    <div class="page-container page-grid">
      <RouterLink class="back-link" to="/">← 返回主页</RouterLink>

      <section class="hero">
        <p class="eyebrow">EN Model</p>
        <h1 class="hero-title">📚 英语积累系统</h1>
        <p class="hero-subtitle">将静态多页结构收敛成 Vue 路由，模式数据继续本地维护。</p>
      </section>

      <section class="mode-grid">
        <RouterLink v-for="mode in modes" :key="mode.id" :to="`/projects/data-viz/mode/${mode.id}`" class="mode-card">
          <div class="mode-icon">{{ mode.icon }}</div>
          <h2 class="mode-title">{{ mode.title }}</h2>
          <p class="project-description">{{ mode.description }}</p>
          <div class="status-pill status-pill--muted">{{ mode.patterns.length }} 个模式</div>
        </RouterLink>
      </section>
    </div>
  </main>
</template>
