<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const API_BASE_STORAGE_KEY = 'futures-monitor-api-base-url'
const SYMBOL_STORAGE_KEY = 'futures-monitor-selected-symbol'
const CAPITAL_EQUITY_STORAGE_KEY = 'futures-monitor-manual-capital-equity'
const CAPITAL_AVAILABLE_STORAGE_KEY = 'futures-monitor-manual-capital-available'
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
const capitalEquityInput = ref(readStoredValue(CAPITAL_EQUITY_STORAGE_KEY, ''))
const capitalAvailableInput = ref(readStoredValue(CAPITAL_AVAILABLE_STORAGE_KEY, ''))
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

const chartPadding = { top: 24, right: 24, bottom: 28, left: 64 }

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

const currentPriceClass = computed(() => {
  if (dashboard.metrics.changePct > 0) return 'ticker--up'
  if (dashboard.metrics.changePct < 0) return 'ticker--down'
  return 'ticker--flat'
})

const signalBadge = computed(() => {
  const side = dashboard.signal.side === 'long' ? '🔴 做多' : '🟢 做空'
  const level = dashboard.signal.level === 'standard' ? '🔥 标准' : '✨ 谨慎'
  return `${level} · ${side}`
})
const sizingTitle = computed(() => {
  if (dashboard.sizing.maxVolume > 0) return `当前最多可开 ${dashboard.sizing.maxVolume} 手`
  return '当前条件下不可开仓'
})
const sizingSummary = computed(() => {
  if (dashboard.sizing.reason) return dashboard.sizing.reason
  return '已按保证金不超过可支配资金、单笔止损不超过总资金 1% 测算。'
})

const selectedWatchItem = computed(() => watchItems.value.find((item) => item.symbol === selectedSymbol.value) || null)
const selectedSymbolLabel = computed(() => selectedWatchItem.value?.displayName || selectedSymbol.value || '--')
const selectedSymbolDisplay = computed(() => selectedWatchItem.value?.symbolDisplay || selectedSymbolLabel.value)

const metricCards = computed(() => [
  ['最新价', dashboard.metrics.price.toFixed(2)],
  ['涨跌幅', `${dashboard.metrics.changePct.toFixed(2)}%`],
  ['成交量', numberCompact(dashboard.metrics.volume)],
  ['MA6', dashboard.metrics.ma6.toFixed(2)],
  ['MADKX', dashboard.metrics.madkx.toFixed(2)],
  ['可用资金', currency(dashboard.metrics.available)],
  ['账户权益', currency(dashboard.metrics.equity)],
  ['保证金', currency(dashboard.metrics.margin)],
])

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
  restartLiveFeed()
})

watch(selectedInterval, () => {
  restartLiveFeed()
})

watch([capitalEquityInput, capitalAvailableInput], ([equity, available]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CAPITAL_EQUITY_STORAGE_KEY, equity)
    window.localStorage.setItem(CAPITAL_AVAILABLE_STORAGE_KEY, available)
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
  const width = Math.min(Math.max(window.innerWidth - 420, 520), 980)
  chartState.width = width
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
    if (!selectedSymbol.value) {
      applyEmptyState(EMPTY_QUEUE_MESSAGE)
      return
    }
    const payload = await fetchMonitorPayload()
    applyPayload(payload)
  } catch (error) {
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
  if (!watchSymbols.value.includes(selectedSymbol.value)) {
    selectedSymbol.value = watchSymbols.value[0] || ''
  }
}

function restartLiveFeed() {
  const runId = ++refreshSequence
  closeStream()
  refreshDashboard().finally(() => {
    if (runId !== refreshSequence) return
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
  if (!apiUrl.value || !selectedSymbol.value) return
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

function buildMonitorQuery() {
  const params = new URLSearchParams({
    symbol: selectedSymbol.value,
    interval: selectedInterval.value,
  })
  const equity = `${capitalEquityInput.value || ''}`.trim()
  const available = `${capitalAvailableInput.value || ''}`.trim()
  if (equity !== '') params.set('capitalEquity', equity)
  if (available !== '') params.set('capitalAvailable', available)
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
    const y = bar.lowY + 6
    return `M ${centerX} ${y} L ${centerX - 10} ${y + 16} L ${centerX + 10} ${y + 16} Z`
  }
  const y = bar.highY - 6
  return `M ${centerX} ${y} L ${centerX - 10} ${y - 16} L ${centerX + 10} ${y - 16} Z`
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
  <main class="page page--dark">
    <div class="page-container futures-monitor">
      <RouterLink to="/projects/tools" class="back-link">← 返回工具页</RouterLink>

      <section class="hero futures-hero">
        <div>
          <p class="eyebrow">Futures Terminal</p>
          <h1 class="hero-title">期货实时监控面板</h1>
          <p class="hero-subtitle">
            当前页面按飞书提醒队列展示合约，最新进入队列的提醒会排在最前面，并支持继续查看对应合约的实时数据。
          </p>
        </div>
        <div class="surface-block hero-status">
          <div class="status-chip" :class="dashboard.mode === 'live' ? 'status-chip--success' : 'status-chip--warning'">
            {{ dashboard.sourceLabel }}
          </div>
          <div class="muted-text">最后更新：{{ dashboard.lastUpdatedAt || '--' }}</div>
          <div class="muted-text">{{ streamState.connected ? 'SSE 实时推送已连接' : (streamState.error || '使用轮询更新') }}</div>
        </div>
      </section>

      <section class="panel config-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">连接配置</h2>
            <p class="panel-subtitle">留空时默认使用后端实时账户数据；也可以手动输入资金做开仓测算。</p>
          </div>
        </div>
        <div class="config-grid">
          <label class="field-group">
            <span class="field-label">后端 API 地址</span>
            <input v-model="apiUrlInput" class="input" placeholder="http://localhost:3201" />
          </label>
          <label class="field-group">
            <span class="field-label">监控周期</span>
            <select v-model="selectedInterval" class="select">
              <option v-for="item in INTERVAL_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>
          <label class="field-group">
            <span class="field-label">账户总资金</span>
            <input
              v-model.lazy="capitalEquityInput"
              class="input"
              type="number"
              min="0"
              step="1000"
              placeholder="留空则使用后端账户权益"
            />
            <small class="field-hint">用于计算单笔止损上限 = 总资金 × 1%</small>
          </label>
          <label class="field-group">
            <span class="field-label">剩余可支配资金</span>
            <input
              v-model.lazy="capitalAvailableInput"
              class="input"
              type="number"
              min="0"
              step="1000"
              placeholder="留空则使用后端可用资金"
            />
            <small class="field-hint">用于判断保证金最多能支持开几手</small>
          </label>
        </div>
      </section>

      <section class="monitor-layout">
        <aside class="panel watch-panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">提醒队列</h2>
              <p class="panel-subtitle">仅展示已发送飞书提醒的合约，最新提醒排在最前面。</p>
            </div>
          </div>
          <div class="symbol-list">
            <template v-if="watchItems.length">
              <button
                v-for="item in watchItems"
                :key="item.symbol"
                class="symbol-item"
                :class="{ 'symbol-item--active': item.symbol === selectedSymbol }"
                @click="selectedSymbol = item.symbol"
              >
                <span class="symbol-text">
                  <strong>{{ item.displayName || item.symbol }}</strong>
                  <small class="symbol-code">{{ item.symbol }}</small>
                  <small v-if="item.lastAlertAt" class="symbol-meta">提醒于 {{ item.lastAlertAt }}</small>
                </span>
                <small v-if="tradeSymbols.includes(item.symbol)" class="symbol-tag">交易</small>
              </button>
            </template>
            <p v-else class="symbol-empty">暂无飞书提醒，合约会在提醒发出后进入队列。</p>
          </div>
        </aside>

        <section class="panel chart-panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">{{ selectedSymbolLabel }} · {{ INTERVAL_OPTIONS.find((item) => item.value === selectedInterval)?.label }}</h2>
              <p class="muted-text">{{ selectedSymbolDisplay }}</p>
              <p class="panel-subtitle">{{ dashboard.signal.reason }}</p>
            </div>
            <div class="ticker-box" :class="currentPriceClass">
              <div class="ticker-price">{{ dashboard.metrics.price.toFixed(2) }}</div>
              <div class="ticker-change">{{ dashboard.metrics.changePct.toFixed(2) }}%</div>
            </div>
          </div>

          <div class="chart-shell">
            <svg :viewBox="`0 0 ${chartState.width} ${chartState.height}`" class="kline-chart" role="img" aria-label="期货K线图">
              <defs>
                <linearGradient id="chartBg" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stop-color="rgba(99,102,241,0.15)" />
                  <stop offset="100%" stop-color="rgba(15,23,42,0.02)" />
                </linearGradient>
              </defs>

              <rect
                :x="chartPadding.left"
                :y="chartPadding.top"
                :width="chartState.width - chartPadding.left - chartPadding.right"
                :height="chartState.height - chartPadding.top - chartPadding.bottom"
                rx="16"
                fill="url(#chartBg)"
              />

              <g v-for="mark in priceAxisMarks" :key="mark.label">
                <line
                  :x1="chartPadding.left"
                  :x2="chartState.width - chartPadding.right"
                  :y1="mark.y"
                  :y2="mark.y"
                  class="axis-line"
                />
                <text
                  :x="12"
                  :y="mark.y + 4"
                  class="axis-text"
                >
                  {{ mark.label }}
                </text>
              </g>

              <path :d="madkxPath" class="indicator-line indicator-line--purple" />
              <path :d="ma6Path" class="indicator-line indicator-line--yellow" />

              <g v-for="bar in chartBars" :key="bar.time">
                <line
                  :x1="bar.x + bar.candleWidth / 2"
                  :x2="bar.x + bar.candleWidth / 2"
                  :y1="bar.highY"
                  :y2="bar.lowY"
                  :class="bar.close >= bar.open ? 'wick wick--up' : 'wick wick--down'"
                />
                <rect
                  :x="bar.x"
                  :y="Math.min(bar.openY, bar.closeY)"
                  :width="bar.candleWidth"
                  :height="Math.max(Math.abs(bar.closeY - bar.openY), 2)"
                  :class="bar.close >= bar.open ? 'candle candle--up' : 'candle candle--down'"
                  rx="4"
                />
              </g>

              <g v-for="bar in signalMarkers" :key="`signal-${bar.time}`">
                <line
                  :x1="bar.x + bar.candleWidth / 2"
                  :x2="bar.x + bar.candleWidth / 2"
                  :y1="bar.signalMarker.side === 'long' ? bar.lowY + 6 : bar.highY - 6"
                  :y2="bar.signalMarker.side === 'long' ? bar.lowY + 42 : bar.highY - 42"
                  :class="bar.signalMarker.side === 'long' ? 'signal-pole signal-pole--long' : 'signal-pole signal-pole--short'"
                />
                <path
                  :d="buildMarkerPath(bar)"
                  :class="bar.signalMarker.side === 'long' ? 'signal-marker signal-marker--long' : 'signal-marker signal-marker--short'"
                />
                <text
                  :x="bar.x + bar.candleWidth / 2"
                  :y="bar.signalMarker.side === 'long' ? bar.lowY + 56 : bar.highY - 50"
                  text-anchor="middle"
                  class="signal-label"
                >
                  {{ markerLabel(bar.signalMarker) }}
                </text>
              </g>
            </svg>
          </div>

          <div class="legend-row">
            <span class="legend-item"><i class="legend-dot legend-dot--yellow"></i> MA6</span>
            <span class="legend-item"><i class="legend-dot legend-dot--purple"></i> MADKX</span>
            <span class="legend-item"><i class="legend-dot legend-dot--red"></i> 阳线</span>
            <span class="legend-item"><i class="legend-dot legend-dot--green"></i> 阴线</span>
            <span class="legend-item"><i class="legend-dot legend-dot--red"></i> 多头信号</span>
            <span class="legend-item"><i class="legend-dot legend-dot--green"></i> 空头信号</span>
          </div>
        </section>

        <aside class="panel side-panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">信号与账户</h2>
              <p class="panel-subtitle">{{ signalBadge }}</p>
            </div>
          </div>

          <div class="stats-grid">
            <article
              v-for="([label, value], index) in metricCards"
              :key="`${label}-${index}`"
              class="stat-card"
            >
              <div class="muted-text">{{ label }}</div>
              <strong>{{ value }}</strong>
            </article>
          </div>

          <div class="surface-block signal-card">
            <div class="field-label">当前信号</div>
            <div class="signal-title">{{ dashboard.signal.status }}</div>
            <p class="muted-text">{{ dashboard.signal.reason }}</p>
            <small class="muted-text">更新于 {{ dashboard.signal.updatedAt || '--' }}</small>
          </div>

          <div class="surface-block sizing-card">
            <div class="field-label">开仓测算</div>
            <div class="signal-title">{{ sizingTitle }}</div>
            <p class="muted-text">{{ sizingSummary }}</p>
            <div class="sizing-grid">
              <article class="sizing-metric">
                <span class="muted-text">总资金</span>
                <strong>{{ currency(dashboard.capital.equity) }}</strong>
                <small class="muted-text">{{ capitalSourceLabel(dashboard.capital.equitySource) }}</small>
              </article>
              <article class="sizing-metric">
                <span class="muted-text">可支配资金</span>
                <strong>{{ currency(dashboard.capital.available) }}</strong>
                <small class="muted-text">{{ capitalSourceLabel(dashboard.capital.availableSource) }}</small>
              </article>
              <article class="sizing-metric">
                <span class="muted-text">交易单位</span>
                <strong>{{ dashboard.instrument.volumeMultiple || '--' }}</strong>
                <small class="muted-text">每手合约乘数</small>
              </article>
              <article class="sizing-metric">
                <span class="muted-text">每手保证金</span>
                <strong>{{ currency(dashboard.sizing.perLotMargin || dashboard.instrument.marginPerLot) }}</strong>
                <small class="muted-text">{{ marginSourceLabel(dashboard.instrument.marginSource) }}</small>
              </article>
              <article class="sizing-metric">
                <span class="muted-text">单手止损额</span>
                <strong>{{ currency(dashboard.sizing.perLotRisk) }}</strong>
                <small class="muted-text">含手续费与滑点</small>
              </article>
              <article class="sizing-metric">
                <span class="muted-text">1% 止损额度</span>
                <strong>{{ currency(dashboard.sizing.riskBudget) }}</strong>
                <small class="muted-text">总资金 × 1%</small>
              </article>
              <article class="sizing-metric">
                <span class="muted-text">止损最多</span>
                <strong>{{ lotCountText(dashboard.sizing.riskCap) }}</strong>
                <small class="muted-text">按 1% 风险上限</small>
              </article>
              <article class="sizing-metric">
                <span class="muted-text">保证金最多</span>
                <strong>{{ lotCountText(dashboard.sizing.marginCap) }}</strong>
                <small class="muted-text">按可支配资金上限</small>
              </article>
            </div>
            <div class="sizing-rule">
              <div>参考价：{{ dashboard.signal.fillReference > 0 ? dashboard.signal.fillReference.toFixed(2) : '--' }}</div>
              <div>止损价：{{ dashboard.signal.stopPrice > 0 ? dashboard.signal.stopPrice.toFixed(2) : '--' }}</div>
              <div>止损距离：{{ dashboard.sizing.stopDistance > 0 ? dashboard.sizing.stopDistance.toFixed(2) : '--' }}</div>
            </div>
          </div>

          <div class="surface-block">
            <div class="field-label">持仓快照</div>
            <div v-if="dashboard.positions.length" class="position-list">
              <div v-for="item in dashboard.positions" :key="`${item.symbol}-${item.side}`" class="position-item">
                <div>
                  <strong>{{ item.displayName || item.symbol }}</strong>
                  <div class="muted-text">{{ item.symbol }}</div>
                  <div class="muted-text">{{ item.side }} · {{ item.volume }} 手</div>
                </div>
                <div class="position-right">
                  <div>{{ item.entryPrice.toFixed(2) }}</div>
                  <div :class="item.pnl >= 0 ? 'pnl pnl--profit' : 'pnl pnl--loss'">
                    {{ item.pnl >= 0 ? '🔴' : '🟢' }} {{ item.pnl.toFixed(2) }}
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="muted-text">暂无持仓，后续会显示真实持仓信息。</p>
          </div>

          <div class="surface-block">
            <div class="field-label">事件流</div>
            <div class="event-list">
              <div v-for="item in dashboard.events" :key="`${item.time}-${item.text}`" class="event-item">
                <small class="muted-text">{{ item.time }}</small>
                <div>{{ item.text }}</div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  </main>
</template>

<style scoped>
.futures-monitor {
  display: grid;
  gap: 22px;
}

.futures-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.hero-status {
  min-width: 220px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 700;
  margin-bottom: 8px;
}

.status-chip--success {
  background: rgba(34, 197, 94, 0.18);
  color: #86efac;
}

.status-chip--warning {
  background: rgba(245, 158, 11, 0.18);
  color: #fde68a;
}

.config-panel {
  padding-bottom: 18px;
}

.config-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.field-hint {
  display: block;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.5;
}

.monitor-layout {
  display: grid;
  gap: 20px;
  grid-template-columns: 220px minmax(0, 1fr) 320px;
}

.watch-panel,
.side-panel,
.chart-panel {
  min-height: 620px;
}

.symbol-list,
.position-list,
.event-list {
  display: grid;
  gap: 10px;
}

.symbol-item {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  padding: 12px 14px;
  border-radius: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.symbol-text {
  display: grid;
  gap: 2px;
}

.symbol-code {
  color: rgba(255, 255, 255, 0.58);
}

.symbol-meta {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.75rem;
}

.symbol-item:hover,
.symbol-item--active {
  transform: translateY(-1px);
  background: rgba(99, 102, 241, 0.22);
  border-color: rgba(165, 180, 252, 0.4);
}

.symbol-tag {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  font-size: 0.72rem;
}

.symbol-empty {
  margin: 0;
  padding: 18px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.6;
}

.ticker-box {
  min-width: 132px;
  padding: 14px 16px;
  border-radius: 16px;
  text-align: right;
  background: rgba(255, 255, 255, 0.08);
}

.ticker--up {
  color: #fca5a5;
}

.ticker--down {
  color: #86efac;
}

.ticker--flat {
  color: #e2e8f0;
}

.ticker-price {
  font-size: 1.6rem;
  font-weight: 800;
}

.ticker-change {
  font-size: 0.96rem;
  font-weight: 600;
}

.chart-shell {
  overflow: auto;
  margin-bottom: 12px;
}

.kline-chart {
  width: 100%;
  min-height: 420px;
}

.axis-line {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-dasharray: 3 4;
}

.axis-text {
  fill: rgba(255, 255, 255, 0.55);
  font-size: 12px;
}

.indicator-line {
  fill: none;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.indicator-line--yellow {
  stroke: #facc15;
}

.indicator-line--purple {
  stroke: #a78bfa;
}

.wick {
  stroke-width: 1.5;
}

.wick--up,
.candle--up {
  stroke: #ef4444;
  fill: #ef4444;
}

.wick--down,
.candle--down {
  stroke: #22c55e;
  fill: #22c55e;
}

.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.92rem;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-dot--yellow { background: #facc15; }
.legend-dot--purple { background: #a78bfa; }
.legend-dot--red { background: #ef4444; }
.legend-dot--green { background: #22c55e; }

.signal-marker {
  opacity: 0.95;
}

.signal-pole {
  stroke-width: 2.6;
  opacity: 0.85;
}

.signal-pole--long {
  stroke: #ef4444;
}

.signal-pole--short {
  stroke: #22c55e;
}

.signal-marker--long {
  fill: #ef4444;
}

.signal-marker--short {
  fill: #22c55e;
}

.signal-label {
  fill: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 700;
}

.signal-card {
  margin-top: 16px;
}

.sizing-card {
  margin-top: 16px;
}

.signal-title {
  margin: 8px 0 6px;
  font-size: 1.1rem;
  font-weight: 700;
}

.sizing-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.sizing-metric {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.sizing-rule {
  display: grid;
  gap: 6px;
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.88rem;
}

.position-item,
.event-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.position-right {
  text-align: right;
}

.pnl--profit {
  color: #fca5a5;
}

.pnl--loss {
  color: #86efac;
}

@media (max-width: 1180px) {
  .monitor-layout {
    grid-template-columns: 1fr;
  }

  .watch-panel,
  .side-panel,
  .chart-panel {
    min-height: auto;
  }
}

@media (max-width: 760px) {
  .futures-hero {
    flex-direction: column;
  }

  .sizing-grid {
    grid-template-columns: 1fr;
  }
}
</style>
