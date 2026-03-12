<script setup>
import { watchEffect } from 'vue'

watchEffect(() => {
  document.title = '工具应用 - Jackson He'
})
</script>

<template>
  <main class="page page--emerald">
    <div class="page-container page-grid">

      <section class="hero hero--center">
        <div class="big-emoji">🛠️</div>
        <h1 class="hero-title">工具应用</h1>
        <p class="hero-subtitle">这个模块已整理为统一入口，后续可以继续扩展更多实用工具。</p>
      </section>

      <section class="panel">
        <div class="empty-state">
          <div class="empty-state-icon">✨</div>
          <p>当前保留为占位页，但目录、路由和样式体系已经准备好。</p>
        </div>
      </section>
    </div>
  </main>
</template>
