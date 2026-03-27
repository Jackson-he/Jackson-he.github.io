<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import MarkdownIt from 'markdown-it'

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
const markdown = createMarkdownRenderer()

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
const hasScrolledMessages = ref(false)
const isNearMessageBottom = ref(true)
const editingMessageId = ref('')
const editingMessageContent = ref('')
const pendingConversationIds = ref([])

const normalizedApiBase = computed(() => apiBase.value.replace(/\/+$/, ''))
const activeMessages = computed(() => activeConversation.value?.messages || [])
const activeWorkingDirectory = computed(() => activeConversation.value?.workingDirectory || workingDirectory.value || '.')
const isDesktop = computed(() => viewportWidth.value >= MOBILE_BREAKPOINT)
const shouldShowDrawer = computed(() => isDesktop.value || isDrawerOpen.value)
const shouldShowDrawerOverlay = computed(() => !isDesktop.value && isDrawerOpen.value)
const hasMessages = computed(() => activeMessages.value.length > 0)
const serviceStateText = computed(() => (serviceStatus.value?.ok ? '服务在线' : '等待连接'))
const serviceStateClass = computed(() => (serviceStatus.value?.ok ? 'is-online' : 'is-offline'))
const activeConversationPending = computed(() =>
  activeConversationId.value ? pendingConversationIds.value.includes(activeConversationId.value) : false,
)
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
    updateScrollIndicators()
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
  updateScrollIndicators()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth)
  }

  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
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
    if (options.announce !== false) {
      statusMessage.value = `已切换到「${data.conversation.title}」`
    }

    if (!options.preserveDrawer) {
      closeDrawerOnMobile()
      nextTick(() => {
        composerInput.value?.focus()
      })
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

  if (!content) {
    return
  }

  const sent = await submitMessageContent(content)
  if (sent) {
    draft.value = ''
    await nextTick()
    resizeComposerInput()
  }
}

function sendSuggestion(prompt) {
  draft.value = prompt
  sendMessage()
}

function startEditingMessage(message) {
  editingMessageId.value = message.id
  editingMessageContent.value = message.content
}

function cancelEditingMessage() {
  editingMessageId.value = ''
  editingMessageContent.value = ''
}

async function submitEditedMessage() {
  const content = editingMessageContent.value.trim()

  if (!content || activeConversationPending.value) {
    return
  }

  const sent = await submitMessageContent(content)
  if (sent) {
    cancelEditingMessage()
  }
}

function handleEditComposerKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submitEditedMessage()
  }
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
  cancelEditingMessage()
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

async function submitMessageContent(content) {
  if (!content) {
    return false
  }
  let conversationId = activeConversationId.value

  const optimisticUserMessage = {
    id: `temp-${Date.now()}`,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  }

  try {
    if (!conversationId) {
      const createdConversation = await createConversation({ propagateError: true })
      conversationId = createdConversation?.id || ''
    }

    if (!conversationId || isConversationPending(conversationId)) {
      return false
    }

    if (isActiveConversation(conversationId)) {
      errorMessage.value = ''
      statusMessage.value = ''
    }

    setConversationPending(conversationId, true)

    if (!activeConversation.value || activeConversation.value.id !== conversationId) {
      if (isActiveConversation(conversationId)) {
        activeConversation.value = {
          id: conversationId,
          title: buildConversationTitle(content),
          messages: [],
        }
      }
    } else if (!activeConversation.value) {
      activeConversation.value = {
        id: conversationId,
        title: buildConversationTitle(content),
        messages: [],
      }
    }

    if (isActiveConversation(conversationId) && activeConversation.value?.id === conversationId) {
      activeConversation.value = {
        ...activeConversation.value,
        messages: [...(activeConversation.value.messages || []), optimisticUserMessage],
      }
    }

    const response = await fetch(`${normalizedApiBase.value}/api/codex/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        ...buildConversationPayload(),
      }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (data.conversation && isActiveConversation(conversationId)) {
        activeConversation.value = data.conversation
      }
      await refreshConversations()
      throw new Error(data.error || `Request failed with status ${response.status}`)
    }

    if (isActiveConversation(conversationId)) {
      activeConversation.value = data.conversation
      statusMessage.value = `本轮完成，用时 ${formatDuration(data.durationMs)}`
      errorMessage.value = ''
    }
    await refreshConversations()
    return true
  } catch (error) {
    if (isActiveConversation(conversationId)) {
      errorMessage.value = error.message
    }

    if (
      isActiveConversation(conversationId) &&
      activeConversation.value?.messages?.some((message) => message.id === optimisticUserMessage.id)
    ) {
      activeConversation.value = {
        ...activeConversation.value,
        messages: activeConversation.value.messages.filter((message) => message.id !== optimisticUserMessage.id),
      }
    }
    return false
  } finally {
    setConversationPending(conversationId, false)
  }
}

function resizeComposerInput() {
  if (!composerInput.value) {
    return
  }

  composerInput.value.style.height = '0px'
  composerInput.value.style.height = `${Math.min(Math.max(composerInput.value.scrollHeight, 34), 180)}px`
}

async function copyText(content) {
  try {
    await navigator.clipboard.writeText(content)
    statusMessage.value = '代码已复制'
  } catch {
    errorMessage.value = '复制失败，请手动复制'
  }
}

function renderMarkdown(content) {
  return markdown.render(typeof content === 'string' ? content : '')
}

function handleMessageContentClick(event) {
  const copyButton = event.target.closest('[data-copy-code]')
  if (!copyButton) {
    return
  }

  const codeElement = copyButton.closest('.codex-code-block')?.querySelector('code')
  if (!codeElement) {
    return
  }

  copyText(codeElement.textContent || '')
}

function scrollMessagesToBottom() {
  if (messageViewport.value) {
    messageViewport.value.scrollTop = messageViewport.value.scrollHeight
    updateScrollIndicators()
  }
}

function isConversationPending(conversationId) {
  return Boolean(conversationId) && pendingConversationIds.value.includes(conversationId)
}

function setConversationPending(conversationId, isPending) {
  if (!conversationId) {
    return
  }

  const next = pendingConversationIds.value.filter((id) => id !== conversationId)
  if (isPending) {
    next.push(conversationId)
  }
  pendingConversationIds.value = next
}

function isActiveConversation(conversationId) {
  return Boolean(conversationId) && activeConversationId.value === conversationId
}

function updateScrollIndicators() {
  if (!messageViewport.value) {
    hasScrolledMessages.value = false
    isNearMessageBottom.value = true
    return
  }

  const viewport = messageViewport.value
  const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight

  hasScrolledMessages.value = viewport.scrollTop > 8
  isNearMessageBottom.value = distanceFromBottom < 24
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

function createMarkdownRenderer() {
  const instance = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
  })

  const defaultLinkOpen =
    instance.renderer.rules.link_open ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))

  instance.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
    return defaultLinkOpen(tokens, idx, options, env, self)
  }

  instance.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    const language = token.info.trim().split(/\s+/)[0] || 'code'
    const escapedLanguage = instance.utils.escapeHtml(language)
    const escapedCode = instance.utils.escapeHtml(token.content.replace(/\n$/, ''))

    return `
<div class="codex-code-block">
  <div class="codex-code-block-head">
    <span>${escapedLanguage}</span>
    <button type="button" class="codex-code-copy" data-copy-code="true">复制</button>
  </div>
  <pre><code class="language-${escapedLanguage}">${escapedCode}</code></pre>
</div>`
  }

  return instance
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
          <div class="codex-history-toolbar">
            <div class="codex-history-summary">
              <strong>会话列表</strong>
              <span>{{ conversations.length }} 条</span>
            </div>
            <button type="button" class="codex-soft-button" :disabled="loadingList" @click="refreshConversations">
              刷新
            </button>
          </div>

          <div class="codex-history-list">
            <button
              v-for="conversation in conversations"
              :key="conversation.id"
              type="button"
              class="codex-history-card"
              :class="{
                'is-active': conversation.id === activeConversationId,
                'is-pending': isConversationPending(conversation.id),
              }"
              @click="loadConversation(conversation.id)"
            >
              <div class="codex-history-card-title-row">
                <strong>{{ conversation.title }}</strong>
                <span v-if="isConversationPending(conversation.id)" class="codex-history-pending">处理中</span>
                <button
                  type="button"
                  class="codex-history-delete"
                  aria-label="删除对话"
                  title="删除对话"
                  :disabled="deletingConversation"
                  @click.stop="deleteConversation(conversation.id)"
                >
                  <span aria-hidden="true">🗑</span>
                </button>
              </div>
            </button>

            <div v-if="!conversations.length && !loadingList" class="codex-empty-card codex-empty-card--sidebar">
              <p>还没有历史对话，开始提问后会自动出现在这里。</p>
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
      </aside>

      <section class="codex-stage">
        <header class="codex-topbar" :class="{ 'is-elevated': hasScrolledMessages }">
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

        <section ref="messageViewport" class="codex-stage-scroll" @scroll="updateScrollIndicators">
          <div v-if="!hasMessages" class="codex-welcome">
            <p class="codex-welcome-kicker">Connected to your local Codex service</p>
            <h2>有什么可以帮忙的？</h2>
            <p>让 Codex 帮你读代码、分析问题、制定计划，或者直接推动一个实现方案。</p>

            <div class="codex-context-chips codex-context-chips--center">
              <span class="codex-context-chip">{{ activeWorkingDirectory }}</span>
              <span class="codex-context-chip">模型 {{ selectedModelLabel }}</span>
              <span class="codex-context-chip">Sandbox {{ sandboxMode }}</span>
            </div>

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
              :class="[
                `codex-message-card--${message.role}`,
                { 'is-editing': editingMessageId === message.id },
              ]"
            >
              <div class="codex-message-head">
                <span class="codex-message-author">{{ message.role === 'user' ? '你' : 'Codex' }}</span>
                <time>{{ formatTime(message.createdAt) }}</time>
              </div>

              <template v-if="message.role === 'user' && editingMessageId === message.id">
                <div class="codex-message-edit-wrap">
                  <textarea
                    v-model="editingMessageContent"
                    class="codex-message-edit-input"
                    rows="4"
                    :disabled="activeConversationPending"
                    @keydown="handleEditComposerKeydown"
                  />
                  <div class="codex-message-edit-footer">
                    <span>编辑后将作为新消息发送</span>
                    <div class="codex-message-edit-actions">
                      <button type="button" class="codex-message-inline-button" @click="cancelEditingMessage">取消</button>
                      <button
                        type="button"
                        class="codex-message-inline-button codex-message-inline-button--primary"
                        :disabled="activeConversationPending || !editingMessageContent.trim()"
                        @click="submitEditedMessage"
                      >
                        {{ activeConversationPending ? '发送中...' : '发送' }}
                      </button>
                    </div>
                  </div>
                </div>
              </template>
              <div
                v-else
                class="codex-message-content codex-markdown"
                v-html="renderMarkdown(message.content)"
                @click="handleMessageContentClick"
              />

              <p v-if="message.usage" class="codex-message-usage">
                input {{ message.usage.input_tokens }} · cached {{ message.usage.cached_input_tokens }} · output {{ message.usage.output_tokens }}
              </p>

              <div v-if="message.role === 'user' && editingMessageId !== message.id" class="codex-message-actions">
                <button
                  type="button"
                  class="codex-message-edit-button"
                  aria-label="编辑消息"
                  title="编辑消息"
                  @click="startEditingMessage(message)"
                >
                  <span aria-hidden="true">✎</span>
                </button>
              </div>
            </article>
          </div>

          <div v-if="activeConversationPending" class="codex-thinking-row">
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

        <form class="codex-composer" :class="{ 'is-elevated': !isNearMessageBottom }" @submit.prevent="sendMessage">
          <button type="button" class="codex-composer-side" @click="createConversation">＋</button>
          <textarea
            ref="composerInput"
            v-model="draft"
            class="codex-composer-input"
            placeholder="问问 Codex：读这个项目、找问题、给方案，或者直接开始实现"
            :disabled="activeConversationPending"
            rows="1"
            @keydown="handleComposerKeydown"
          />
          <button type="submit" class="codex-composer-send" :disabled="activeConversationPending || !draft.trim()">
            {{ activeConversationPending ? '…' : '↑' }}
          </button>
        </form>
      </section>
    </div>
  </main>
</template>
