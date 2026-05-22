<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const API_BASE_STORAGE_KEY = 'futures-monitor-api-base-url'
const SYMBOL_STORAGE_KEY = 'futures-monitor-selected-symbol'
const CAPITAL_EQUITY_STORAGE_KEY = 'futures-monitor-manual-capital-equity'
const CAPITAL_AVAILABLE_STORAGE_KEY = 'futures-monitor-manual-capital-available'
const RISK_RATIO_STORAGE_KEY = 'futures-monitor-risk-ratio'
const DEFAULT_API_BASE = 'http://localhost:3201'
const EMPTY_QUEUE_MESSAGE = '暂无已发送飞书提醒的合约'

const INTERVAL_OPTIONS = [
  { label: '1分钟', value: '1m' },
  { label: '5分钟', value: '5m' },
  { label: '15分钟', value: '15m' },
  { label: '1小时', value: '1h' },
]

const apiUrlInput = ref(readStoredValue(API_BASE_STORAGE_KEY, DEFAULT_API_BASE))
const apiUrl = ref(normalizeApiBase(apiUrlInput.value))
const watchSymbols = ref([])
const watchItems = ref([])
const tradeSymbols = ref([])
const selectedSymbol = ref(readStoredValue(SYMBOL_STORAGE_KEY, ''))
const selectedInterval = ref('1h')
const chartVisible = ref(false)
const capitalEquityInput = ref(readStoredValue(CAPITAL_EQUITY_STORAGE_KEY, ''))
const capitalAvailableInput = ref(readStoredValue(CAPITAL_AVAILABLE_STORAGE_KEY, ''))
const riskRatioInput = ref(readStoredValue(RISK_RATIO_STORAGE_KEY, '1'))
const symbolFilter = ref('')
const refreshTimer = ref(null)
let streamSource = null
let refreshSequence = 0

const dashboard = reactive({
  loading: false,
  error: '',
  mode: 'offline',
  sourceLabel: '等待连接后端',
  lastUpdatedAt: '',
  bars: [],
  metrics: {
    price: 0,
    changePct: 0,
    volume: 0,
    ma6: 0,
    madkx: 0,
    available: 100000,
    equity: 100000,
    margin: 0,
  },
  signal: {
    hasSignal: false,
    name: '',
    side: 'long',
    level: 'standard',
    status: '等待数据',
    reason: '请先启动 monitor.py，并确认前端后端地址配置正确。',
    fillReference: 0,
    stopPrice: 0,
    riskRatio: 0.01,
    updatedAt: '',
  },
  instrument: {
    priceTick: 0,
    volumeMultiple: 0,
    marginPerLot: 0,
    marginSource: 'unknown',
  },
  capital: {
    available: 0,
    equity: 0,
    availableSource: 'account',
    equitySource: 'account',
    riskRatio: 0.01,
  },
  sizing: {
    hasSignal: false,
    maxVolume: 0,
    riskCap: 0,
    marginCap: 0,
    perLotRisk: 0,
    perLotMargin: 0,
    riskBudget: 0,
    stopDistance: 0,
    limitedBy: 'none',
    reason: '',
    previewMode: false,
  },
  positions: [],
  events: [],
})

const streamState = reactive({
  connected: false,
  error: '',
})

const chartState = reactive({
  width: 920,
  height: 420,
})

const chartPadding = { top: 24, right: 68, bottom: 28, left: 64 }

const klineRange = computed(() => {
  const values = dashboard.bars.flatMap((bar) => [bar.high, bar.low, bar.ma6, bar.madkx]).filter((value) => Number.isFinite(value))
  if (!values.length) {
    return { min: 0, max: 1 }
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = Math.max((max - min) * 0.08, max * 0.0025, 1)
  return { min: min - padding, max: max + padding }
})

const chartBars = computed(() => {
  const bars = dashboard.bars
  if (!bars.length) return []
  const drawableWidth = chartState.width - chartPadding.left - chartPadding.right
  const candleGap = 4
  const candleWidth = Math.max(4, drawableWidth / bars.length - candleGap)
  return bars.map((bar, index) => {
    const x = chartPadding.left + index * (candleWidth + candleGap)
    return {
      ...bar,
      x,
      candleWidth,
      openY: scalePrice(bar.open),
      closeY: scalePrice(bar.close),
      highY: scalePrice(bar.high),
      lowY: scalePrice(bar.low),
      ma6Y: scalePrice(bar.ma6),
      madkxY: scalePrice(bar.madkx),
      markerBaseY: bar.signalMarker
        ? (bar.signalMarker.side === 'long' ? scalePrice(bar.low) + 6 : scalePrice(bar.high) - 6)
        : null,
    }
  })
})

const ma6Path = computed(() => buildLinePath(chartBars.value, 'ma6Y'))
const madkxPath = computed(() => buildLinePath(chartBars.value, 'madkxY'))
const signalMarkers = computed(() => chartBars.value.filter((bar) => bar.signalMarker))
const priceAxisMarks = computed(() => {
  const { min, max } = klineRange.value
  const steps = 4
  return Array.from({ length: steps + 1 }, (_, index) => {
    const ratio = index / steps
    const value = max - (max - min) * ratio
    const y = chartPadding.top + (chartState.height - chartPadding.top - chartPadding.bottom) * ratio
    return { label: value.toFixed(2), y }
  })
})

const fillReferenceY = computed(() => {
  const price = dashboard.signal.fillReference
  if (!price || !Number.isFinite(price) || price <= 0) return null
  const { min, max } = klineRange.value
  if (price < min || price > max) return null
  return scalePrice(price)
})

const stopPriceY = computed(() => {
  const price = dashboard.signal.stopPrice
  if (!price || !Number.isFinite(price) || price <= 0) return null
  const { min, max } = klineRange.value
  if (price < min || price > max) return null
  return scalePrice(price)
})

const riskRatioPct = computed(() => {
  const v = parseFloat(riskRatioInput.value)
  return Number.isFinite(v) && v > 0 ? v : 1
})

const effectiveRiskBudget = computed(() => {
  const equity = dashboard.capital.equity
  if (!equity || equity <= 0) return 0
  return equity * (riskRatioPct.value / 100)
})

const effectiveRiskCap = computed(() => {
  const perLotRisk = dashboard.sizing.perLotRisk
  if (!perLotRisk || perLotRisk <= 0) return 0
  return Math.floor(effectiveRiskBudget.value / perLotRisk)
})

const effectiveMaxVolume = computed(() => {
  const marginCap = dashboard.sizing.marginCap
  const riskCap = effectiveRiskCap.value
  if (riskCap <= 0 && (!Number.isFinite(marginCap) || marginCap <= 0)) return 0
  if (riskCap <= 0) return Math.floor(marginCap)
  if (!Number.isFinite(marginCap) || marginCap <= 0) return riskCap
  return Math.min(riskCap, Math.floor(marginCap))
})

const currentPriceClass = computed(() => {
  if (dashboard.metrics.changePct > 0) return 'ticker--up'
  if (dashboard.metrics.changePct < 0) return 'ticker--down'
  return 'ticker--flat'
})

const apiBaseWarning = computed(() => {
  if (typeof window === 'undefined') return ''
  if (!apiUrl.value) return '请先填写后端 API 地址。'
  if (window.location.protocol === 'https:' && apiUrl.value.startsWith('http://')) {
    return '当前页面走 HTTPS，后端若仍是 HTTP，请求会被浏览器拦截；请改用 HTTPS API 地址。'
  }
  return ''
})

const watchlistDebugUrl = computed(() => (
  apiUrl.value ? `${apiUrl.value}/api/futures/watchlist` : ''
))

const monitorDebugUrl = computed(() => (
  apiUrl.value && selectedSymbol.value
    ? `${apiUrl.value}/api/futures/monitor?${buildMonitorQuery()}`
    : ''
))

const hasConnectionIssue = computed(() => (
  Boolean(apiBaseWarning.value || dashboard.error || streamState.error)
))

const sizingSummary = computed(() => {
  if (dashboard.sizing.reason) return dashboard.sizing.reason
  return `已按保证金不超过可支配资金、单笔止损不超过总资金 ${riskRatioPct.value}% 测算。`
})

const selectedWatchItem = computed(() => watchItems.value.find((item) => item.symbol === selectedSymbol.value) || null)
const selectedSymbolLabel = computed(() => selectedWatchItem.value?.displayName || selectedSymbol.value || '--')
const selectedSymbolDisplay = computed(() => selectedWatchItem.value?.symbolDisplay || selectedSymbolLabel.value)

const filteredWatchItems = computed(() => {
  const q = symbolFilter.value.trim().toLowerCase()
  if (!q) return watchItems.value
  return watchItems.value.filter((item) =>
    item.symbol.toLowerCase().includes(q) ||
    (item.displayName || '').toLowerCase().includes(q),
  )
})

watch(apiUrlInput, (value) => {
  apiUrl.value = normalizeApiBase(value)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(API_BASE_STORAGE_KEY, value)
  }
  restartLiveFeed()
})

watch(selectedSymbol, (value) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SYMBOL_STORAGE_KEY, value)
  }
})

watch(selectedInterval, () => {
  restartLiveFeed()
})

watch([capitalEquityInput, capitalAvailableInput, riskRatioInput], ([equity, available, ratio]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CAPITAL_EQUITY_STORAGE_KEY, equity)
    window.localStorage.setItem(CAPITAL_AVAILABLE_STORAGE_KEY, available)
    window.localStorage.setItem(RISK_RATIO_STORAGE_KEY, ratio)
  }
  restartLiveFeed()
})

onMounted(() => {
  restartLiveFeed()
  window.addEventListener('resize', updateChartWidth)
  updateChartWidth()
})

onBeforeUnmount(() => {
  clearRefreshTimer()
  closeStream()
  window.removeEventListener('resize', updateChartWidth)
})

function updateChartWidth() {
  if (typeof window === 'undefined') return
  const width = Math.min(Math.max(window.innerWidth - 560, 400), 980)
  chartState.width = width
  chartState.height = Math.min(Math.max(window.innerHeight - 260, 240), 600)
}

function clearRefreshTimer() {
  if (refreshTimer.value) {
    window.clearTimeout(refreshTimer.value)
    refreshTimer.value = null
  }
}

function scheduleRefresh(delay = 5000) {
  if (typeof window === 'undefined') return
  clearRefreshTimer()
  refreshTimer.value = window.setTimeout(() => {
    refreshDashboard({ silent: true }).catch(() => {})
  }, delay)
}

async function refreshDashboard(options = {}) {
  dashboard.loading = !options.silent
  dashboard.error = ''
  try {
    await fetchWatchlist()
    if (!chartVisible.value || !selectedSymbol.value) {
      applyIdleState(watchItems.value.length ? '点击左侧品类加载 K 线图；再次点击当前品类可隐藏。' : EMPTY_QUEUE_MESSAGE)
      return
    }
    const payload = await fetchMonitorPayload()
    applyPayload(payload)
  } catch (error) {
    console.log('refreshDashboard error: ', error)
    dashboard.error = error instanceof Error ? error.message : '加载数据失败'
    applyEmptyState(dashboard.error)
  } finally {
    dashboard.loading = false
    scheduleRefresh(streamState.connected ? 15000 : dashboard.mode === 'live' ? 4000 : 6000)
  }
}

async function fetchWatchlist() {
  const base = apiUrl.value
  const response = await fetch(`${base}/api/futures/watchlist`)
  if (!response.ok) {
    throw new Error(`观察列表接口返回 ${response.status}`)
  }
  const payload = await response.json()
  const nextWatchItems = Array.isArray(payload.watchItems)
    ? payload.watchItems.filter((item) => item?.symbol)
    : []
  const nextWatchSymbols = nextWatchItems.map((item) => item.symbol)
  watchItems.value = nextWatchItems
  watchSymbols.value = nextWatchSymbols
  tradeSymbols.value = Array.isArray(payload.tradeSymbols) ? payload.tradeSymbols : []
  if (selectedSymbol.value && !watchSymbols.value.includes(selectedSymbol.value)) {
    selectedSymbol.value = ''
    chartVisible.value = false
  }
}

function restartLiveFeed() {
  const runId = ++refreshSequence
  closeStream()
  refreshDashboard().finally(() => {
    if (runId !== refreshSequence) return
    if (!chartVisible.value) return
    startStream()
  })
}

function closeStream() {
  if (streamSource) {
    streamSource.close()
    streamSource = null
  }
  streamState.connected = false
}

function startStream() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return
  if (!chartVisible.value || !apiUrl.value || !selectedSymbol.value) return
  const url = `${apiUrl.value}/api/futures/stream?${buildMonitorQuery()}`
  streamSource = new EventSource(url)
  streamSource.onopen = () => {
    streamState.connected = true
    streamState.error = ''
  }
  streamSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      applyPayload(payload)
    } catch (error) {
      console.log('startStream-', error)
      streamState.error = error instanceof Error ? error.message : '解析推送失败'
    }
  }
  streamSource.onerror = () => {
    streamState.connected = false
    streamState.error = '实时推送连接中断，已回退轮询。'
    closeStream()
    scheduleRefresh(2000)
  }
}

async function fetchMonitorPayload() {
  const base = apiUrl.value
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(`${base}/api/futures/monitor?${buildMonitorQuery()}`, {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`后端返回 ${response.status}`)
    }
    const payload = await response.json()
    if (!payload?.bars?.length) {
      throw new Error('后端暂未提供期货监控数据')
    }
    return payload
  } finally {
    window.clearTimeout(timeout)
  }
}

function applyPayload(payload) {
  dashboard.mode = payload.mode || 'live'
  dashboard.sourceLabel = payload.sourceLabel || '实时数据'
  dashboard.lastUpdatedAt = payload.lastUpdatedAt || new Date().toLocaleString()
  dashboard.bars = payload.bars || []
  dashboard.metrics = { ...dashboard.metrics, ...(payload.metrics || {}) }
  dashboard.instrument = { ...dashboard.instrument, ...(payload.instrument || {}) }
  dashboard.signal = { ...dashboard.signal, ...(payload.signal || {}) }
  dashboard.capital = { ...dashboard.capital, ...(payload.capital || {}) }
  dashboard.sizing = { ...dashboard.sizing, ...(payload.sizing || {}) }
  dashboard.positions = payload.positions || []
  dashboard.events = payload.events || []
}

function applyIdleState(message) {
  applyEmptyState(message)
  dashboard.mode = 'idle'
  dashboard.sourceLabel = watchItems.value.length ? '等待选择品类' : '等待提醒队列'
}

function applyEmptyState(message) {
  dashboard.mode = 'offline'
  dashboard.sourceLabel = '未连接后端'
  dashboard.lastUpdatedAt = new Date().toLocaleString()
  dashboard.bars = []
  dashboard.metrics = {
    price: 0,
    changePct: 0,
    volume: 0,
    ma6: 0,
    madkx: 0,
    available: 0,
    equity: 0,
    margin: 0,
  }
  dashboard.signal = {
    hasSignal: false,
    name: '',
    side: 'long',
    level: 'standard',
    status: '等待数据',
    reason: message || '未获取到后端数据',
    fillReference: 0,
    stopPrice: 0,
    riskRatio: 0.01,
    updatedAt: '',
  }
  dashboard.instrument = {
    priceTick: 0,
    volumeMultiple: 0,
    marginPerLot: 0,
    marginSource: 'unknown',
  }
  dashboard.capital = {
    available: 0,
    equity: 0,
    availableSource: 'account',
    equitySource: 'account',
    riskRatio: 0.01,
  }
  dashboard.sizing = {
    hasSignal: false,
    maxVolume: 0,
    riskCap: 0,
    marginCap: 0,
    perLotRisk: 0,
    perLotMargin: 0,
    riskBudget: 0,
    stopDistance: 0,
    limitedBy: 'none',
    reason: '',
    previewMode: false,
  }
  dashboard.positions = []
  dashboard.events = [
    { time: new Date().toLocaleTimeString(), text: message || '未获取到后端数据' },
  ]
}

function toggleSymbolChart(symbol) {
  if (chartVisible.value && selectedSymbol.value === symbol) {
    chartVisible.value = false
    restartLiveFeed()
    return
  }
  selectedSymbol.value = symbol
  chartVisible.value = true
  restartLiveFeed()
}

function buildMonitorQuery() {
  const params = new URLSearchParams({
    symbol: selectedSymbol.value,
    interval: selectedInterval.value,
  })
  const equity = `${capitalEquityInput.value || ''}`.trim()
  const available = `${capitalAvailableInput.value || ''}`.trim()
  if (equity !== '') params.set('capitalEquity', equity)
  if (available !== '') params.set('capitalAvailable', available)
  const ratio = `${riskRatioInput.value || ''}`.trim()
  if (ratio !== '' && ratio !== '1') params.set('riskRatio', String(parseFloat(ratio) / 100))
  return params.toString()
}

function scalePrice(value) {
  const { min, max } = klineRange.value
  const height = chartState.height - chartPadding.top - chartPadding.bottom
  const ratio = (value - min) / (max - min || 1)
  return chartState.height - chartPadding.bottom - ratio * height
}

function buildLinePath(bars, key) {
  return bars
    .map((bar, index) => `${index === 0 ? 'M' : 'L'} ${bar.x + bar.candleWidth / 2} ${bar[key]}`)
    .join(' ')
}

function buildMarkerPath(bar) {
  const centerX = bar.x + bar.candleWidth / 2
  if (bar.signalMarker.side === 'long') {
    const y = bar.lowY + 4
    return `M ${centerX} ${y} L ${centerX - 6} ${y + 10} L ${centerX + 6} ${y + 10} Z`
  }
  const y = bar.highY - 4
  return `M ${centerX} ${y} L ${centerX - 6} ${y - 10} L ${centerX + 6} ${y - 10} Z`
}

function markerLabel(marker) {
  if (!marker) return ''
  if (marker.level === 'standard') {
    return marker.side === 'long' ? '标多' : '标空'
  }
  return marker.side === 'long' ? '谨多' : '谨空'
}

function readStoredValue(key, fallback) {
  if (typeof window === 'undefined') return fallback
  return window.localStorage.getItem(key) || fallback
}

function normalizeApiBase(value) {
  return (value || '').trim().replace(/\/+$/, '')
}

function capitalSourceLabel(source) {
  return source === 'manual' ? '手动输入' : '账户实时值'
}

function marginSourceLabel(source) {
  if (source === 'quote') return 'TqSdk 实时保证金'
  if (source === 'estimate') return '按估算保证金率'
  return '待补充'
}

function lotCountText(value) {
  return Number.isFinite(value) ? `${Math.max(0, Math.floor(value))} 手` : '--'
}

function numberCompact(value) {
  if (!Number.isFinite(value)) return '--'
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function currency(value) {
  if (!Number.isFinite(value)) return '--'
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2,
  }).format(value)
}
</script>

<template>
  <main class="page page--dark fm-page">
    <div class="page-container futures-monitor">
      <!-- Top bar -->
      <header class="fm-topbar">
        <div class="fm-topbar-brand">
          <span class="fm-brand-label">FUTURES TERMINAL</span>
          <span class="fm-brand-sep">|</span>
          <span class="fm-brand-symbol">{{ selectedSymbolLabel }}</span>
        </div>
        <div class="fm-topbar-status">
          <span class="fm-status-dot" :class="dashboard.mode === 'live' ? 'fm-status-dot--live' : 'fm-status-dot--offline'"></span>
          <span class="fm-status-text">{{ dashboard.sourceLabel }}</span>
          <span class="fm-status-sep">·</span>
          <span class="fm-status-stream">{{ streamState.connected ? 'SSE' : 'POLL' }}</span>
          <span class="fm-status-sep">·</span>
          <span class="fm-status-time">{{ dashboard.lastUpdatedAt || '--' }}</span>
        </div>
      </header>

      <!-- Config strip -->
      <section class="fm-config-strip">
        <label class="fm-config-field">
          <span class="fm-config-label">API</span>
          <input v-model="apiUrlInput" class="fm-config-input" placeholder="http://localhost:3201" />
        </label>
        <label class="fm-config-field fm-config-field--narrow">
          <span class="fm-config-label">周期</span>
          <select v-model="selectedInterval" class="fm-config-input fm-config-select">
            <option v-for="item in INTERVAL_OPTIONS" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label class="fm-config-field">
          <span class="fm-config-label">总资金</span>
          <input
            v-model.lazy="capitalEquityInput"
            class="fm-config-input"
            type="number"
            min="0"
            step="1000"
            placeholder="后端权益"
          />
        </label>
        <label class="fm-config-field">
          <span class="fm-config-label">可用</span>
          <input
            v-model.lazy="capitalAvailableInput"
            class="fm-config-input"
            type="number"
            min="0"
            step="1000"
            placeholder="后端可用"
          />
        </label>
        <label class="fm-config-field fm-config-field--narrow">
          <span class="fm-config-label">风控%</span>
          <input
            v-model.lazy="riskRatioInput"
            class="fm-config-input"
            type="number"
            min="0.1"
            max="10"
            step="0.5"
            placeholder="1"
          />
        </label>
      </section>

      <!-- <section class="fm-connection-strip">
        <span class="fm-connection-pill fm-connection-pill--mono">{{ apiUrl || '未配置 API Base URL' }}</span>
        <span class="fm-connection-pill" :class="hasConnectionIssue ? 'fm-connection-pill--danger' : 'fm-connection-pill--ok'">
          {{ hasConnectionIssue ? '连接异常' : '连接正常' }}
        </span>
        <span v-if="apiBaseWarning" class="fm-connection-pill fm-connection-pill--warn">{{ apiBaseWarning }}</span>
      </section>

      <section v-if="hasConnectionIssue" class="fm-diagnostic-panel">
        <p v-if="dashboard.error" class="fm-diagnostic-line"><strong>轮询接口</strong>{{ dashboard.error }}</p>
        <p v-if="streamState.error" class="fm-diagnostic-line"><strong>SSE 推送</strong>{{ streamState.error }}</p>
        <p v-if="watchlistDebugUrl" class="fm-diagnostic-line"><strong>先测这个</strong>{{ watchlistDebugUrl }}</p>
        <p v-if="monitorDebugUrl" class="fm-diagnostic-line"><strong>再测这个</strong>{{ monitorDebugUrl }}</p>
      </section> -->

      <!-- Main 3-column layout -->
      <section class="fm-layout">
        <!-- Watchlist -->
        <aside class="fm-panel fm-watchlist">
          <div class="fm-panel-head">
            <h2 class="fm-panel-title">提醒队列</h2>
            <span class="fm-panel-badge">{{ watchItems.length }}</span>
          </div>
          <div class="fm-search-box">
            <input
              v-model="symbolFilter"
              class="fm-search-input"
              placeholder="搜索合约..."
            />
          </div>
          <div class="fm-symbol-list">
            <template v-if="filteredWatchItems.length">
              <button
                v-for="item in filteredWatchItems"
                :key="item.symbol"
                class="fm-symbol-item"
                :class="{ 'fm-symbol-item--active': chartVisible && item.symbol === selectedSymbol }"
                @click="toggleSymbolChart(item.symbol)"
              >
                <div class="fm-symbol-info">
                  <strong class="fm-symbol-name">{{ item.displayName || item.symbol }}</strong>
                  <small class="fm-symbol-code">{{ item.symbol }}</small>
                  <small v-if="item.lastAlertAt" class="fm-symbol-time">{{ item.lastAlertAt }}</small>
                </div>
                <small v-if="tradeSymbols.includes(item.symbol)" class="fm-symbol-tag">TRADE</small>
              </button>
            </template>
            <p v-else-if="watchItems.length" class="fm-symbol-empty">无匹配结果</p>
            <p v-else class="fm-symbol-empty">暂无飞书提醒，合约会在提醒发出后进入队列。</p>
          </div>
        </aside>

        <!-- Chart -->
        <section class="fm-panel fm-chart-panel">
          <div v-if="chartVisible" class="fm-chart-header">
            <div class="fm-chart-title-group">
              <h2 class="fm-chart-title">{{ selectedSymbolLabel }}</h2>
              <span class="fm-chart-interval">{{ INTERVAL_OPTIONS.find((item) => item.value === selectedInterval)?.label }}</span>
              <span class="fm-chart-code">{{ selectedSymbolDisplay }}</span>
            </div>
            <button class="fm-chart-toggle" type="button" @click="toggleSymbolChart(selectedSymbol)">
              隐藏 K 线
            </button>
            <div class="fm-ticker" :class="currentPriceClass">
              <span class="fm-ticker-price">{{ dashboard.metrics.price.toFixed(2) }}</span>
              <span class="fm-ticker-change" :class="dashboard.metrics.changePct >= 0 ? 'fm-ticker-change--up' : 'fm-ticker-change--down'">
                {{ dashboard.metrics.changePct >= 0 ? '+' : '' }}{{ dashboard.metrics.changePct.toFixed(2) }}%
              </span>
            </div>
          </div>

          <div v-else class="fm-chart-idle">
            <span class="fm-chart-idle-kicker">KLINE ON DEMAND</span>
            <h2>默认不渲染 K 线图</h2>
            <p>点击左侧任一品类后加载该合约 K 线；再次点击当前品类或点击“隐藏 K 线”即可关闭。</p>
          </div>

          <!-- Metric strip -->
          <div v-if="chartVisible" class="fm-metric-strip">
            <div class="fm-metric-item">
              <span class="fm-metric-label">MA6</span>
              <span class="fm-metric-value">{{ dashboard.metrics.ma6.toFixed(2) }}</span>
            </div>
            <div class="fm-metric-item">
              <span class="fm-metric-label">MADKX</span>
              <span class="fm-metric-value">{{ dashboard.metrics.madkx.toFixed(2) }}</span>
            </div>
            <div class="fm-metric-item">
              <span class="fm-metric-label">成交量</span>
              <span class="fm-metric-value">{{ numberCompact(dashboard.metrics.volume) }}</span>
            </div>
            <div class="fm-metric-item">
              <span class="fm-metric-label">保证金</span>
              <span class="fm-metric-value">{{ currency(dashboard.metrics.margin) }}</span>
            </div>
            <div class="fm-metric-item">
              <span class="fm-metric-label">权益</span>
              <span class="fm-metric-value">{{ currency(dashboard.metrics.equity) }}</span>
            </div>
            <div class="fm-metric-item">
              <span class="fm-metric-label">可用</span>
              <span class="fm-metric-value">{{ currency(dashboard.metrics.available) }}</span>
            </div>
          </div>

          <div v-if="chartVisible" class="fm-chart-shell">
            <svg :viewBox="`0 0 ${chartState.width} ${chartState.height}`" class="fm-kline-chart" role="img" aria-label="期货K线图">
              <defs>
                <linearGradient id="chartBg" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stop-color="rgba(99,102,241,0.06)" />
                  <stop offset="100%" stop-color="rgba(15,23,42,0.01)" />
                </linearGradient>
              </defs>

              <rect
                :x="chartPadding.left"
                :y="chartPadding.top"
                :width="chartState.width - chartPadding.left - chartPadding.right"
                :height="chartState.height - chartPadding.top - chartPadding.bottom"
                rx="2"
                fill="url(#chartBg)"
              />

              <g v-for="mark in priceAxisMarks" :key="mark.label">
                <line
                  :x1="chartPadding.left"
                  :x2="chartState.width - chartPadding.right"
                  :y1="mark.y"
                  :y2="mark.y"
                  class="fm-axis-line"
                />
                <text
                  :x="12"
                  :y="mark.y + 4"
                  class="fm-axis-text"
                >
                  {{ mark.label }}
                </text>
              </g>

              <path :d="madkxPath" class="fm-indicator fm-indicator--purple" />
              <path :d="ma6Path" class="fm-indicator fm-indicator--yellow" />

              <g v-for="bar in chartBars" :key="bar.time">
                <line
                  :x1="bar.x + bar.candleWidth / 2"
                  :x2="bar.x + bar.candleWidth / 2"
                  :y1="bar.highY"
                  :y2="bar.lowY"
                  :class="bar.close >= bar.open ? 'fm-wick fm-wick--up' : 'fm-wick fm-wick--down'"
                />
                <rect
                  :x="bar.x"
                  :y="Math.min(bar.openY, bar.closeY)"
                  :width="bar.candleWidth"
                  :height="Math.max(Math.abs(bar.closeY - bar.openY), 2)"
                  :class="bar.close >= bar.open ? 'fm-candle fm-candle--up' : 'fm-candle fm-candle--down'"
                  rx="1"
                />
              </g>

              <!-- Fill reference price line -->
              <g v-if="fillReferenceY != null">
                <line
                  :x1="chartPadding.left"
                  :x2="chartState.width - chartPadding.right"
                  :y1="fillReferenceY"
                  :y2="fillReferenceY"
                  class="fm-ref-line fm-ref-line--fill"
                />
                <rect
                  :x="chartState.width - chartPadding.right + 2"
                  :y="fillReferenceY - 9"
                  :width="58"
                  height="18"
                  rx="3"
                  class="fm-ref-tag fm-ref-tag--fill"
                />
                <text
                  :x="chartState.width - chartPadding.right + 6"
                  :y="fillReferenceY + 4"
                  class="fm-ref-tag-text"
                >
                  参考 {{ dashboard.signal.fillReference.toFixed(1) }}
                </text>
              </g>

              <!-- Stop price line -->
              <g v-if="stopPriceY != null">
                <line
                  :x1="chartPadding.left"
                  :x2="chartState.width - chartPadding.right"
                  :y1="stopPriceY"
                  :y2="stopPriceY"
                  class="fm-ref-line fm-ref-line--stop"
                />
                <rect
                  :x="chartState.width - chartPadding.right + 2"
                  :y="stopPriceY - 9"
                  :width="58"
                  height="18"
                  rx="3"
                  class="fm-ref-tag fm-ref-tag--stop"
                />
                <text
                  :x="chartState.width - chartPadding.right + 6"
                  :y="stopPriceY + 4"
                  class="fm-ref-tag-text"
                >
                  止损 {{ dashboard.signal.stopPrice.toFixed(1) }}
                </text>
              </g>

              <!-- Signal markers -->
              <g v-for="bar in signalMarkers" :key="`signal-${bar.time}`">
                <line
                  :x1="bar.x + bar.candleWidth / 2"
                  :x2="bar.x + bar.candleWidth / 2"
                  :y1="bar.signalMarker.side === 'long' ? bar.lowY + 4 : bar.highY - 4"
                  :y2="bar.signalMarker.side === 'long' ? bar.lowY + 24 : bar.highY - 24"
                  :class="bar.signalMarker.side === 'long' ? 'fm-sig-pole fm-sig-pole--long' : 'fm-sig-pole fm-sig-pole--short'"
                />
                <path
                  :d="buildMarkerPath(bar)"
                  :class="bar.signalMarker.side === 'long' ? 'fm-sig-marker fm-sig-marker--long' : 'fm-sig-marker fm-sig-marker--short'"
                />
                <text
                  :x="bar.x + bar.candleWidth / 2"
                  :y="bar.signalMarker.side === 'long' ? bar.lowY + 36 : bar.highY - 32"
                  text-anchor="middle"
                  class="fm-sig-label"
                >
                  {{ markerLabel(bar.signalMarker) }}
                </text>
              </g>
            </svg>
          </div>

          <div v-if="chartVisible" class="fm-legend">
            <span class="fm-legend-item"><i class="fm-legend-dot fm-legend-dot--yellow"></i>MA6</span>
            <span class="fm-legend-item"><i class="fm-legend-dot fm-legend-dot--purple"></i>MADKX</span>
            <span class="fm-legend-item"><i class="fm-legend-dot fm-legend-dot--red"></i>阳线 / 多头</span>
            <span class="fm-legend-item"><i class="fm-legend-dot fm-legend-dot--green"></i>阴线 / 空头</span>
            <span v-if="fillReferenceY != null" class="fm-legend-item"><i class="fm-legend-line fm-legend-line--fill"></i>参考价</span>
            <span v-if="stopPriceY != null" class="fm-legend-item"><i class="fm-legend-line fm-legend-line--stop"></i>止损价</span>
          </div>

          <!-- Signal reason -->
          <div
            v-if="chartVisible && dashboard.signal.reason"
            class="fm-signal-reason"
            :class="{
              'fm-signal-reason--long': dashboard.signal.hasSignal && dashboard.signal.side === 'long',
              'fm-signal-reason--short': dashboard.signal.hasSignal && dashboard.signal.side === 'short',
            }"
          >
            <span v-if="dashboard.signal.hasSignal" class="fm-signal-reason-icon">
              {{ dashboard.signal.side === 'long' ? '▲' : '▼' }}
            </span>
            {{ dashboard.signal.reason }}
          </div>
        </section>

        <!-- Right sidebar -->
        <aside class="fm-panel fm-sidebar">
          <!-- Signal -->
          <div class="fm-sidebar-section">
            <div class="fm-panel-head">
              <h2 class="fm-panel-title">交易信号</h2>
              <span class="fm-signal-badge" :class="dashboard.signal.side === 'long' ? 'fm-signal-badge--long' : 'fm-signal-badge--short'">
                {{ dashboard.signal.side === 'long' ? 'LONG' : 'SHORT' }}
              </span>
            </div>
            <div class="fm-signal-block">
              <div class="fm-signal-status">{{ dashboard.signal.status }}</div>
              <div class="fm-signal-level">{{ dashboard.signal.level === 'standard' ? '标准信号' : '谨慎信号' }}</div>
              <small class="fm-dim-text">{{ dashboard.signal.updatedAt || '--' }}</small>
            </div>
          </div>

          <!-- Sizing -->
          <div class="fm-sidebar-section">
            <div class="fm-panel-head">
              <h2 class="fm-panel-title">开仓测算</h2>
              <span class="fm-sizing-result" :class="effectiveMaxVolume > 0 ? 'fm-sizing-result--ok' : 'fm-sizing-result--zero'">
                {{ effectiveMaxVolume > 0 ? `${effectiveMaxVolume} 手` : '不可开' }}
              </span>
            </div>
            <p class="fm-dim-text fm-sizing-note">{{ sizingSummary }}</p>
            <div class="fm-data-grid">
              <div class="fm-data-cell">
                <span class="fm-data-label">总资金</span>
                <span class="fm-data-value">{{ currency(dashboard.capital.equity) }}</span>
                <span class="fm-data-source">{{ capitalSourceLabel(dashboard.capital.equitySource) }}</span>
              </div>
              <div class="fm-data-cell">
                <span class="fm-data-label">可用</span>
                <span class="fm-data-value">{{ currency(dashboard.capital.available) }}</span>
                <span class="fm-data-source">{{ capitalSourceLabel(dashboard.capital.availableSource) }}</span>
              </div>
              <div class="fm-data-cell">
                <span class="fm-data-label">合约乘数</span>
                <span class="fm-data-value">{{ dashboard.instrument.volumeMultiple || '--' }}</span>
              </div>
              <div class="fm-data-cell">
                <span class="fm-data-label">每手保证金</span>
                <span class="fm-data-value">{{ currency(dashboard.sizing.perLotMargin || dashboard.instrument.marginPerLot) }}</span>
                <span class="fm-data-source">{{ marginSourceLabel(dashboard.instrument.marginSource) }}</span>
              </div>
              <div class="fm-data-cell">
                <span class="fm-data-label">单手止损</span>
                <span class="fm-data-value">{{ currency(dashboard.sizing.perLotRisk) }}</span>
              </div>
              <div class="fm-data-cell">
                <span class="fm-data-label">{{ riskRatioPct }}%额度</span>
                <span class="fm-data-value">{{ currency(effectiveRiskBudget) }}</span>
              </div>
              <div class="fm-data-cell">
                <span class="fm-data-label">止损上限</span>
                <span class="fm-data-value fm-data-value--accent">{{ lotCountText(effectiveRiskCap) }}</span>
              </div>
              <div class="fm-data-cell">
                <span class="fm-data-label">保证金上限</span>
                <span class="fm-data-value fm-data-value--accent">{{ lotCountText(dashboard.sizing.marginCap) }}</span>
              </div>
            </div>
            <div class="fm-ref-strip">
              <span>参考 {{ dashboard.signal.fillReference > 0 ? dashboard.signal.fillReference.toFixed(2) : '--' }}</span>
              <span>止损 {{ dashboard.signal.stopPrice > 0 ? dashboard.signal.stopPrice.toFixed(2) : '--' }}</span>
              <span>距离 {{ dashboard.sizing.stopDistance > 0 ? dashboard.sizing.stopDistance.toFixed(2) : '--' }}</span>
            </div>
          </div>

          <!-- Positions -->
          <div class="fm-sidebar-section">
            <div class="fm-panel-head">
              <h2 class="fm-panel-title">持仓</h2>
              <span class="fm-panel-badge">{{ dashboard.positions.length }}</span>
            </div>
            <div v-if="dashboard.positions.length" class="fm-pos-list">
              <div v-for="item in dashboard.positions" :key="`${item.symbol}-${item.side}`" class="fm-pos-item">
                <div class="fm-pos-info">
                  <strong>{{ item.displayName || item.symbol }}</strong>
                  <small class="fm-dim-text">{{ item.side }} · {{ item.volume }} 手 @ {{ item.entryPrice.toFixed(2) }}</small>
                </div>
                <div :class="item.pnl >= 0 ? 'fm-pnl fm-pnl--profit' : 'fm-pnl fm-pnl--loss'">
                  {{ item.pnl >= 0 ? '+' : '' }}{{ item.pnl.toFixed(2) }}
                </div>
              </div>
            </div>
            <p v-else class="fm-dim-text fm-empty-hint">暂无持仓</p>
          </div>

          <!-- Events -->
          <div class="fm-sidebar-section">
            <div class="fm-panel-head">
              <h2 class="fm-panel-title">事件流</h2>
            </div>
            <div class="fm-event-list">
              <div v-for="item in dashboard.events" :key="`${item.time}-${item.text}`" class="fm-event-item">
                <span class="fm-event-time">{{ item.time }}</span>
                <span class="fm-event-text">{{ item.text }}</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* ============================================
   Futures Monitor — Professional Terminal UI
   ============================================ */

.fm-page {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
}

.futures-monitor {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 6px;
  width: min(1440px, 100%);
  height: 100%;
  min-height: 0;
}

/* ---------- Top Bar ---------- */
.fm-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  font-size: 0.82rem;
  flex-shrink: 0;
}

.fm-back {
  padding: 5px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.78rem;
  transition: background 0.15s;
  white-space: nowrap;
}

.fm-back:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.fm-topbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
}

.fm-brand-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.fm-brand-sep {
  color: rgba(255, 255, 255, 0.15);
}

.fm-brand-symbol {
  color: #e2e8f0;
  font-weight: 700;
}

.fm-topbar-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.76rem;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

.fm-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.fm-status-dot--live {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
}

.fm-status-dot--offline {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.fm-status-text {
  color: rgba(255, 255, 255, 0.7);
}

.fm-status-sep {
  color: rgba(255, 255, 255, 0.15);
}

.fm-status-stream {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.fm-status-time {
  color: rgba(255, 255, 255, 0.4);
}

/* ---------- Config Strip ---------- */
.fm-config-strip {
  display: flex;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.fm-config-field {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.fm-config-field--narrow {
  flex: 0 0 auto;
  max-width: 130px;
}

.fm-config-label {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-transform: uppercase;
}

.fm-config-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.82rem;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

.fm-config-input:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.5);
}

.fm-config-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.fm-config-select {
  appearance: auto;
}

.fm-config-select option {
  color: #0f172a;
  background: #fff;
}

.fm-connection-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.fm-connection-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.55);
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.74rem;
}

.fm-connection-pill--mono {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

.fm-connection-pill--ok {
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.28);
  background: rgba(20, 83, 45, 0.24);
}

.fm-connection-pill--danger {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.32);
  background: rgba(127, 29, 29, 0.26);
}

.fm-connection-pill--warn {
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.32);
  background: rgba(120, 53, 15, 0.26);
}

.fm-diagnostic-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.24);
  background: rgba(15, 23, 42, 0.72);
}

.fm-diagnostic-line {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.78rem;
  line-height: 1.5;
  word-break: break-all;
}

.fm-diagnostic-line strong {
  display: inline-block;
  min-width: 72px;
  margin-right: 8px;
  color: #f8fafc;
}

/* ---------- 3-Column Layout ---------- */
.fm-layout {
  display: grid;
  gap: 8px;
  grid-template-columns: 200px minmax(0, 1fr) 320px;
  min-height: 0;
  overflow: hidden;
}

.fm-panel {
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.fm-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.fm-panel-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.02em;
}

.fm-panel-badge {
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
  font-weight: 600;
}

/* ---------- Watchlist ---------- */
.fm-watchlist {
  min-height: 0;
}

.fm-search-box {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.fm-search-input {
  width: 100%;
  padding: 5px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.78rem;
}

.fm-search-input:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.5);
}

.fm-search-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.fm-symbol-list {
  display: grid;
  gap: 1px;
  background: rgba(255, 255, 255, 0.03);
  overflow-y: auto;
  min-height: 0;
  flex: 1;
}

.fm-symbol-item {
  width: 100%;
  border: none;
  background: transparent;
  color: #e2e8f0;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  border-left: 2px solid transparent;
}

.fm-symbol-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.fm-symbol-item--active {
  background: rgba(99, 102, 241, 0.12);
  border-left-color: #6366f1;
}

.fm-symbol-info {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.fm-symbol-name {
  font-size: 0.84rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-symbol-code {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.7rem;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

.fm-symbol-time {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.68rem;
}

.fm-symbol-tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.fm-symbol-empty {
  margin: 0;
  padding: 20px 14px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.82rem;
  line-height: 1.6;
}

/* ---------- Chart Panel ---------- */
.fm-chart-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.fm-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.fm-chart-title-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.fm-chart-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
}

.fm-chart-interval {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  font-size: 0.72rem;
  font-weight: 600;
}

.fm-chart-code {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.76rem;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

.fm-chart-toggle {
  margin-left: auto;
  padding: 5px 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.75);
  color: rgba(226, 232, 240, 0.82);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.fm-chart-toggle:hover {
  border-color: rgba(248, 250, 252, 0.42);
  color: #f8fafc;
}

.fm-ticker {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

.ticker--up .fm-ticker-price,
.ticker--up .fm-ticker-change { color: #ef4444; }
.ticker--down .fm-ticker-price,
.ticker--down .fm-ticker-change { color: #22c55e; }
.ticker--flat .fm-ticker-price,
.ticker--flat .fm-ticker-change { color: #94a3b8; }

.fm-ticker-price {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.fm-ticker-change {
  font-size: 0.88rem;
  font-weight: 600;
}

.fm-ticker-change--up { color: #ef4444; }
.fm-ticker-change--down { color: #22c55e; }

/* Metric strip under chart header */
.fm-metric-strip {
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  flex-shrink: 0;
}

.fm-metric-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}

.fm-metric-item:last-child {
  border-right: none;
}

.fm-metric-label {
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.fm-metric-value {
  font-size: 0.78rem;
  color: #cbd5e1;
  font-weight: 600;
}

/* Chart area */
.fm-chart-idle {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px;
  color: rgba(226, 232, 240, 0.68);
  text-align: center;
  background:
    radial-gradient(circle at 50% 35%, rgba(59, 130, 246, 0.14), transparent 32%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.5), rgba(2, 6, 23, 0.2));
}

.fm-chart-idle-kicker {
  color: rgba(147, 197, 253, 0.86);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.fm-chart-idle h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.15rem;
}

.fm-chart-idle p {
  max-width: 420px;
  margin: 0;
  line-height: 1.7;
  font-size: 0.86rem;
}

.fm-chart-shell {
  flex: 1;
  overflow: auto;
  padding: 4px;
  min-height: 0;
}

.fm-kline-chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.fm-axis-line {
  stroke: rgba(255, 255, 255, 0.05);
  stroke-dasharray: 2 3;
}

.fm-axis-text {
  fill: rgba(255, 255, 255, 0.35);
  font-size: 11px;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

.fm-indicator {
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fm-indicator--yellow { stroke: #eab308; }
.fm-indicator--purple { stroke: #8b5cf6; }

.fm-wick { stroke-width: 1.2; }
.fm-wick--up, .fm-candle--up { stroke: #ef4444; fill: #ef4444; }
.fm-wick--down, .fm-candle--down { stroke: #22c55e; fill: #22c55e; }

.fm-sig-pole { stroke-width: 1.2; opacity: 0.6; }
.fm-sig-pole--long { stroke: #ef4444; }
.fm-sig-pole--short { stroke: #22c55e; }

.fm-sig-marker { opacity: 0.8; }

.fm-sig-label {
  fill: rgba(255, 255, 255, 0.65);
  font-size: 8px;
  font-weight: 600;
}

/* Reference price lines */
.fm-ref-line {
  stroke-width: 1;
  stroke-dasharray: 6 4;
}

.fm-ref-line--fill {
  stroke: #60a5fa;
  opacity: 0.7;
}

.fm-ref-line--stop {
  stroke: #f97316;
  opacity: 0.7;
}

.fm-ref-tag {
  opacity: 0.85;
}

.fm-ref-tag--fill {
  fill: rgba(96, 165, 250, 0.2);
  stroke: rgba(96, 165, 250, 0.4);
  stroke-width: 1;
}

.fm-ref-tag--stop {
  fill: rgba(249, 115, 22, 0.2);
  stroke: rgba(249, 115, 22, 0.4);
  stroke-width: 1;
}

.fm-ref-tag-text {
  fill: rgba(255, 255, 255, 0.8);
  font-size: 9px;
  font-weight: 600;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

/* Signal marker glow & pulse */
.fm-sig-marker--long {
  fill: #ef4444;
  filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.35));
  animation: fm-pulse 2s ease-in-out infinite;
}

.fm-sig-marker--short {
  fill: #22c55e;
  filter: drop-shadow(0 0 2px rgba(34, 197, 94, 0.35));
  animation: fm-pulse 2s ease-in-out infinite;
}

@keyframes fm-pulse {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}

/* Legend */
.fm-legend {
  display: flex;
  gap: 14px;
  padding: 4px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.72rem;
  flex-shrink: 0;
}

.fm-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.fm-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.fm-legend-dot--yellow { background: #eab308; }
.fm-legend-dot--purple { background: #8b5cf6; }
.fm-legend-dot--red { background: #ef4444; }
.fm-legend-dot--green { background: #22c55e; }

.fm-legend-line {
  width: 14px;
  height: 0;
  border-top: 2px dashed;
  display: inline-block;
  vertical-align: middle;
}

.fm-legend-line--fill {
  border-color: #60a5fa;
}

.fm-legend-line--stop {
  border-color: #f97316;
}

.fm-signal-reason {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.78rem;
  line-height: 1.5;
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;
}

.fm-signal-reason--long {
  background: rgba(239, 68, 68, 0.08);
  border-top-color: rgba(239, 68, 68, 0.15);
  color: rgba(248, 113, 113, 0.9);
}

.fm-signal-reason--short {
  background: rgba(34, 197, 94, 0.08);
  border-top-color: rgba(34, 197, 94, 0.15);
  color: rgba(74, 222, 128, 0.9);
}

.fm-signal-reason-icon {
  font-size: 0.72rem;
  flex-shrink: 0;
}

/* ---------- Sidebar ---------- */
.fm-sidebar {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.fm-sidebar-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.fm-sidebar-section:last-child {
  border-bottom: none;
}

.fm-dim-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.76rem;
  margin: 0;
}

/* Signal block */
.fm-signal-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.fm-signal-badge--long {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.fm-signal-badge--short {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.fm-signal-block {
  padding: 10px 14px;
}

.fm-signal-status {
  font-size: 0.92rem;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 2px;
}

.fm-signal-level {
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
}

/* Sizing */
.fm-sizing-result {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 0.76rem;
  font-weight: 800;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

.fm-sizing-result--ok {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.fm-sizing-result--zero {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.fm-sizing-note {
  padding: 0 14px 6px;
  line-height: 1.5;
}

.fm-data-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  margin: 0 8px 8px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.fm-data-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.6);
}

.fm-data-label {
  font-size: 0.64rem;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.fm-data-value {
  font-size: 0.82rem;
  font-weight: 700;
  color: #e2e8f0;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

.fm-data-value--accent {
  color: #a5b4fc;
}

.fm-data-source {
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.25);
}

.fm-ref-strip {
  display: flex;
  gap: 12px;
  padding: 6px 14px 10px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.72rem;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

/* Positions */
.fm-pos-list {
  display: grid;
  gap: 1px;
}

.fm-pos-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
}

.fm-pos-info {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.fm-pos-info strong {
  font-size: 0.82rem;
}

.fm-pnl {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 0.84rem;
  font-weight: 700;
  white-space: nowrap;
}

.fm-pnl--profit { color: #ef4444; }
.fm-pnl--loss { color: #22c55e; }

.fm-empty-hint {
  padding: 12px 14px;
}

/* Events */
.fm-event-list {
  display: grid;
  gap: 0;
}

.fm-event-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 5px 14px;
  font-size: 0.76rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.fm-event-time {
  color: rgba(255, 255, 255, 0.3);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 0.68rem;
  white-space: nowrap;
}

.fm-event-text {
  color: rgba(255, 255, 255, 0.6);
}

/* ---------- Responsive ---------- */
@media (max-width: 1280px) {
  .fm-layout {
    grid-template-columns: 180px minmax(0, 1fr) 280px;
  }
}

@media (max-width: 1080px) {
  .fm-page {
    height: auto;
    max-height: none;
    overflow: auto;
  }

  .futures-monitor {
    height: auto;
  }

  .fm-layout {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .fm-watchlist {
    order: 1;
    max-height: 200px;
  }

  .fm-chart-panel {
    order: 2;
    min-height: 400px;
  }

  .fm-sidebar {
    order: 3;
    overflow-y: visible;
  }
}

@media (max-width: 720px) {
  .fm-config-strip {
    flex-wrap: wrap;
  }

  .fm-config-field {
    min-width: 140px;
  }

  .fm-topbar {
    flex-wrap: wrap;
  }

  .fm-chart-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .fm-metric-strip {
    flex-wrap: wrap;
  }

  .fm-metric-item {
    min-width: 70px;
  }

  .fm-ref-strip {
    flex-wrap: wrap;
    gap: 6px;
  }
}
</style>
