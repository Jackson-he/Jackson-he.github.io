<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const API_BASE_STORAGE_KEY = 'stock-transition-api-base-url'
const SYMBOLS_STORAGE_KEY = 'stock-transition-symbols'
const DEFAULT_API_BASE = 'http://localhost:3101'
const DEFAULT_SYMBOLS = 'AAPL,MSFT,NVDA,TSLA,TSM,INTC,PLTR,KTOS,CRCL'

const apiUrlInput = ref(readInitialApiBase())
const apiUrl = ref(normalizeApiBase(apiUrlInput.value))
const symbolsInput = ref(readStoredValue(SYMBOLS_STORAGE_KEY, DEFAULT_SYMBOLS))
const refreshTimer = ref(null)

const dashboard = reactive({
  loading: false,
  error: '',
  lastUpdatedAt: '',
  health: null,
  modeInfo: null,
  snapshot: createEmptySnapshot(),
  strategy: {},
  market: {},
  realStatus: {},
  realtimeStatus: { latest: {} },
  realScanResult: null,
  realQuoteResult: null,
})

const actionState = reactive({
  scanning: false,
  quoting: false,
  startingRealtime: false,
  stoppingRealtime: false,
  rebuilding: false,
  stepping: false,
  resetting: false,
  savingApi: false,
})

const summaryMetrics = computed(() => {
  const summary = dashboard.snapshot.summary || {}
  const snapshot = dashboard.snapshot || {}
  return [
    ['现金', currency(summary.cash)],
    ['权益', currency(summary.equity)],
    ['已实现盈亏', currency(summary.realizedPnl)],
    ['未实现盈亏', currency(summary.unrealizedPnl)],
    ['观察名单', String((snapshot.watchlist || []).length)],
    ['持仓数', String(summary.openPositionCount || 0)],
    ['已平仓', String(summary.closedTrades || 0)],
    ['胜率', `${summary.winRate || 0}%`],
  ]
})

const isRealMode = computed(() => dashboard.modeInfo?.mode === 'real')
const modeLabel = computed(() => (isRealMode.value ? 'REAL 模式' : 'MOCK 模式'))
const nextTimeLabel = computed(() => dashboard.snapshot?.nextMinuteTime || '--')
const statusLabel = computed(() => {
  if (dashboard.loading) return '正在同步后端状态...'
  if (dashboard.error) return dashboard.error
  if (isRealMode.value) {
    if (dashboard.snapshot.marketAllowed == null) return '等待真实扫描'
    return dashboard.snapshot.marketAllowed ? '真实市场允许开仓' : '真实市场禁止开仓'
  }
  if (dashboard.snapshot.sessionComplete) return '模拟已结束'
  return dashboard.snapshot.marketAllowed ? '市场允许开仓' : '市场禁止开仓'
})
const isRealtimeActive = computed(() => {
  const stream = dashboard.realtimeStatus || {}
  const subscriptions = stream.subscriptions || {}
  return Boolean(
    stream.connected
    || stream.connecting
    || stream.reconnectEnabled
    || ['trades', 'quotes', 'bars'].some((key) => Array.isArray(subscriptions[key]) && subscriptions[key].length),
  )
})
const realtimeStatusLabel = computed(() => {
  const stream = dashboard.realtimeStatus || {}
  if (stream.connected) return '实时流已连接'
  if (stream.connecting) return '实时流连接中'
  if (isRealtimeActive.value) return '实时监听已开启'
  return '实时流未连接'
})
const realtimeStartLabel = computed(() => {
  if (actionState.startingRealtime) return '启动中...'
  return isRealtimeActive.value ? '实时监听已开启' : '启动实时监听'
})
const realStatusLabel = computed(() => {
  const status = dashboard.realStatus || {}
  if (!apiUrl.value) return '请先配置后端 API 地址'
  return status.configured ? 'Alpaca 已配置' : '后端可达，但未配置 Alpaca Key'
})
const latestRealtimeText = computed(() => {
  return formatJson(Object.keys(dashboard.realtimeStatus?.latest || {}).length ? dashboard.realtimeStatus.latest : '暂无数据')
})
const modeFeatures = computed(() => {
  const features = dashboard.modeInfo?.features || {}
  return [
    { label: '分钟推进', enabled: Boolean(features.stepSimulation) },
    { label: '真实扫描', enabled: Boolean(features.realWatchlistScan) },
    { label: '实时监听', enabled: Boolean(features.realtimeStreaming) },
    { label: '自动信号', enabled: Boolean(features.autoRealtimeSignals) },
  ]
})
const apiBaseWarning = computed(() => {
  if (typeof window === 'undefined') return ''
  if (window.location.protocol === 'https:' && apiUrl.value.startsWith('http://')) {
    return '当前页面走 HTTPS，后端若仍是 HTTP，请求会被浏览器拦截；请使用 HTTPS API 地址。'
  }
  return ''
})
const healthSummary = computed(() => {
  const health = dashboard.health
  if (!health) return '尚未探测'
  return `${health.service || 'stock-transition'} · ${health.mode || dashboard.modeInfo?.mode || '-'} · ${health.time || '-'}`
})

watch(symbolsInput, (value) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SYMBOLS_STORAGE_KEY, value)
  }
})

onMounted(() => {
  refreshDashboard()
  refreshTimer.value = window.setInterval(() => {
    refreshDashboard({ silent: true })
  }, 5000)
})

onBeforeUnmount(() => {
  if (refreshTimer.value) {
    window.clearInterval(refreshTimer.value)
  }
})

function createEmptySnapshot() {
  return {
    watchlist: [],
    positions: [],
    trades: [],
    events: [],
    summary: {
      cash: 0,
      equity: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      openPositionCount: 0,
      closedTrades: 0,
      winRate: 0,
    },
    realtime: {},
    market: null,
  }
}

function readStoredValue(key, fallback) {
  if (typeof window === 'undefined') return fallback
  return window.localStorage.getItem(key) || fallback
}

function readInitialApiBase() {
  if (typeof window === 'undefined') return DEFAULT_API_BASE
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('apiBase')
  if (fromQuery) {
    window.localStorage.setItem(API_BASE_STORAGE_KEY, fromQuery)
    return fromQuery
  }
  return window.localStorage.getItem(API_BASE_STORAGE_KEY) || DEFAULT_API_BASE
}

function normalizeApiBase(value) {
  const trimmed = String(value || '').trim()
  return trimmed.replace(/\/$/, '')
}

function parseSymbols() {
  return symbolsInput.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)
}

async function apiCall(path, options = {}) {
  const base = normalizeApiBase(apiUrl.value)
  if (!base) {
    throw new Error('请先填写后端 API Base URL')
  }

  const response = await fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch (error) {
    throw new Error(`后端返回了非 JSON 响应 (${response.status})`)
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload?.error || `请求失败 (${response.status})`)
  }

  return Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload
}

async function refreshDashboard({ silent = false } = {}) {
  if (!silent) {
    dashboard.loading = true
  }
  dashboard.error = ''

  try {
    const [health, modeInfo, snapshot, strategy, market, realStatus, realtimeStatus] = await Promise.all([
      apiCall('/api/health'),
      apiCall('/api/mode'),
      apiCall('/api/state'),
      apiCall('/api/strategy'),
      apiCall('/api/market'),
      apiCall('/api/real/status'),
      apiCall('/api/realtime/status'),
    ])

    dashboard.health = health
    dashboard.modeInfo = modeInfo
    dashboard.snapshot = snapshot || createEmptySnapshot()
    dashboard.strategy = strategy || {}
    dashboard.market = market || {}
    dashboard.realStatus = realStatus || {}
    dashboard.realtimeStatus = realtimeStatus || { latest: {} }
    dashboard.lastUpdatedAt = new Date().toISOString()
  } catch (error) {
    dashboard.error = error.message || '无法连接后端 API'
  } finally {
    dashboard.loading = false
  }
}

async function saveApiBase() {
  actionState.savingApi = true
  try {
    const normalized = normalizeApiBase(apiUrlInput.value)
    apiUrl.value = normalized
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(API_BASE_STORAGE_KEY, normalized)
    }
    await refreshDashboard()
  } finally {
    actionState.savingApi = false
  }
}

async function rebuildWatchlist() {
  actionState.rebuilding = true
  try {
    const body = isRealMode.value ? { symbols: parseSymbols() } : {}
    dashboard.snapshot = await apiCall('/api/watchlist/rebuild', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message || '重建观察名单失败'
  } finally {
    actionState.rebuilding = false
  }
}

async function stepEngine(steps) {
  actionState.stepping = true
  try {
    dashboard.snapshot = await apiCall('/api/engine/step', {
      method: 'POST',
      body: JSON.stringify({ steps }),
    })
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message || '推进失败'
  } finally {
    actionState.stepping = false
  }
}

async function resetState() {
  actionState.resetting = true
  try {
    dashboard.snapshot = await apiCall('/api/reset', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message || '重置失败'
  } finally {
    actionState.resetting = false
  }
}

async function fetchRealScan() {
  actionState.scanning = true
  try {
    const data = await apiCall(`/api/real/watchlist/scan?symbols=${encodeURIComponent(parseSymbols().join(','))}`)
    dashboard.realScanResult = data
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message || '真实扫描失败'
  } finally {
    actionState.scanning = false
  }
}

async function fetchRealQuote() {
  actionState.quoting = true
  try {
    const symbol = parseSymbols()[0] || 'AAPL'
    dashboard.realQuoteResult = await apiCall(`/api/real/quote?symbol=${encodeURIComponent(symbol)}`)
  } catch (error) {
    dashboard.error = error.message || '查询报价失败'
  } finally {
    actionState.quoting = false
  }
}

async function startRealtime() {
  if (isRealtimeActive.value) {
    return
  }

  actionState.startingRealtime = true
  try {
    await apiCall('/api/realtime/start', {
      method: 'POST',
      body: JSON.stringify({
        symbols: parseSymbols(),
        channels: ['trades', 'quotes', 'bars'],
        reconnect: true,
      }),
    })
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message || '启动实时监听失败'
  } finally {
    actionState.startingRealtime = false
  }
}

async function stopRealtime() {
  actionState.stoppingRealtime = true
  try {
    await apiCall('/api/realtime/stop', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message || '停止实时监听失败'
  } finally {
    actionState.stoppingRealtime = false
  }
}

function currency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatJson(value) {
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function relativeStrengthText(value) {
  const amount = Number(value || 0)
  return `${(amount * 100).toFixed(2)}%`
}

function pnlClass(value) {
  return Number(value || 0) >= 0 ? 'ok' : 'bad'
}
</script>

<template>
  <main class="page page--dark">
    <div class="page-container stock-page">
      <RouterLink to="/" class="back-link">← 返回首页</RouterLink>

      <section class="hero hero--center stock-hero">
        <p class="eyebrow">Stock Transition</p>
        <h1 class="hero-title">美股趋势突破面板</h1>
        <p class="hero-subtitle">前端已迁移到 GitHub Pages 站点；后端 API 需要单独部署，并在下方填写可访问的地址。</p>
        <div class="badge-row">
          <span class="status-pill">{{ statusLabel }}</span>
          <span class="status-pill status-pill--secondary">{{ modeLabel }}</span>
          <span class="status-pill status-pill--secondary mono">{{ nextTimeLabel }}</span>
        </div>
      </section>

      <section class="panel page-grid">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">后端连接</h2>
          </div>
        </div>
        <div class="field-row">
          <input v-model="apiUrlInput" class="stock-input stock-input--wide" placeholder="例如 https://your-api.example.com" />
          <button class="action-button" :disabled="actionState.savingApi" @click="saveApiBase">{{ actionState.savingApi ? '保存中...' : '保存并连接' }}</button>
          <button class="ghost-button" :disabled="dashboard.loading" @click="refreshDashboard()">刷新状态</button>
        </div>
        <div class="badge-row">
          <span class="status-pill status-pill--secondary mono">{{ apiUrl || '未配置 API Base URL' }}</span>
          <span class="status-pill status-pill--secondary">{{ healthSummary }}</span>
          <span class="status-pill" :class="dashboard.error ? 'status-pill--danger' : 'status-pill--success'">{{ dashboard.error ? '连接异常' : '连接正常' }}</span>
        </div>
        <p v-if="apiBaseWarning" class="warning-text">{{ apiBaseWarning }}</p>
      </section>

      <section class="panel page-grid">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">真实数据配置</h2>
            <p class="panel-subtitle">默认股票池会用于真实扫描与实时监听，支持手动覆盖。</p>
          </div>
        </div>
        <div class="field-row">
          <input v-model="symbolsInput" class="stock-input stock-input--wide" placeholder="AAPL,MSFT,NVDA" />
          <button class="action-button" :disabled="actionState.scanning" @click="fetchRealScan">{{ actionState.scanning ? '扫描中...' : '扫描真实观察名单' }}</button>
          <button class="ghost-button" :disabled="actionState.quoting" @click="fetchRealQuote">{{ actionState.quoting ? '查询中...' : '查询首个股票报价' }}</button>
        </div>
        <div class="badge-row">
          <span class="status-pill">{{ realStatusLabel }}</span>
          <span class="status-pill status-pill--secondary">{{ realtimeStatusLabel }}</span>
          <span class="status-pill status-pill--secondary">默认股票数 {{ parseSymbols().length }}</span>
          <span class="status-pill status-pill--secondary">最后刷新 {{ dashboard.lastUpdatedAt || '--' }}</span>
        </div>
      </section>

      <section class="panel page-grid">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">运行控制</h2>
            <p class="panel-subtitle">`mock` 模式支持分钟推进，`real` 模式主要用真实扫描和实时流。</p>
          </div>
        </div>
        <div class="button-row">
          <button class="action-button" :disabled="actionState.rebuilding" @click="rebuildWatchlist">{{ actionState.rebuilding ? '处理中...' : (isRealMode ? '重建真实观察名单' : '重建观察名单') }}</button>
          <button class="action-button" :disabled="isRealMode || actionState.stepping" @click="stepEngine(1)">推进 1 分钟</button>
          <button class="action-button" :disabled="isRealMode || actionState.stepping" @click="stepEngine(5)">推进 5 分钟</button>
          <button class="ghost-button" :disabled="actionState.resetting" @click="resetState">{{ actionState.resetting ? '重置中...' : (isRealMode ? '重置实时状态' : '重置模拟') }}</button>
        </div>
        <div class="button-row">
          <button class="action-button" :disabled="actionState.startingRealtime || isRealtimeActive" @click="startRealtime">{{ realtimeStartLabel }}</button>
          <button class="ghost-button" :disabled="actionState.stoppingRealtime || !isRealtimeActive" @click="stopRealtime">{{ actionState.stoppingRealtime ? '停止中...' : '停止实时监听' }}</button>
        </div>
        <div class="feature-grid">
          <div v-for="feature in modeFeatures" :key="feature.label" class="feature-card">
            <span class="feature-name">{{ feature.label }}</span>
            <span :class="['feature-badge', feature.enabled ? 'feature-badge--on' : 'feature-badge--off']">{{ feature.enabled ? '开启' : '关闭' }}</span>
          </div>
        </div>
      </section>

      <section class="stats-grid">
        <article v-for="metric in summaryMetrics" :key="metric[0]" class="stat-card">
          <span class="stat-card__label">{{ metric[0] }}</span>
          <strong class="stat-card__value">{{ metric[1] }}</strong>
        </article>
      </section>

      <section class="page-grid page-grid--two">
        <article class="table-card">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">观察名单</h2>
              <p class="panel-subtitle">当前 `/api/state` 返回的观察名单。</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>股票</th><th>收盘</th><th>相对强度</th><th>ATR14</th></tr>
              </thead>
              <tbody>
                <tr v-if="!dashboard.snapshot.watchlist?.length"><td colspan="4">暂无观察名单</td></tr>
                <tr v-for="item in dashboard.snapshot.watchlist || []" :key="item.symbol">
                  <td class="mono">{{ item.symbol }}</td>
                  <td>{{ item.close }}</td>
                  <td>{{ relativeStrengthText(item.relativeStrength) }}</td>
                  <td>{{ item.atr14 }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="table-card">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">持仓</h2>
              <p class="panel-subtitle">`mock` 模式显示本地持仓，`real` 模式此区域通常为空。</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>股票</th><th>入场</th><th>止损</th><th>目标</th><th>浮盈亏</th></tr>
              </thead>
              <tbody>
                <tr v-if="!dashboard.snapshot.positions?.length"><td colspan="5">当前无持仓</td></tr>
                <tr v-for="item in dashboard.snapshot.positions || []" :key="item.id">
                  <td class="mono">{{ item.symbol }}</td>
                  <td>{{ item.entryPrice }}</td>
                  <td>{{ item.currentStopPrice }}</td>
                  <td>{{ item.targetPrice }}</td>
                  <td :class="pnlClass(item.unrealizedPnl)">{{ currency(item.unrealizedPnl) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section class="page-grid page-grid--two">
        <article class="table-card">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">交易记录</h2>
              <p class="panel-subtitle">对应 `/api/state.trades`。</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>股票</th><th>入场价</th><th>剩余仓位</th><th>状态</th><th>已实现盈亏</th></tr>
              </thead>
              <tbody>
                <tr v-if="!dashboard.snapshot.trades?.length"><td colspan="5">暂无交易</td></tr>
                <tr v-for="item in dashboard.snapshot.trades || []" :key="item.id || `${item.symbol}-${item.entryTime}`">
                  <td class="mono">{{ item.symbol }}</td>
                  <td>{{ item.entryPrice }}</td>
                  <td>{{ item.remainingShares }}/{{ item.totalShares }}</td>
                  <td>{{ item.status }}</td>
                  <td :class="pnlClass(item.realizedPnl)">{{ currency(item.realizedPnl) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">事件流</h2>
              <p class="panel-subtitle">展示最近 12 条事件。</p>
            </div>
          </div>
          <pre class="json-view">{{ formatJson((dashboard.snapshot.events || []).slice(0, 12)) }}</pre>
        </article>
      </section>

      <section class="page-grid page-grid--two">
        <article class="panel">
          <div class="panel-header"><h2 class="panel-title">策略定义</h2></div>
          <pre class="json-view">{{ formatJson(dashboard.strategy) }}</pre>
        </article>
        <article class="panel">
          <div class="panel-header"><h2 class="panel-title">市场快照</h2></div>
          <pre class="json-view">{{ formatJson(dashboard.market) }}</pre>
        </article>
      </section>

      <section class="page-grid page-grid--two">
        <article class="panel">
          <div class="panel-header"><h2 class="panel-title">真实观察名单结果</h2></div>
          <pre class="json-view">{{ formatJson(dashboard.realScanResult || '尚未查询') }}</pre>
        </article>
        <article class="panel">
          <div class="panel-header"><h2 class="panel-title">真实报价结果</h2></div>
          <pre class="json-view">{{ formatJson(dashboard.realQuoteResult || '尚未查询') }}</pre>
        </article>
      </section>

      <section class="page-grid page-grid--two">
        <article class="panel">
          <div class="panel-header"><h2 class="panel-title">实时状态详情</h2></div>
          <pre class="json-view">{{ formatJson(dashboard.realtimeStatus) }}</pre>
        </article>
        <article class="panel">
          <div class="panel-header"><h2 class="panel-title">实时最新行情</h2></div>
          <pre class="json-view">{{ latestRealtimeText }}</pre>
        </article>
      </section>
    </div>
  </main>
</template>

<style scoped>
.stock-page {
  display: grid;
  gap: 22px;
}

.stock-hero {
  text-align: left;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.16);
  border: 1px solid rgba(34, 197, 94, 0.22);
  color: #dcfce7;
  font-size: 0.94rem;
}

.status-pill--secondary {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.14);
  color: var(--text-secondary);
}

.status-pill--danger {
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.26);
  color: #fecaca;
}

.status-pill--success {
  background: rgba(34, 197, 94, 0.16);
  border-color: rgba(34, 197, 94, 0.22);
  color: #dcfce7;
}

.stock-input {
  flex: 1 1 260px;
  min-width: 240px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
}

.stock-input--wide {
  min-width: min(100%, 440px);
}

.action-button,
.ghost-button {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.action-button {
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  color: #fff;
}

.ghost-button {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.action-button:disabled,
.ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.warning-text {
  margin: 0;
  color: #fcd34d;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.feature-card {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.feature-name {
  color: var(--text-secondary);
}

.feature-badge {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
}

.feature-badge--on {
  background: rgba(34, 197, 94, 0.16);
  color: #bbf7d0;
}

.feature-badge--off {
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
}

.stat-card__label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.stat-card__value {
  font-size: 1.35rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
  vertical-align: top;
}

th {
  color: var(--text-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mono {
  font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
}

.json-view {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.8rem;
  line-height: 1.6;
  color: #dbeafe;
}

.ok {
  color: #4ade80;
}

.bad {
  color: #f87171;
}

@media (max-width: 768px) {
  .stock-hero {
    text-align: center;
  }
}
</style>
