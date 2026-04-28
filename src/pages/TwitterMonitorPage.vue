<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const STORAGE_KEYS = {
  apiBase: 'twitter-monitor-console-api-base-url',
  apiKey: 'twitter-monitor-console-api-key',
  apiPrefix: 'twitter-monitor-console-api-prefix',
}

const DEFAULT_API_BASE = 'http://localhost:3310'
const DEFAULT_API_PREFIX = '/api/twitter'
const VISIBLE_REFRESH_INTERVAL_MS = 30000
const HIDDEN_REFRESH_INTERVAL_MS = 90000

const apiBaseInput = ref(readStoredValue(STORAGE_KEYS.apiBase, DEFAULT_API_BASE))
const apiBase = ref(normalizeApiBase(apiBaseInput.value))
const apiPrefixInput = ref(readStoredValue(STORAGE_KEYS.apiPrefix, DEFAULT_API_PREFIX))
const apiPrefix = ref(normalizeApiPrefix(apiPrefixInput.value))
const apiKeyInput = ref(readStoredValue(STORAGE_KEYS.apiKey, ''))
const apiKey = ref(apiKeyInput.value.trim())
const refreshTimer = ref(null)
const activeTab = ref('posts')
const targetIntervalDrafts = reactive({})
const targetIntervalBaseValues = reactive({})

const TABS = [
  { key: 'posts', label: '帖子' },
  { key: 'matches', label: '命中' },
  { key: 'targets', label: '目标' },
  { key: 'rules', label: '规则' },
]

const dashboard = reactive({
  loading: false,
  error: '',
  statusMessage: '',
  lastUpdatedAt: '',
  health: null,
  targets: [],
  rules: [],
  posts: [],
  matches: [],
  lastSyncResult: null,
})

const actionState = reactive({
  refreshing: false,
  applyingConnection: false,
  creatingTarget: false,
  creatingRule: false,
  testingNotify: false,
  syncingTargetIds: [],
  togglingTargetIds: [],
  savingTargetIntervalIds: [],
  togglingRuleIds: [],
})

const targetForm = reactive({
  type: 'user',
  username: '',
  query: '',
  label: '',
  pollIntervalSec: 60,
  bootstrapMode: 'latest',
  runNow: true,
})

const ruleForm = reactive({
  name: '',
  targetId: '',
  matchMode: 'any',
  keywords: '',
  pattern: '',
  excludeRetweets: true,
  excludeReplies: false,
  requireMedia: false,
  webhookUrl: '',
})

const targetLookup = computed(() => {
  return new Map(dashboard.targets.map((target) => [String(target.id), target]))
})

const targetOptions = computed(() => {
  return [
    { value: '', label: '全部目标共享' },
    ...dashboard.targets.map((target) => ({
      value: String(target.id),
      label: `${target.label} · ${target.type === 'user' ? '@' : '#'}${target.type === 'user' ? target.username : target.id}`,
    })),
  ]
})

const summaryCards = computed(() => {
  const enabledTargets = dashboard.targets.filter((item) => item.enabled).length
  const enabledRules = dashboard.rules.filter((item) => item.enabled).length
  const sentMatches = dashboard.matches.filter((item) => item.notificationStatus === 'sent').length
  const failedMatches = dashboard.matches.filter((item) => item.notificationStatus === 'failed').length

  return [
    { label: '监控目标', value: String(dashboard.targets.length), detail: `${enabledTargets} 个启用中` },
    { label: '规则数量', value: String(dashboard.rules.length), detail: `${enabledRules} 条启用中` },
    { label: '最近帖子', value: String(dashboard.posts.length), detail: '最近一次抓取缓存' },
    {
      label: '最近命中',
      value: String(dashboard.matches.length),
      detail: failedMatches ? `${failedMatches} 条发送失败` : `${sentMatches} 条已发送`,
    },
  ]
})

const healthSummary = computed(() => {
  if (!dashboard.health) {
    return '尚未连接后端'
  }

  const bits = [
    dashboard.health.service || 'twitter-monitor',
    dashboard.health.provider || 'provider',
    dashboard.health.apiPrefix || apiPrefix.value,
    dashboard.health.providerConfigured ? 'provider ready' : 'provider missing',
    dashboard.health.defaultWebhookConfigured ? 'webhook ready' : 'webhook missing',
  ]
  return bits.join(' · ')
})

const apiBaseWarning = computed(() => {
  if (typeof window === 'undefined') {
    return ''
  }
  if (!apiBase.value) {
    return '请先填写 twitter-monitor 后端地址。'
  }
  if (window.location.protocol === 'https:' && apiBase.value.startsWith('http://')) {
    return '当前页面走 HTTPS，后端如果仍是 HTTP，请求会被浏览器拦截；请改用 HTTPS 后端或本地调试。'
  }
  return ''
})

const hasPendingConnectionChanges = computed(() => {
  return (
    normalizeApiBase(apiBaseInput.value) !== apiBase.value ||
    normalizeApiPrefix(apiPrefixInput.value) !== apiPrefix.value ||
    apiKeyInput.value.trim() !== apiKey.value
  )
})

const tabCounts = computed(() => ({
  posts: dashboard.posts.length,
  matches: dashboard.matches.length,
  targets: dashboard.targets.length,
  rules: dashboard.rules.length,
}))

watch(apiBaseInput, (value) => {
  saveStorage(STORAGE_KEYS.apiBase, value)
})

watch(apiPrefixInput, (value) => {
  saveStorage(STORAGE_KEYS.apiPrefix, value)
})

watch(apiKeyInput, (value) => {
  saveStorage(STORAGE_KEYS.apiKey, value)
})

onMounted(() => {
  refreshDashboard()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  clearRefreshTimer()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function readStoredValue(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }
  return window.localStorage.getItem(key) || fallback
}

function saveStorage(key, value) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(key, value)
}

function normalizeApiBase(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function normalizeApiPrefix(value) {
  const trimmed = String(value || '').trim()
  const candidate = trimmed || DEFAULT_API_PREFIX
  const withLeadingSlash = candidate.startsWith('/') ? candidate : `/${candidate}`
  const normalized = withLeadingSlash.replace(/\/+$/, '')
  return normalized || DEFAULT_API_PREFIX
}

function normalizeApiPath(path) {
  const input = String(path || '').trim()
  if (!input) {
    return '/'
  }

  if (input === '/api') {
    return ''
  }

  if (input.startsWith('/api/')) {
    return input.slice(4)
  }

  return input.startsWith('/') ? input : `/${input}`
}

function clearRefreshTimer() {
  if (refreshTimer.value && typeof window !== 'undefined') {
    window.clearTimeout(refreshTimer.value)
    refreshTimer.value = null
  }
}

function scheduleRefresh(delayOverride = null) {
  if (typeof window === 'undefined') {
    return
  }

  clearRefreshTimer()
  const delay =
    delayOverride == null
      ? (document.hidden ? HIDDEN_REFRESH_INTERVAL_MS : VISIBLE_REFRESH_INTERVAL_MS)
      : delayOverride

  refreshTimer.value = window.setTimeout(() => {
    refreshDashboard({ silent: true }).catch(() => {})
  }, delay)
}

function handleVisibilityChange() {
  scheduleRefresh(document.hidden ? HIDDEN_REFRESH_INTERVAL_MS : 500)
}

async function apiCall(path, options = {}) {
  const base = normalizeApiBase(apiBase.value)
  if (!base) {
    throw new Error('请先填写 twitter-monitor API Base URL')
  }
  const finalPath = `${apiPrefix.value}${normalizeApiPath(path)}`

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (apiKey.value) {
    headers['x-api-key'] = apiKey.value
  }

  const response = await fetch(`${base}${finalPath}`, {
    ...options,
    headers,
  })

  const rawText = await response.text()
  let payload = null
  if (rawText) {
    try {
      payload = JSON.parse(rawText)
    } catch (error) {
      payload = null
    }
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      rawText ||
      `请求失败 (${response.status})`
    throw new Error(message)
  }

  return payload
}

async function refreshDashboard(options = {}) {
  const silent = Boolean(options.silent)
  if (actionState.refreshing) {
    return
  }

  actionState.refreshing = true
  if (!silent) {
    dashboard.loading = true
  }

  try {
    const [healthResult, targetsResult, rulesResult, postsResult, matchesResult] = await Promise.allSettled([
      apiCall('/api/health'),
      apiCall('/api/watch-targets'),
      apiCall('/api/rules'),
      apiCall('/api/posts'),
      apiCall('/api/matches'),
    ])

    if (healthResult.status === 'fulfilled') {
      dashboard.health = healthResult.value
    }

    if (targetsResult.status === 'fulfilled') {
      dashboard.targets = Array.isArray(targetsResult.value?.items) ? targetsResult.value.items : []
      syncTargetIntervalDrafts()
    }

    if (rulesResult.status === 'fulfilled') {
      dashboard.rules = Array.isArray(rulesResult.value?.items) ? rulesResult.value.items : []
    }

    if (postsResult.status === 'fulfilled') {
      dashboard.posts = Array.isArray(postsResult.value?.items) ? postsResult.value.items : []
    }

    if (matchesResult.status === 'fulfilled') {
      dashboard.matches = Array.isArray(matchesResult.value?.items) ? matchesResult.value.items : []
    }

    const rejected = [targetsResult, rulesResult, postsResult, matchesResult].find(
      (result) => result.status === 'rejected',
    )
    dashboard.error = rejected?.reason?.message || ''
    dashboard.lastUpdatedAt = new Date().toISOString()
  } catch (error) {
    dashboard.error = error.message
  } finally {
    actionState.refreshing = false
    dashboard.loading = false
    scheduleRefresh()
  }
}

async function applyConnectionSettings() {
  actionState.applyingConnection = true
  dashboard.error = ''
  dashboard.statusMessage = ''

  try {
    apiBase.value = normalizeApiBase(apiBaseInput.value)
    apiPrefix.value = normalizeApiPrefix(apiPrefixInput.value)
    apiKey.value = apiKeyInput.value.trim()
    await refreshDashboard()
    dashboard.statusMessage = '后端连接配置已应用。'
  } finally {
    actionState.applyingConnection = false
  }
}

async function submitTarget() {
  actionState.creatingTarget = true
  dashboard.error = ''
  dashboard.statusMessage = ''

  try {
    const payload = {
      type: targetForm.type,
      label: targetForm.label.trim() || undefined,
      pollIntervalSec: Math.max(Number(targetForm.pollIntervalSec) || 60, 15),
      bootstrapMode: targetForm.bootstrapMode,
      runNow: targetForm.runNow,
    }

    if (targetForm.type === 'user') {
      payload.username = targetForm.username.trim()
    } else {
      payload.query = targetForm.query.trim()
    }

    const response = await apiCall('/api/watch-targets', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    dashboard.lastSyncResult = response?.syncResult || null
    dashboard.statusMessage = `已创建监控目标「${response?.item?.label || payload.label || payload.username || payload.query}」`
    resetTargetForm()
    await refreshDashboard()
  } catch (error) {
    dashboard.error = error.message
  } finally {
    actionState.creatingTarget = false
  }
}

async function submitRule() {
  actionState.creatingRule = true
  dashboard.error = ''
  dashboard.statusMessage = ''

  try {
    const payload = {
      name: ruleForm.name.trim(),
      targetId: ruleForm.targetId ? Number(ruleForm.targetId) : null,
      matchMode: ruleForm.matchMode,
      keywords:
        ruleForm.matchMode === 'regex'
          ? []
          : parseKeywordInput(ruleForm.keywords),
      pattern: ruleForm.matchMode === 'regex' ? ruleForm.pattern.trim() : '',
      excludeRetweets: ruleForm.excludeRetweets,
      excludeReplies: ruleForm.excludeReplies,
      requireMedia: ruleForm.requireMedia,
      webhookUrl: ruleForm.webhookUrl.trim(),
    }

    const response = await apiCall('/api/rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    dashboard.statusMessage = `已创建规则「${response?.item?.name || payload.name}」`
    resetRuleForm()
    await refreshDashboard()
  } catch (error) {
    dashboard.error = error.message
  } finally {
    actionState.creatingRule = false
  }
}

async function syncTarget(target) {
  pushBusy(actionState.syncingTargetIds, target.id)
  dashboard.error = ''
  dashboard.statusMessage = ''

  try {
    const response = await apiCall(`/api/watch-targets/${target.id}/sync`, {
      method: 'POST',
    })
    dashboard.lastSyncResult = response
    dashboard.statusMessage = `已手动同步「${target.label}」`
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message
  } finally {
    removeBusy(actionState.syncingTargetIds, target.id)
  }
}

async function toggleTarget(target) {
  pushBusy(actionState.togglingTargetIds, target.id)
  dashboard.error = ''

  try {
    await apiCall(`/api/watch-targets/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        enabled: !target.enabled,
      }),
    })
    dashboard.statusMessage = `${target.label} 已${target.enabled ? '暂停' : '启用'}`
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message
  } finally {
    removeBusy(actionState.togglingTargetIds, target.id)
  }
}

async function saveTargetInterval(target) {
  const targetId = String(target.id)
  const nextInterval = normalizeTargetIntervalValue(targetIntervalDrafts[targetId], target.pollIntervalSec)
  if (nextInterval === target.pollIntervalSec) {
    dashboard.statusMessage = `${target.label} 的轮询间隔未变化`
    targetIntervalDrafts[targetId] = String(target.pollIntervalSec)
    targetIntervalBaseValues[targetId] = String(target.pollIntervalSec)
    return
  }

  pushBusy(actionState.savingTargetIntervalIds, target.id)
  dashboard.error = ''
  dashboard.statusMessage = ''

  try {
    await apiCall(`/api/watch-targets/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        pollIntervalSec: nextInterval,
      }),
    })
    dashboard.statusMessage = `已将 ${target.label} 的轮询间隔改为 ${nextInterval} 秒，下一轮调度自动生效。`
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message
  } finally {
    removeBusy(actionState.savingTargetIntervalIds, target.id)
  }
}

async function toggleRule(rule) {
  pushBusy(actionState.togglingRuleIds, rule.id)
  dashboard.error = ''

  try {
    await apiCall(`/api/rules/${rule.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        enabled: !rule.enabled,
      }),
    })
    dashboard.statusMessage = `${rule.name} 已${rule.enabled ? '暂停' : '启用'}`
    await refreshDashboard({ silent: true })
  } catch (error) {
    dashboard.error = error.message
  } finally {
    removeBusy(actionState.togglingRuleIds, rule.id)
  }
}

async function testNotify() {
  actionState.testingNotify = true
  dashboard.error = ''

  try {
    await apiCall('/api/test-notify', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    dashboard.statusMessage = '默认通知 webhook 测试已发送。'
  } catch (error) {
    dashboard.error = error.message
  } finally {
    actionState.testingNotify = false
  }
}

function resetTargetForm() {
  targetForm.type = 'user'
  targetForm.username = ''
  targetForm.query = ''
  targetForm.label = ''
  targetForm.pollIntervalSec = 60
  targetForm.bootstrapMode = 'latest'
  targetForm.runNow = true
}

function resetRuleForm() {
  ruleForm.name = ''
  ruleForm.targetId = ''
  ruleForm.matchMode = 'any'
  ruleForm.keywords = ''
  ruleForm.pattern = ''
  ruleForm.excludeRetweets = true
  ruleForm.excludeReplies = false
  ruleForm.requireMedia = false
  ruleForm.webhookUrl = ''
}

function syncTargetIntervalDrafts() {
  const activeIds = new Set()

  dashboard.targets.forEach((target) => {
    const key = String(target.id)
    const currentValue = String(target.pollIntervalSec)
    activeIds.add(key)

    if (!(key in targetIntervalDrafts) || targetIntervalDrafts[key] === targetIntervalBaseValues[key]) {
      targetIntervalDrafts[key] = currentValue
    }
    targetIntervalBaseValues[key] = currentValue
  })

  Object.keys(targetIntervalDrafts).forEach((key) => {
    if (!activeIds.has(key)) {
      delete targetIntervalDrafts[key]
      delete targetIntervalBaseValues[key]
    }
  })
}

function parseKeywordInput(input) {
  return String(input || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function pushBusy(list, id) {
  if (!list.includes(id)) {
    list.push(id)
  }
}

function removeBusy(list, id) {
  const index = list.indexOf(id)
  if (index >= 0) {
    list.splice(index, 1)
  }
}

function isBusy(list, id) {
  return list.includes(id)
}

function normalizeTargetIntervalValue(value, fallback = 60) {
  const parsed = Number.parseInt(String(value || '').trim(), 10)
  if (!Number.isFinite(parsed)) {
    return Math.max(Number(fallback) || 60, 15)
  }
  return Math.max(parsed, 15)
}

function targetIntervalChanged(target) {
  const key = String(target.id)
  return normalizeTargetIntervalValue(targetIntervalDrafts[key], target.pollIntervalSec) !== target.pollIntervalSec
}

function formatDateTime(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatRelativeTime(value) {
  if (!value) {
    return '暂无'
  }

  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) {
    return value
  }

  const diffMs = time - Date.now()
  const diffMin = Math.round(diffMs / 60000)
  if (Math.abs(diffMin) < 1) {
    return '刚刚'
  }
  if (Math.abs(diffMin) < 60) {
    return `${Math.abs(diffMin)} 分钟${diffMin > 0 ? '后' : '前'}`
  }

  const diffHour = Math.round(diffMin / 60)
  if (Math.abs(diffHour) < 24) {
    return `${Math.abs(diffHour)} 小时${diffHour > 0 ? '后' : '前'}`
  }

  const diffDay = Math.round(diffHour / 24)
  return `${Math.abs(diffDay)} 天${diffDay > 0 ? '后' : '前'}`
}

function shortText(text, maxLength = 150) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) {
    return clean
  }
  return `${clean.slice(0, maxLength)}...`
}

function statusTone(status) {
  switch (status) {
    case 'sent':
      return 'sent'
    case 'failed':
      return 'failed'
    case 'skipped':
      return 'muted'
    default:
      return 'pending'
  }
}

function targetSourceLabel(target) {
  if (target.type === 'user') {
    return `@${target.username || '--'}`
  }
  return target.query || '--'
}

function ruleTargetLabel(rule) {
  if (!rule.targetId) {
    return '全部目标共享'
  }
  const target = targetLookup.value.get(String(rule.targetId))
  return target ? target.label : `目标 #${rule.targetId}`
}

function ruleKeywords(rule) {
  if (rule.matchMode === 'regex') {
    return rule.pattern ? [rule.pattern] : []
  }
  return Array.isArray(rule.keywords) ? rule.keywords : []
}

function postTargetSummary(post) {
  if (!Array.isArray(post.observedTargetIds) || !post.observedTargetIds.length) {
    return '未关联目标'
  }

  return post.observedTargetIds
    .map((id) => targetLookup.value.get(String(id))?.label || `#${id}`)
    .join(' · ')
}

function avatarLetter(text) {
  const clean = String(text || '').trim()
  if (!clean) return '?'
  const ch = clean.replace(/^@/, '').charAt(0)
  return ch ? ch.toUpperCase() : '?'
}
</script>

<template>
  <main class="x-page">
    <div class="x-shell">
      <!-- LEFT NAV -->
      <aside class="x-nav">
        <div class="x-nav-inner">

          <nav class="x-nav-list">
            <button
              v-for="tab in TABS"
              :key="tab.key"
              class="x-nav-item"
              :class="{ 'is-active': activeTab === tab.key }"
              type="button"
              @click="activeTab = tab.key"
            >
              <span class="x-nav-dot" />
              <span class="x-nav-label">{{ tab.label }}</span>
            </button>
          </nav>

          <button
            class="x-pill x-pill--primary x-nav-cta"
            :disabled="actionState.refreshing"
            @click="refreshDashboard()"
          >
            {{ actionState.refreshing ? '同步中…' : '刷新面板' }}
          </button>
        </div>
      </aside>

      <!-- MAIN COLUMN -->
      <section class="x-main">
        <header class="x-topbar">
          <div class="x-topbar-row">
            <h1 class="x-topbar-title">推文监控</h1>
            <span class="x-topbar-sub">{{ formatRelativeTime(dashboard.lastUpdatedAt) }} · {{ dashboard.targets.length }} 目标 / {{ dashboard.rules.length }} 规则</span>
          </div>
          <div class="x-tabs" role="tablist">
            <button
              v-for="tab in TABS"
              :key="tab.key"
              class="x-tab"
              :class="{ 'is-active': activeTab === tab.key }"
              role="tab"
              type="button"
              @click="activeTab = tab.key"
            >
              <span>{{ tab.label }}</span>
              <span class="x-tab-count">{{ tabCounts[tab.key] }}</span>
            </button>
          </div>
        </header>

        <!-- COMPOSER -->
        <div class="x-composer">
          <div class="x-composer-avatar">JM</div>
          <div class="x-composer-body">
            <!-- POSTS tab composer -->
            <div v-if="activeTab === 'posts'" class="x-composer-row">
              <p class="x-composer-hint">实时同步 twitter-monitor 抓到的帖子。点右上角刷新或左侧按钮立即拉取。</p>
              <div class="x-composer-actions">
                <button class="x-pill x-pill--ghost" :disabled="actionState.refreshing" @click="refreshDashboard()">
                  {{ actionState.refreshing ? '同步中…' : '立刻刷新' }}
                </button>
              </div>
            </div>

            <!-- MATCHES tab composer -->
            <div v-else-if="activeTab === 'matches'" class="x-composer-row">
              <p class="x-composer-hint">查看最近规则命中和通知发送状态。可发送一次默认 webhook 测试。</p>
              <div class="x-composer-actions">
                <button class="x-pill x-pill--ghost" :disabled="actionState.testingNotify" @click="testNotify">
                  {{ actionState.testingNotify ? '发送中…' : '测试通知' }}
                </button>
              </div>
            </div>

            <!-- TARGETS tab composer (target form) -->
            <form v-else-if="activeTab === 'targets'" class="x-form" @submit.prevent="submitTarget">
              <p class="x-composer-hint">添加新的监控目标，支持账号或高级查询。</p>
              <div class="x-form-row x-form-row--two">
                <label class="x-field">
                  <span class="x-field-label">类型</span>
                  <select v-model="targetForm.type" class="x-select">
                    <option value="user">账号</option>
                    <option value="query">查询</option>
                  </select>
                </label>
                <label class="x-field">
                  <span class="x-field-label">轮询间隔（秒）</span>
                  <input v-model="targetForm.pollIntervalSec" class="x-input" type="number" min="15" step="15" />
                </label>
              </div>

              <label v-if="targetForm.type === 'user'" class="x-field">
                <span class="x-field-label">用户名</span>
                <input v-model="targetForm.username" class="x-input" placeholder="OpenAI" spellcheck="false" />
              </label>
              <label v-else class="x-field">
                <span class="x-field-label">查询语句</span>
                <textarea v-model="targetForm.query" class="x-textarea" placeholder="from:OpenAI OR ChatGPT" spellcheck="false" />
              </label>

              <div class="x-form-row x-form-row--two">
                <label class="x-field">
                  <span class="x-field-label">显示名称</span>
                  <input v-model="targetForm.label" class="x-input" placeholder="可留空" spellcheck="false" />
                </label>
                <label class="x-field">
                  <span class="x-field-label">初始模式</span>
                  <select v-model="targetForm.bootstrapMode" class="x-select">
                    <option value="latest">latest</option>
                    <option value="backfill">backfill</option>
                  </select>
                </label>
              </div>

              <label class="x-checkbox">
                <input v-model="targetForm.runNow" type="checkbox" />
                <span>创建后立即执行一次同步</span>
              </label>

              <div class="x-composer-actions">
                <button class="x-pill x-pill--primary" type="submit" :disabled="actionState.creatingTarget">
                  {{ actionState.creatingTarget ? '创建中…' : '创建目标' }}
                </button>
              </div>
            </form>

            <!-- RULES tab composer (rule form) -->
            <form v-else class="x-form" @submit.prevent="submitRule">
              <p class="x-composer-hint">规则用于在帖子中筛选关键词、正则或全部命中。</p>
              <label class="x-field">
                <span class="x-field-label">规则名称</span>
                <input v-model="ruleForm.name" class="x-input" placeholder="例如：重要产品更新" spellcheck="false" />
              </label>

              <div class="x-form-row x-form-row--two">
                <label class="x-field">
                  <span class="x-field-label">关联目标</span>
                  <select v-model="ruleForm.targetId" class="x-select">
                    <option v-for="option in targetOptions" :key="option.value || 'all'" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label class="x-field">
                  <span class="x-field-label">匹配模式</span>
                  <select v-model="ruleForm.matchMode" class="x-select">
                    <option value="any">any</option>
                    <option value="all">all</option>
                    <option value="regex">regex</option>
                  </select>
                </label>
              </div>

              <label v-if="ruleForm.matchMode === 'regex'" class="x-field">
                <span class="x-field-label">正则表达式</span>
                <input v-model="ruleForm.pattern" class="x-input" placeholder="gpt\s?5|openai" spellcheck="false" />
              </label>
              <label v-else class="x-field">
                <span class="x-field-label">关键词</span>
                <textarea v-model="ruleForm.keywords" class="x-textarea" placeholder="chatgpt, gpt-5, release note" spellcheck="false" />
              </label>

              <label class="x-field">
                <span class="x-field-label">覆盖 Webhook（可选）</span>
                <input v-model="ruleForm.webhookUrl" class="x-input" placeholder="留空则使用默认通知地址" spellcheck="false" />
              </label>

              <div class="x-toggle-row">
                <label class="x-checkbox">
                  <input v-model="ruleForm.excludeRetweets" type="checkbox" />
                  <span>排除转推</span>
                </label>
                <label class="x-checkbox">
                  <input v-model="ruleForm.excludeReplies" type="checkbox" />
                  <span>排除回复</span>
                </label>
                <label class="x-checkbox">
                  <input v-model="ruleForm.requireMedia" type="checkbox" />
                  <span>必须带媒体</span>
                </label>
              </div>

              <div class="x-composer-actions">
                <button class="x-pill x-pill--primary" type="submit" :disabled="actionState.creatingRule">
                  {{ actionState.creatingRule ? '创建中…' : '创建规则' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- FEED -->
        <div class="x-feed">
          <!-- POSTS -->
          <template v-if="activeTab === 'posts'">
            <article v-for="post in dashboard.posts" :key="post.postId" class="x-tweet">
              <div class="x-tweet-avatar">{{ avatarLetter(post.authorUsername) }}</div>
              <div class="x-tweet-body">
                <div class="x-tweet-head">
                  <span class="x-tweet-name">{{ post.authorUsername || '未知作者' }}</span>
                  <span class="x-tweet-handle">@{{ post.authorUsername || 'unknown' }}</span>
                  <span class="x-dot">·</span>
                  <span class="x-tweet-time">{{ formatDateTime(post.createdAt) }}</span>
                  <a
                    v-if="post.raw?.url || post.url"
                    class="x-tweet-link"
                    :href="post.raw?.url || post.url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >打开原帖 ↗</a>
                </div>
                <p class="x-tweet-text">{{ shortText(post.text, 240) || '无内容' }}</p>
                <div class="x-tweet-meta">
                  <span>{{ postTargetSummary(post) }}</span>
                </div>
              </div>
            </article>
            <div v-if="!dashboard.posts.length" class="x-empty">
              还没有抓到帖子，先确认目标和 provider key 是否配置正确。
            </div>
          </template>

          <!-- MATCHES -->
          <template v-else-if="activeTab === 'matches'">
            <article v-for="match in dashboard.matches" :key="match.id" class="x-tweet">
              <div class="x-tweet-avatar x-tweet-avatar--match">⚡</div>
              <div class="x-tweet-body">
                <div class="x-tweet-head">
                  <span class="x-tweet-name">{{ match.ruleName || `规则 #${match.ruleId}` }}</span>
                  <span class="x-tweet-handle">@{{ match.authorUsername || 'unknown' }}</span>
                  <span class="x-dot">·</span>
                  <span class="x-tweet-time">{{ formatDateTime(match.postCreatedAt) }}</span>
                  <span class="x-status" :class="`x-status--${statusTone(match.notificationStatus)}`">
                    {{ match.notificationStatus || 'pending' }}
                  </span>
                </div>
                <p class="x-tweet-text">{{ shortText(match.postText, 240) || '无内容' }}</p>
                <p v-if="match.notificationError" class="x-alert x-alert--error">{{ match.notificationError }}</p>
              </div>
            </article>
            <div v-if="!dashboard.matches.length" class="x-empty">暂时还没有命中记录。</div>
          </template>

          <!-- TARGETS -->
          <template v-else-if="activeTab === 'targets'">
            <article v-for="target in dashboard.targets" :key="target.id" class="x-tweet">
              <div class="x-tweet-avatar">{{ avatarLetter(target.username || target.label) }}</div>
              <div class="x-tweet-body">
                <div class="x-tweet-head">
                  <span class="x-tweet-name">{{ target.label }}</span>
                  <span class="x-tweet-handle">{{ targetSourceLabel(target) }}</span>
                  <span class="x-dot">·</span>
                  <span class="x-tweet-time">{{ formatDateTime(target.lastCheckedAt) }}</span>
                  <span class="x-status" :class="target.enabled ? 'x-status--online' : 'x-status--muted'">
                    {{ target.enabled ? '启用中' : '已暂停' }}
                  </span>
                </div>
                <div class="x-tweet-meta">
                  <span>类型 {{ target.type }}</span>
                  <span>间隔 {{ target.pollIntervalSec }}s</span>
                  <span>模式 {{ target.bootstrapMode }}</span>
                  <span>游标 {{ target.lastSeenPostId || '--' }}</span>
                </div>
                <div class="x-inline-editor">
                  <label class="x-inline-editor__label" :for="`target-interval-${target.id}`">轮询间隔（秒）</label>
                  <div class="x-inline-editor__controls">
                    <input
                      :id="`target-interval-${target.id}`"
                      v-model="targetIntervalDrafts[target.id]"
                      class="x-input x-input--inline"
                      type="number"
                      min="15"
                      step="15"
                    />
                    <button
                      class="x-pill x-pill--primary x-pill--sm"
                      :disabled="isBusy(actionState.savingTargetIntervalIds, target.id) || !targetIntervalChanged(target)"
                      @click="saveTargetInterval(target)"
                    >
                      {{ isBusy(actionState.savingTargetIntervalIds, target.id) ? '保存中…' : '保存间隔' }}
                    </button>
                  </div>
                  <p class="x-inline-editor__hint">修改后无需重启，下一轮调度会自动读取新的间隔。</p>
                </div>
                <p v-if="target.lastError" class="x-alert x-alert--error">{{ target.lastError }}</p>
                <div class="x-tweet-actions">
                  <button
                    class="x-pill x-pill--ghost x-pill--sm"
                    :disabled="isBusy(actionState.syncingTargetIds, target.id)"
                    @click="syncTarget(target)"
                  >
                    {{ isBusy(actionState.syncingTargetIds, target.id) ? '同步中…' : '立即同步' }}
                  </button>
                  <button
                    class="x-pill x-pill--sm"
                    :class="target.enabled ? 'x-pill--danger' : 'x-pill--primary'"
                    :disabled="isBusy(actionState.togglingTargetIds, target.id)"
                    @click="toggleTarget(target)"
                  >
                    {{ isBusy(actionState.togglingTargetIds, target.id) ? '处理中…' : (target.enabled ? '暂停' : '启用') }}
                  </button>
                </div>
              </div>
            </article>
            <div v-if="!dashboard.targets.length" class="x-empty">还没有监控目标，先在上面创建一个账号或查询。</div>
          </template>

          <!-- RULES -->
          <template v-else>
            <article v-for="rule in dashboard.rules" :key="rule.id" class="x-tweet">
              <div class="x-tweet-avatar x-tweet-avatar--rule">#</div>
              <div class="x-tweet-body">
                <div class="x-tweet-head">
                  <span class="x-tweet-name">{{ rule.name }}</span>
                  <span class="x-tweet-handle">{{ ruleTargetLabel(rule) }}</span>
                  <span class="x-dot">·</span>
                  <span class="x-tweet-time">{{ rule.matchMode }}</span>
                  <span class="x-status" :class="rule.enabled ? 'x-status--online' : 'x-status--muted'">
                    {{ rule.enabled ? '启用中' : '已暂停' }}
                  </span>
                </div>
                <div v-if="ruleKeywords(rule).length" class="x-chip-row">
                  <span v-for="kw in ruleKeywords(rule)" :key="kw" class="x-chip">#{{ kw }}</span>
                </div>
                <p v-else class="x-tweet-meta">所有帖子</p>
                <div class="x-tweet-meta">
                  <span>{{ rule.excludeRetweets ? '排除转推' : '包含转推' }}</span>
                  <span>{{ rule.excludeReplies ? '排除回复' : '包含回复' }}</span>
                  <span>{{ rule.requireMedia ? '仅媒体' : '媒体不限' }}</span>
                </div>
                <div class="x-tweet-actions">
                  <button
                    class="x-pill x-pill--sm"
                    :class="rule.enabled ? 'x-pill--danger' : 'x-pill--primary'"
                    :disabled="isBusy(actionState.togglingRuleIds, rule.id)"
                    @click="toggleRule(rule)"
                  >
                    {{ isBusy(actionState.togglingRuleIds, rule.id) ? '处理中…' : (rule.enabled ? '暂停' : '启用') }}
                  </button>
                </div>
              </div>
            </article>
            <div v-if="!dashboard.rules.length" class="x-empty">还没有规则，先创建一条关键词或正则规则。</div>
          </template>
        </div>
      </section>

      <!-- RIGHT ASIDE -->
      <aside class="x-aside">
        <!-- Connection / status -->
        <section class="x-aside-card">
          <header class="x-aside-head">
            <h2 class="x-aside-title">服务状态</h2>
            <span class="x-status" :class="dashboard.health?.ok ? 'x-status--online' : 'x-status--muted'">
              {{ dashboard.health?.ok ? '在线' : '待连接' }}
            </span>
          </header>
          <p class="x-aside-meta">{{ healthSummary }}</p>
          <p class="x-aside-meta">最近刷新 · {{ formatRelativeTime(dashboard.lastUpdatedAt) }}</p>
          <p v-if="apiBaseWarning" class="x-alert x-alert--warn">{{ apiBaseWarning }}</p>
          <p v-if="dashboard.error" class="x-alert x-alert--error">{{ dashboard.error }}</p>
          <p v-else-if="dashboard.statusMessage" class="x-alert x-alert--ok">{{ dashboard.statusMessage }}</p>
        </section>

        <!-- Stats -->
        <section class="x-aside-card">
          <h2 class="x-aside-title">数据概览</h2>
          <div class="x-aside-stats">
            <div v-for="card in summaryCards" :key="card.label" class="x-aside-stat">
              <span class="x-aside-stat-label">{{ card.label }}</span>
              <span class="x-aside-stat-value">{{ card.value }}</span>
              <span class="x-aside-stat-detail">{{ card.detail }}</span>
            </div>
          </div>
        </section>

        <!-- Connection -->
        <section class="x-aside-card">
          <h2 class="x-aside-title">连接配置</h2>
          <label class="x-field">
            <span class="x-field-label">API Base URL</span>
            <input v-model="apiBaseInput" class="x-input" placeholder="http://localhost:3310" spellcheck="false" />
          </label>
          <label class="x-field">
            <span class="x-field-label">API Prefix</span>
            <input v-model="apiPrefixInput" class="x-input" placeholder="/api 或 /api/twitter" spellcheck="false" />
          </label>
          <label class="x-field">
            <span class="x-field-label">x-api-key</span>
            <input v-model="apiKeyInput" class="x-input" placeholder="ADMIN_API_KEY" spellcheck="false" />
          </label>
          <p class="x-aside-meta">当前 · {{ apiBase || '未设置' }}</p>
          <p class="x-aside-meta">前缀 · {{ apiPrefix }}</p>
          <p v-if="hasPendingConnectionChanges" class="x-aside-meta x-aside-meta--accent">
            输入框已修改，点下方按钮才会启用。
          </p>
          <div class="x-composer-actions">
            <button
              class="x-pill x-pill--primary x-pill--sm"
              :disabled="actionState.applyingConnection"
              @click="applyConnectionSettings"
            >
              {{ actionState.applyingConnection ? '连接中…' : '应用连接配置' }}
            </button>
          </div>
        </section>

        <!-- Hints -->
        <section class="x-aside-card">
          <h2 class="x-aside-title">运行提示</h2>
          <ul class="x-aside-hints">
            <li><strong>跨域</strong> · 后端默认允许 *，可改 `CORS_ALLOW_ORIGIN`。</li>
            <li><strong>账号监控</strong> · 默认走 `advanced_search from:&lt;username&gt;`。</li>
            <li><strong>路径前缀</strong> · 远端如果走 Nginx 分流，把后端 `API_PREFIX` 和这里的 `API Prefix` 设成同一个值，例如 `/api/twitter`。</li>
          </ul>
        </section>

        <!-- Last sync -->
        <section v-if="dashboard.lastSyncResult" class="x-aside-card">
          <h2 class="x-aside-title">最近一次同步</h2>
          <pre class="x-json">{{ JSON.stringify(dashboard.lastSyncResult, null, 2) }}</pre>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.x-page {
  min-height: 100vh;
  background: #000;
  color: #e7e9ea;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.x-shell {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 360px;
  gap: 0;
  max-width: 1280px;
  margin: 0 auto;
  min-height: 100vh;
}

/* ===== LEFT NAV ===== */
.x-nav {
  border-right: 1px solid #2f3336;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  justify-content: flex-end;
}

.x-nav-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 8px 16px;
  width: 100%;
  align-items: flex-start;
}

.x-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  color: #e7e9ea;
  margin-bottom: 4px;
  transition: background 0.18s ease;
}
.x-logo:hover { background: #181818; }

.x-nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.x-nav-item {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background: transparent;
  border: 0;
  color: #e7e9ea;
  font-size: 1.15rem;
  font-weight: 500;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
  text-align: left;
  width: max-content;
  max-width: 100%;
}
.x-nav-item:hover { background: #181818; }
.x-nav-item.is-active { font-weight: 800; }
.x-nav-item--ghost { color: #71767b; font-size: 0.95rem; }

.x-nav-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #2f3336;
  flex-shrink: 0;
}
.x-nav-item.is-active .x-nav-dot { background: #1d9bf0; box-shadow: 0 0 0 4px rgba(29,155,240,0.18); }

.x-nav-cta {
  margin-top: 12px;
  width: 100%;
  max-width: 220px;
  justify-content: center;
}

@media (max-width: 1100px) {
  .x-nav-label { display: none; }
  .x-nav-item { padding: 12px; justify-content: center; width: auto; }
  .x-nav-cta { max-width: 56px; padding: 12px; font-size: 0; }
  .x-nav-cta::before { content: '↻'; font-size: 1.2rem; }
}

/* ===== MAIN ===== */
.x-main {
  border-right: 1px solid #2f3336;
  min-height: 100vh;
}

.x-topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  background: rgba(0,0,0,0.78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid #2f3336;
}

.x-topbar-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 18px 10px;
}
.x-topbar-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.x-topbar-sub { color: #71767b; font-size: 0.82rem; }

.x-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.x-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 0;
  background: transparent;
  border: 0;
  color: #71767b;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: color 0.18s ease, background 0.18s ease;
}
.x-tab:hover { background: #0a0a0a; color: #e7e9ea; }
.x-tab.is-active { color: #e7e9ea; }
.x-tab.is-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 4px;
  border-radius: 4px;
  background: #1d9bf0;
}
.x-tab-count {
  font-size: 0.78rem;
  color: #71767b;
  background: #16181c;
  border: 1px solid #2f3336;
  border-radius: 999px;
  padding: 1px 8px;
  min-width: 26px;
  text-align: center;
}
.x-tab.is-active .x-tab-count { color: #1d9bf0; border-color: rgba(29,155,240,0.4); }

/* ===== COMPOSER ===== */
.x-composer {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 8px solid #16181c;
}
.x-composer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: linear-gradient(135deg, #1d9bf0, #4dc4ff);
  color: #000;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.x-composer-body { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.x-composer-row { display: flex; flex-direction: column; gap: 12px; }
.x-composer-hint { margin: 0; color: #71767b; font-size: 0.95rem; line-height: 1.5; }
.x-composer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid #2f3336;
  padding-top: 12px;
  margin-top: 4px;
}

/* ===== FORM ===== */
.x-form { display: flex; flex-direction: column; gap: 14px; }
.x-form-row { display: flex; gap: 12px; }
.x-form-row--two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.x-field { display: flex; flex-direction: column; gap: 6px; }
.x-field-label { font-size: 0.78rem; color: #71767b; letter-spacing: 0.04em; }
.x-input, .x-textarea, .x-select {
  background: #000;
  border: 1px solid #2f3336;
  color: #e7e9ea;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.18s ease;
}
.x-input:focus, .x-textarea:focus, .x-select:focus { border-color: #1d9bf0; }
.x-textarea { min-height: 90px; resize: vertical; }
.x-checkbox { display: inline-flex; align-items: center; gap: 8px; color: #e7e9ea; font-size: 0.92rem; cursor: pointer; }
.x-checkbox input { accent-color: #1d9bf0; width: 16px; height: 16px; }
.x-toggle-row { display: flex; flex-wrap: wrap; gap: 14px 24px; }

/* ===== PILL BUTTONS ===== */
.x-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}
.x-pill:disabled { opacity: 0.55; cursor: not-allowed; }
.x-pill--sm { padding: 6px 14px; font-size: 0.86rem; }

.x-pill--primary { background: #1d9bf0; color: #fff; }
.x-pill--primary:hover:not(:disabled) { background: #1a8cd8; }

.x-pill--ghost { background: transparent; border-color: #536471; color: #e7e9ea; }
.x-pill--ghost:hover:not(:disabled) { background: rgba(239,243,244,0.1); }

.x-pill--danger { background: transparent; border-color: #f4212e; color: #f4212e; }
.x-pill--danger:hover:not(:disabled) { background: rgba(244,33,46,0.1); }

/* ===== FEED & TWEET ===== */
.x-feed { display: flex; flex-direction: column; }

.x-tweet {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #2f3336;
  transition: background 0.15s ease;
}
.x-tweet:hover { background: #0a0a0a; }

.x-tweet-avatar {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: #16181c;
  color: #e7e9ea;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  border: 1px solid #2f3336;
}
.x-tweet-avatar--match { background: rgba(29,155,240,0.15); color: #1d9bf0; border-color: rgba(29,155,240,0.4); }
.x-tweet-avatar--rule { background: rgba(0,186,124,0.12); color: #00ba7c; border-color: rgba(0,186,124,0.4); }

.x-tweet-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.x-tweet-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 0.92rem;
}
.x-tweet-name { font-weight: 800; color: #e7e9ea; }
.x-tweet-handle, .x-tweet-time, .x-dot { color: #71767b; font-weight: 400; }
.x-tweet-link { color: #1d9bf0; font-weight: 600; margin-left: auto; font-size: 0.85rem; }
.x-tweet-link:hover { text-decoration: underline; }

.x-tweet-text {
  margin: 2px 0 0;
  font-size: 0.98rem;
  line-height: 1.5;
  color: #e7e9ea;
  word-break: break-word;
}
.x-tweet-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: #71767b;
  font-size: 0.84rem;
  margin-top: 2px;
}
.x-tweet-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.x-inline-editor {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #2f3336;
}

.x-inline-editor__label {
  color: #aab8c2;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}

.x-inline-editor__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.x-input--inline {
  width: 140px;
}

.x-inline-editor__hint {
  margin: 0;
  color: #71767b;
  font-size: 0.82rem;
  line-height: 1.45;
}

/* ===== STATUS / CHIP / ALERT ===== */
.x-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid #2f3336;
  background: #16181c;
  color: #71767b;
  margin-left: auto;
}
.x-status--online { color: #00ba7c; border-color: rgba(0,186,124,0.4); background: rgba(0,186,124,0.1); }
.x-status--sent { color: #00ba7c; border-color: rgba(0,186,124,0.4); background: rgba(0,186,124,0.1); }
.x-status--failed { color: #f4212e; border-color: rgba(244,33,46,0.4); background: rgba(244,33,46,0.1); }
.x-status--pending { color: #ffd400; border-color: rgba(255,212,0,0.4); background: rgba(255,212,0,0.1); }
.x-status--muted { color: #71767b; }

.x-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.x-chip {
  color: #1d9bf0;
  font-size: 0.86rem;
  padding: 2px 0;
}
.x-chip:hover { text-decoration: underline; cursor: default; }

.x-alert {
  margin: 6px 0 0;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  border: 1px solid transparent;
  line-height: 1.5;
}
.x-alert--warn { color: #ffd400; background: rgba(255,212,0,0.08); border-color: rgba(255,212,0,0.3); }
.x-alert--error { color: #f4212e; background: rgba(244,33,46,0.08); border-color: rgba(244,33,46,0.3); }
.x-alert--ok { color: #00ba7c; background: rgba(0,186,124,0.08); border-color: rgba(0,186,124,0.3); }

.x-empty {
  padding: 36px 20px;
  text-align: center;
  color: #71767b;
}

/* ===== ASIDE ===== */
.x-aside {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  overflow-y: auto;
  padding: 14px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.x-aside-card {
  background: #16181c;
  border: 1px solid #2f3336;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.x-aside-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.x-aside-title { margin: 0; font-size: 1.05rem; font-weight: 800; color: #e7e9ea; }
.x-aside-meta { margin: 0; color: #71767b; font-size: 0.86rem; line-height: 1.5; }
.x-aside-meta--accent { color: #1d9bf0; }

.x-aside-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.x-aside-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #000;
  border: 1px solid #2f3336;
}
.x-aside-stat-label { color: #71767b; font-size: 0.75rem; letter-spacing: 0.04em; text-transform: uppercase; }
.x-aside-stat-value { color: #e7e9ea; font-size: 1.4rem; font-weight: 800; }
.x-aside-stat-detail { color: #71767b; font-size: 0.78rem; }

.x-aside-hints { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; color: #71767b; font-size: 0.86rem; line-height: 1.5; }
.x-aside-hints strong { color: #e7e9ea; margin-right: 4px; }

.x-json {
  margin: 0;
  padding: 10px 12px;
  background: #000;
  border: 1px solid #2f3336;
  border-radius: 12px;
  color: #cbd5e1;
  font-size: 0.78rem;
  overflow: auto;
  max-height: 320px;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1100px) {
  .x-shell { grid-template-columns: 72px minmax(0, 1fr); }
  .x-aside { display: none; }
  .x-main { border-right: 0; }
}

@media (max-width: 720px) {
  .x-shell { grid-template-columns: 1fr; }
  .x-nav {
    position: static;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid #2f3336;
  }
  .x-nav-inner { flex-direction: row; align-items: center; padding: 8px; flex-wrap: wrap; }
  .x-nav-list { flex-direction: row; gap: 2px; flex: 1; flex-wrap: wrap; }
  .x-nav-item { padding: 8px 10px; }
  .x-nav-cta { margin-top: 0; max-width: 56px; padding: 10px; font-size: 0; }
  .x-nav-cta::before { content: '↻'; font-size: 1.1rem; }
  .x-form-row--two { grid-template-columns: 1fr; }
  .x-tweet-link { margin-left: 0; }
  .x-status { margin-left: 0; }
  .x-input--inline { width: 100%; }
}
</style>
