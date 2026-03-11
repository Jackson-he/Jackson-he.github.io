<script setup>
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { modesData } from '../../projects/data-viz/data.js'

const route = useRoute()

const mode = computed(() => modesData[route.params.modeId])

watchEffect(() => {
  document.title = mode.value ? `${mode.value.title} - 英语积累系统` : '模式列表 - 英语积累系统'
})
</script>

<template>
  <main class="page page--violet">
    <div class="page-container page-grid">
      <RouterLink class="back-link" to="/projects/data-viz">← 返回模式首页</RouterLink>

      <section v-if="mode" class="hero">
        <p class="eyebrow">Mode Detail</p>
        <h1 class="hero-title">{{ mode.icon }} {{ mode.title }}</h1>
        <p class="hero-subtitle">{{ mode.description }}</p>
      </section>

      <section v-if="mode" class="patterns-list">
        <RouterLink
          v-for="(pattern, index) in mode.patterns"
          :key="`${pattern.formula}-${index}`"
          :to="`/projects/data-viz/mode/${route.params.modeId}/pattern/${index}`"
          class="pattern-link"
        >
          <article class="pattern-card">
            <div class="formula">{{ pattern.formula }}</div>
            <p class="project-description">{{ pattern.function }}</p>
          </article>
        </RouterLink>
      </section>

      <section v-else class="panel">
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <p>未找到对应模式，请返回上一页重新选择。</p>
        </div>
      </section>
    </div>
  </main>
</template>
