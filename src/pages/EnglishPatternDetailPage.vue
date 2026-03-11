<script setup>
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { modesData } from '../../projects/data-viz/data.js'

const route = useRoute()

const mode = computed(() => modesData[route.params.modeId])
const pattern = computed(() => mode.value?.patterns?.[Number(route.params.patternIndex)])

watchEffect(() => {
  document.title = pattern.value ? `${pattern.value.formula} - ${mode.value?.title || '英语积累系统'}` : '模式详情 - 英语积累系统'
})

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractKeywords(formula) {
  return formula
    .replace(/S\+V\.?/g, '')
    .replace(/N\.?/g, '')
    .replace(/\[.*?\]/g, '')
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && /^[A-Za-z]+$/.test(item))
}

function highlightExample(example, formula) {
  let html = escapeHtml(example)

  extractKeywords(formula).forEach((keyword) => {
    const regex = new RegExp(`\\b(${escapeRegExp(keyword)})\\b`, 'gi')
    html = html.replace(regex, '<strong>$1</strong>')
  })

  return html
}
</script>

<template>
  <main class="page page--violet">
    <div class="page-container page-grid">
      <RouterLink class="back-link" :to="`/projects/data-viz/mode/${route.params.modeId}`">← 返回模式列表</RouterLink>

      <section v-if="pattern && mode" class="panel page-grid">
        <div class="formula">{{ pattern.formula }}</div>

        <div class="surface-block">
          <h2 class="section-heading">功能说明</h2>
          <p class="project-description">{{ pattern.function }}</p>
        </div>

        <div class="surface-block">
          <h2 class="section-heading">例句</h2>
          <div class="example-list">
            <article v-for="(example, index) in pattern.examples" :key="`${index}-${example}`" class="item-card example-item">
              <strong>#{{ index + 1 }}</strong>
              <div v-html="highlightExample(example, pattern.formula)" />
            </article>
          </div>
        </div>
      </section>

      <section v-else class="panel">
        <div class="empty-state">
          <div class="empty-state-icon">🧭</div>
          <p>该模式详情不存在，请返回上一页重新选择。</p>
        </div>
      </section>
    </div>
  </main>
</template>
