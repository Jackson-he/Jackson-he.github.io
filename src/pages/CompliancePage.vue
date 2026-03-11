<script setup>
import { computed, ref, watchEffect } from 'vue'

const apiUrl = 'https://www.person-common.top/api/detect'
const batchApiUrl = 'https://www.person-common.top/api/detect/batch'

const activeTab = ref('single')
const textInput = ref('')
const threshold = ref(0.5)
const batchTextInput = ref('')
const batchThreshold = ref(0.5)
const loading = ref(false)
const resultType = ref('')
const errorMessage = ref('')
const singleResult = ref(null)
const batchResult = ref(null)

const examples = [
  '这只股票一定能让你翻倍！',
  '我推荐你买这只股票',
  '股市有风险，投资需谨慎',
  '建议你重点关注这几只股票',
]

watchEffect(() => {
  document.title = '内容合规检测 - Jackson He'
})

const singleConfidence = computed(() => toPercent(getMaxProbability(singleResult.value?.label_details)))
const batchViolationRate = computed(() => toPercent(batchResult.value?.summary?.violation_rate))

function toPercent(value) {
  return ((Number(value) || 0) * 100).toFixed(2)
}

function getMaxProbability(labelDetails = {}) {
  return Object.values(labelDetails || {}).reduce((max, item) => {
    const probability = Number(item?.probability) || 0
    return Math.max(max, probability)
  }, 0)
}

function getRiskLevel(probability) {
  if (probability >= 0.8) return '🔴 高风险'
  if (probability >= 0.6) return '🟠 中风险'
  if (probability >= 0.4) return '🟡 低风险'
  return '🟢 安全'
}

function setExample(text) {
  textInput.value = text
}

function fillBatchExample() {
  batchTextInput.value = examples.concat([
    '欢迎关注我的投资建议',
    '市场波动较大，请注意风险控制',
  ]).join('\n')
}

function clearResults() {
  errorMessage.value = ''
  singleResult.value = null
  batchResult.value = null
  resultType.value = ''
}

function clearBatchResults() {
  batchTextInput.value = ''
  clearResults()
}

async function requestJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.message || data?.error || '请求失败')
  }

  return data
}

async function detectText() {
  const text = textInput.value.trim()
  if (!text) {
    window.alert('请输入待检测的文本！')
    return
  }

  loading.value = true
  errorMessage.value = ''
  batchResult.value = null

  try {
    singleResult.value = await requestJson(apiUrl, {
      text,
      threshold: Number(threshold.value),
    })
    resultType.value = 'single'
  } catch (error) {
    resultType.value = 'error'
    errorMessage.value = error.message || '检测失败'
  } finally {
    loading.value = false
  }
}

async function detectBatch() {
  const texts = batchTextInput.value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!texts.length) {
    window.alert('请输入待检测的文本！')
    return
  }

  if (texts.length > 100) {
    window.alert(`最多支持 100 条文本，当前有 ${texts.length} 条`) 
    return
  }

  loading.value = true
  errorMessage.value = ''
  singleResult.value = null

  try {
    batchResult.value = await requestJson(batchApiUrl, {
      texts,
      threshold: Number(batchThreshold.value),
    })
    resultType.value = 'batch'
  } catch (error) {
    resultType.value = 'error'
    errorMessage.value = error.message || '批量检测失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="page page--indigo">
    <div class="page-container page-grid">
      <RouterLink class="back-link" to="/">← 返回主页</RouterLink>

      <section class="hero">
        <p class="eyebrow">AI Compliance</p>
        <h1 class="hero-title">🔍 内容合规检测</h1>
        <p class="hero-subtitle">保留原有检测能力，改为 Vue 3 状态驱动渲染。</p>
      </section>

      <section class="panel page-grid">
        <div class="tabs">
          <button class="tab" :class="{ 'is-active': activeTab === 'single' }" @click="activeTab = 'single'">单条检测</button>
          <button class="tab" :class="{ 'is-active': activeTab === 'batch' }" @click="activeTab = 'batch'">批量检测</button>
        </div>

        <template v-if="activeTab === 'single'">
          <div class="field-group">
            <label class="field-label" for="textInput">输入待检测文本</label>
            <textarea id="textInput" v-model="textInput" class="textarea" placeholder="例如：这只股票一定能让你翻倍！" />
          </div>

          <div class="field-group">
            <label class="field-label">检测阈值</label>
            <div class="range-wrap">
              <input v-model="threshold" class="range-input" type="range" min="0" max="1" step="0.1">
              <span class="range-value">{{ Number(threshold).toFixed(1) }}</span>
            </div>
          </div>

          <div class="button-row">
            <button class="btn btn--primary" :disabled="loading" @click="detectText">{{ loading ? '检测中...' : '🔍 开始检测' }}</button>
            <button class="btn btn--secondary" @click="clearResults">🗑️ 清空</button>
          </div>

          <div class="surface-block">
            <h2 class="section-heading">示例文本</h2>
            <div class="chip-list">
              <button v-for="item in examples" :key="item" class="chip" @click="setExample(item)">{{ item }}</button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="field-group">
            <label class="field-label" for="batchTextInput">输入待检测文本（每行一条，最多 100 条）</label>
            <textarea id="batchTextInput" v-model="batchTextInput" class="textarea" placeholder="每行一条文本" />
          </div>

          <div class="field-group">
            <label class="field-label">检测阈值</label>
            <div class="range-wrap">
              <input v-model="batchThreshold" class="range-input" type="range" min="0" max="1" step="0.1">
              <span class="range-value">{{ Number(batchThreshold).toFixed(1) }}</span>
            </div>
          </div>

          <div class="button-row">
            <button class="btn btn--primary" :disabled="loading" @click="detectBatch">{{ loading ? '检测中...' : '🔍 批量检测' }}</button>
            <button class="btn btn--secondary" @click="clearBatchResults">🗑️ 清空</button>
            <button class="btn btn--info" @click="fillBatchExample">📝 填充示例</button>
          </div>
        </template>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">检测结果</h2>
            <p class="panel-subtitle">Vue 模板自动转义文本，避免原先大量 `innerHTML` 拼接。</p>
          </div>
        </div>

        <div v-if="loading" class="empty-state">
          <div class="empty-state-icon">⏳</div>
          <p>正在请求检测接口...</p>
        </div>

        <div v-else-if="resultType === 'error'" class="message-box message-box--error">
          {{ errorMessage }}
        </div>

        <div v-else-if="resultType === 'single' && singleResult" class="result-stack">
          <div class="item-card">
            <div class="panel-header">
              <h3 class="panel-title">{{ singleResult.has_violation ? '⚠️ 检测到违规内容' : '✅ 内容正常' }}</h3>
              <span class="status-pill" :class="singleResult.has_violation ? 'status-pill--warning' : 'status-pill--success'">
                {{ getRiskLevel(getMaxProbability(singleResult.label_details)) }}
              </span>
            </div>

            <div class="detail-grid">
              <div class="surface-block">
                <div class="muted-label">检测文本</div>
                <div>{{ singleResult.text }}</div>
              </div>
              <div class="surface-block">
                <div class="muted-label">置信度</div>
                <div>{{ singleConfidence }}%</div>
              </div>
              <div class="surface-block">
                <div class="muted-label">检测结果</div>
                <div>{{ singleResult.has_violation ? '违规内容' : '正常内容' }}</div>
              </div>
            </div>

            <div class="confidence-bar" style="margin-top: 16px;">
              <div class="confidence-fill" :style="{ width: `${singleConfidence}%` }" />
            </div>
          </div>

          <div v-if="singleResult.detected_labels?.length" class="item-card">
            <h3 class="section-heading">违规类型</h3>
            <div class="chip-list">
              <span v-for="label in singleResult.detected_labels" :key="label" class="status-pill status-pill--warning">{{ label }}</span>
            </div>
          </div>

          <div class="item-card">
            <h3 class="section-heading">详细概率</h3>
            <div class="result-stack">
              <div v-for="(details, label) in singleResult.label_details" :key="label" class="surface-block">
                <div class="panel-header">
                  <strong>{{ label }}</strong>
                  <span class="status-pill" :class="details.detected ? 'status-pill--warning' : 'status-pill--muted'">
                    {{ toPercent(details.probability) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="resultType === 'batch' && batchResult" class="result-stack">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="muted-label">总计</div>
              <div class="stat-card-value">{{ batchResult.summary?.total ?? 0 }}</div>
            </div>
            <div class="stat-card">
              <div class="muted-label">违规内容</div>
              <div class="stat-card-value">{{ batchResult.summary?.violation_count ?? 0 }}</div>
            </div>
            <div class="stat-card">
              <div class="muted-label">正常内容</div>
              <div class="stat-card-value">{{ batchResult.summary?.normal_count ?? 0 }}</div>
            </div>
            <div class="stat-card">
              <div class="muted-label">违规率</div>
              <div class="stat-card-value">{{ batchViolationRate }}%</div>
            </div>
          </div>

          <div class="item-card" v-if="batchResult.summary?.label_counts && Object.keys(batchResult.summary.label_counts).length">
            <h3 class="section-heading">各类型违规统计</h3>
            <div class="detail-grid">
              <div v-for="(count, label) in batchResult.summary.label_counts" :key="label" class="surface-block">
                <div class="muted-label">{{ label }}</div>
                <div>{{ count }} 条</div>
              </div>
            </div>
          </div>

          <div class="item-card">
            <h3 class="section-heading">详细结果</h3>
            <div class="item-list">
              <article v-for="(item, index) in batchResult.results" :key="`${index}-${item.text}`" class="surface-block">
                <div class="panel-header">
                  <strong>#{{ index + 1 }} {{ item.text }}</strong>
                  <span class="status-pill" :class="item.has_violation ? 'status-pill--warning' : 'status-pill--success'">
                    {{ item.has_violation ? '违规内容' : '正常内容' }}
                  </span>
                </div>
                <p class="muted-text">风险等级：{{ getRiskLevel(getMaxProbability(item.label_details)) }}</p>
                <div class="confidence-bar" style="margin-top: 12px;">
                  <div class="confidence-fill" :style="{ width: `${toPercent(getMaxProbability(item.label_details))}%` }" />
                </div>
                <div v-if="item.detected_labels?.length" class="chip-list" style="margin-top: 12px;">
                  <span v-for="label in item.detected_labels" :key="label" class="status-pill status-pill--warning">{{ label }}</span>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-state-icon">🧪</div>
          <p>选择模式并发起检测后，结果会显示在这里。</p>
        </div>
      </section>
    </div>
  </main>
</template>
