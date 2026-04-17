<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'

const STORAGE_KEYS = {
  apiBase: 'codex-chat-api-base',
  apiKey: 'codex-chat-api-key',
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
const STREAMING_ASSISTANT_FALLBACK_PREFIX = 'stream-assistant'
const markdown = createMarkdownRenderer()

const apiBase = ref(resolveInitialApiBase())
const apiKey = ref(loadStorage(STORAGE_KEYS.apiKey, ''))
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
const isSidebarCollapsed = ref(localStorage.getItem('codex-sidebar-collapsed') === 'true')
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
const hasScrolledMessages = ref(false)
const isNearMessageBottom = ref(true)
const editingMessageId = ref('')
const editingMessageContent = ref('')
const pendingConversationIds = ref([])
const streamingAssistantIds = ref({})
const showSettings = ref(false)
const isDarkMode = ref(loadStorage('codex-dark-mode', true))

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
  [apiBase, apiKey, workingDirectory, model, baseUrl, sandboxMode, approvalPolicy, networkAccessEnabled, activeConversationId],
  () => {
    saveStorage(STORAGE_KEYS.apiBase, apiBase.value)
    saveStorage(STORAGE_KEYS.apiKey, apiKey.value)
    saveStorage(STORAGE_KEYS.workingDirectory, workingDirectory.value)
    saveStorage(STORAGE_KEYS.model, model.value)
    saveStorage(STORAGE_KEYS.baseUrl, baseUrl.value)
    saveStorage(STORAGE_KEYS.sandboxMode, sandboxMode.value)
    saveStorage(STORAGE_KEYS.approvalPolicy, approvalPolicy.value)
    saveStorage(STORAGE_KEYS.networkAccessEnabled, networkAccessEnabled.value)
    saveStorage(STORAGE_KEYS.activeConversationId, activeConversationId.value)
  },
)

watch(isDarkMode, (val) => {
  saveStorage('codex-dark-mode', val)
})

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
    apiKey: apiKey.value.trim(),
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

function toggleSidebarCollapse() {
  if (!isDesktop.value) return
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  localStorage.setItem('codex-sidebar-collapsed', isSidebarCollapsed.value ? 'true' : 'false')
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

    const data = await requestStreamingConversationReply(conversationId, content)

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

    setStreamingAssistantId(conversationId, '')

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

async function requestStreamingConversationReply(conversationId, content) {
  const response = await fetch(`${normalizedApiBase.value}/api/codex/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: buildRequestHeaders({
      Accept: 'text/event-stream',
    }),
    body: JSON.stringify({
      content,
      ...buildConversationPayload(),
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    if (data.conversation && isActiveConversation(conversationId)) {
      activeConversation.value = data.conversation
    }
    throw createApiError(response, data)
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    return requestConversationReply(conversationId, content)
  }

  let finalPayload = null
  let receivedEvent = false

  await consumeSseResponse(response.body, async ({ event, data }) => {
    receivedEvent = true

    if (event === 'assistant_start') {
      const assistantMessage = data?.message
      if (!assistantMessage?.id) {
        return
      }

      setStreamingAssistantId(conversationId, assistantMessage.id)
      upsertStreamingAssistantMessage(conversationId, assistantMessage)
      return
    }

    if (event === 'assistant_snapshot') {
      applyStreamingAssistantSnapshot(conversationId, data?.content || '')
      return
    }

    if (event === 'conversation') {
      finalPayload = data
      setStreamingAssistantId(conversationId, '')
      return
    }

    if (event === 'error') {
      setStreamingAssistantId(conversationId, '')
      if (data?.conversation && isActiveConversation(conversationId)) {
        activeConversation.value = data.conversation
      }
      throw new Error(data?.error || 'Codex request failed')
    }
  })

  if (!receivedEvent) {
    return requestConversationReply(conversationId, content)
  }

  if (!finalPayload) {
    throw new Error('流式响应提前结束，请检查远端服务或反向代理超时配置')
  }

  return finalPayload
}

async function requestConversationReply(conversationId, content) {
  const response = await fetch(`${normalizedApiBase.value}/api/codex/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: buildRequestHeaders(),
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
    throw createApiError(response, data)
  }

  return data
}

async function consumeSseResponse(body, onEvent) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
      buffer = buffer.replace(/\r\n/g, '\n')

      let boundaryIndex = buffer.indexOf('\n\n')
      while (boundaryIndex !== -1) {
        const chunk = buffer.slice(0, boundaryIndex)
        buffer = buffer.slice(boundaryIndex + 2)
        const parsed = parseSseChunk(chunk)
        if (parsed) {
          await onEvent(parsed)
        }
        boundaryIndex = buffer.indexOf('\n\n')
      }

      if (done) {
        const trailing = buffer.trim()
        if (trailing) {
          const parsed = parseSseChunk(trailing)
          if (parsed) {
            await onEvent(parsed)
          }
        }
        break
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function parseSseChunk(chunk) {
  const normalized = chunk.trim()
  if (!normalized) {
    return null
  }

  let event = 'message'
  const dataLines = []

  for (const line of normalized.split('\n')) {
    if (!line || line.startsWith(':')) {
      continue
    }

    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (!dataLines.length) {
    return null
  }

  const payloadText = dataLines.join('\n')

  try {
    return {
      event,
      data: JSON.parse(payloadText),
    }
  } catch {
    return {
      event,
      data: { text: payloadText },
    }
  }
}

function upsertStreamingAssistantMessage(conversationId, message) {
  if (!isActiveConversation(conversationId)) {
    return
  }

  const currentConversation = activeConversation.value
  if (!currentConversation || currentConversation.id !== conversationId) {
    return
  }

  const messages = currentConversation.messages || []
  const existingIndex = messages.findIndex((item) => item.id === message.id)
  const nextMessages = [...messages]

  if (existingIndex === -1) {
    nextMessages.push(message)
  } else {
    nextMessages[existingIndex] = {
      ...nextMessages[existingIndex],
      ...message,
    }
  }

  activeConversation.value = {
    ...currentConversation,
    messages: nextMessages,
  }
}

function applyStreamingAssistantSnapshot(conversationId, content) {
  if (!isActiveConversation(conversationId)) {
    return
  }

  const currentConversation = activeConversation.value
  if (!currentConversation || currentConversation.id !== conversationId) {
    return
  }

  const messages = [...(currentConversation.messages || [])]
  const streamingAssistantId = getStreamingAssistantId(conversationId)
  let messageIndex = streamingAssistantId
    ? messages.findIndex((message) => message.id === streamingAssistantId)
    : -1

  if (messageIndex === -1) {
    const fallbackMessage = {
      id: `${STREAMING_ASSISTANT_FALLBACK_PREFIX}-${Date.now()}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }
    messages.push(fallbackMessage)
    messageIndex = messages.length - 1
    setStreamingAssistantId(conversationId, fallbackMessage.id)
  }

  messages[messageIndex] = {
    ...messages[messageIndex],
    content,
  }

  activeConversation.value = {
    ...currentConversation,
    messages,
  }
}

function getStreamingAssistantId(conversationId) {
  return streamingAssistantIds.value[conversationId] || ''
}

function setStreamingAssistantId(conversationId, messageId) {
  if (!conversationId) {
    return
  }

  const next = { ...streamingAssistantIds.value }

  if (messageId) {
    next[conversationId] = messageId
  } else {
    delete next[conversationId]
  }

  streamingAssistantIds.value = next
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

function compactText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

async function apiCall(path, options = {}) {
  const response = await fetch(`${normalizedApiBase.value}${path}`, {
    headers: buildRequestHeaders(options.headers || {}),
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw createApiError(response, data)
  }

  return data
}

function createApiError(response, data = {}) {
  const message = compactText(data?.error)
  if (message) {
    return new Error(message)
  }

  if (response.status === 504) {
    return new Error('Request failed with status 504，远端网关超时，请检查反向代理超时和上游模型配置')
  }

  if (response.status === 502) {
    return new Error('Request failed with status 502，远端反向代理没有连上 codex-service')
  }

  return new Error(`Request failed with status ${response.status}`)
}

function buildRequestHeaders(extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  const normalizedApiKey = compactText(apiKey.value)
  if (normalizedApiKey) {
    headers['X-Codex-Api-Key'] = normalizedApiKey
  }

  return headers
}

function resolveInitialApiBase() {
  const fromQuery = readApiBaseFromQuery()
  if (fromQuery) {
    return fromQuery
  }

  return loadStorage(STORAGE_KEYS.apiBase, resolveDefaultApiBase())
}

function resolveDefaultApiBase() {
  const envBase = compactText(import.meta.env?.VITE_CODEX_API_BASE)
  if (envBase) {
    return envBase
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:3200'
  }

  const { protocol, hostname, origin } = window.location
  if ((protocol === 'http:' || protocol === 'https:') && hostname && !isLocalHostname(hostname)) {
    return origin
  }

  return 'http://127.0.0.1:3200'
}

function readApiBaseFromQuery() {
  if (typeof window === 'undefined') {
    return ''
  }

  return compactText(new URLSearchParams(window.location.search).get('apiBase'))
}

function isLocalHostname(hostname) {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)
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
    <div class="codex-app" :class="{ 'is-light': !isDarkMode }">
      <div v-if="shouldShowDrawerOverlay" class="codex-overlay" @click="closeDrawer" />

      <aside class="codex-drawer" :class="{ 'is-open': shouldShowDrawer, 'is-desktop': isDesktop, 'is-collapsed': isSidebarCollapsed }">
        <div class="codex-drawer-header">
          <div v-if="!isSidebarCollapsed">
            <p class="codex-drawer-kicker">Codex Workspace</p>
          </div>
          <button type="button" class="codex-round-button" @click="toggleSidebarCollapse" aria-label="折叠侧边栏">
            <svg v-if="!isSidebarCollapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
          </button>
          <button v-if="!isDesktop" type="button" class="codex-round-button" @click="closeDrawer">✕</button>
        </div>

        <div class="codex-drawer-panel">
          <button type="button" class="codex-new-chat-btn" :disabled="creatingConversation" @click="createConversation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新对话
          </button>
          <div class="codex-history-toolbar">
            <div class="codex-history-summary">
              <strong>Recents</strong>
              <span>{{ conversations.length }} 条</span>
            </div>
            <button type="button" class="codex-soft-button" :disabled="loadingList" @click="refreshConversations">
              刷新
            </button>
          </div>

          <div class="codex-history-list">
            <div
              v-for="conversation in conversations"
              :key="conversation.id"
              class="codex-history-card"
              :class="{
                'is-active': conversation.id === activeConversationId,
                'is-pending': isConversationPending(conversation.id),
              }"
            >
              <div class="codex-history-card-title-row">
                <button type="button" class="codex-history-card-btn" @click="loadConversation(conversation.id)">
                  <strong>{{ conversation.title }}</strong>
                  <span v-if="isConversationPending(conversation.id)" class="codex-history-pending">处理中</span>
                </button>
                <button
                  type="button"
                  class="codex-history-delete"
                  aria-label="删除对话"
                  title="删除对话"
                  @click.stop="deleteConversation(conversation.id)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>

            <div v-if="!conversations.length && !loadingList" class="codex-empty-card codex-empty-card--sidebar">
              <p>还没有历史对话，开始提问后会自动出现在这里。</p>
            </div>
          </div>
        </div>
      </aside>

      <section class="codex-stage">
        <header class="codex-topbar" :class="{ 'is-elevated': hasScrolledMessages }">
          <div class="codex-topbar-group">
            <button v-if="!isDesktop" type="button" class="codex-round-button" @click="toggleDrawer('history')" aria-label="打开历史对话">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <button type="button" class="codex-pill-button codex-pill-button--brand" @click="openDrawer('history')">
              <span class="codex-pill-mark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </span>
              <span>Codex</span>
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
            <button type="button" class="codex-round-button" @click="isDarkMode = !isDarkMode" :aria-label="isDarkMode ? '切换为浅色模式' : '切换为深色模式'">
              <svg v-if="isDarkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <button type="button" class="codex-round-button" @click="showSettings = true" aria-label="设置">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>
        </header>

        <section ref="messageViewport" class="codex-stage-scroll" @scroll="updateScrollIndicators">
          <div v-if="!hasMessages" class="codex-welcome">
            <h2>What can I help with?</h2>
            <!-- <p>让 Codex 帮你读代码、分析问题、制定计划，或者直接推动一个实现方案。</p> -->

            <div class="codex-context-chips codex-context-chips--center">
              <!-- <span class="codex-context-chip">目录 {{ activeWorkingDirectory }}</span> -->
              <span class="codex-context-chip">{{ selectedModelLabel }}</span>
            </div>

            <!-- <div class="codex-suggestion-grid">
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
            </div> -->
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
                <span class="codex-message-avatar">{{ message.role === 'user' ? 'U' : 'C' }}</span>
                <span class="codex-message-author">{{ message.role === 'user' ? '你' : 'Codex' }}</span>
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
            <p>Codex 正在思考...</p>
          </div>
        </section>

        <div class="codex-feedback-row">
          <p v-if="statusMessage" class="codex-feedback-text codex-feedback-text--success">{{ statusMessage }}</p>
          <p v-if="loadingConversation" class="codex-feedback-text">正在加载会话...</p>
          <p v-if="errorMessage" class="codex-feedback-text codex-feedback-text--error">{{ errorMessage }}</p>
        </div>

        <form class="codex-composer" :class="{ 'is-elevated': !isNearMessageBottom }" @submit.prevent="sendMessage">
          <button type="button" class="codex-composer-side" @click="createConversation" aria-label="新建对话">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <textarea
            ref="composerInput"
            v-model="draft"
            class="codex-composer-input"
            placeholder="发消息给 Codex..."
            :disabled="activeConversationPending"
            rows="1"
            @keydown="handleComposerKeydown"
          />
          <button type="submit" class="codex-composer-send" :disabled="activeConversationPending || !draft.trim()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </button>
        </form>
      </section>

      <!-- Settings Modal -->
      <Teleport to="body">
        <div v-if="showSettings" class="codex-modal-overlay" @click="showSettings = false">
          <div class="codex-modal" @click.stop>
            <div class="codex-modal-header">
              <h3>设置</h3>
              <button type="button" class="codex-modal-close" @click="showSettings = false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="codex-modal-body">
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

              <!-- <div class="codex-field-group">
                <label class="codex-field-label" for="codex-working-dir">工作目录</label>
                <input id="codex-working-dir" v-model="workingDirectory" class="codex-input" placeholder="." />
              </div> -->

              <div class="codex-field-group">
                <label class="codex-field-label" for="codex-api-key">CODEX_API_KEY</label>
                <input
                  id="codex-api-key"
                  v-model="apiKey"
                  type="password"
                  class="codex-input"
                  placeholder="可选覆盖服务端环境变量"
                  autocomplete="new-password"
                  spellcheck="false"
                />
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

              <!-- <label class="codex-switch-row">
                <input v-model="networkAccessEnabled" type="checkbox" />
                <span>允许网络访问</span>
              </label> -->
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </main>
</template>
