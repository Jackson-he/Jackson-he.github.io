<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const STORAGE_KEYS = {
  apiBase: 'codex-chat-api-base',
  workingDirectory: 'codex-chat-working-directory',
  model: 'codex-chat-model',
  baseUrl: 'codex-chat-base-url',
  sandboxMode: 'codex-chat-sandbox-mode',
  approvalPolicy: 'codex-chat-approval-policy',
  networkAccessEnabled: 'codex-chat-network-access-enabled',
  activeConversationId: 'codex-chat-active-conversation-id',
}

const SUGGESTION_PROMPTS = [
  {
    icon: '⌘',
    label: '读代码',
    prompt: '请先阅读当前项目结构，然后告诉我应该先从哪里开始理解这个仓库。',
  },
  {
    icon: '✦',
    label: '做方案',
    prompt: '请结合当前项目上下文，给我一个简洁清晰的改造计划，按优先级排序。',
  },
  {
    icon: '</>',
    label: '找问题',
    prompt: '请检查当前项目里最值得优先修复的问题，并说明原因。',
  },
  {
    icon: '⚙',
    label: '写实现',
    prompt: '请基于当前目录内容，给我一个可以直接落地的实现建议。',
  },
]

const MOBILE_BREAKPOINT = 980

const apiBase = ref(loadStorage(STORAGE_KEYS.apiBase, 'http://127.0.0.1:3200'))
const workingDirectory = ref(loadStorage(STORAGE_KEYS.workingDirectory, '.'))
const model = ref(loadStorage(STORAGE_KEYS.model, ''))
const baseUrl = ref(loadStorage(STORAGE_KEYS.baseUrl, ''))
const sandboxMode = ref(loadStorage(STORAGE_KEYS.sandboxMode, 'workspace-write'))
const approvalPolicy = ref(loadStorage(STORAGE_KEYS.approvalPolicy, 'on-request'))
const networkAccessEnabled = ref(loadStorage(STORAGE_KEYS.networkAccessEnabled, false))
const activeConversationId = ref(loadStorage(STORAGE_KEYS.activeConversationId, ''))

const conversations = ref([])
const activeConversation = ref(null)
const serviceStatus = ref(null)
const loadingList = ref(false)
const loadingConversation = ref(false)
const sending = ref(false)
const creatingConversation = ref(false)
const deletingConversation = ref(false)
const errorMessage = ref('')
const statusMessage = ref('')
const draft = ref('')
const messageViewport = ref(null)
const composerInput = ref(null)
const drawerSection = ref('history')
const isDrawerOpen = ref(false)
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
let activeMessageController = null

const normalizedApiBase = computed(() => apiBase.value.replace(/\/+$/, ''))
const activeMessages = computed(() => activeConversation.value?.messages || [])
const activeTitle = computed(() => activeConversation.value?.title || '新对话')
const activeWorkingDirectory = computed(() => activeConversation.value?.workingDirectory || workingDirectory.value || '.')
const isDesktop = computed(() => viewportWidth.value >= MOBILE_BREAKPOINT)
const shouldShowDrawer = computed(() => isDesktop.value || isDrawerOpen.value)
const shouldShowDrawerOverlay = computed(() => !isDesktop.value && isDrawerOpen.value)
const hasMessages = computed(() => activeMessages.value.length > 0)
const serviceStateText = computed(() => (serviceStatus.value?.ok ? '服务在线' : '等待连接'))
const serviceStateClass = computed(() => (serviceStatus.value?.ok ? 'is-online' : 'is-offline'))
const selectedModelLabel = computed(() => model.value || serviceStatus.value?.defaults?.model || '服务默认')
const availableModelOptions = computed(() => {
  const options = []
  const seen = new Set()
  const defaultModel = serviceStatus.value?.defaults?.model || ''

  options.push({
    value: '',
    label: defaultModel ? `服务默认 (${defaultModel})` : '服务默认',
  })
  seen.add('')

  const push = (value) => {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized || seen.has(normalized)) {
      return
    }

    seen.add(normalized)
    options.push({
      value: normalized,
      label: normalized,
    })
  }

  ;(serviceStatus.value?.modelOptions || []).forEach(push)
  conversations.value.forEach((conversation) => push(conversation.model))
  push(activeConversation.value?.model)
  push(model.value)

  return options
})

watch(
  [apiBase, workingDirectory, model, baseUrl, sandboxMode, approvalPolicy, networkAccessEnabled, activeConversationId],
  () => {
    saveStorage(STORAGE_KEYS.apiBase, apiBase.value)
    saveStorage(STORAGE_KEYS.workingDirectory, workingDirectory.value)
    saveStorage(STORAGE_KEYS.model, model.value)
    saveStorage(STORAGE_KEYS.baseUrl, baseUrl.value)
    saveStorage(STORAGE_KEYS.sandboxMode, sandboxMode.value)
    saveStorage(STORAGE_KEYS.approvalPolicy, approvalPolicy.value)
    saveStorage(STORAGE_KEYS.networkAccessEnabled, networkAccessEnabled.value)
    saveStorage(STORAGE_KEYS.activeConversationId, activeConversationId.value)
  },
)

watch(
  () => activeMessages.value.length,
  async () => {
    await nextTick()
    scrollMessagesToBottom()
  },
)

watch(draft, async () => {
  await nextTick()
  resizeComposerInput()
})

watch(shouldShowDrawerOverlay, (isOpen) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }
})

onMounted(async () => {
  updateViewportWidth()
  window.addEventListener('resize', updateViewportWidth)
  await refreshHealth()
  await refreshConversations()
  await nextTick()
  resizeComposerInput()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth)
  }

  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }

  if (activeMessageController) {
    activeMessageController.abort()
    activeMessageController = null
  }
})

async function refreshHealth() {
  try {
    serviceStatus.value = await apiCall('/api/codex/health')
    errorMessage.value = ''
  } catch (error) {
    serviceStatus.value = null
    errorMessage.value = error.message
  }
}

async function refreshConversations() {
  loadingList.value = true

  try {
    const data = await apiCall('/api/codex/conversations')
    conversations.value = data.conversations || []

    if (activeConversationId.value) {
      const found = conversations.value.find((item) => item.id === activeConversationId.value)
      if (found) {
        await loadConversation(activeConversationId.value, { preserveDrawer: true })
      } else if (conversations.value.length) {
        await loadConversation(conversations.value[0].id, { preserveDrawer: true })
      } else {
        resetComposerState()
      }
    } else if (conversations.value.length) {
      await loadConversation(conversations.value[0].id, { preserveDrawer: true })
    } else {
      resetComposerState()
    }
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loadingList.value = false
  }
}

async function loadConversation(id, options = {}) {
  if (!id) {
    resetComposerState()
    return
  }

  loadingConversation.value = true
  activeConversationId.value = id

  try {
    const data = await apiCall(`/api/codex/conversations/${id}`)
    activeConversation.value = data.conversation
    errorMessage.value = ''

    if (!options.preserveDrawer) {
      closeDrawerOnMobile()
    }
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loadingConversation.value = false
  }
}

async function createConversation(options = {}) {
  creatingConversation.value = true

  try {
    const data = await apiCall('/api/codex/conversations', {
      method: 'POST',
      body: JSON.stringify(buildConversationPayload()),
    })

    activeConversationId.value = data.conversation.id
    activeConversation.value = data.conversation
    await refreshConversations()
    statusMessage.value = '已创建新对话'
    closeDrawerOnMobile()
    return data.conversation
  } catch (error) {
    errorMessage.value = error.message
    if (options.propagateError) {
      throw error
    }
    return null
  } finally {
    creatingConversation.value = false
  }
}

async function deleteConversation(id) {
  if (!id || deletingConversation.value) {
    return
  }

  deletingConversation.value = true

  try {
    await apiCall(`/api/codex/conversations/${id}`, {
      method: 'DELETE',
    })

    statusMessage.value = '对话已删除'

    if (activeConversationId.value === id) {
      resetComposerState()
    }

    await refreshConversations()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    deletingConversation.value = false
  }
}

async function sendMessage() {
  const content = draft.value.trim()

  if (!content || sending.value) {
    return
  }

  sending.value = true
  errorMessage.value = ''
  statusMessage.value = ''

  const optimisticUserMessage = {
    id: `temp-${Date.now()}`,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  }
  const assistantPlaceholderId = `assistant-${Date.now()}`
  const assistantPlaceholder = {
    id: assistantPlaceholderId,
    role: 'assistant',
    content: '',
    createdAt: new Date().toISOString(),
    isStreaming: true,
  }

  draft.value = ''

  try {
    if (!activeConversationId.value) {
      await createConversation({ propagateError: true })
    }

    if (!activeConversation.value) {
      activeConversation.value = {
        id: activeConversationId.value,
        title: buildConversationTitle(content),
        messages: [],
      }
    }

    activeConversation.value = {
      ...activeConversation.value,
      messages: [...(activeConversation.value.messages || []), optimisticUserMessage, assistantPlaceholder],
    }

    const response = await fetch(`${normalizedApiBase.value}/api/codex/conversations/${activeConversationId.value}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        ...buildConversationPayload(),
      }),
      signal: createStreamController(),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || `Request failed with status ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Streaming response body is unavailable')
    }

    const result = await consumeMessageStream(response.body, assistantPlaceholderId)
    activeMessageController = null

    if (result?.conversation) {
      activeConversation.value = result.conversation
      statusMessage.value = `本轮完成，用时 ${formatDuration(result.durationMs)}`
    }

    await refreshConversations()
  } catch (error) {
    activeMessageController = null
    errorMessage.value = error.message
    if (
      activeConversation.value?.messages?.some((message) => message.id === optimisticUserMessage.id) &&
      !activeConversation.value?.messages?.some((message) => message.isError)
    ) {
      activeConversation.value = {
        ...activeConversation.value,
        messages: activeConversation.value.messages.filter(
          (message) => message.id !== optimisticUserMessage.id && message.id !== assistantPlaceholderId,
        ),
      }
    }
  } finally {
    sending.value = false
  }
}

function sendSuggestion(prompt) {
  draft.value = prompt
  sendMessage()
}

function buildConversationPayload() {
  return {
    workingDirectory: workingDirectory.value.trim() || '.',
    model: model.value.trim(),
    baseUrl: baseUrl.value.trim(),
    sandboxMode: sandboxMode.value,
    approvalPolicy: approvalPolicy.value,
    networkAccessEnabled: networkAccessEnabled.value,
  }
}

function resetComposerState() {
  activeConversationId.value = ''
  activeConversation.value = null
}

function handleComposerKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function updateViewportWidth() {
  viewportWidth.value = window.innerWidth
}

function openDrawer(section) {
  drawerSection.value = section
  if (!isDesktop.value) {
    isDrawerOpen.value = true
  }
}

function closeDrawer() {
  if (!isDesktop.value) {
    isDrawerOpen.value = false
  }
}

function toggleDrawer(section) {
  if (isDesktop.value) {
    drawerSection.value = section
    return
  }

  if (drawerSection.value === section && isDrawerOpen.value) {
    isDrawerOpen.value = false
    return
  }

  drawerSection.value = section
  isDrawerOpen.value = true
}

function closeDrawerOnMobile() {
  if (!isDesktop.value) {
    isDrawerOpen.value = false
  }
}

function resizeComposerInput() {
  if (!composerInput.value) {
    return
  }

  composerInput.value.style.height = '0px'
  composerInput.value.style.height = `${Math.min(Math.max(composerInput.value.scrollHeight, 34), 180)}px`
}

function replaceAssistantDraft(messageId, content) {
  if (!activeConversation.value) {
    return
  }

  activeConversation.value = {
    ...activeConversation.value,
    messages: activeConversation.value.messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            content,
      }
        : message,
    ),
  }

  nextTick(() => {
    scrollMessagesToBottom()
  })
}

function parseMessageSegments(content) {
  const text = typeof content === 'string' ? content : ''
  const segments = []
  const regex = /```([^\n`]*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match = regex.exec(text)

  while (match) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      })
    }

    segments.push({
      type: 'code',
      language: match[1].trim(),
      content: match[2].replace(/\n$/, ''),
    })

    lastIndex = regex.lastIndex
    match = regex.exec(text)
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return segments.length ? segments : [{ type: 'text', content: text }]
}

async function copyText(content) {
  try {
    await navigator.clipboard.writeText(content)
    statusMessage.value = '代码已复制'
  } catch {
    errorMessage.value = '复制失败，请手动复制'
  }
}

function createStreamController() {
  if (activeMessageController) {
    activeMessageController.abort()
  }

  activeMessageController = new AbortController()
  return activeMessageController.signal
}

async function consumeMessageStream(stream, assistantMessageId) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalPayload = null

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() || ''

      for (const chunk of chunks) {
        const result = handleSseChunk(chunk, assistantMessageId)
        if (result?.type === 'conversation') {
          finalPayload = result.payload
        }

        if (result?.type === 'error') {
          throw new Error(result.payload.error || 'Streaming request failed')
        }
      }
    }

    if (buffer.trim()) {
      const result = handleSseChunk(buffer, assistantMessageId)
      if (result?.type === 'conversation') {
        finalPayload = result.payload
      }

      if (result?.type === 'error') {
        throw new Error(result.payload.error || 'Streaming request failed')
      }
    }

    return finalPayload
  } finally {
    reader.releaseLock()
  }
}

function handleSseChunk(chunk, assistantMessageId) {
  if (!chunk.trim()) {
    return null
  }

  let eventName = 'message'
  const dataLines = []

  for (const line of chunk.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  const payload = dataLines.length ? JSON.parse(dataLines.join('\n')) : {}

  if (eventName === 'assistant_snapshot') {
    replaceAssistantDraft(assistantMessageId, payload.content || '')
    return null
  }

  if (eventName === 'conversation') {
    activeConversation.value = payload.conversation
    return {
      type: 'conversation',
      payload,
    }
  }

  if (eventName === 'error') {
    if (payload.conversation) {
      activeConversation.value = payload.conversation
    }

    return {
      type: 'error',
      payload,
    }
  }

  return null
}

function scrollMessagesToBottom() {
  if (messageViewport.value) {
    messageViewport.value.scrollTop = messageViewport.value.scrollHeight
  }
}

function formatTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDuration(durationMs) {
  if (!durationMs && durationMs !== 0) {
    return '-'
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  return `${(durationMs / 1000).toFixed(1)}s`
}

function buildConversationTitle(content) {
  return content.replace(/\s+/g, ' ').trim().slice(0, 24) || '新对话'
}

async function apiCall(path, options = {}) {
  const response = await fetch(`${normalizedApiBase.value}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`)
  }

  return data
}

function loadStorage(key, fallbackValue) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) {
      return fallbackValue
    }

    return JSON.parse(raw)
  } catch {
    return fallbackValue
  }
}

function saveStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures in private mode.
  }
}
</script>

<template>
  <main class="page page--codex codex-page">
    <div class="codex-app">
      <div v-if="shouldShowDrawerOverlay" class="codex-overlay" @click="closeDrawer" />

      <aside class="codex-drawer" :class="{ 'is-open': shouldShowDrawer, 'is-desktop': isDesktop }">
        <div class="codex-drawer-header">
          <div>
            <p class="codex-drawer-kicker">Codex Workspace</p>
            <h2>{{ drawerSection === 'history' ? '历史对话' : '连接配置' }}</h2>
          </div>
          <button v-if="!isDesktop" type="button" class="codex-round-button" @click="closeDrawer">✕</button>
        </div>

        <div class="codex-drawer-tabs">
          <button
            type="button"
            class="codex-tab-button"
            :class="{ 'is-active': drawerSection === 'history' }"
            @click="drawerSection = 'history'"
          >
            历史
          </button>
          <button
            type="button"
            class="codex-tab-button"
            :class="{ 'is-active': drawerSection === 'settings' }"
            @click="drawerSection = 'settings'"
          >
            配置
          </button>
        </div>

        <div v-if="drawerSection === 'history'" class="codex-drawer-panel">
          <div class="codex-sidebar-card">
            <div class="codex-sidebar-row">
              <div>
                <strong>会话列表</strong>
                <p>{{ conversations.length }} 条历史记录</p>
              </div>
              <button type="button" class="codex-soft-button" :disabled="loadingList" @click="refreshConversations">
                刷新
              </button>
            </div>

            <button
              type="button"
              class="codex-primary-button codex-primary-button--full"
              :disabled="creatingConversation"
              @click="createConversation"
            >
              {{ creatingConversation ? '创建中...' : '新建对话' }}
            </button>
          </div>

          <div class="codex-history-list">
            <button
              v-for="conversation in conversations"
              :key="conversation.id"
              type="button"
              class="codex-history-card"
              :class="{ 'is-active': conversation.id === activeConversationId }"
              @click="loadConversation(conversation.id)"
            >
              <div class="codex-history-card-top">
                <strong>{{ conversation.title }}</strong>
                <span>{{ formatTime(conversation.updatedAt) }}</span>
              </div>
              <p>{{ conversation.lastMessagePreview || '还没有消息，试着发第一句。' }}</p>
              <div class="codex-history-card-bottom">
                <span>{{ conversation.messageCount }} 条消息</span>
                <span v-if="conversation.lastError" class="codex-inline-error">有错误</span>
              </div>
            </button>

            <div v-if="!conversations.length && !loadingList" class="codex-empty-card codex-empty-card--sidebar">
              <p>还没有历史对话，点上面的“新建对话”就可以开始。</p>
            </div>
          </div>
        </div>

        <div v-else class="codex-drawer-panel codex-drawer-panel--settings">
          <div class="codex-sidebar-card">
            <div class="codex-sidebar-row">
              <div>
                <strong>服务状态</strong>
                <p>{{ serviceStateText }}</p>
              </div>
              <button type="button" class="codex-soft-button" @click="refreshHealth">检查</button>
            </div>
            <p class="codex-settings-meta">当前 API: {{ normalizedApiBase }}</p>
          </div>

          <div class="codex-field-group">
            <label class="codex-field-label" for="codex-api-base">服务地址</label>
            <input id="codex-api-base" v-model="apiBase" class="codex-input" placeholder="http://127.0.0.1:3200" />
          </div>

          <div class="codex-field-group">
            <label class="codex-field-label" for="codex-working-dir">工作目录</label>
            <input id="codex-working-dir" v-model="workingDirectory" class="codex-input" placeholder="." />
          </div>

          <div class="codex-field-group">
            <label class="codex-field-label" for="codex-model">模型</label>
            <select id="codex-model" v-model="model" class="codex-select">
              <option
                v-for="option in availableModelOptions"
                :key="option.value || 'default-model'"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="codex-field-group">
            <label class="codex-field-label" for="codex-base-url">Base URL</label>
            <input id="codex-base-url" v-model="baseUrl" class="codex-input" placeholder="可选覆盖" />
          </div>

          <div class="codex-field-grid">
            <div class="codex-field-group">
              <label class="codex-field-label" for="codex-sandbox">Sandbox</label>
              <select id="codex-sandbox" v-model="sandboxMode" class="codex-select">
                <option value="read-only">read-only</option>
                <option value="workspace-write">workspace-write</option>
                <option value="danger-full-access">danger-full-access</option>
              </select>
            </div>

            <div class="codex-field-group">
              <label class="codex-field-label" for="codex-approval">Approval</label>
              <select id="codex-approval" v-model="approvalPolicy" class="codex-select">
                <option value="never">never</option>
                <option value="on-request">on-request</option>
                <option value="on-failure">on-failure</option>
                <option value="untrusted">untrusted</option>
              </select>
            </div>
          </div>

          <label class="codex-switch-row">
            <input v-model="networkAccessEnabled" type="checkbox" />
            <span>允许网络访问</span>
          </label>
        </div>

        <div class="codex-drawer-footer">
          <RouterLink to="/projects/tools" class="codex-link-chip">返回工具应用</RouterLink>
          <span class="codex-settings-meta">工作区仅允许访问当前仓库内部路径</span>
        </div>
      </aside>

      <section class="codex-stage">
        <header class="codex-topbar">
          <div class="codex-topbar-group">
            <button type="button" class="codex-round-button" @click="toggleDrawer('history')">☰</button>
            <button type="button" class="codex-pill-button codex-pill-button--brand" @click="openDrawer('history')">
              <span class="codex-pill-mark">✦</span>
              <span>Codex Chat</span>
            </button>
          </div>

          <div class="codex-topbar-group">
            <button
              type="button"
              class="codex-pill-button codex-pill-button--status"
              :class="serviceStateClass"
              @click="refreshHealth"
            >
              {{ serviceStateText }}
            </button>
            <button type="button" class="codex-round-button" @click="toggleDrawer('settings')">⚙</button>
            <button type="button" class="codex-round-button codex-round-button--dark" @click="createConversation">＋</button>
          </div>
        </header>

        <div class="codex-conversation-bar">
          <div class="codex-conversation-meta">
            <p class="codex-conversation-path">{{ activeWorkingDirectory }}</p>
            <h1>{{ activeTitle }}</h1>
            <div class="codex-context-chips">
              <span class="codex-context-chip">模型 {{ selectedModelLabel }}</span>
              <span class="codex-context-chip">Sandbox {{ sandboxMode }}</span>
              <span class="codex-context-chip">Approval {{ approvalPolicy }}</span>
            </div>
          </div>
          <button
            v-if="activeConversationId"
            type="button"
            class="codex-soft-button codex-soft-button--danger"
            :disabled="deletingConversation"
            @click="deleteConversation(activeConversationId)"
          >
            {{ deletingConversation ? '删除中...' : '删除' }}
          </button>
        </div>

        <section ref="messageViewport" class="codex-stage-scroll">
          <div v-if="!hasMessages" class="codex-welcome">
            <p class="codex-welcome-kicker">Connected to your local Codex service</p>
            <h2>有什么可以帮忙的？</h2>
            <p>让 Codex 帮你读代码、分析问题、制定计划，或者直接推动一个实现方案。</p>

            <div class="codex-suggestion-grid">
              <button
                v-for="item in SUGGESTION_PROMPTS"
                :key="item.label"
                type="button"
                class="codex-suggestion-chip"
                @click="sendSuggestion(item.prompt)"
              >
                <span class="codex-suggestion-icon">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </div>

          <div v-else class="codex-message-stack">
            <article
              v-for="message in activeMessages"
              :key="message.id"
              class="codex-message-card"
              :class="`codex-message-card--${message.role}`"
            >
              <div class="codex-message-head">
                <span class="codex-message-author">{{ message.role === 'user' ? '你' : 'Codex' }}</span>
                <time>{{ formatTime(message.createdAt) }}</time>
              </div>

              <div class="codex-message-content">
                <template
                  v-for="(segment, segmentIndex) in parseMessageSegments(message.content)"
                  :key="`${message.id}-${segmentIndex}`"
                >
                  <p v-if="segment.type === 'text'" class="codex-message-text">{{ segment.content }}</p>
                  <div v-else class="codex-code-block">
                    <div class="codex-code-block-head">
                      <span>{{ segment.language || 'code' }}</span>
                      <button type="button" class="codex-code-copy" @click="copyText(segment.content)">复制</button>
                    </div>
                    <pre><code>{{ segment.content }}</code></pre>
                  </div>
                </template>
              </div>

              <p v-if="message.usage" class="codex-message-usage">
                input {{ message.usage.input_tokens }} · cached {{ message.usage.cached_input_tokens }} · output {{ message.usage.output_tokens }}
              </p>
            </article>
          </div>

          <div v-if="sending" class="codex-thinking-row">
            <div class="codex-thinking-dots">
              <span class="codex-thinking-dot" />
              <span class="codex-thinking-dot" />
              <span class="codex-thinking-dot" />
            </div>
            <p>Codex 正在处理这条消息...</p>
          </div>
        </section>

        <div class="codex-feedback-row">
          <p v-if="statusMessage" class="codex-feedback-text codex-feedback-text--success">{{ statusMessage }}</p>
          <p v-if="loadingConversation" class="codex-feedback-text">正在加载会话...</p>
          <p v-if="errorMessage" class="codex-feedback-text codex-feedback-text--error">{{ errorMessage }}</p>
        </div>

        <form class="codex-composer" @submit.prevent="sendMessage">
          <button type="button" class="codex-composer-side" @click="createConversation">＋</button>
          <textarea
            ref="composerInput"
            v-model="draft"
            class="codex-composer-input"
            placeholder="问问 Codex：读这个项目、找问题、给方案，或者直接开始实现"
            :disabled="sending"
            rows="1"
            @keydown="handleComposerKeydown"
          />
          <button type="submit" class="codex-composer-send" :disabled="sending || !draft.trim()">
            {{ sending ? '…' : '↑' }}
          </button>
        </form>
      </section>
    </div>
  </main>
</template>
