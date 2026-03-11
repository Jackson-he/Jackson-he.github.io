<script setup>
import { computed, reactive, ref, watchEffect } from 'vue'

const apiUrl = ref('http://localhost:3001')
const historyTypeFilter = ref('')

const matchesState = reactive({
  loading: false,
  error: '',
  items: [],
  loaded: false,
})

const predictionsState = reactive({
  loading: false,
  error: '',
  items: [],
  comparisons: [],
  stats: {},
  view: 'today',
  date: '',
})

const recommendationsState = reactive({
  loading: false,
  error: '',
  recommendation: null,
  comparisons: [],
  stats: {},
  view: 'today',
  date: '',
})

const historyState = reactive({
  loading: false,
  error: '',
  items: [],
  statistics: {},
  loaded: false,
})

const apiBase = computed(() => apiUrl.value.trim() || 'http://localhost:3001')

watchEffect(() => {
  document.title = '赛事预测查询 - Jackson He'
})

const historyStatistics = computed(() => Object.entries(historyState.statistics || {}))

const recommendationSections = computed(() => buildRecommendationSections(recommendationsState.recommendation))

const recommendationComparisonGroups = computed(() => {
  return Object.entries(
    (recommendationsState.comparisons || []).reduce((accumulator, item) => {
      const type = item.type || 'unknown'
      if (!accumulator[type]) {
        accumulator[type] = []
      }
      accumulator[type].push(item)
      return accumulator
    }, {}),
  )
})

function typeName(type) {
  return {
    goalRecommendation: '进球数推荐',
    halfFullTimeRecommendation: '半全场推荐',
    scoreRecommendation: '比分推荐',
    comboRecommendation: '二串一组合推荐',
  }[type] || type || '未知类型'
}

function confidenceClass(value) {
  const amount = Number(value) || 0
  if (amount >= 70) return 'status-pill--success'
  if (amount >= 50) return 'status-pill--warning'
  if (amount > 0) return 'status-pill--danger'
  return 'status-pill--muted'
}

function accuracyText(value) {
  const amount = Number(value) || 0
  return `${amount.toFixed(0)}%`
}

function emptyMessageForPrediction() {
  return predictionsState.view === 'compare' ? '暂无对比数据' : '点击“查看今日预测”查看预测结果'
}

function emptyMessageForRecommendation() {
  return recommendationsState.view === 'compare' ? '暂无推荐对比数据' : '点击“查看推荐”查看推荐结果'
}

function streakText(streak) {
  if (!streak) return '-'
  if (typeof streak === 'string') return streak

  const count = streak.count || 0
  if (streak.type === 'win') return `${count}连红`
  if (streak.type === 'lose') return `${count}连黑`
  return `${count}连走`
}

function historyResultText(item) {
  if (item.isCorrect === true) return '命中'
  if (item.isCorrect === false) return '未中'
  if (item.hasResult) return '待判定'
  return '暂无结果'
}

function historyResultClass(item) {
  if (item.isCorrect === true) return 'status-pill--success'
  if (item.isCorrect === false) return 'status-pill--danger'
  return 'status-pill--muted'
}

function renderRecommendedValue(type, match) {
  if (type === 'goalRecommendation') return match.goalRange || match.totalGoals || '未知'
  if (type === 'halfFullTimeRecommendation') return match.halfFullTime || '未知'
  if (type === 'scoreRecommendation') return match.score || '未知'
  if (type === 'comboRecommendation') return match.prediction || match.combination || '未知'
  return '未知'
}

function renderActualValue(type, result) {
  if (type === 'goalRecommendation') return result.totalGoals || result.goalRange || '未知'
  if (type === 'halfFullTimeRecommendation') return result.halfFullTime || '未知'
  if (type === 'scoreRecommendation') return result.score || '未知'
  if (type === 'comboRecommendation') return result.fullTimeResult || result.score || '未知'
  return '未知'
}

function buildRecommendationSections(rec) {
  if (!rec) return []

  const sections = []

  if (rec.goalRecommendation) {
    sections.push({
      type: 'goalRecommendation',
      title: rec.goalRecommendation.type || '进球数推荐',
      description: rec.goalRecommendation.description || '',
      matches: rec.goalRecommendation.matches || [],
      combination: '',
    })
  }

  if (rec.halfFullTimeRecommendation) {
    sections.push({
      type: 'halfFullTimeRecommendation',
      title: rec.halfFullTimeRecommendation.type || '半全场推荐',
      description: rec.halfFullTimeRecommendation.description || '',
      matches: rec.halfFullTimeRecommendation.matches || [],
      combination: '',
    })
  }

  if (rec.scoreRecommendation) {
    sections.push({
      type: 'scoreRecommendation',
      title: rec.scoreRecommendation.type || '比分推荐',
      description: rec.scoreRecommendation.description || '',
      matches: rec.scoreRecommendation.matches || [],
      combination: '',
    })
  }

  if (rec.comboRecommendation) {
    sections.push({
      type: 'comboRecommendation',
      title: rec.comboRecommendation.type || '二串一组合推荐',
      description: rec.comboRecommendation.description || '',
      matches: rec.comboRecommendation.matches || [],
      combination: rec.comboRecommendation.combination || '',
      comboType: rec.comboRecommendation.comboType || '',
    })
  }

  return sections
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${apiBase.value}${endpoint}`, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `请求失败 (${response.status})`)
  }

  return data
}

async function loadTodayMatches() {
  matchesState.loading = true
  matchesState.error = ''

  try {
    const result = await apiCall('/api/predictions/matches/today')
    matchesState.items = result.data || []
    matchesState.loaded = true
  } catch (error) {
    matchesState.error = error.message || '获取比赛失败'
  } finally {
    matchesState.loading = false
  }
}

async function predictToday() {
  if (!window.confirm('确定要预测今日所有比赛吗？这可能需要一些时间。')) {
    return
  }

  predictionsState.loading = true
  predictionsState.error = ''

  try {
    const result = await apiCall('/api/predictions/predict/today', 'POST')
    window.alert(`预测完成！成功预测 ${result.successCount || 0} 场比赛`)
    await loadTodayPredictions()
  } catch (error) {
    predictionsState.error = error.message || '预测失败'
  } finally {
    predictionsState.loading = false
  }
}

async function loadTodayPredictions() {
  predictionsState.loading = true
  predictionsState.error = ''
  predictionsState.view = 'today'

  try {
    const result = await apiCall('/api/predictions/today')
    predictionsState.items = result.data || []
    predictionsState.comparisons = []
    predictionsState.stats = {}
  } catch (error) {
    predictionsState.error = error.message || '获取预测失败'
  } finally {
    predictionsState.loading = false
  }
}

async function generateRecommendations() {
  if (!window.confirm('确定要生成今日推荐吗？')) {
    return
  }

  recommendationsState.loading = true
  recommendationsState.error = ''

  try {
    await apiCall('/api/predictions/recommendations/generate', 'POST')
    window.alert('推荐生成完成')
    await loadRecommendations()
  } catch (error) {
    recommendationsState.error = error.message || '生成推荐失败'
  } finally {
    recommendationsState.loading = false
  }
}

async function loadRecommendations() {
  recommendationsState.loading = true
  recommendationsState.error = ''
  recommendationsState.view = 'today'

  try {
    const result = await apiCall('/api/predictions/recommendations/today')
    recommendationsState.recommendation = result.data?.recommendation || result.data || null
    recommendationsState.comparisons = []
    recommendationsState.stats = {}
  } catch (error) {
    recommendationsState.error = error.message || '获取推荐失败'
  } finally {
    recommendationsState.loading = false
  }
}

async function compareResults() {
  const today = new Date().toISOString().split('T')[0]
  const date = window.prompt('请输入要对比的日期 (YYYY-MM-DD)', today)
  if (!date) return

  predictionsState.loading = true
  predictionsState.error = ''
  predictionsState.view = 'compare'
  predictionsState.date = date

  try {
    const result = await apiCall(`/api/predictions/compare?date=${encodeURIComponent(date)}`)
    predictionsState.comparisons = result.data?.comparisonResults || []
    predictionsState.stats = result.data?.statistics || {}
    predictionsState.items = []
  } catch (error) {
    predictionsState.error = error.message || '对比失败'
  } finally {
    predictionsState.loading = false
  }
}

async function compareRecommendations() {
  const today = new Date().toISOString().split('T')[0]
  const date = window.prompt('请输入要对比的日期 (YYYY-MM-DD)', today)
  if (!date) return

  recommendationsState.loading = true
  recommendationsState.error = ''
  recommendationsState.view = 'compare'
  recommendationsState.date = date

  try {
    const result = await apiCall(`/api/predictions/compare-recommendations?date=${encodeURIComponent(date)}`)
    recommendationsState.comparisons = result.data?.comparisonResults || []
    recommendationsState.stats = result.data?.statistics || {}
    recommendationsState.recommendation = result.data?.recommendation || null
  } catch (error) {
    recommendationsState.error = error.message || '推荐对比失败'
  } finally {
    recommendationsState.loading = false
  }
}

async function loadHistoryRecommendations() {
  historyState.loading = true
  historyState.error = ''

  const endpoint = historyTypeFilter.value
    ? `/api/predictions/recommendations/history?type=${encodeURIComponent(historyTypeFilter.value)}`
    : '/api/predictions/recommendations/history'

  try {
    const result = await apiCall(endpoint)
    historyState.items = result.data || []
    historyState.statistics = result.statistics || {}
    historyState.loaded = true
  } catch (error) {
    historyState.error = error.message || '获取历史推荐失败'
  } finally {
    historyState.loading = false
  }
}
</script>

<template>
  <main class="page page--dark">
    <div class="page-container page-grid">
      <RouterLink class="back-link" to="/">← 返回主页</RouterLink>

      <section class="hero">
        <p class="eyebrow">Sport Prediction</p>
        <h1 class="hero-title">⚽ 赛事预测查询系统</h1>
        <p class="hero-subtitle">将原本依赖大量 DOM 拼接的页面，改为 Vue 3 响应式数据面板。</p>
      </section>

      <section class="panel page-grid">
        <div class="field-group">
          <label class="field-label" for="apiUrl">API 服务器地址</label>
          <input id="apiUrl" v-model="apiUrl" class="input" type="text" placeholder="http://localhost:3001">
        </div>

        <div class="button-row">
          <button class="btn btn--primary" @click="loadTodayMatches">📅 获取今日比赛</button>
          <button class="btn btn--success" @click="predictToday">🔮 预测今日比赛</button>
          <button class="btn btn--info" @click="loadTodayPredictions">📊 查看今日预测</button>
          <button class="btn btn--warning" @click="generateRecommendations">⭐ 生成推荐</button>
          <button class="btn btn--info" @click="loadRecommendations">💡 查看推荐</button>
          <button class="btn btn--primary" @click="compareResults">📈 对比预测</button>
          <button class="btn btn--warning" @click="compareRecommendations">🧮 对比推荐</button>
          <button class="btn btn--info" @click="loadHistoryRecommendations">📜 历史推荐</button>
        </div>
      </section>

      <section class="page-grid page-grid--two">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">📅 今日比赛</h2>
              <p class="panel-subtitle">读取 `/api/predictions/matches/today`。</p>
            </div>
          </div>

          <div v-if="matchesState.loading" class="empty-state">
            <div class="empty-state-icon">⏳</div>
            <p>正在加载比赛列表...</p>
          </div>
          <div v-else-if="matchesState.error" class="message-box message-box--error">{{ matchesState.error }}</div>
          <div v-else-if="!matchesState.items.length" class="empty-state">
            <div class="empty-state-icon">⚽</div>
            <p>{{ matchesState.loaded ? '今日暂无比赛' : '点击“获取今日比赛”查看比赛列表' }}</p>
          </div>
          <div v-else class="item-list">
            <article v-for="match in matchesState.items" :key="match.matchId || `${match.homeTeam}-${match.awayTeam}`" class="item-card">
              <div class="panel-header">
                <div>
                  <h3 class="panel-title">{{ match.homeTeam }} vs {{ match.awayTeam }}</h3>
                  <p class="panel-subtitle">{{ match.league || '未知联赛' }}</p>
                </div>
                <span class="status-pill status-pill--muted">{{ match.matchTime || '时间待定' }}</span>
              </div>
              <p class="muted-text">比赛 ID：{{ match.matchId }}</p>
            </article>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">🔮 预测结果</h2>
              <p class="panel-subtitle">支持查看今日预测和按日期对比结果。</p>
            </div>
            <span v-if="predictionsState.view === 'compare' && predictionsState.date" class="status-pill status-pill--muted">
              {{ predictionsState.date }}
            </span>
          </div>

          <div v-if="predictionsState.loading" class="empty-state">
            <div class="empty-state-icon">⏳</div>
            <p>正在加载预测数据...</p>
          </div>
          <div v-else-if="predictionsState.error" class="message-box message-box--error">{{ predictionsState.error }}</div>
          <template v-else-if="predictionsState.view === 'compare' && predictionsState.comparisons.length">
            <div class="stats-grid" style="margin-bottom: 18px;">
              <div class="stat-card">
                <div class="muted-label">总比赛数</div>
                <div class="stat-card-value">{{ predictionsState.stats.totalMatches || 0 }}</div>
              </div>
              <div class="stat-card">
                <div class="muted-label">有结果比赛</div>
                <div class="stat-card-value">{{ predictionsState.stats.matchesWithResults || 0 }}</div>
              </div>
              <div class="stat-card">
                <div class="muted-label">胜负正确</div>
                <div class="stat-card-value">{{ predictionsState.stats.fullTimeResultCorrect || 0 }}</div>
              </div>
              <div class="stat-card">
                <div class="muted-label">平均准确率</div>
                <div class="stat-card-value">{{ predictionsState.stats.averageAccuracy || 0 }}%</div>
              </div>
            </div>

            <div class="item-list">
              <article v-for="comp in predictionsState.comparisons" :key="comp.matchId || `${comp.homeTeam}-${comp.awayTeam}`" class="item-card">
                <div class="panel-header">
                  <div>
                    <h3 class="panel-title">{{ comp.homeTeam }} vs {{ comp.awayTeam }}</h3>
                    <p class="panel-subtitle">{{ comp.league || '未知联赛' }}</p>
                  </div>
                  <span class="status-pill" :class="confidenceClass(comp.comparison?.accuracy)">
                    {{ comp.hasOfficialResult && comp.comparison ? accuracyText(comp.comparison.accuracy) : '暂无结果' }}
                  </span>
                </div>

                <div v-if="comp.hasOfficialResult && comp.comparison" class="detail-grid">
                  <div class="surface-block">
                    <div class="section-heading">预测结果</div>
                    <p class="muted-text">胜负：{{ comp.prediction?.fullTimeResult || '未知' }}</p>
                    <p class="muted-text">比分：{{ comp.prediction?.score || '未知' }}</p>
                    <p class="muted-text">进球数：{{ comp.prediction?.goalRange || '未知' }}</p>
                    <p class="muted-text">半全场：{{ comp.prediction?.halfFullTime || '未知' }}</p>
                  </div>
                  <div class="surface-block">
                    <div class="section-heading">官方结果</div>
                    <p class="muted-text">胜负：{{ comp.officialResult?.fullTimeResult || '未知' }}</p>
                    <p class="muted-text">比分：{{ comp.officialResult?.score || '未知' }}</p>
                    <p class="muted-text">进球数：{{ comp.officialResult?.goalRange || comp.officialResult?.totalGoals || '未知' }}</p>
                    <p class="muted-text">半全场：{{ comp.officialResult?.halfFullTime || '未知' }}</p>
                  </div>
                </div>
                <div v-else class="surface-block">⚠️ 该比赛暂无官方结果。</div>
              </article>
            </div>
          </template>
          <template v-else-if="predictionsState.items.length">
            <div class="item-list">
              <article v-for="pred in predictionsState.items" :key="pred.matchId || `${pred.homeTeam}-${pred.awayTeam}`" class="item-card">
                <div class="panel-header">
                  <div>
                    <h3 class="panel-title">{{ pred.homeTeam }} vs {{ pred.awayTeam }}</h3>
                    <p class="panel-subtitle">{{ pred.league || '未知联赛' }}</p>
                  </div>
                  <span class="status-pill" :class="confidenceClass(pred.prediction?.prediction?.confidence)">
                    {{ pred.prediction?.prediction?.confidence || 0 }}%
                  </span>
                </div>

                <div class="detail-grid">
                  <div class="surface-block">
                    <div class="muted-label">预测结果</div>
                    <div>{{ pred.prediction?.prediction?.fullTimeResult || '未知' }}</div>
                  </div>
                  <div class="surface-block">
                    <div class="muted-label">预测比分</div>
                    <div>{{ pred.prediction?.prediction?.score || '未知' }}</div>
                  </div>
                  <div class="surface-block">
                    <div class="muted-label">总进球数</div>
                    <div>{{ pred.prediction?.prediction?.goalRange || '未知' }}</div>
                  </div>
                  <div class="surface-block">
                    <div class="muted-label">半全场</div>
                    <div>{{ pred.prediction?.prediction?.halfFullTime || '未知' }}</div>
                  </div>
                </div>
              </article>
            </div>
          </template>
          <div v-else class="empty-state">
            <div class="empty-state-icon">📊</div>
            <p>{{ emptyMessageForPrediction() }}</p>
          </div>
        </section>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">💡 推荐结果</h2>
            <p class="panel-subtitle">支持查看推荐本身和按日期对比推荐命中情况。</p>
          </div>
          <span v-if="recommendationsState.view === 'compare' && recommendationsState.date" class="status-pill status-pill--muted">
            {{ recommendationsState.date }}
          </span>
        </div>

        <div v-if="recommendationsState.loading" class="empty-state">
          <div class="empty-state-icon">⏳</div>
          <p>正在加载推荐数据...</p>
        </div>
        <div v-else-if="recommendationsState.error" class="message-box message-box--error">{{ recommendationsState.error }}</div>
        <template v-else-if="recommendationsState.view === 'compare' && recommendationComparisonGroups.length">
          <div class="stats-grid" style="margin-bottom: 18px;">
            <div class="stat-card">
              <div class="muted-label">推荐比赛数</div>
              <div class="stat-card-value">{{ recommendationsState.stats.totalRecommendedMatches || 0 }}</div>
            </div>
            <div class="stat-card">
              <div class="muted-label">有结果比赛</div>
              <div class="stat-card-value">{{ recommendationsState.stats.matchesWithResults || 0 }}</div>
            </div>
            <div class="stat-card">
              <div class="muted-label">整体准确率</div>
              <div class="stat-card-value">{{ recommendationsState.stats.overallAccuracy || 0 }}%</div>
            </div>
            <div class="stat-card">
              <div class="muted-label">组合推荐正确</div>
              <div class="stat-card-value">{{ recommendationsState.stats.comboRecommendationCorrect || 0 }}</div>
            </div>
          </div>

          <div class="recommendation-stack">
            <section v-for="([type, items]) in recommendationComparisonGroups" :key="type" class="surface-block">
              <h3 class="section-heading">{{ typeName(type) }}</h3>
              <div class="item-list">
                <article v-for="item in items" :key="item.id || `${type}-${item.match?.homeTeam}-${item.match?.awayTeam}`" class="item-card">
                  <div class="panel-header">
                    <div>
                      <h4 class="panel-title">{{ item.match?.homeTeam || '未知' }} vs {{ item.match?.awayTeam || '未知' }}</h4>
                      <p class="panel-subtitle">{{ item.match?.league || '未知联赛' }}</p>
                    </div>
                    <span class="status-pill" :class="confidenceClass(item.comparison?.accuracy)">
                      {{ item.hasOfficialResult && item.comparison ? accuracyText(item.comparison.accuracy) : '暂无结果' }}
                    </span>
                  </div>

                  <div v-if="item.hasOfficialResult" class="detail-grid">
                    <div class="surface-block">
                      <div class="section-heading">推荐信息</div>
                      <p class="muted-text">推荐值：{{ renderRecommendedValue(type, item.match || {}) }}</p>
                      <p class="muted-text">信心度：{{ item.match?.confidence || '未知' }}%</p>
                      <div v-if="type === 'scoreRecommendation' && item.match?.scoreOptions?.length" class="score-grid" style="margin-top: 12px;">
                        <div
                          v-for="option in item.match.scoreOptions"
                          :key="`${item.match.homeTeam}-${option.score}`"
                          class="score-option"
                          :class="{ 'is-primary': option.score === item.actualResult?.score }"
                        >
                          <strong>{{ option.score }}</strong>
                          <div class="muted-label">{{ option.confidence }}%</div>
                        </div>
                      </div>
                    </div>
                    <div class="surface-block">
                      <div class="section-heading">实际结果</div>
                      <p class="muted-text">实际值：{{ renderActualValue(type, item.actualResult || {}) }}</p>
                      <p class="muted-text">比分：{{ item.actualResult?.score || '未知' }}</p>
                      <p class="muted-text">胜负：{{ item.actualResult?.fullTimeResult || '未知' }}</p>
                    </div>
                  </div>
                  <div v-else class="surface-block">⚠️ 该比赛暂无官方结果。</div>
                </article>
              </div>
            </section>
          </div>
        </template>
        <template v-else-if="recommendationSections.length">
          <div class="recommendation-stack">
            <section v-for="section in recommendationSections" :key="section.type" class="surface-block">
              <div class="panel-header">
                <div>
                  <h3 class="panel-title">{{ section.title }}<span v-if="section.comboType"> - {{ section.comboType }}</span></h3>
                  <p class="panel-subtitle">{{ section.description }}</p>
                </div>
              </div>

              <div v-if="section.combination" class="surface-block" style="margin-bottom: 14px;">
                <strong>组合：</strong> {{ section.combination }}
              </div>

              <div class="item-list">
                <article v-for="match in section.matches" :key="`${section.type}-${match.homeTeam}-${match.awayTeam}-${match.prediction || match.score || ''}`" class="item-card">
                  <div class="panel-header">
                    <div>
                      <h4 class="panel-title">{{ match.homeTeam }}<span v-if="match.awayTeam"> vs {{ match.awayTeam }}</span></h4>
                      <p class="panel-subtitle">{{ match.league || '推荐条目' }}</p>
                    </div>
                    <span class="status-pill" :class="confidenceClass(match.confidence)">{{ match.confidence || 0 }}%</span>
                  </div>

                  <div v-if="section.type === 'scoreRecommendation' && match.scoreOptions?.length" class="score-grid">
                    <div v-for="(option, index) in match.scoreOptions" :key="`${match.homeTeam}-${option.score}`" class="score-option" :class="{ 'is-primary': index === 0 }">
                      <strong>{{ option.score }}</strong>
                      <div class="muted-label">{{ option.confidence }}%</div>
                    </div>
                  </div>
                  <div v-else class="detail-grid">
                    <div class="surface-block">
                      <div class="muted-label">推荐值</div>
                      <div>{{ renderRecommendedValue(section.type, match) }}</div>
                    </div>
                    <div class="surface-block">
                      <div class="muted-label">信心度</div>
                      <div>{{ match.confidence || 0 }}%</div>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section v-if="recommendationsState.recommendation?.summary" class="surface-block">
              <h3 class="section-heading">📋 推荐总结</h3>
              <p class="muted-text"><strong>最佳推荐：</strong>{{ recommendationsState.recommendation.summary.bestRecommendation || '暂无' }}</p>
              <p class="muted-text"><strong>推荐理由：</strong>{{ recommendationsState.recommendation.summary.whyBest || '暂无' }}</p>
              <p class="muted-text"><strong>风险提示：</strong>{{ recommendationsState.recommendation.summary.riskWarning || '暂无' }}</p>
            </section>
          </div>
        </template>
        <div v-else class="empty-state">
          <div class="empty-state-icon">⭐</div>
          <p>{{ emptyMessageForRecommendation() }}</p>
        </div>
      </section>

      <section class="panel page-grid">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">📜 历史推荐</h2>
            <p class="panel-subtitle">读取历史推荐数据，并按推荐类型过滤。</p>
          </div>
        </div>

        <div class="field-row">
          <select v-model="historyTypeFilter" class="select">
            <option value="">全部推荐类型</option>
            <option value="goalRecommendation">进球数推荐</option>
            <option value="halfFullTimeRecommendation">半全场推荐</option>
            <option value="scoreRecommendation">比分推荐</option>
            <option value="comboRecommendation">二串一组合推荐</option>
          </select>
          <button class="btn btn--info" @click="loadHistoryRecommendations">刷新数据</button>
        </div>

        <div v-if="historyState.loading" class="empty-state">
          <div class="empty-state-icon">⏳</div>
          <p>正在加载历史推荐...</p>
        </div>
        <div v-else-if="historyState.error" class="message-box message-box--error">{{ historyState.error }}</div>
        <template v-else>
          <div v-if="historyStatistics.length" class="card-grid">
            <article v-for="([type, stat]) in historyStatistics" :key="type" class="item-card">
              <div class="panel-header">
                <h3 class="panel-title">{{ stat.typeName || typeName(type) }}</h3>
                <span class="status-pill" :class="confidenceClass(stat.winRate)">{{ stat.winRate || 0 }}%</span>
              </div>
              <div class="detail-grid">
                <div class="surface-block">
                  <div class="muted-label">总场次</div>
                  <div>{{ stat.total || 0 }}</div>
                </div>
                <div class="surface-block">
                  <div class="muted-label">正确</div>
                  <div>{{ stat.correct || 0 }}</div>
                </div>
                <div class="surface-block">
                  <div class="muted-label">错误</div>
                  <div>{{ stat.wrong || 0 }}</div>
                </div>
                <div class="surface-block">
                  <div class="muted-label">连胜/连黑</div>
                  <div>{{ streakText(stat.currentStreak) }}</div>
                </div>
              </div>
            </article>
          </div>

          <div v-if="historyState.items.length" class="table-card">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>类型</th>
                    <th>比赛</th>
                    <th>推荐</th>
                    <th>实际</th>
                    <th>结果</th>
                    <th>走势</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in historyState.items" :key="item.id || `${item.date}-${item.type}-${item.homeTeam}-${item.awayTeam}`">
                    <td>{{ item.date }}</td>
                    <td>{{ item.typeName || typeName(item.type) }}</td>
                    <td>
                      <strong>{{ item.type === 'comboRecommendation' ? item.homeTeam : `${item.homeTeam} vs ${item.awayTeam}` }}</strong>
                      <div class="muted-label">{{ item.league || '-' }}</div>
                    </td>
                    <td>{{ item.recommended || '-' }}</td>
                    <td>{{ item.actual || (item.hasResult ? '待开奖' : '-') }}</td>
                    <td>
                      <span class="status-pill" :class="historyResultClass(item)">{{ historyResultText(item) }}</span>
                    </td>
                    <td>{{ item.streak || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-state-icon">📜</div>
            <p>{{ historyState.loaded ? '暂无历史推荐数据' : '点击“历史推荐”按钮加载历史数据' }}</p>
          </div>
        </template>
      </section>
    </div>
  </main>
</template>
