<script setup>
import { computed, reactive, ref, watchEffect } from 'vue'

const apiUrl = ref('http://localhost:3001')
const activeTab = ref('matches')
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
  document.title = '赛事预测查询'
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
  return predictionsState.view === 'compare' ? '暂无对比数据' : '点击"查看今日预测"查看预测结果'
}

function emptyMessageForRecommendation() {
  return recommendationsState.view === 'compare' ? '暂无推荐对比数据' : '点击"查看推荐"查看推荐结果'
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
  <main class="sp-page">
    <div class="sp-container">

      <!-- Stadium Header -->
      <header class="sp-header">
        <div class="sp-header__badge">SPORT PREDICTION</div>
        <div></div>
        <!-- <h1 class="sp-header__title">赛事预测系统</h1> -->
        <div class="sp-header__config">
          <label class="sp-config-label" for="apiUrl">API</label>
          <input id="apiUrl" v-model="apiUrl" class="sp-config-input" type="text" placeholder="http://localhost:3001">
        </div>
      </header>

      <!-- Tab Navigation -->
      <nav class="sp-tabs">
        <button class="sp-tab" :class="{ 'is-active': activeTab === 'matches' }" @click="activeTab = 'matches'">比赛</button>
        <button class="sp-tab" :class="{ 'is-active': activeTab === 'predictions' }" @click="activeTab = 'predictions'">预测</button>
        <button class="sp-tab" :class="{ 'is-active': activeTab === 'recommendations' }" @click="activeTab = 'recommendations'">推荐</button>
        <button class="sp-tab" :class="{ 'is-active': activeTab === 'history' }" @click="activeTab = 'history'">历史</button>
      </nav>

      <!-- ========== MATCHES TAB ========== -->
      <section v-if="activeTab === 'matches'" class="sp-section">
        <div class="sp-section-header">
          <div>
            <h2 class="sp-section-title">今日比赛</h2>
            <p class="sp-section-sub">获取今日赛程并进行预测</p>
          </div>
          <div class="sp-actions">
            <button class="sp-btn sp-btn--primary" :disabled="matchesState.loading" @click="loadTodayMatches">获取比赛</button>
            <button class="sp-btn sp-btn--gold" :disabled="predictionsState.loading" @click="predictToday">开始预测</button>
          </div>
        </div>

        <div v-if="matchesState.loading" class="sp-empty">
          <div class="sp-spinner"></div>
          <p>正在加载比赛列表...</p>
        </div>
        <div v-else-if="matchesState.error" class="sp-error">{{ matchesState.error }}</div>
        <div v-else-if="!matchesState.items.length" class="sp-empty">
          <div class="sp-empty__icon">&#9917;</div>
          <p>{{ matchesState.loaded ? '今日暂无比赛' : '点击"获取比赛"查看比赛列表' }}</p>
        </div>
        <div v-else class="sp-match-grid">
          <article v-for="match in matchesState.items" :key="match.matchId || `${match.homeTeam}-${match.awayTeam}`" class="sp-match-card">
            <div class="sp-match-card__league">{{ match.league || '未知联赛' }}</div>
            <div class="sp-match-card__body">
              <div class="sp-match-card__team sp-match-card__team--home">{{ match.homeTeam }}</div>
              <div class="sp-match-card__vs">VS</div>
              <div class="sp-match-card__team sp-match-card__team--away">{{ match.awayTeam }}</div>
            </div>
            <div class="sp-match-card__footer">
              <span>{{ match.matchTime || '时间待定' }}</span>
              <span class="sp-match-card__id">ID: {{ match.matchId }}</span>
            </div>
          </article>
        </div>
      </section>

      <!-- ========== PREDICTIONS TAB ========== -->
      <section v-if="activeTab === 'predictions'" class="sp-section">
        <div class="sp-section-header">
          <div>
            <h2 class="sp-section-title">预测结果</h2>
            <p class="sp-section-sub">查看今日预测和按日期对比</p>
          </div>
          <div class="sp-actions">
            <button class="sp-btn sp-btn--primary" :disabled="predictionsState.loading" @click="loadTodayPredictions">今日预测</button>
            <button class="sp-btn sp-btn--outline" :disabled="predictionsState.loading" @click="compareResults">对比预测</button>
          </div>
        </div>

        <div v-if="predictionsState.loading" class="sp-empty">
          <div class="sp-spinner"></div>
          <p>正在加载预测数据...</p>
        </div>
        <div v-else-if="predictionsState.error" class="sp-error">{{ predictionsState.error }}</div>

        <!-- Compare View -->
        <template v-else-if="predictionsState.view === 'compare' && predictionsState.comparisons.length">
          <div class="sp-date-badge" v-if="predictionsState.date">{{ predictionsState.date }}</div>
          <div class="sp-stats-bar">
            <div class="sp-stat-box">
              <div class="sp-stat-box__label">总比赛数</div>
              <div class="sp-stat-box__value">{{ predictionsState.stats.totalMatches || 0 }}</div>
            </div>
            <div class="sp-stat-box">
              <div class="sp-stat-box__label">有结果</div>
              <div class="sp-stat-box__value">{{ predictionsState.stats.matchesWithResults || 0 }}</div>
            </div>
            <div class="sp-stat-box">
              <div class="sp-stat-box__label">胜负正确</div>
              <div class="sp-stat-box__value">{{ predictionsState.stats.fullTimeResultCorrect || 0 }}</div>
            </div>
            <div class="sp-stat-box sp-stat-box--highlight">
              <div class="sp-stat-box__label">准确率</div>
              <div class="sp-stat-box__value">{{ predictionsState.stats.averageAccuracy || 0 }}%</div>
            </div>
          </div>

          <div class="sp-card-grid">
            <article v-for="comp in predictionsState.comparisons" :key="comp.matchId || `${comp.homeTeam}-${comp.awayTeam}`" class="sp-pred-card">
              <div class="sp-pred-card__header">
                <div>
                  <div class="sp-pred-card__league">{{ comp.league || '未知联赛' }}</div>
                  <h3 class="sp-pred-card__teams">{{ comp.homeTeam }} vs {{ comp.awayTeam }}</h3>
                </div>
                <span class="sp-badge" :class="confidenceClass(comp.comparison?.accuracy)">
                  {{ comp.hasOfficialResult && comp.comparison ? accuracyText(comp.comparison.accuracy) : '暂无结果' }}
                </span>
              </div>
              <div v-if="comp.hasOfficialResult && comp.comparison" class="sp-compare-grid">
                <div class="sp-compare-col">
                  <div class="sp-compare-col__title">预测</div>
                  <div class="sp-kv"><span class="sp-kv__k">胜负</span><span class="sp-kv__v">{{ comp.prediction?.fullTimeResult || '未知' }}</span></div>
                  <div class="sp-kv"><span class="sp-kv__k">比分</span><span class="sp-kv__v">{{ comp.prediction?.score || '未知' }}</span></div>
                  <div class="sp-kv"><span class="sp-kv__k">进球</span><span class="sp-kv__v">{{ comp.prediction?.goalRange || '未知' }}</span></div>
                  <div class="sp-kv"><span class="sp-kv__k">半全场</span><span class="sp-kv__v">{{ comp.prediction?.halfFullTime || '未知' }}</span></div>
                </div>
                <div class="sp-compare-col sp-compare-col--actual">
                  <div class="sp-compare-col__title">官方</div>
                  <div class="sp-kv"><span class="sp-kv__k">胜负</span><span class="sp-kv__v">{{ comp.officialResult?.fullTimeResult || '未知' }}</span></div>
                  <div class="sp-kv"><span class="sp-kv__k">比分</span><span class="sp-kv__v">{{ comp.officialResult?.score || '未知' }}</span></div>
                  <div class="sp-kv"><span class="sp-kv__k">进球</span><span class="sp-kv__v">{{ comp.officialResult?.goalRange || comp.officialResult?.totalGoals || '未知' }}</span></div>
                  <div class="sp-kv"><span class="sp-kv__k">半全场</span><span class="sp-kv__v">{{ comp.officialResult?.halfFullTime || '未知' }}</span></div>
                </div>
              </div>
              <div v-else class="sp-no-result">暂无官方结果</div>
            </article>
          </div>
        </template>

        <!-- Today Predictions -->
        <template v-else-if="predictionsState.items.length">
          <div class="sp-card-grid">
            <article v-for="pred in predictionsState.items" :key="pred.matchId || `${pred.homeTeam}-${pred.awayTeam}`" class="sp-pred-card">
              <div class="sp-pred-card__header">
                <div>
                  <div class="sp-pred-card__league">{{ pred.league || '未知联赛' }}</div>
                  <h3 class="sp-pred-card__teams">{{ pred.homeTeam }} vs {{ pred.awayTeam }}</h3>
                </div>
                <span class="sp-badge" :class="confidenceClass(pred.prediction?.prediction?.confidence)">
                  {{ pred.prediction?.prediction?.confidence || 0 }}%
                </span>
              </div>
              <div class="sp-progress">
                <div class="sp-progress__fill" :style="{ width: (pred.prediction?.prediction?.confidence || 0) + '%' }"></div>
              </div>
              <div class="sp-detail-chips">
                <div class="sp-chip">
                  <div class="sp-chip__label">胜负</div>
                  <div class="sp-chip__value">{{ pred.prediction?.prediction?.fullTimeResult || '未知' }}</div>
                </div>
                <div class="sp-chip">
                  <div class="sp-chip__label">比分</div>
                  <div class="sp-chip__value">{{ pred.prediction?.prediction?.score || '未知' }}</div>
                </div>
                <div class="sp-chip">
                  <div class="sp-chip__label">进球数</div>
                  <div class="sp-chip__value">{{ pred.prediction?.prediction?.goalRange || '未知' }}</div>
                </div>
                <div class="sp-chip">
                  <div class="sp-chip__label">半全场</div>
                  <div class="sp-chip__value">{{ pred.prediction?.prediction?.halfFullTime || '未知' }}</div>
                </div>
              </div>
            </article>
          </div>
        </template>

        <div v-else class="sp-empty">
          <div class="sp-empty__icon">&#128202;</div>
          <p>{{ emptyMessageForPrediction() }}</p>
        </div>
      </section>

      <!-- ========== RECOMMENDATIONS TAB ========== -->
      <section v-if="activeTab === 'recommendations'" class="sp-section">
        <div class="sp-section-header">
          <div>
            <h2 class="sp-section-title">推荐结果</h2>
            <p class="sp-section-sub">查看推荐和对比推荐命中情况</p>
          </div>
          <div class="sp-actions">
            <button class="sp-btn sp-btn--gold" :disabled="recommendationsState.loading" @click="generateRecommendations">生成推荐</button>
            <button class="sp-btn sp-btn--primary" :disabled="recommendationsState.loading" @click="loadRecommendations">查看推荐</button>
            <button class="sp-btn sp-btn--outline" :disabled="recommendationsState.loading" @click="compareRecommendations">对比推荐</button>
          </div>
        </div>

        <div v-if="recommendationsState.loading" class="sp-empty">
          <div class="sp-spinner"></div>
          <p>正在加载推荐数据...</p>
        </div>
        <div v-else-if="recommendationsState.error" class="sp-error">{{ recommendationsState.error }}</div>

        <!-- Compare Recommendations -->
        <template v-else-if="recommendationsState.view === 'compare' && recommendationComparisonGroups.length">
          <div class="sp-date-badge" v-if="recommendationsState.date">{{ recommendationsState.date }}</div>
          <div class="sp-stats-bar">
            <div class="sp-stat-box">
              <div class="sp-stat-box__label">推荐数</div>
              <div class="sp-stat-box__value">{{ recommendationsState.stats.totalRecommendedMatches || 0 }}</div>
            </div>
            <div class="sp-stat-box">
              <div class="sp-stat-box__label">有结果</div>
              <div class="sp-stat-box__value">{{ recommendationsState.stats.matchesWithResults || 0 }}</div>
            </div>
            <div class="sp-stat-box sp-stat-box--highlight">
              <div class="sp-stat-box__label">准确率</div>
              <div class="sp-stat-box__value">{{ recommendationsState.stats.overallAccuracy || 0 }}%</div>
            </div>
            <div class="sp-stat-box">
              <div class="sp-stat-box__label">组合正确</div>
              <div class="sp-stat-box__value">{{ recommendationsState.stats.comboRecommendationCorrect || 0 }}</div>
            </div>
          </div>

          <div class="sp-rec-stack">
            <section v-for="([type, items]) in recommendationComparisonGroups" :key="type" class="sp-rec-group">
              <h3 class="sp-rec-group__title">{{ typeName(type) }}</h3>
              <div class="sp-card-grid">
                <article v-for="item in items" :key="item.id || `${type}-${item.match?.homeTeam}-${item.match?.awayTeam}`" class="sp-pred-card">
                  <div class="sp-pred-card__header">
                    <div>
                      <div class="sp-pred-card__league">{{ item.match?.league || '未知联赛' }}</div>
                      <h4 class="sp-pred-card__teams">{{ item.match?.homeTeam || '未知' }} vs {{ item.match?.awayTeam || '未知' }}</h4>
                    </div>
                    <span class="sp-badge" :class="confidenceClass(item.comparison?.accuracy)">
                      {{ item.hasOfficialResult && item.comparison ? accuracyText(item.comparison.accuracy) : '暂无结果' }}
                    </span>
                  </div>
                  <div v-if="item.hasOfficialResult" class="sp-compare-grid">
                    <div class="sp-compare-col">
                      <div class="sp-compare-col__title">推荐</div>
                      <div class="sp-kv"><span class="sp-kv__k">推荐值</span><span class="sp-kv__v">{{ renderRecommendedValue(type, item.match || {}) }}</span></div>
                      <div class="sp-kv"><span class="sp-kv__k">信心度</span><span class="sp-kv__v">{{ item.match?.confidence || '未知' }}%</span></div>
                      <div v-if="type === 'scoreRecommendation' && item.match?.scoreOptions?.length" class="sp-score-grid">
                        <div
                          v-for="option in item.match.scoreOptions"
                          :key="`${item.match.homeTeam}-${option.score}`"
                          class="sp-score-chip"
                          :class="{ 'is-hit': option.score === item.actualResult?.score }"
                        >
                          <strong>{{ option.score }}</strong>
                          <small>{{ option.confidence }}%</small>
                        </div>
                      </div>
                    </div>
                    <div class="sp-compare-col sp-compare-col--actual">
                      <div class="sp-compare-col__title">实际</div>
                      <div class="sp-kv"><span class="sp-kv__k">实际值</span><span class="sp-kv__v">{{ renderActualValue(type, item.actualResult || {}) }}</span></div>
                      <div class="sp-kv"><span class="sp-kv__k">比分</span><span class="sp-kv__v">{{ item.actualResult?.score || '未知' }}</span></div>
                      <div class="sp-kv"><span class="sp-kv__k">胜负</span><span class="sp-kv__v">{{ item.actualResult?.fullTimeResult || '未知' }}</span></div>
                    </div>
                  </div>
                  <div v-else class="sp-no-result">暂无官方结果</div>
                </article>
              </div>
            </section>
          </div>
        </template>

        <!-- Today Recommendations -->
        <template v-else-if="recommendationSections.length">
          <div class="sp-rec-stack">
            <section v-for="section in recommendationSections" :key="section.type" class="sp-rec-group">
              <div class="sp-rec-group__header">
                <h3 class="sp-rec-group__title">
                  {{ section.title }}<span v-if="section.comboType" class="sp-rec-group__combo"> - {{ section.comboType }}</span>
                </h3>
                <p v-if="section.description" class="sp-rec-group__desc">{{ section.description }}</p>
              </div>

              <div v-if="section.combination" class="sp-combo-badge">
                <strong>组合：</strong> {{ section.combination }}
              </div>

              <div class="sp-card-grid">
                <article v-for="match in section.matches" :key="`${section.type}-${match.homeTeam}-${match.awayTeam}-${match.prediction || match.score || ''}`" class="sp-pred-card">
                  <div class="sp-pred-card__header">
                    <div>
                      <h4 class="sp-pred-card__teams">{{ match.homeTeam }}<span v-if="match.awayTeam"> vs {{ match.awayTeam }}</span></h4>
                      <div class="sp-pred-card__league">{{ match.league || '推荐条目' }}</div>
                    </div>
                    <span class="sp-badge" :class="confidenceClass(match.confidence)">{{ match.confidence || 0 }}%</span>
                  </div>
                  <div class="sp-progress">
                    <div class="sp-progress__fill" :style="{ width: (match.confidence || 0) + '%' }"></div>
                  </div>
                  <div v-if="section.type === 'scoreRecommendation' && match.scoreOptions?.length" class="sp-score-grid">
                    <div v-for="(option, index) in match.scoreOptions" :key="`${match.homeTeam}-${option.score}`" class="sp-score-chip" :class="{ 'is-hit': index === 0 }">
                      <strong>{{ option.score }}</strong>
                      <small>{{ option.confidence }}%</small>
                    </div>
                  </div>
                  <div v-else class="sp-detail-chips sp-detail-chips--two">
                    <div class="sp-chip">
                      <div class="sp-chip__label">推荐值</div>
                      <div class="sp-chip__value">{{ renderRecommendedValue(section.type, match) }}</div>
                    </div>
                    <div class="sp-chip">
                      <div class="sp-chip__label">信心度</div>
                      <div class="sp-chip__value">{{ match.confidence || 0 }}%</div>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section v-if="recommendationsState.recommendation?.summary" class="sp-summary-card">
              <h3 class="sp-summary-card__title">推荐总结</h3>
              <div class="sp-summary-card__row"><span class="sp-summary-card__label">最佳推荐</span><span>{{ recommendationsState.recommendation.summary.bestRecommendation || '暂无' }}</span></div>
              <div class="sp-summary-card__row"><span class="sp-summary-card__label">推荐理由</span><span>{{ recommendationsState.recommendation.summary.whyBest || '暂无' }}</span></div>
              <div class="sp-summary-card__row"><span class="sp-summary-card__label">风险提示</span><span>{{ recommendationsState.recommendation.summary.riskWarning || '暂无' }}</span></div>
            </section>
          </div>
        </template>

        <div v-else class="sp-empty">
          <div class="sp-empty__icon">&#11088;</div>
          <p>{{ emptyMessageForRecommendation() }}</p>
        </div>
      </section>

      <!-- ========== HISTORY TAB ========== -->
      <section v-if="activeTab === 'history'" class="sp-section">
        <div class="sp-section-header">
          <div>
            <h2 class="sp-section-title">历史推荐</h2>
            <p class="sp-section-sub">读取历史推荐数据</p>
          </div>
          <div class="sp-actions">
            <select v-model="historyTypeFilter" class="sp-select">
              <option value="">全部类型</option>
              <option value="goalRecommendation">进球数推荐</option>
              <option value="halfFullTimeRecommendation">半全场推荐</option>
              <option value="scoreRecommendation">比分推荐</option>
              <option value="comboRecommendation">二串一组合</option>
            </select>
            <button class="sp-btn sp-btn--primary" :disabled="historyState.loading" @click="loadHistoryRecommendations">刷新</button>
          </div>
        </div>

        <div v-if="historyState.loading" class="sp-empty">
          <div class="sp-spinner"></div>
          <p>正在加载历史推荐...</p>
        </div>
        <div v-else-if="historyState.error" class="sp-error">{{ historyState.error }}</div>
        <template v-else>
          <!-- Statistics Cards -->
          <div v-if="historyStatistics.length" class="sp-stats-bar">
            <article v-for="([type, stat]) in historyStatistics" :key="type" class="sp-stat-box sp-stat-box--card">
              <div class="sp-stat-box__label">{{ stat.typeName || typeName(type) }}</div>
              <div class="sp-stat-box__value">{{ stat.winRate || 0 }}%</div>
              <div class="sp-stat-box__detail">
                <span>{{ stat.correct || 0 }}胜</span>
                <span>{{ stat.wrong || 0 }}负</span>
                <span>{{ streakText(stat.currentStreak) }}</span>
              </div>
            </article>
          </div>

          <!-- History Table -->
          <div v-if="historyState.items.length" class="sp-table-wrap">
            <table class="sp-table">
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
                    <div class="sp-table__sub">{{ item.league || '-' }}</div>
                  </td>
                  <td>{{ item.recommended || '-' }}</td>
                  <td>{{ item.actual || (item.hasResult ? '待开奖' : '-') }}</td>
                  <td>
                    <span class="sp-badge" :class="historyResultClass(item)">{{ historyResultText(item) }}</span>
                  </td>
                  <td>{{ item.streak || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="sp-empty">
            <div class="sp-empty__icon">&#128220;</div>
            <p>{{ historyState.loaded ? '暂无历史推荐数据' : '点击"刷新"加载历史数据' }}</p>
          </div>
        </template>
      </section>

    </div>
  </main>
</template>

<style scoped>
/* ============================================
   Sport Prediction — Modern Sports Theme
   ============================================ */

/* --- Page & Container --- */
.sp-page {
  min-height: 100vh;
  padding: 0;
  background: linear-gradient(170deg, #022c22 0%, #064e3b 35%, #0f172a 100%);
  color: #ecfdf5;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.sp-container {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 32px 20px 60px;
  display: grid;
  gap: 24px;
}

/* --- Header --- */
.sp-header {
  text-align: center;
  padding: 48px 24px 32px;
}

.sp-header__badge {
  display: inline-block;
  padding: 6px 18px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.18);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #6ee7b7;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  margin-bottom: 16px;
}

.sp-header__title {
  margin: 0;
  font-size: clamp(2rem, 6vw, 3.2rem);
  font-weight: 800;
  line-height: 1.1;
  background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 40%, #6ee7b7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sp-header__config {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 6px 8px 6px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.sp-config-label {
  color: #6ee7b7;
  font-size: 0.82rem;
  font-weight: 700;
}

.sp-config-input {
  border: none;
  background: transparent;
  color: #d1fae5;
  font-size: 0.85rem;
  width: 240px;
  padding: 6px 12px;
  border-radius: 999px;
  font-family: inherit;
}

.sp-config-input::placeholder {
  color: rgba(209, 250, 229, 0.35);
}

.sp-config-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.05);
}

/* --- Tab Navigation --- */
.sp-tabs {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 6px;
  border-radius: 16px;
  background: rgba(6, 78, 59, 0.6);
  border: 1px solid rgba(16, 185, 129, 0.15);
}

.sp-tab {
  padding: 12px 28px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #a7f3d0;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.15s;
  font-family: inherit;
}

.sp-tab:hover {
  background: rgba(16, 185, 129, 0.12);
  color: #ecfdf5;
}

.sp-tab.is-active {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

/* --- Section --- */
.sp-section {
  animation: spFadeIn 0.3s ease;
}

@keyframes spFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.sp-section-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.sp-section-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #ecfdf5;
}

.sp-section-sub {
  margin: 4px 0 0;
  color: #6ee7b7;
  font-size: 0.9rem;
}

.sp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* --- Buttons --- */
.sp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
  font-family: inherit;
}

.sp-btn:hover {
  transform: translateY(-1px);
}

.sp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.sp-btn--primary {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
}

.sp-btn--gold {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
}

.sp-btn--outline {
  background: transparent;
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #6ee7b7;
}

.sp-btn--outline:hover {
  background: rgba(16, 185, 129, 0.1);
}

/* --- Select --- */
.sp-select {
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.3);
  background: rgba(6, 78, 59, 0.5);
  color: #d1fae5;
  font-size: 0.88rem;
  font-family: inherit;
  cursor: pointer;
}

.sp-select option {
  color: #064e3b;
  background: #ecfdf5;
}

/* --- Empty & Error --- */
.sp-empty {
  padding: 48px 24px;
  text-align: center;
  border-radius: 16px;
  background: rgba(6, 78, 59, 0.3);
  border: 1px dashed rgba(16, 185, 129, 0.2);
}

.sp-empty__icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.sp-empty p {
  margin: 0;
  color: #a7f3d0;
  font-size: 0.95rem;
}

.sp-error {
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fecaca;
  font-size: 0.92rem;
}

/* --- Spinner --- */
.sp-spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 16px;
  border: 3px solid rgba(16, 185, 129, 0.2);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spSpin 0.7s linear infinite;
}

@keyframes spSpin {
  to { transform: rotate(360deg); }
}

/* --- Match Grid & Cards (Scoreboard style) --- */
.sp-match-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.sp-match-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(6, 78, 59, 0.45);
  border: 1px solid rgba(16, 185, 129, 0.15);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.sp-match-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  border-color: rgba(16, 185, 129, 0.35);
}

.sp-match-card__league {
  color: #f59e0b;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.sp-match-card__body {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sp-match-card__team {
  flex: 1;
  font-size: 1.05rem;
  font-weight: 700;
  color: #ecfdf5;
  line-height: 1.3;
}

.sp-match-card__team--home {
  text-align: right;
}

.sp-match-card__team--away {
  text-align: left;
}

.sp-match-card__vs {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid #10b981;
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  font-size: 0.82rem;
  font-weight: 800;
  flex-shrink: 0;
}

.sp-match-card__footer {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(16, 185, 129, 0.1);
  color: #6ee7b7;
  font-size: 0.82rem;
}

.sp-match-card__id {
  color: rgba(167, 243, 208, 0.5);
}

/* --- Badge (confidence / result) --- */
.sp-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  flex-shrink: 0;
}

.sp-badge.status-pill--success {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.sp-badge.status-pill--warning {
  background: rgba(245, 158, 11, 0.18);
  color: #fde68a;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.sp-badge.status-pill--danger {
  background: rgba(239, 68, 68, 0.16);
  color: #fecaca;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.sp-badge.status-pill--muted {
  background: rgba(148, 163, 184, 0.12);
  color: #cbd5e1;
}

/* --- Date Badge --- */
.sp-date-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #6ee7b7;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 16px;
}

/* --- Stats Bar --- */
.sp-stats-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.sp-stat-box {
  padding: 18px;
  border-radius: 14px;
  background: rgba(6, 78, 59, 0.4);
  border: 1px solid rgba(16, 185, 129, 0.12);
  text-align: center;
}

.sp-stat-box--highlight {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.08);
}

.sp-stat-box--card {
  text-align: left;
}

.sp-stat-box__label {
  color: #6ee7b7;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 6px;
}

.sp-stat-box__value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #ecfdf5;
}

.sp-stat-box__detail {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  color: #a7f3d0;
  font-size: 0.82rem;
}

/* --- Prediction Card Grid --- */
.sp-card-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}

.sp-pred-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(6, 78, 59, 0.4);
  border: 1px solid rgba(16, 185, 129, 0.12);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.sp-pred-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
  border-color: rgba(16, 185, 129, 0.3);
}

.sp-pred-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.sp-pred-card__league {
  color: #f59e0b;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sp-pred-card__teams {
  margin: 4px 0 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #ecfdf5;
}

/* --- Progress Bar --- */
.sp-progress {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-bottom: 16px;
}

.sp-progress__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #10b981, #f59e0b);
  transition: width 0.5s ease;
}

/* --- Detail Chips --- */
.sp-detail-chips {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.sp-detail-chips--two {
  grid-template-columns: repeat(2, 1fr);
}

.sp-chip {
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.08);
  text-align: center;
}

.sp-chip__label {
  color: #6ee7b7;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.sp-chip__value {
  color: #ecfdf5;
  font-size: 0.95rem;
  font-weight: 700;
}

/* --- Compare Grid --- */
.sp-compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.sp-compare-col {
  padding: 16px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.1);
}

.sp-compare-col--actual {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.12);
}

.sp-compare-col__title {
  color: #6ee7b7;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.sp-compare-col--actual .sp-compare-col__title {
  color: #fbbf24;
}

.sp-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.sp-kv:last-child {
  border-bottom: none;
}

.sp-kv__k {
  color: #a7f3d0;
  font-size: 0.82rem;
}

.sp-kv__v {
  color: #ecfdf5;
  font-weight: 600;
  font-size: 0.88rem;
}

.sp-no-result {
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: #a7f3d0;
  font-size: 0.88rem;
  text-align: center;
}

/* --- Score Grid --- */
.sp-score-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.sp-score-chip {
  padding: 10px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  text-align: center;
}

.sp-score-chip strong {
  display: block;
  color: #ecfdf5;
  font-size: 0.95rem;
}

.sp-score-chip small {
  color: #6ee7b7;
  font-size: 0.75rem;
}

.sp-score-chip.is-hit {
  border: 1px solid rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.15);
}

/* --- Recommendation Stack --- */
.sp-rec-stack {
  display: grid;
  gap: 20px;
}

.sp-rec-group {
  padding: 20px;
  border-radius: 16px;
  background: rgba(6, 78, 59, 0.3);
  border: 1px solid rgba(16, 185, 129, 0.1);
}

.sp-rec-group__header {
  margin-bottom: 16px;
}

.sp-rec-group__title {
  margin: 0 0 14px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #6ee7b7;
}

.sp-rec-group__combo {
  color: #a7f3d0;
  font-weight: 500;
}

.sp-rec-group__desc {
  margin: 4px 0 0;
  color: #a7f3d0;
  font-size: 0.88rem;
}

.sp-combo-badge {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.18);
  color: #fde68a;
  font-size: 0.9rem;
  margin-bottom: 14px;
}

/* --- Summary Card --- */
.sp-summary-card {
  padding: 24px;
  border-radius: 16px;
  background: rgba(6, 78, 59, 0.35);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-left: 4px solid #10b981;
}

.sp-summary-card__title {
  margin: 0 0 16px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #6ee7b7;
}

.sp-summary-card__row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(16, 185, 129, 0.08);
  color: #d1fae5;
  font-size: 0.9rem;
  line-height: 1.6;
}

.sp-summary-card__row:last-child {
  border-bottom: none;
}

.sp-summary-card__label {
  color: #6ee7b7;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

/* --- History Table --- */
.sp-table-wrap {
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid rgba(16, 185, 129, 0.12);
  background: rgba(6, 78, 59, 0.3);
}

.sp-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}

.sp-table th {
  padding: 14px 16px;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 700;
  color: #6ee7b7;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(16, 185, 129, 0.06);
  border-bottom: 1px solid rgba(16, 185, 129, 0.12);
}

.sp-table td {
  padding: 14px 16px;
  color: #d1fae5;
  font-size: 0.88rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: top;
}

.sp-table tbody tr:hover {
  background: rgba(16, 185, 129, 0.06);
}

.sp-table tbody tr:last-child td {
  border-bottom: none;
}

.sp-table__sub {
  color: #6ee7b7;
  font-size: 0.78rem;
  margin-top: 2px;
}

/* --- Responsive --- */
@media (max-width: 640px) {
  .sp-container {
    padding: 20px 14px 48px;
  }

  .sp-header {
    padding: 32px 16px 24px;
  }

  .sp-config-input {
    width: 160px;
  }

  .sp-tabs {
    border-radius: 14px;
  }

  .sp-tab {
    padding: 10px 16px;
    font-size: 0.88rem;
  }

  .sp-section-header {
    flex-direction: column;
    gap: 12px;
  }

  .sp-match-grid,
  .sp-card-grid {
    grid-template-columns: 1fr;
  }

  .sp-detail-chips {
    grid-template-columns: repeat(2, 1fr);
  }

  .sp-compare-grid {
    grid-template-columns: 1fr;
  }

  .sp-stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .sp-match-card__body {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }

  .sp-match-card__team--home,
  .sp-match-card__team--away {
    text-align: center;
  }
}
</style>
