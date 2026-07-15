<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

 
const API_BASE = (window.location.href.indexOf('localhost') === -1 ? 'https://www.person-common.top/api/fuji-print' : 'http://127.0.0.1:3312/api/fuji-print').replace(/\/$/, '')
const AUTH_TOKEN_KEY = 'fuji-print-auth-token'

const PRINT_SPEC = {
  paperWidthMm: 100,
  paperHeightMm: 180,
  printWidthMm: 100,
  printHeightMm: 148,
  dpi: 300,
  pixelWidth: 1181,
  pixelHeight: 1748,
}

function makeGridCells(columns, rows) {
  const cells = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cells.push({
        x: column / columns,
        y: row / rows,
        w: 1 / columns,
        h: 1 / rows,
      })
    }
  }
  return cells
}

function makeCell(x, y, w, h, sourceIndex = null) {
  const cell = { x, y, w, h }
  if (Number.isInteger(sourceIndex)) {
    cell.sourceIndex = sourceIndex
  }
  return cell
}

function makeCenteredPhotoCell(widthMm, heightMm) {
  return makeCell(
    (PRINT_SPEC.printWidthMm - widthMm) / (PRINT_SPEC.printWidthMm * 2),
    (PRINT_SPEC.printHeightMm - heightMm) / (PRINT_SPEC.printHeightMm * 2),
    widthMm / PRINT_SPEC.printWidthMm,
    heightMm / PRINT_SPEC.printHeightMm,
  )
}

function makeLifeFourCells() {
  const marginX = 0.055
  const columnGap = 0.05
  const columnWidth = (1 - marginX * 2 - columnGap) / 2
  const marginY = 0.035
  const rowGap = 0.012
  const rowHeight = (1 - marginY * 2 - rowGap * 3) / 4
  const cells = []

  for (let row = 0; row < 4; row += 1) {
    const y = marginY + row * (rowHeight + rowGap)
    cells.push(makeCell(marginX, y, columnWidth, rowHeight, row))
    cells.push(makeCell(marginX + columnWidth + columnGap, y, columnWidth, rowHeight, row))
  }
  return cells
}

function getCellSourceIndex(cell, index) {
  return Number.isInteger(cell.sourceIndex) ? cell.sourceIndex : index
}

function getTemplateSlotCount(template) {
  return template.cells.reduce((count, cell, index) => {
    return Math.max(count, getCellSourceIndex(cell, index) + 1)
  }, 0)
}

const layoutTemplates = [
  {
    id: 'official-3inch',
    category: '尺寸',
    name: '3寸',
    shortName: '3寸',
    cells: [makeCenteredPhotoCell(55, 84)],
  },
  {
    id: 'official-4inch',
    category: '尺寸',
    name: '4寸',
    shortName: '4寸',
    cells: [makeCenteredPhotoCell(76, 102)],
  },
  {
    id: 'single-full',
    category: '尺寸',
    name: '5寸',
    shortName: '5寸',
    cells: [makeCenteredPhotoCell(89, 127)],
  },
  {
    id: 'life-four-strip',
    category: '人生四格',
    name: '人生四格',
    shortName: '四格',
    cells: makeLifeFourCells(),
  },
  {
    id: 'double-stack',
    category: '二拼',
    name: '上下二拼',
    shortName: '2-1',
    cells: makeGridCells(1, 2),
  },
  {
    id: 'double-side',
    category: '二拼',
    name: '左右二拼',
    shortName: '2-2',
    cells: makeGridCells(2, 1),
  },
  {
    id: 'three-poster',
    category: '三拼',
    name: '上大下二',
    shortName: '3-1',
    cells: [
      makeCell(0, 0, 1, 0.5),
      makeCell(0, 0.5, 0.5, 0.5),
      makeCell(0.5, 0.5, 0.5, 0.5),
    ],
  },
  {
    id: 'three-left-main',
    category: '三拼',
    name: '左大右二',
    shortName: '3-2',
    cells: [
      makeCell(0, 0, 0.5, 1),
      makeCell(0.5, 0, 0.5, 0.5),
      makeCell(0.5, 0.5, 0.5, 0.5),
    ],
  },
  {
    id: 'three-stack',
    category: '三拼',
    name: '三横排',
    shortName: '3-3',
    cells: makeGridCells(1, 3),
  },
  {
    id: 'three-columns',
    category: '三拼',
    name: '三竖排',
    shortName: '3-4',
    cells: makeGridCells(3, 1),
  },
  {
    id: 'four-grid',
    category: '四拼',
    name: '四宫格',
    shortName: '4-1',
    cells: makeGridCells(2, 2),
  },
  {
    id: 'four-left-main',
    category: '四拼',
    name: '左大右三',
    shortName: '4-2',
    cells: [
      makeCell(0, 0, 0.5, 1),
      makeCell(0.5, 0, 0.5, 1 / 3),
      makeCell(0.5, 1 / 3, 0.5, 1 / 3),
      makeCell(0.5, 2 / 3, 0.5, 1 / 3),
    ],
  },
  {
    id: 'four-mosaic',
    category: '四拼',
    name: '错落四拼',
    shortName: '4-3',
    cells: [
      makeCell(0, 0, 0.42, 0.42),
      makeCell(0.42, 0, 0.58, 0.42),
      makeCell(0, 0.42, 0.58, 0.58),
      makeCell(0.58, 0.42, 0.42, 0.58),
    ],
  },
  {
    id: 'five-left-two-right-three',
    category: '五拼',
    name: '左二右三',
    shortName: '5-1',
    cells: [
      makeCell(0, 0, 0.5, 0.5),
      makeCell(0, 0.5, 0.5, 0.5),
      makeCell(0.5, 0, 0.5, 1 / 3),
      makeCell(0.5, 1 / 3, 0.5, 1 / 3),
      makeCell(0.5, 2 / 3, 0.5, 1 / 3),
    ],
  },
  {
    id: 'five-left-three-right-two',
    category: '五拼',
    name: '左三右二',
    shortName: '5-2',
    cells: [
      makeCell(0, 0, 0.5, 1 / 3),
      makeCell(0, 1 / 3, 0.5, 1 / 3),
      makeCell(0, 2 / 3, 0.5, 1 / 3),
      makeCell(0.5, 0, 0.5, 0.5),
      makeCell(0.5, 0.5, 0.5, 0.5),
    ],
  },
  {
    id: 'five-top-two-bottom-three',
    category: '五拼',
    name: '上二下三',
    shortName: '5-3',
    cells: [
      makeCell(0, 0, 0.5, 0.5),
      makeCell(0.5, 0, 0.5, 0.5),
      makeCell(0, 0.5, 1 / 3, 0.5),
      makeCell(1 / 3, 0.5, 1 / 3, 0.5),
      makeCell(2 / 3, 0.5, 1 / 3, 0.5),
    ],
  },
  {
    id: 'five-top-three-bottom-two',
    category: '五拼',
    name: '上三下二',
    shortName: '5-4',
    cells: [
      makeCell(0, 0, 1 / 3, 0.5),
      makeCell(1 / 3, 0, 1 / 3, 0.5),
      makeCell(2 / 3, 0, 1 / 3, 0.5),
      makeCell(0, 0.5, 0.5, 0.5),
      makeCell(0.5, 0.5, 0.5, 0.5),
    ],
  },
  {
    id: 'six-grid',
    category: '六拼',
    name: '六宫格',
    shortName: '6-1',
    cells: makeGridCells(2, 3),
  },
  {
    id: 'six-left-main',
    category: '六拼',
    name: '左大右五',
    shortName: '6-2',
    cells: [
      makeCell(0, 0, 0.48, 1),
      makeCell(0.48, 0, 0.52, 0.2),
      makeCell(0.48, 0.2, 0.52, 0.2),
      makeCell(0.48, 0.4, 0.52, 0.2),
      makeCell(0.48, 0.6, 0.52, 0.2),
      makeCell(0.48, 0.8, 0.52, 0.2),
    ],
  },
  {
    id: 'six-three-columns',
    category: '六拼',
    name: '三列二行',
    shortName: '6-3',
    cells: makeGridCells(3, 2),
  },
  {
    id: 'six-top-two-bottom-four',
    category: '六拼',
    name: '上二下四',
    shortName: '6-4',
    cells: [
      makeCell(0, 0, 0.5, 0.5),
      makeCell(0.5, 0, 0.5, 0.5),
      makeCell(0, 0.5, 0.25, 0.5),
      makeCell(0.25, 0.5, 0.25, 0.5),
      makeCell(0.5, 0.5, 0.25, 0.5),
      makeCell(0.75, 0.5, 0.25, 0.5),
    ],
  },
  {
    id: 'seven-top-main',
    category: '七拼',
    name: '上大下六',
    shortName: '7-1',
    cells: [
      makeCell(0, 0, 1, 0.28),
      ...makeGridCells(2, 3).map((cell) => makeCell(cell.x, 0.28 + cell.y * 0.72, cell.w, cell.h * 0.72)),
    ],
  },
  {
    id: 'seven-left-main',
    category: '七拼',
    name: '左大右六',
    shortName: '7-2',
    cells: [
      makeCell(0, 0, 0.32, 1),
      ...makeGridCells(2, 3).map((cell) => makeCell(0.32 + cell.x * 0.68, cell.y, cell.w * 0.68, cell.h)),
    ],
  },
  {
    id: 'seven-right-main',
    category: '七拼',
    name: '右大左六',
    shortName: '7-3',
    cells: [
      ...makeGridCells(2, 3).map((cell) => makeCell(cell.x * 0.68, cell.y, cell.w * 0.68, cell.h)),
      makeCell(0.68, 0, 0.32, 1),
    ],
  },
  {
    id: 'seven-top-three-bottom-four',
    category: '七拼',
    name: '上三下四',
    shortName: '7-4',
    cells: [
      ...makeGridCells(3, 1).map((cell) => makeCell(cell.x, 0, cell.w, 0.42)),
      ...makeGridCells(2, 2).map((cell) => makeCell(cell.x, 0.42 + cell.y * 0.58, cell.w, cell.h * 0.58)),
    ],
  },
  {
    id: 'seven-left-three-right-four',
    category: '七拼',
    name: '左三右四',
    shortName: '7-5',
    cells: [
      ...makeGridCells(1, 3).map((cell) => makeCell(0, cell.y, 0.34, cell.h)),
      ...makeGridCells(2, 2).map((cell) => makeCell(0.34 + cell.x * 0.66, cell.y, cell.w * 0.66, cell.h)),
    ],
  },
  {
    id: 'seven-mosaic',
    category: '七拼',
    name: '错落七拼',
    shortName: '7-6',
    cells: [
      makeCell(0, 0, 0.42, 0.34),
      makeCell(0.42, 0, 0.28, 0.34),
      makeCell(0.7, 0, 0.3, 0.34),
      makeCell(0, 0.34, 0.33, 0.33),
      makeCell(0.33, 0.34, 0.34, 0.33),
      makeCell(0.67, 0.34, 0.33, 0.33),
      makeCell(0, 0.67, 1, 0.33),
    ],
  },
  {
    id: 'eight-grid',
    category: '八拼',
    name: '八格竖排',
    shortName: '8-1',
    cells: makeGridCells(2, 4),
  },
  {
    id: 'eight-top-four-bottom-four',
    category: '八拼',
    name: '四列二行',
    shortName: '8-2',
    cells: makeGridCells(4, 2),
  },
  {
    id: 'eight-mosaic',
    category: '八拼',
    name: '错落八拼',
    shortName: '8-3',
    cells: [
      makeCell(0, 0, 0.5, 0.25),
      makeCell(0.5, 0, 0.5, 0.25),
      makeCell(0, 0.25, 0.33, 0.25),
      makeCell(0.33, 0.25, 0.34, 0.25),
      makeCell(0.67, 0.25, 0.33, 0.25),
      makeCell(0, 0.5, 0.5, 0.25),
      makeCell(0.5, 0.5, 0.5, 0.25),
      makeCell(0, 0.75, 1, 0.25),
    ],
  },
  {
    id: 'eight-four-columns',
    category: '八拼',
    name: '四竖条',
    shortName: '8-4',
    cells: [
      ...makeGridCells(4, 1).map((cell) => makeCell(cell.x, 0, cell.w, 0.5)),
      ...makeGridCells(4, 1).map((cell) => makeCell(cell.x, 0.5, cell.w, 0.5)),
    ],
  },
  {
    id: 'eight-left-three-right-five',
    category: '八拼',
    name: '左三右五',
    shortName: '8-5',
    cells: [
      ...makeGridCells(1, 3).map((cell) => makeCell(0, cell.y, 0.44, cell.h)),
      ...makeGridCells(1, 5).map((cell) => makeCell(0.44, cell.y, 0.56, cell.h)),
    ],
  },
  {
    id: 'nine-grid',
    category: '九拼',
    name: '九宫格',
    shortName: '9-1',
    cells: makeGridCells(3, 3),
  },
  {
    id: 'nine-top-three-bottom-six',
    category: '九拼',
    name: '上三下六',
    shortName: '9-2',
    cells: [
      ...makeGridCells(3, 1).map((cell) => makeCell(cell.x, 0, cell.w, 0.34)),
      ...makeGridCells(3, 2).map((cell) => makeCell(cell.x, 0.34 + cell.y * 0.66, cell.w, cell.h * 0.66)),
    ],
  },
  {
    id: 'nine-center-main',
    category: '九拼',
    name: '中心大图',
    shortName: '9-3',
    cells: [
      makeCell(0, 0, 0.25, 0.25),
      makeCell(0.25, 0, 0.5, 0.25),
      makeCell(0.75, 0, 0.25, 0.25),
      makeCell(0, 0.25, 0.25, 0.5),
      makeCell(0.25, 0.25, 0.5, 0.5),
      makeCell(0.75, 0.25, 0.25, 0.5),
      makeCell(0, 0.75, 0.25, 0.25),
      makeCell(0.25, 0.75, 0.5, 0.25),
      makeCell(0.75, 0.75, 0.25, 0.25),
    ],
  },
  {
    id: 'nine-top-four-bottom-five',
    category: '九拼',
    name: '上四下五',
    shortName: '9-4',
    cells: [
      ...makeGridCells(4, 1).map((cell) => makeCell(cell.x, 0, cell.w, 0.45)),
      ...makeGridCells(5, 1).map((cell) => makeCell(cell.x, 0.45, cell.w, 0.55)),
    ],
  },
]

const fileInput = ref(null)
const photos = ref([])
const selectedPhotoIds = ref([])
const slotPhotoIds = ref([])
const slotTransforms = ref([])
const activeTemplateId = ref('four-grid')
const activeSlotIndex = ref(0)
const dragState = ref(null)
const activeView = ref('library')
const isExporting = ref(false)
const isSavingLayout = ref(false)
const isUnlocked = ref(false)
const isAuthenticating = ref(false)
const authPassword = ref('')
const authState = ref('请输入访问密码')
const authToken = ref('')
const saveState = ref('待保存')
const libraryState = ref('加载素材库')
const layoutWallState = ref('加载排版')
const searchText = ref('')
const savedLayouts = ref([])
const wallDragPhotoId = ref('')
const wallDropPhotoId = ref('')
const suppressNextTileClick = ref(false)
const wallPointerDrag = ref(null)
const deletingPhotoIds = ref(new Set())
const deletingLayoutIds = ref(new Set())
const uploadQueue = ref([])
const activeUploadCount = ref(0)

const PHOTO_ORDER_KEY = 'fuji-print-photo-order'
const MAX_UPLOAD_CONCURRENCY = 2
const UPLOAD_RETRY_LIMIT = 2
const UPLOAD_TIMEOUT_MS = 120000
const UPLOAD_CHUNK_BYTES = 768 * 1024

const activeTemplate = computed(() => {
  return layoutTemplates.find((template) => template.id === activeTemplateId.value) || layoutTemplates[0]
})

const activeTemplateSlotCount = computed(() => getTemplateSlotCount(activeTemplate.value))

const layoutTemplateGroups = computed(() => {
  const groups = []
  for (const template of layoutTemplates) {
    let group = groups.find((item) => item.name === template.category)
    if (!group) {
      group = { name: template.category, templates: [] }
      groups.push(group)
    }
    group.templates.push(template)
  }
  return groups
})

const selectedPhotos = computed(() => {
  return selectedPhotoIds.value
    .map((id) => photos.value.find((photo) => photo.id === id))
    .filter(Boolean)
})

const displayedPhotos = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) {
    return photos.value
  }
  return photos.value.filter((photo) => photo.name.toLowerCase().includes(keyword))
})

const activeSlotPhoto = computed(() => getCellPhoto(activeSlotIndex.value))
const activeSlotTransform = computed(() => slotTransforms.value[activeSlotIndex.value] || null)
const filledSlotCount = computed(() => {
  const filledSourceIndexes = new Set()
  for (const [index, cell] of activeTemplate.value.cells.entries()) {
    if (slotPhotoIds.value[index]) {
      filledSourceIndexes.add(getCellSourceIndex(cell, index))
    }
  }
  return filledSourceIndexes.size
})
const pageTitle = computed(() => {
  if (activeView.value === 'library') {
    return '照片素材库'
  }
  if (activeView.value === 'layout-wall') {
    return '排版墙'
  }
  return '排版预览'
})
const printSummary = computed(() => {
  return `${PRINT_SPEC.printWidthMm}×${PRINT_SPEC.printHeightMm}mm · ${PRINT_SPEC.dpi}dpi · ${PRINT_SPEC.pixelWidth}×${PRINT_SPEC.pixelHeight}px`
})
const uploadQueueSummary = computed(() => {
  if (!activeUploadCount.value && !uploadQueue.value.length) {
    return ''
  }

  return `上传中 ${activeUploadCount.value} · 等待 ${uploadQueue.value.length}`
})

watch([activeTemplateId, selectedPhotoIds], () => {
  syncSlots()
}, { deep: true })

onMounted(() => {
  const savedToken = sessionStorage.getItem(AUTH_TOKEN_KEY)
  if (savedToken) {
    unlockWithToken(savedToken)
  }
})

onBeforeUnmount(() => {
  photos.value.forEach((photo) => {
    if (photo.objectUrl) {
      URL.revokeObjectURL(photo.objectUrl)
    }
  })
})

function loadSavedLayouts() {
  try {
    return JSON.parse(localStorage.getItem('fuji-print-layouts') || '[]')
  } catch {
    return []
  }
}

function persistSavedLayouts() {
  try {
    localStorage.setItem('fuji-print-layouts', JSON.stringify(savedLayouts.value.slice(0, 8)))
  } catch {
    savedLayouts.value = savedLayouts.value.slice(0, 3)
    localStorage.setItem('fuji-print-layouts', JSON.stringify(savedLayouts.value))
  }
}

async function loginWithPassword() {
  if (isAuthenticating.value) {
    return
  }

  const password = authPassword.value.trim()
  if (!password) {
    authState.value = '请输入访问密码'
    return
  }

  isAuthenticating.value = true
  authState.value = '验证中'
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!response.ok) {
      throw new Error('invalid password')
    }

    const payload = await response.json()
    if (!payload.token) {
      throw new Error('empty token')
    }

    sessionStorage.setItem(AUTH_TOKEN_KEY, payload.token)
    unlockWithToken(payload.token)
  } catch {
    authState.value = '密码错误或服务不可用'
  } finally {
    isAuthenticating.value = false
  }
}

function unlockWithToken(token) {
  authToken.value = token
  isUnlocked.value = true
  authPassword.value = ''
  authState.value = '已解锁'
  savedLayouts.value = loadSavedLayouts()
  syncSlots()
  loadRemotePhotos()
  loadRemoteLayouts()
}

function authHeaders(extraHeaders = {}) {
  return {
    ...extraHeaders,
    Authorization: `Bearer ${authToken.value}`,
  }
}

function fetchWithAuth(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: authHeaders(options.headers || {}),
  })
}

function withAccessToken(url) {
  if (!authToken.value || !url || /^blob:/i.test(url)) {
    return url
  }

  try {
    const parsedUrl = new URL(url, window.location.href)
    parsedUrl.searchParams.set('access_token', authToken.value)
    return parsedUrl.toString()
  } catch {
    return url
  }
}

function stripAccessToken(url) {
  if (!url || /^blob:/i.test(url)) {
    return url
  }

  try {
    const parsedUrl = new URL(url, window.location.href)
    parsedUrl.searchParams.delete('access_token')
    return parsedUrl.toString()
  } catch {
    return url
  }
}

function normalizeLayoutRecord(layout) {
  const savedAt = layout.savedAt || layout.createdAt || ''
  return {
    ...layout,
    id: layout.id || crypto.randomUUID(),
    name: layout.name || `${layout.templateName || '排版'} · ${formatLayoutTime({ savedAt })}`,
    templateName: layout.templateName || '排版',
    thumbnailDataUrl: layout.thumbnailDataUrl || '',
    savedAt,
    createdAt: layout.createdAt || savedAt,
  }
}

function mergeLayouts(primaryLayouts, fallbackLayouts = []) {
  const layoutMap = new Map()
  for (const layout of fallbackLayouts.map(normalizeLayoutRecord)) {
    layoutMap.set(layout.id, layout)
  }
  for (const layout of primaryLayouts.map(normalizeLayoutRecord)) {
    layoutMap.set(layout.id, { ...(layoutMap.get(layout.id) || {}), ...layout })
  }

  return Array.from(layoutMap.values()).sort((left, right) => {
    return String(right.savedAt || right.createdAt).localeCompare(String(left.savedAt || left.createdAt))
  })
}

function upsertSavedLayout(layout) {
  savedLayouts.value = mergeLayouts([layout], savedLayouts.value)
  layoutWallState.value = `${savedLayouts.value.length} 个排版`
  persistSavedLayouts()
}

function absoluteBackendUrl(path) {
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return withAccessToken(path)
  }
  if (path.startsWith('/uploads/')) {
    return withAccessToken(`${API_BASE}/files/${path.split('/').pop()}`)
  }
  return withAccessToken(new URL(path, `${API_BASE}/`).toString())
}

async function loadRemotePhotos() {
  libraryState.value = '加载素材库'
  try {
    const response = await fetchWithAuth(`${API_BASE}/uploads`, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('load failed')
    }

    const payload = await response.json()
    const remotePhotos = (payload.files || []).map(mapUploadedFile)
    const localOnlyPhotos = photos.value.filter((photo) => photo.objectUrl && !photo.serverId)

    photos.value = applySavedPhotoOrder([...localOnlyPhotos, ...remotePhotos])
    photos.value.forEach(loadImageSize)
    selectedPhotoIds.value = selectedPhotoIds.value.filter((id) => {
      return photos.value.some((photo) => photo.id === id)
    })
    syncSelectionOrderWithWall()
    libraryState.value = `${photos.value.length} 张素材`
  } catch {
    libraryState.value = photos.value.length ? `${photos.value.length} 张本地素材` : '素材库离线'
  }
}

async function loadRemoteLayouts() {
  layoutWallState.value = '加载排版'
  try {
    const response = await fetchWithAuth(`${API_BASE}/layouts`, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('load layouts failed')
    }

    const payload = await response.json()
    const remoteLayouts = (payload.layouts || []).map(normalizeLayoutRecord)
    savedLayouts.value = mergeLayouts(remoteLayouts, savedLayouts.value)
    layoutWallState.value = savedLayouts.value.length ? `${savedLayouts.value.length} 个排版` : '暂无排版'
  } catch {
    layoutWallState.value = savedLayouts.value.length ? `${savedLayouts.value.length} 个本机草稿` : '排版墙离线'
  }
}

async function fetchLayoutDetail(layout) {
  if (layout.photos && layout.templateId) {
    return layout
  }

  const response = await fetchWithAuth(`${API_BASE}/layouts/${encodeURIComponent(layout.id)}`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('layout not found')
  }

  const payload = await response.json()
  return normalizeLayoutRecord(payload.layout || layout)
}

function mapUploadedFile(file) {
  return {
    id: file.id,
    serverId: file.id,
    name: decodeMaybeUtf8Mojibake(file.originalName || file.filename || 'image'),
    size: file.size || 0,
    type: file.mimeType || 'image/*',
    url: absoluteBackendUrl(file.url),
    objectUrl: '',
      width: 0,
      height: 0,
      status: '已上传',
      uploadProgress: null,
      uploadedAt: file.uploadedAt || '',
    }
}

function decodeMaybeUtf8Mojibake(value) {
  if (!value || !/[^\x20-\x7e]/.test(value)) {
    return value
  }

  const chars = Array.from(value)
  if (chars.some((char) => char.charCodeAt(0) > 255)) {
    return value
  }

  try {
    const bytes = Uint8Array.from(chars, (char) => char.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return value
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileChange(event) {
  await addFiles(Array.from(event.target.files || []))
  event.target.value = ''
}

async function handleDrop(event) {
  await addFiles(Array.from(event.dataTransfer.files || []))
}

async function addFiles(files) {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  if (!imageFiles.length) {
    return
  }

  for (const file of imageFiles) {
    const photo = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      objectUrl: '',
      width: 0,
      height: 0,
      status: '本地预览',
      uploadProgress: 0,
      uploadedAt: new Date().toISOString(),
    }
    photo.objectUrl = photo.url

    photos.value = [photo, ...photos.value]
    loadImageSize(photo)
    enqueueUpload(photo, file)
  }
  libraryState.value = `${photos.value.length} 张素材`
  persistPhotoOrder()
}

function loadImageSize(photo) {
  if (!photo.url || (photo.width && photo.height)) {
    return
  }

  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.onload = () => {
    photo.width = image.naturalWidth
    photo.height = image.naturalHeight
  }
  image.src = photo.url
}

function enqueueUpload(photo, file) {
  photo.status = '等待上传'
  setUploadProgress(photo, 0)
  uploadQueue.value.push({ photo, file, attempt: 0 })
  processUploadQueue()
}

function processUploadQueue() {
  while (activeUploadCount.value < MAX_UPLOAD_CONCURRENCY && uploadQueue.value.length) {
    const job = uploadQueue.value.shift()
    activeUploadCount.value += 1
    runUploadJob(job).finally(() => {
      activeUploadCount.value -= 1
      processUploadQueue()
    })
  }
}

async function runUploadJob(job) {
  const { photo, file, attempt } = job
  if (!photos.value.includes(photo)) {
    return
  }

  try {
    photo.status = attempt ? `重试上传 ${attempt}/${UPLOAD_RETRY_LIMIT}` : '准备上传'
    setUploadProgress(photo, 0)
    await uploadPhoto(photo, file, attempt)
  } catch (error) {
    if (attempt < UPLOAD_RETRY_LIMIT && photos.value.includes(photo)) {
      photo.status = `等待重试 ${attempt + 1}/${UPLOAD_RETRY_LIMIT}`
      setUploadProgress(photo, 0)
      await sleep(900 * (attempt + 1))
      await runUploadJob({ photo, file, attempt: attempt + 1 })
      return
    }

    photo.status = getUploadErrorMessage(error)
    photo.uploadProgress = null
  }
}

async function uploadPhoto(photo, file, attempt) {
  if (file.size > UPLOAD_CHUNK_BYTES) {
    await uploadChunkedPhoto(photo, file, attempt)
    return
  }

  await uploadDirectPhoto(photo, file, attempt)
}

async function uploadDirectPhoto(photo, file, attempt) {
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('originalName', file.name)

  photo.status = attempt ? `上传中 · 第 ${attempt + 1} 次` : '上传中'
  const payload = await uploadFormData(`${API_BASE}/uploads`, formData, (loaded, total) => {
    if (total) {
      setUploadProgress(photo, (loaded / total) * 100)
    }
  })

  const uploaded = payload.files?.[0]
  if (!uploaded) {
    throw new Error('empty upload response')
  }

  applyUploadedPhoto(photo, uploaded)
}

async function uploadChunkedPhoto(photo, file, attempt) {
  const uploadId = crypto.randomUUID()
  const totalChunks = Math.ceil(file.size / UPLOAD_CHUNK_BYTES)
  let uploaded = null

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * UPLOAD_CHUNK_BYTES
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, file.size)
    const chunk = file.slice(start, end, file.type || 'application/octet-stream')
    const formData = new FormData()
    formData.append('uploadId', uploadId)
    formData.append('chunkIndex', String(index))
    formData.append('totalChunks', String(totalChunks))
    formData.append('originalName', file.name)
    formData.append('mimeType', file.type || 'application/octet-stream')
    formData.append('chunk', chunk, `${file.name}.part-${index}`)

    const baseLoaded = start
    photo.status = attempt ? `分片上传 · 第 ${attempt + 1} 次` : '分片上传'
    const payload = await uploadFormData(`${API_BASE}/uploads/chunks`, formData, (loaded) => {
      setUploadProgress(photo, ((baseLoaded + loaded) / file.size) * 100)
    })

    if (payload.complete) {
      uploaded = payload.files?.[0]
    }
  }

  if (!uploaded) {
    throw new Error('empty upload response')
  }

  applyUploadedPhoto(photo, uploaded)
}

function applyUploadedPhoto(photo, uploaded) {
  const previousId = photo.id
  const previousObjectUrl = photo.objectUrl
  const uploadedPhoto = mapUploadedFile(uploaded)
  Object.assign(photo, uploadedPhoto)
  photo.uploadProgress = null
  selectedPhotoIds.value = selectedPhotoIds.value.map((id) => (id === previousId ? photo.id : id))
  slotPhotoIds.value = slotPhotoIds.value.map((id) => (id === previousId ? photo.id : id))
  if (previousObjectUrl) {
    URL.revokeObjectURL(previousObjectUrl)
  }
  loadImageSize(photo)
  persistPhotoOrder()
}

function uploadFormData(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${authToken.value}`)
    xhr.timeout = UPLOAD_TIMEOUT_MS

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded, event.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`upload_failed_${xhr.status}`))
        return
      }

      try {
        resolve(JSON.parse(xhr.responseText || '{}'))
      } catch {
        reject(new Error('invalid upload response'))
      }
    }
    xhr.onerror = () => reject(new Error('network_error'))
    xhr.ontimeout = () => reject(Object.assign(new Error('upload_timeout'), { name: 'AbortError' }))
    xhr.onabort = () => reject(Object.assign(new Error('upload_aborted'), { name: 'AbortError' }))
    xhr.send(formData)
  })
}

function setUploadProgress(photo, value) {
  photo.uploadProgress = clamp(Math.round(value), 0, 100)
}

function getUploadErrorMessage(error) {
  if (error?.name === 'AbortError') {
    return '上传超时，保留本地预览'
  }
  if (String(error?.message || '').includes('413')) {
    return '服务器限制单次请求，保留本地预览'
  }
  return '上传失败，保留本地预览'
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function togglePhoto(photo) {
  if (suppressNextTileClick.value) {
    suppressNextTileClick.value = false
    return
  }

  if (selectedPhotoIds.value.includes(photo.id)) {
    selectedPhotoIds.value = selectedPhotoIds.value.filter((id) => id !== photo.id)
    return
  }

  selectedPhotoIds.value = [...selectedPhotoIds.value, photo.id]
}

function clearSelection() {
  selectedPhotoIds.value = []
}

function isDeletingPhoto(photo) {
  return deletingPhotoIds.value.has(photo.id)
}

function setDeletingPhoto(photoId, isDeleting) {
  const nextIds = new Set(deletingPhotoIds.value)
  if (isDeleting) {
    nextIds.add(photoId)
  } else {
    nextIds.delete(photoId)
  }
  deletingPhotoIds.value = nextIds
}

function isDeletingLayout(layout) {
  return deletingLayoutIds.value.has(layout.id)
}

function setDeletingLayout(layoutId, isDeleting) {
  const nextIds = new Set(deletingLayoutIds.value)
  if (isDeleting) {
    nextIds.add(layoutId)
  } else {
    nextIds.delete(layoutId)
  }
  deletingLayoutIds.value = nextIds
}

async function deleteLayout(layout) {
  if (isDeletingLayout(layout)) {
    return
  }

  const confirmed = window.confirm(`删除「${layout.name}」？`)
  if (!confirmed) {
    return
  }

  setDeletingLayout(layout.id, true)
  layoutWallState.value = '删除排版'
  try {
    if (layout.savedAt) {
      const response = await fetch(`${API_BASE}/layouts/${encodeURIComponent(layout.id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!response.ok && response.status !== 404) {
        throw new Error('delete layout failed')
      }
    }

    savedLayouts.value = savedLayouts.value.filter((item) => item.id !== layout.id)
    persistSavedLayouts()
    layoutWallState.value = savedLayouts.value.length ? `${savedLayouts.value.length} 个排版` : '暂无排版'
    saveState.value = '已删除排版'
  } catch {
    layoutWallState.value = '删除失败'
    saveState.value = '排版删除失败'
  } finally {
    setDeletingLayout(layout.id, false)
  }
}

async function deletePhoto(photo) {
  if (isDeletingPhoto(photo)) {
    return
  }

  const confirmed = window.confirm(`删除「${photo.name}」？`)
  if (!confirmed) {
    return
  }

  setDeletingPhoto(photo.id, true)
  try {
    if (photo.serverId) {
      const response = await fetch(`${API_BASE}/uploads/${encodeURIComponent(photo.serverId)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!response.ok && response.status !== 404) {
        throw new Error('delete failed')
      }
    }
    removePhotoFromClient(photo.id)
  } catch {
    photo.status = '删除失败'
  } finally {
    setDeletingPhoto(photo.id, false)
  }
}

function removePhotoFromClient(photoId) {
  const photo = photos.value.find((item) => item.id === photoId)
  if (photo?.objectUrl) {
    URL.revokeObjectURL(photo.objectUrl)
  }

  photos.value = photos.value.filter((item) => item.id !== photoId)
  selectedPhotoIds.value = selectedPhotoIds.value.filter((id) => id !== photoId)
  slotPhotoIds.value = slotPhotoIds.value.map((id) => (id === photoId ? null : id))
  persistPhotoOrder()
  syncSlots()
  libraryState.value = `${photos.value.length} 张素材`
}

function startWallDrag(event, photo) {
  wallDragPhotoId.value = photo.id
  wallDropPhotoId.value = photo.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', photo.id)
}

function enterWallDrop(photo) {
  if (wallDragPhotoId.value && wallDragPhotoId.value !== photo.id) {
    wallDropPhotoId.value = photo.id
  }
}

function leaveWallDrop(photo) {
  if (wallDropPhotoId.value === photo.id) {
    wallDropPhotoId.value = ''
  }
}

function dropWallPhoto(photo) {
  const draggedId = wallDragPhotoId.value
  clearWallDragState()
  if (!draggedId || draggedId === photo.id) {
    return
  }

  reorderPhotos(draggedId, photo.id)
  suppressNextTileClick.value = true
  window.setTimeout(() => {
    suppressNextTileClick.value = false
  }, 0)
}

function clearWallDragState() {
  wallDragPhotoId.value = ''
  wallDropPhotoId.value = ''
  wallPointerDrag.value = null
}

function startWallPointerDrag(event, photo) {
  if (event.button != null && event.button !== 0) {
    return
  }

  wallPointerDrag.value = {
    photoId: photo.id,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    dragging: false,
  }
  wallDragPhotoId.value = photo.id
  wallDropPhotoId.value = photo.id
  event.currentTarget.setPointerCapture(event.pointerId)
}

function moveWallPointerDrag(event) {
  const state = wallPointerDrag.value
  if (!state || state.pointerId !== event.pointerId) {
    return
  }

  const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY)
  if (!state.dragging && distance < 8) {
    return
  }

  state.dragging = true
  suppressNextTileClick.value = true
  const targetTile = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-photo-id]')
  const targetId = targetTile?.dataset?.photoId
  if (targetId && targetId !== state.photoId) {
    wallDropPhotoId.value = targetId
  }
}

function endWallPointerDrag(event) {
  const state = wallPointerDrag.value
  if (!state || state.pointerId !== event.pointerId) {
    return
  }

  if (state.dragging && wallDropPhotoId.value && wallDropPhotoId.value !== state.photoId) {
    reorderPhotos(state.photoId, wallDropPhotoId.value)
  }

  clearWallDragState()
  window.setTimeout(() => {
    suppressNextTileClick.value = false
  }, 0)
}

function reorderPhotos(draggedId, targetId) {
  const nextPhotos = [...photos.value]
  const draggedIndex = nextPhotos.findIndex((photo) => photo.id === draggedId)
  const targetIndex = nextPhotos.findIndex((photo) => photo.id === targetId)
  if (draggedIndex < 0 || targetIndex < 0) {
    return
  }

  const [draggedPhoto] = nextPhotos.splice(draggedIndex, 1)
  nextPhotos.splice(targetIndex, 0, draggedPhoto)
  photos.value = nextPhotos
  syncSelectionOrderWithWall()
  persistPhotoOrder()
}

function applySavedPhotoOrder(photoList) {
  const savedOrder = loadSavedPhotoOrder()
  if (!savedOrder.length) {
    return photoList
  }

  const orderMap = new Map(savedOrder.map((id, index) => [id, index]))
  return [...photoList].sort((left, right) => {
    const leftOrder = orderMap.has(left.id) ? orderMap.get(left.id) : Number.MAX_SAFE_INTEGER
    const rightOrder = orderMap.has(right.id) ? orderMap.get(right.id) : Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
  })
}

function loadSavedPhotoOrder() {
  try {
    return JSON.parse(localStorage.getItem(PHOTO_ORDER_KEY) || '[]')
  } catch {
    return []
  }
}

function persistPhotoOrder() {
  localStorage.setItem(PHOTO_ORDER_KEY, JSON.stringify(photos.value.map((photo) => photo.id)))
}

function syncSelectionOrderWithWall() {
  const selected = new Set(selectedPhotoIds.value)
  selectedPhotoIds.value = photos.value
    .filter((photo) => selected.has(photo.id))
    .map((photo) => photo.id)
}

function openLayout() {
  syncSlots()
  const firstFilledSlot = slotPhotoIds.value.findIndex(Boolean)
  activeSlotIndex.value = firstFilledSlot >= 0 ? firstFilledSlot : 0
  activeView.value = 'layout'
}

function showLibrary() {
  activeView.value = 'library'
}

function showLayoutWall() {
  activeView.value = 'layout-wall'
  loadRemoteLayouts()
}

function getDefaultTransform() {
  return { scale: 1, x: 50, y: 50 }
}

function syncSlots() {
  const previousSlots = slotPhotoIds.value
  const previousTransforms = slotTransforms.value
  const nextSlots = activeTemplate.value.cells.map((cell, index) => {
    return selectedPhotoIds.value[getCellSourceIndex(cell, index)] || null
  })

  slotPhotoIds.value = nextSlots
  slotTransforms.value = nextSlots.map((photoId, index) => {
    if (photoId && photoId === previousSlots[index]) {
      return previousTransforms[index] || getDefaultTransform()
    }
    return getDefaultTransform()
  })

  if (activeSlotIndex.value >= nextSlots.length) {
    activeSlotIndex.value = Math.max(0, nextSlots.length - 1)
  }
}

function getCellPhoto(index) {
  const photoId = slotPhotoIds.value[index]
  return photos.value.find((photo) => photo.id === photoId)
}

function getSlotTransform(index) {
  if (!slotTransforms.value[index]) {
    slotTransforms.value[index] = getDefaultTransform()
  }
  return slotTransforms.value[index]
}

function getCellBox(cell, width, height) {
  return {
    x: cell.x * width,
    y: cell.y * height,
    w: cell.w * width,
    h: cell.h * height,
  }
}

function cellBoxStyle(cell) {
  const box = getCellBox(cell, PRINT_SPEC.printWidthMm, PRINT_SPEC.printHeightMm)
  return {
    left: `${(box.x / PRINT_SPEC.printWidthMm) * 100}%`,
    top: `${(box.y / PRINT_SPEC.printHeightMm) * 100}%`,
    width: `${(box.w / PRINT_SPEC.printWidthMm) * 100}%`,
    height: `${(box.h / PRINT_SPEC.printHeightMm) * 100}%`,
  }
}

function imageStyle(index) {
  const transform = getSlotTransform(index)
  return {
    objectPosition: `${transform.x}% ${transform.y}%`,
    transform: `scale(${transform.scale})`,
  }
}

function selectSlot(index) {
  activeSlotIndex.value = index
}

function startDrag(event, index) {
  if (!getCellPhoto(index)) {
    return
  }

  selectSlot(index)
  const rect = event.currentTarget.getBoundingClientRect()
  const transform = getSlotTransform(index)
  dragState.value = {
    index,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: transform.x,
    originY: transform.y,
    width: rect.width || 1,
    height: rect.height || 1,
  }
  event.currentTarget.setPointerCapture(event.pointerId)
}

function dragImage(event) {
  const drag = dragState.value
  if (!drag || drag.pointerId !== event.pointerId) {
    return
  }

  const transform = getSlotTransform(drag.index)
  transform.x = clamp(drag.originX - ((event.clientX - drag.startX) / drag.width) * 100, 0, 100)
  transform.y = clamp(drag.originY - ((event.clientY - drag.startY) / drag.height) * 100, 0, 100)
}

function endDrag(event) {
  if (dragState.value?.pointerId === event.pointerId) {
    dragState.value = null
  }
}

function zoomSlot(index, delta) {
  if (!getCellPhoto(index)) {
    return
  }

  selectSlot(index)
  const transform = getSlotTransform(index)
  transform.scale = clamp(Number((transform.scale + delta).toFixed(2)), 1, 3)
}

function setActiveZoom(value) {
  if (!activeSlotTransform.value) {
    return
  }
  activeSlotTransform.value.scale = clamp(Number(value), 1, 3)
}

function resetActiveTransform() {
  slotTransforms.value[activeSlotIndex.value] = getDefaultTransform()
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function formatSize(bytes) {
  if (!bytes) {
    return '0 KB'
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function photoMeta(photo) {
  const dimensions = photo.width && photo.height ? `${photo.width}×${photo.height}` : '读取中'
  return `${dimensions} · ${formatSize(photo.size)}`
}

function shouldShowPhotoStatus(photo) {
  return /失败|超时|限制/.test(photo.status || '')
}

function shouldShowUploadProgress(photo) {
  return photo.uploadProgress !== null
    && photo.uploadProgress !== undefined
    && Number.isFinite(Number(photo.uploadProgress))
    && !shouldShowPhotoStatus(photo)
}

function uploadProgressValue(photo) {
  return clamp(Number(photo.uploadProgress) || 0, 0, 100)
}

function uploadProgressText(photo) {
  const progress = uploadProgressValue(photo)
  return progress ? `${progress}%` : '等待'
}

function formatLayoutTime(layout) {
  const rawValue = layout.savedAt || layout.createdAt
  if (!rawValue) {
    return '未记录时间'
  }

  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) {
    return '未记录时间'
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function layoutPhotoCount(layout) {
  const ids = layout.slotPhotoIds || layout.selectedPhotoIds || []
  return new Set(ids.filter(Boolean)).size
}

function getPhotoLabel(photo) {
  const index = selectedPhotoIds.value.indexOf(photo.id)
  return index >= 0 ? index + 1 : ''
}

async function loadCanvasImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

function drawImageInBox(ctx, image, x, y, width, height, transform) {
  const boxRatio = width / height
  const imageRatio = image.naturalWidth / image.naturalHeight
  const baseCropWidth = imageRatio > boxRatio ? image.naturalHeight * boxRatio : image.naturalWidth
  const baseCropHeight = imageRatio > boxRatio ? image.naturalHeight : image.naturalWidth / boxRatio
  const cropWidth = baseCropWidth / transform.scale
  const cropHeight = baseCropHeight / transform.scale
  const sourceX = (image.naturalWidth - cropWidth) * (transform.x / 100)
  const sourceY = (image.naturalHeight - cropHeight) * (transform.y / 100)

  ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, x, y, width, height)
}

async function renderComposite(pixelWidth = PRINT_SPEC.pixelWidth) {
  const pixelHeight = Math.round(pixelWidth * (PRINT_SPEC.printHeightMm / PRINT_SPEC.printWidthMm))
  const canvas = document.createElement('canvas')
  canvas.width = pixelWidth
  canvas.height = pixelHeight

  const ctx = canvas.getContext('2d')
  const scaleX = pixelWidth / PRINT_SPEC.printWidthMm
  const scaleY = pixelHeight / PRINT_SPEC.printHeightMm

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (const [index, cell] of activeTemplate.value.cells.entries()) {
    const photo = getCellPhoto(index)
    const boxMm = getCellBox(cell, PRINT_SPEC.printWidthMm, PRINT_SPEC.printHeightMm)
    const x = boxMm.x * scaleX
    const y = boxMm.y * scaleY
    const width = boxMm.w * scaleX
    const height = boxMm.h * scaleY

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, width, height)
    ctx.clip()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, width, height)

    if (photo) {
      try {
        const image = await loadCanvasImage(photo.url)
        drawImageInBox(ctx, image, x, y, width, height, getSlotTransform(index))
      } catch {
        ctx.fillStyle = '#e5ebe8'
        ctx.fillRect(x, y, width, height)
      }
    }

    ctx.restore()
  }

  return canvas.toDataURL('image/png')
}

async function downloadComposite() {
  isExporting.value = true
  try {
    const dataUrl = await renderComposite()
    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = `fuji-6inch-layout-${new Date().toISOString().slice(0, 10)}.png`
    anchor.click()
    saveState.value = '已导出 PNG'
  } finally {
    isExporting.value = false
  }
}

function buildLayoutRecord(thumbnailDataUrl) {
  const layoutPhotoIds = Array.from(new Set(slotPhotoIds.value.filter(Boolean)))
  const layoutPhotos = layoutPhotoIds
    .map((id) => photos.value.find((photo) => photo.id === id))
    .filter(Boolean)

  return {
    id: crypto.randomUUID(),
    name: `${activeTemplate.value.name} · ${new Date().toLocaleString('zh-CN')}`,
    createdAt: new Date().toISOString(),
    templateId: activeTemplateId.value,
    templateName: activeTemplate.value.name,
    printSpec: PRINT_SPEC,
    selectedPhotoIds: layoutPhotoIds,
    slotPhotoIds: [...slotPhotoIds.value],
    slotTransforms: slotTransforms.value.map((transform) => ({ ...transform })),
    photos: layoutPhotos.map((photo) => ({
      id: photo.id,
      serverId: photo.serverId || '',
      name: photo.name,
      url: stripAccessToken(photo.url),
      width: photo.width,
      height: photo.height,
      size: photo.size,
      status: photo.status,
    })),
    thumbnailDataUrl,
  }
}

async function saveLayout() {
  if (isSavingLayout.value) {
    return
  }

  if (!filledSlotCount.value) {
    saveState.value = '未选择照片'
    return
  }

  const localOnlyPhotos = Array.from(new Set(slotPhotoIds.value.filter(Boolean)))
    .map((id) => photos.value.find((photo) => photo.id === id))
    .filter((photo) => photo?.objectUrl || /^blob:/i.test(photo?.url || ''))
  if (localOnlyPhotos.length) {
    saveState.value = `等待 ${localOnlyPhotos.length} 张照片上传完成`
    return
  }

  isSavingLayout.value = true
  saveState.value = '保存中，请稍候'
  let record = null

  try {
    const thumbnailDataUrl = await renderComposite(420)
    record = buildLayoutRecord(thumbnailDataUrl)
    const response = await fetchWithAuth(`${API_BASE}/layouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
    if (!response.ok) {
      throw new Error('save layout failed')
    }

    const payload = await response.json()
    upsertSavedLayout(normalizeLayoutRecord(payload.layout || record))
    saveState.value = '已保存到后台'
  } catch {
    if (record) {
      upsertSavedLayout(record)
      saveState.value = '后台保存失败，已保留本机草稿'
    } else {
      saveState.value = '保存失败'
    }
  } finally {
    isSavingLayout.value = false
  }
}

async function restoreLayout(layoutItem) {
  layoutWallState.value = '打开排版'
  let layout
  try {
    layout = await fetchLayoutDetail(layoutItem)
  } catch {
    layoutWallState.value = '排版加载失败'
    saveState.value = '排版加载失败'
    return
  }

  const existingIds = new Set(photos.value.map((photo) => photo.id))
  const restoredPhotos = (layout.photos || [])
    .filter((photo) => !existingIds.has(photo.id))
    .map((photo) => ({
      ...photo,
      url: absoluteBackendUrl(photo.url),
      objectUrl: '',
      type: 'image/*',
      status: photo.status || '已载入',
      uploadedAt: layout.savedAt || layout.createdAt,
    }))

  photos.value = [...restoredPhotos, ...photos.value]
  activeTemplateId.value = layoutTemplates.some((template) => template.id === layout.templateId)
    ? layout.templateId
    : activeTemplateId.value
  const restoredSelectedIds = layout.selectedPhotoIds?.length ? layout.selectedPhotoIds : layout.slotPhotoIds || []
  selectedPhotoIds.value = Array.from(new Set(restoredSelectedIds)).filter((id) => {
    return [...restoredPhotos, ...photos.value].some((photo) => photo.id === id)
  })
  slotPhotoIds.value = layout.slotPhotoIds || []
  slotTransforms.value = (layout.slotTransforms || []).map((transform) => ({
    scale: transform.scale || 1,
    x: transform.x ?? 50,
    y: transform.y ?? 50,
  }))
  photos.value.forEach(loadImageSize)
  saveState.value = '已载入排版'
  layoutWallState.value = savedLayouts.value.length ? `${savedLayouts.value.length} 个排版` : '暂无排版'
  openLayout()
}
</script>

<template>
  <main v-if="!isUnlocked" class="fuji-auth-page">
    <form class="fuji-auth-panel" @submit.prevent="loginWithPassword">
      <div class="fuji-auth-title">
        <p>FUJIFILM 小悄印 2 Pro</p>
        <h1>访问验证</h1>
      </div>
      <label>
        <span>访问密码</span>
        <input
          v-model="authPassword"
          type="password"
          autocomplete="current-password"
          placeholder="请输入密码"
          autofocus
        >
      </label>
      <button type="submit" class="fuji-primary-btn" :disabled="isAuthenticating">
        {{ isAuthenticating ? '验证中' : '进入' }}
      </button>
      <p>{{ authState }}</p>
    </form>
  </main>

  <main v-else class="fuji-page">
    <header class="fuji-topbar">
      <div class="fuji-title-block">
        <p>FUJIFILM 小悄印 2 Pro</p>
        <h1>{{ pageTitle }}</h1>
      </div>
      <div class="fuji-top-actions">
        <button
          type="button"
          class="fuji-view-btn"
          :class="{ 'is-active': activeView === 'library' }"
          @click="showLibrary"
        >
          照片墙
        </button>
        <button
          type="button"
          class="fuji-view-btn"
          :class="{ 'is-active': activeView === 'layout-wall' }"
          @click="showLayoutWall"
        >
          排版墙 {{ savedLayouts.length }}
        </button>
        <button
          type="button"
          class="fuji-view-btn"
          :class="{ 'is-active': activeView === 'layout' }"
          @click="openLayout"
        >
          排版 {{ selectedPhotoIds.length }}
        </button>
      </div>
    </header>

    <section
      v-if="activeView === 'library'"
      class="fuji-library"
      @drop.prevent="handleDrop"
      @dragover.prevent
    >
      <div class="fuji-library-toolbar">
        <button type="button" class="fuji-upload-btn" @click="triggerUpload">
          <input
            ref="fileInput"
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
            multiple
            @change="handleFileChange"
          >
          <span>+</span>
          上传图片
        </button>
        <input
          v-model="searchText"
          class="fuji-search"
          type="search"
          placeholder="搜索文件名"
        >
        <div class="fuji-library-count">
          <span>{{ libraryState }}</span>
          <strong v-if="uploadQueueSummary">{{ uploadQueueSummary }}</strong>
          <strong>已选 {{ selectedPhotoIds.length }}</strong>
        </div>
        <button
          type="button"
          class="fuji-text-btn"
          :disabled="!selectedPhotoIds.length"
          @click="clearSelection"
        >
          清空选择
        </button>
      </div>

      <div v-if="displayedPhotos.length" class="fuji-photo-wall">
        <article
          v-for="photo in displayedPhotos"
          :key="photo.id"
          :data-photo-id="photo.id"
          class="fuji-photo-tile"
          :class="{
            'is-selected': selectedPhotoIds.includes(photo.id),
            'is-dragging': wallDragPhotoId === photo.id,
            'is-drop-target': wallDropPhotoId === photo.id && wallDragPhotoId !== photo.id,
            'is-deleting': isDeletingPhoto(photo),
          }"
          draggable="true"
          @click="togglePhoto(photo)"
          @dragstart="startWallDrag($event, photo)"
          @dragenter.prevent="enterWallDrop(photo)"
          @dragover.prevent="enterWallDrop(photo)"
          @dragleave="leaveWallDrop(photo)"
          @drop.prevent="dropWallPhoto(photo)"
          @dragend="clearWallDragState"
        >
          <div class="fuji-photo-thumb">
            <img :src="photo.url" :alt="photo.name" loading="lazy" draggable="false">
            <div
              v-if="shouldShowUploadProgress(photo)"
              class="fuji-upload-progress"
              role="progressbar"
              aria-label="上传进度"
              :aria-valuenow="uploadProgressValue(photo)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span>{{ uploadProgressText(photo) }}</span>
              <div>
                <i :style="{ width: `${uploadProgressValue(photo)}%` }"></i>
              </div>
            </div>
          </div>
          <span v-if="getPhotoLabel(photo)" class="fuji-pick-order">{{ getPhotoLabel(photo) }}</span>
          <span v-if="shouldShowPhotoStatus(photo)" class="fuji-photo-status">{{ photo.status }}</span>
          <button
            type="button"
            class="fuji-delete-btn"
            :disabled="isDeletingPhoto(photo)"
            aria-label="删除照片"
            @click.stop="deletePhoto(photo)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 15H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
          <!-- <button
            type="button"
            class="fuji-drag-handle"
            aria-label="拖动排序"
            @click.stop
            @pointerdown.stop.prevent="startWallPointerDrag($event, photo)"
            @pointermove.stop.prevent="moveWallPointerDrag"
            @pointerup.stop.prevent="endWallPointerDrag"
            @pointercancel.stop.prevent="clearWallDragState"
          >
            ≡
          </button> -->
          <strong>{{ photo.name }}</strong>
          <small>{{ photoMeta(photo) }}</small>
        </article>
      </div>

      <div v-else class="fuji-empty">
        <strong>还没有照片</strong>
        <button type="button" @click="triggerUpload">上传第一批图片</button>
      </div>
    </section>

    <section
      v-else-if="activeView === 'layout-wall'"
      class="fuji-layout-wall-page"
    >
      <div class="fuji-layout-wall-toolbar">
        <div class="fuji-layout-wall-title">
          <span>{{ layoutWallState }}</span>
          <strong>已保存排版</strong>
        </div>
        <button type="button" class="fuji-text-btn" @click="loadRemoteLayouts">刷新</button>
      </div>

      <div v-if="savedLayouts.length" class="fuji-layout-wall-grid">
        <article
          v-for="layout in savedLayouts"
          :key="layout.id"
          class="fuji-layout-card"
          :class="{ 'is-deleting': isDeletingLayout(layout) }"
          role="button"
          tabindex="0"
          @click="restoreLayout(layout)"
          @keydown.enter.prevent="restoreLayout(layout)"
          @keydown.space.prevent="restoreLayout(layout)"
        >
          <img
            v-if="layout.thumbnailDataUrl"
            :src="layout.thumbnailDataUrl"
            :alt="layout.name"
            loading="lazy"
          >
          <span v-else class="fuji-layout-card-placeholder">排版</span>
          <strong>{{ layout.name }}</strong>
          <small>
            {{ layout.templateName }} · {{ layoutPhotoCount(layout) || '-' }} 张 · {{ formatLayoutTime(layout) }}
          </small>
          <button
            type="button"
            class="fuji-layout-delete-btn"
            :disabled="isDeletingLayout(layout)"
            aria-label="删除排版"
            @click.stop="deleteLayout(layout)"
            @keydown.stop
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 15H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </article>
      </div>

      <div v-else class="fuji-empty">
        <strong>还没有保存的排版</strong>
        <button type="button" @click="openLayout">去排版</button>
      </div>
    </section>

    <section
      v-else
      class="fuji-layout-page"
    >
      <div class="fuji-layout-panel">
        <div class="fuji-layout-body">
          <aside class="fuji-layout-side">
            <div class="fuji-side-section fuji-layout-command-section">
              <div class="fuji-side-title">
                <span>{{ printSummary }}</span>
                <strong>{{ activeTemplate.name }}</strong>
              </div>
              <div class="fuji-layout-actions">
                <button type="button" class="fuji-text-btn" :disabled="isExporting" @click="downloadComposite">
                  {{ isExporting ? '导出中' : '导出 PNG' }}
                </button>
                <button
                  type="button"
                  class="fuji-primary-btn"
                  :disabled="isSavingLayout"
                  @click="saveLayout"
                >
                  {{ isSavingLayout ? '保存中' : '保存排版' }}
                </button>
              </div>
              <p class="fuji-save-state">{{ saveState }}</p>
            </div>

            <div class="fuji-side-section">
              <div class="fuji-side-title">
                <span>模板</span>
                <strong>{{ activeTemplateSlotCount }} 格</strong>
              </div>
              <div class="fuji-template-groups">
                <section
                  v-for="group in layoutTemplateGroups"
                  :key="group.name"
                  class="fuji-template-group"
                >
                  <h3>{{ group.name }}</h3>
                  <div class="fuji-template-grid">
                    <button
                      v-for="template in group.templates"
                      :key="template.id"
                      type="button"
                      :class="{ 'is-active': activeTemplateId === template.id }"
                      @click="activeTemplateId = template.id"
                    >
                      <span class="fuji-template-preview" aria-hidden="true">
                        <i
                          v-for="(cell, index) in template.cells"
                          :key="`${template.id}-preview-${index}`"
                          :style="cellBoxStyle(cell)"
                        ></i>
                      </span>
                      <span class="fuji-template-copy">
                        <small>{{ template.shortName }}</small>
                        <strong>{{ template.name }}</strong>
                      </span>
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <div class="fuji-side-section">
              <div class="fuji-side-title">
                <span>已选照片</span>
                <strong>{{ selectedPhotos.length }}</strong>
              </div>
              <div class="fuji-selected-strip">
                <button
                  v-for="(photo, index) in selectedPhotos"
                  :key="photo.id"
                  type="button"
                  :class="{ 'is-used': index < activeTemplate.cells.length }"
                  @click="activeSlotIndex = Math.min(index, activeTemplate.cells.length - 1)"
                >
                  <img :src="photo.url" :alt="photo.name">
                  <span>{{ index + 1 }}</span>
                </button>
              </div>
            </div>

            <div class="fuji-side-section">
              <div class="fuji-side-title">
                <span>当前图片</span>
                <strong>{{ activeSlotPhoto ? activeSlotIndex + 1 : '-' }}</strong>
              </div>
              <div v-if="activeSlotPhoto && activeSlotTransform" class="fuji-adjust-panel">
                <strong>{{ activeSlotPhoto.name }}</strong>
                <label>
                  <span>缩放 {{ activeSlotTransform.scale.toFixed(2) }}x</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    :value="activeSlotTransform.scale"
                    @input="setActiveZoom($event.target.value)"
                  >
                </label>
                <div class="fuji-adjust-actions">
                  <button type="button" @click="zoomSlot(activeSlotIndex, -0.1)">-</button>
                  <button type="button" @click="resetActiveTransform">重置</button>
                  <button type="button" @click="zoomSlot(activeSlotIndex, 0.1)">+</button>
                </div>
              </div>
              <p v-else class="fuji-muted">未选择照片</p>
            </div>

            <div v-if="savedLayouts.length" class="fuji-side-section">
              <div class="fuji-side-title">
                <span>{{ saveState }}</span>
                <strong>草稿</strong>
              </div>
              <div class="fuji-draft-list">
                <button
                  v-for="layout in savedLayouts"
                  :key="layout.id"
                  type="button"
                  @click="restoreLayout(layout)"
                >
                  <img v-if="layout.thumbnailDataUrl" :src="layout.thumbnailDataUrl" :alt="layout.name">
                  <span v-else class="fuji-draft-placeholder">排</span>
                  <span>{{ layout.templateName }}</span>
                </button>
              </div>
            </div>
          </aside>

          <section class="fuji-preview-stage">
            <div class="fuji-paper-shadow">
              <div class="fuji-print-area">
                <div
                  v-for="(cell, index) in activeTemplate.cells"
                  :key="`${activeTemplate.id}-${index}`"
                  class="fuji-print-cell"
                  :class="{ 'is-empty': !getCellPhoto(index), 'is-active': activeSlotIndex === index }"
                  :style="cellBoxStyle(cell)"
                  role="button"
                  tabindex="0"
                  @click="selectSlot(index)"
                  @pointerdown="startDrag($event, index)"
                  @pointermove="dragImage"
                  @pointerup="endDrag"
                  @pointercancel="endDrag"
                  @wheel.prevent="zoomSlot(index, $event.deltaY < 0 ? 0.08 : -0.08)"
                >
                  <img
                    v-if="getCellPhoto(index)"
                    :src="getCellPhoto(index).url"
                    :alt="getCellPhoto(index).name"
                    :style="imageStyle(index)"
                    draggable="false"
                  >
                  <span v-else>{{ getCellSourceIndex(cell, index) + 1 }}</span>
                </div>
              </div>
            </div>
            <div class="fuji-paper-meta">
              <span>打印区 {{ PRINT_SPEC.printWidthMm }}×{{ PRINT_SPEC.printHeightMm }}mm</span>
              <span>相纸 {{ PRINT_SPEC.paperWidthMm }}×{{ PRINT_SPEC.paperHeightMm }}mm</span>
              <span>{{ filledSlotCount }}/{{ activeTemplateSlotCount }}</span>
            </div>
          </section>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.fuji-auth-page {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 18px;
  background: #eef2f1;
  color: #17201d;
}

.fuji-auth-panel {
  display: grid;
  gap: 14px;
  width: min(100%, 360px);
  padding: 22px;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 14px 40px rgba(31, 45, 42, 0.1);
}

.fuji-auth-title {
  display: grid;
  gap: 3px;
}

.fuji-auth-title p,
.fuji-auth-title h1,
.fuji-auth-panel p {
  margin: 0;
}

.fuji-auth-title p,
.fuji-auth-panel p {
  color: #697873;
  font-size: 0.82rem;
}

.fuji-auth-title h1 {
  font-size: 1.45rem;
}

.fuji-auth-panel label {
  display: grid;
  gap: 8px;
  color: #42514d;
  font-size: 0.86rem;
}

.fuji-auth-panel input {
  min-width: 0;
  border: 1px solid #c9d4d0;
  border-radius: 6px;
  padding: 11px 12px;
  background: #f8faf9;
  color: #17201d;
  font: inherit;
}

.fuji-page {
  min-height: 100vh;
  padding: 18px;
  background: #eef2f1;
  color: #17201d;
}

.fuji-topbar {
  position: sticky;
  top: 0;
  z-index: 8;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  max-width: 1560px;
  margin: 0 auto 14px;
  padding: 10px 0;
  background: rgba(238, 242, 241, 0.92);
  backdrop-filter: blur(14px);
}

.fuji-back,
.fuji-text-btn,
.fuji-primary-btn,
.fuji-view-btn,
.fuji-upload-btn,
.fuji-delete-btn,
.fuji-layout-delete-btn,
.fuji-drag-handle,
.fuji-photo-tile,
.fuji-layout-card,
.fuji-template-grid button,
.fuji-selected-strip button,
.fuji-adjust-actions button,
.fuji-draft-list button,
.fuji-empty button {
  font: inherit;
  cursor: pointer;
}

.fuji-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ffffff;
  color: #17201d;
  box-shadow: 0 10px 28px rgba(31, 45, 42, 0.12);
}

.fuji-title-block p {
  margin: 0 0 3px;
  color: #697873;
  font-size: 0.78rem;
}

.fuji-title-block h1 {
  margin: 0;
}

.fuji-title-block h1 {
  font-size: 1.45rem;
}

.fuji-top-actions,
.fuji-layout-actions,
.fuji-library-toolbar,
.fuji-layout-wall-toolbar,
.fuji-paper-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fuji-text-btn,
.fuji-primary-btn,
.fuji-view-btn,
.fuji-upload-btn,
.fuji-delete-btn,
.fuji-layout-delete-btn,
.fuji-drag-handle,
.fuji-layout-card,
.fuji-empty button {
  border: 0;
  border-radius: 6px;
  min-height: 38px;
  padding: 9px 13px;
}

.fuji-text-btn {
  background: #dce6e2;
  color: #20302c;
}

.fuji-text-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.fuji-primary-btn {
  background: #d9553d;
  color: #ffffff;
}

.fuji-primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.fuji-view-btn {
  background: #dce6e2;
  color: #20302c;
}

.fuji-view-btn.is-active {
  background: #17201d;
  color: #ffffff;
}

.fuji-library {
  max-width: 1560px;
  margin: 0 auto;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 14px 40px rgba(31, 45, 42, 0.1);
}

.fuji-library-toolbar {
  position: sticky;
  top: 70px;
  z-index: 5;
  flex-wrap: wrap;
  padding: 14px;
  border-bottom: 1px solid #e1e8e5;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
}

.fuji-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2f7d68;
  color: #ffffff;
}

.fuji-upload-btn input {
  display: none;
}

.fuji-upload-btn span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
}

.fuji-search {
  flex: 1 1 220px;
  min-width: 0;
  border: 1px solid #c9d4d0;
  border-radius: 6px;
  padding: 10px 12px;
  background: #f8faf9;
  color: #17201d;
}

.fuji-library-count {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #5d6d68;
  font-size: 0.86rem;
}

.fuji-library-count strong {
  border-radius: 999px;
  padding: 5px 9px;
  background: #edf4f1;
  color: #2f7d68;
}

.fuji-photo-wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  padding: 14px;
}

.fuji-photo-tile {
  position: relative;
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 5px;
  min-width: 0;
  border: 1px solid #dce4e1;
  border-radius: 8px;
  padding: 8px;
  background: #fbfcfb;
  color: #17201d;
  text-align: left;
  user-select: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.fuji-photo-tile:hover {
  transform: translateY(-1px);
  border-color: #9fb3ad;
}

.fuji-photo-tile.is-selected {
  border-color: #d9553d;
  box-shadow: inset 0 0 0 1px #d9553d;
}

.fuji-photo-tile.is-dragging {
  opacity: 0.42;
  transform: scale(0.98);
}

.fuji-photo-tile.is-drop-target {
  border-color: #2f7d68;
  box-shadow: inset 0 0 0 2px #2f7d68, 0 10px 24px rgba(47, 125, 104, 0.18);
}

.fuji-photo-tile.is-deleting {
  opacity: 0.58;
  pointer-events: none;
}

.fuji-photo-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  background: #dce5e1;
  overflow: hidden;
}

.fuji-photo-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fuji-upload-progress {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: grid;
  gap: 5px;
  padding: 6px;
  border-radius: 6px;
  background: rgba(23, 32, 29, 0.74);
  color: #ffffff;
  font-size: 0.72rem;
  line-height: 1;
  box-shadow: 0 8px 18px rgba(23, 32, 29, 0.18);
}

.fuji-upload-progress span {
  font-weight: 700;
}

.fuji-upload-progress div {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
}

.fuji-upload-progress i {
  display: block;
  height: 100%;
  min-width: 4px;
  border-radius: inherit;
  background: #79d2b6;
  transition: width 0.18s ease;
}

.fuji-photo-tile strong,
.fuji-photo-tile small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fuji-photo-tile strong {
  font-size: 0.85rem;
}

.fuji-photo-tile small {
  color: #687a75;
  font-size: 0.74rem;
}

.fuji-pick-order,
.fuji-photo-status {
  position: absolute;
  top: 14px;
  border-radius: 999px;
  padding: 4px 7px;
  font-size: 0.72rem;
}

.fuji-pick-order {
  left: 14px;
  min-width: 24px;
  text-align: center;
  background: #d9553d;
  color: #ffffff;
  font-weight: 700;
}

.fuji-photo-status {
  right: 52px;
  background: rgba(23, 32, 29, 0.72);
  color: #ffffff;
}

.fuji-delete-btn,
.fuji-drag-handle {
  position: absolute;
}

.fuji-delete-btn {
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
  background: rgba(255, 255, 255, 0.92);
  color: #8f2f25;
  border: 1px solid rgba(143, 47, 37, 0.16);
  box-shadow: 0 6px 16px rgba(23, 32, 29, 0.14);
}

.fuji-delete-btn:hover {
  background: #fff4f1;
  color: #d9553d;
}

.fuji-delete-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.fuji-delete-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fuji-drag-handle {
  left: 14px;
  bottom: 56px;
  min-height: 30px;
  padding: 5px 9px;
  background: rgba(23, 32, 29, 0.78);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.28);
  touch-action: none;
  box-shadow: 0 6px 16px rgba(23, 32, 29, 0.16);
}

.fuji-empty {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 380px;
  color: #657570;
}

.fuji-empty button {
  background: #2f7d68;
  color: #ffffff;
}

.fuji-layout-wall-page {
  max-width: 1560px;
  margin: 0 auto;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 14px 40px rgba(31, 45, 42, 0.1);
}

.fuji-layout-wall-toolbar {
  position: sticky;
  top: 70px;
  z-index: 5;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 14px;
  border-bottom: 1px solid #e1e8e5;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
}

.fuji-layout-wall-title {
  display: grid;
  gap: 3px;
}

.fuji-layout-wall-title span {
  color: #6b7874;
  font-size: 0.82rem;
}

.fuji-layout-wall-title strong {
  color: #17201d;
  font-size: 1rem;
}

.fuji-layout-wall-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  padding: 14px;
}

.fuji-layout-card {
  position: relative;
  display: grid;
  gap: 8px;
  align-content: start;
  min-width: 0;
  padding: 10px;
  border: 1px solid #dce4e1;
  background: #fbfcfb;
  color: #17201d;
  text-align: left;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
  cursor: pointer;
}

.fuji-layout-card:hover,
.fuji-layout-card:focus-visible {
  transform: translateY(-1px);
  border-color: #2f7d68;
  box-shadow: 0 12px 26px rgba(47, 125, 104, 0.14);
  outline: 0;
}

.fuji-layout-card.is-deleting {
  opacity: 0.56;
  pointer-events: none;
}

.fuji-layout-card img,
.fuji-layout-card-placeholder {
  width: 100%;
  aspect-ratio: 100 / 148;
  border-radius: 6px;
  background: #e8eeeb;
}

.fuji-layout-card img {
  object-fit: cover;
}

.fuji-layout-card-placeholder {
  display: grid;
  place-items: center;
  color: #7a8984;
  font-weight: 700;
}

.fuji-layout-card strong,
.fuji-layout-card small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fuji-layout-card strong {
  font-size: 0.88rem;
}

.fuji-layout-card small {
  color: #687a75;
  font-size: 0.76rem;
}

.fuji-layout-delete-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  min-height: 34px;
  padding: 0;
  background: rgba(255, 255, 255, 0.92);
  color: #8f2f25;
  border: 1px solid rgba(143, 47, 37, 0.18);
  box-shadow: 0 8px 18px rgba(23, 32, 29, 0.16);
}

.fuji-layout-delete-btn:hover {
  background: #fff4f1;
  color: #d9553d;
}

.fuji-layout-delete-btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.fuji-layout-delete-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fuji-layout-page {
  max-width: 1560px;
  margin: 0 auto;
}

.fuji-layout-panel {
  display: grid;
  min-height: calc(100vh - 96px);
  overflow: visible;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: #f8faf9;
  box-shadow: 0 14px 40px rgba(31, 45, 42, 0.1);
}

.fuji-layout-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.fuji-layout-actions .fuji-primary-btn {
  grid-column: 1 / -1;
}

.fuji-layout-command-section {
  padding-bottom: 12px;
  border-bottom: 1px solid #e1e8e5;
}

.fuji-layout-command-section .fuji-side-title {
  display: grid;
  gap: 4px;
  align-items: start;
}

.fuji-layout-command-section .fuji-side-title span {
  line-height: 1.5;
}

.fuji-layout-command-section .fuji-side-title strong {
  font-size: 1.05rem;
}

.fuji-save-state {
  margin: 0;
  color: #71807c;
  font-size: 0.82rem;
}

.fuji-layout-body {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 0;
  min-height: calc(100vh - 96px);
}

.fuji-layout-side {
  display: grid;
  align-content: start;
  gap: 12px;
  align-self: start;
  position: sticky;
  top: 84px;
  max-height: calc(100vh - 110px);
  overflow: auto;
  padding: 14px;
  border-right: 1px solid #dce5e1;
  background: #ffffff;
}

.fuji-side-section {
  display: grid;
  gap: 10px;
}

.fuji-side-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #5e6e69;
  font-size: 0.82rem;
}

.fuji-side-title strong {
  color: #17201d;
}

.fuji-template-groups {
  display: grid;
  gap: 14px;
}

.fuji-template-group {
  display: grid;
  gap: 8px;
}

.fuji-template-group h3 {
  margin: 0;
  color: #5e6e69;
  font-size: 0.82rem;
  font-weight: 700;
}

.fuji-template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.fuji-template-grid button {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 76px;
  border: 1px solid #dce4e1;
  border-radius: 8px;
  background: #fbfcfb;
  color: #17201d;
  text-align: left;
  padding: 8px;
}

.fuji-template-grid button.is-active {
  border-color: #d9553d;
  box-shadow: inset 0 0 0 1px #d9553d;
}

.fuji-template-preview {
  position: relative;
  display: block;
  width: 38px;
  aspect-ratio: 100 / 148;
  overflow: hidden;
  border: 1px solid #d5ddd9;
  border-radius: 6px;
  background: #f1f4f2;
}

.fuji-template-preview i {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.86);
  background: #aeb8b3;
}

.fuji-template-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.fuji-template-copy small {
  color: #2f7d68;
  font-size: 0.72rem;
  font-weight: 700;
}

.fuji-template-grid button strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.84rem;
}

.fuji-selected-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.fuji-selected-strip button {
  position: relative;
  border: 1px solid #dce4e1;
  border-radius: 8px;
  padding: 4px;
  background: #f8faf9;
  opacity: 0.55;
}

.fuji-selected-strip button.is-used {
  opacity: 1;
  border-color: #2f7d68;
}

.fuji-selected-strip img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 5px;
  object-fit: cover;
}

.fuji-selected-strip span {
  position: absolute;
  left: 7px;
  top: 7px;
  min-width: 20px;
  border-radius: 999px;
  padding: 2px 5px;
  background: #17201d;
  color: #ffffff;
  font-size: 0.7rem;
}

.fuji-adjust-panel {
  display: grid;
  gap: 10px;
}

.fuji-adjust-panel > strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}

.fuji-adjust-panel label {
  display: grid;
  gap: 8px;
  color: #42514d;
  font-size: 0.85rem;
}

.fuji-adjust-panel input[type='range'] {
  width: 100%;
  accent-color: #d9553d;
}

.fuji-adjust-actions {
  display: grid;
  grid-template-columns: 42px 1fr 42px;
  gap: 8px;
}

.fuji-adjust-actions button,
.fuji-draft-list button {
  border: 1px solid #dce4e1;
  border-radius: 6px;
  background: #f8faf9;
  color: #17201d;
}

.fuji-adjust-actions button {
  min-height: 36px;
}

.fuji-draft-list {
  display: grid;
  gap: 8px;
}

.fuji-draft-list button {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px;
  text-align: left;
}

.fuji-draft-list img {
  width: 42px;
  height: 56px;
  border-radius: 4px;
  object-fit: cover;
  background: #e8eeeb;
}

.fuji-draft-placeholder {
  display: grid;
  place-items: center;
  width: 42px;
  height: 56px;
  border-radius: 4px;
  background: #e8eeeb;
  color: #7a8984;
  font-weight: 700;
  font-size: 0.8rem;
}

.fuji-draft-list span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fuji-muted {
  margin: 0;
  color: #71807c;
  font-size: 0.85rem;
}

.fuji-preview-stage {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  justify-items: center;
  gap: 12px;
  min-height: 0;
  padding: 18px;
  overflow: auto;
}

.fuji-paper-shadow {
  width: min(100%, 560px);
  align-self: center;
  padding: 18px;
  border-radius: 8px;
  background: #d8dedb;
}

.fuji-print-area {
  position: relative;
  width: 100%;
  aspect-ratio: 100 / 148;
  overflow: hidden;
  border: 1px solid #c2cbc7;
  background: #ffffff;
  box-shadow: 0 18px 44px rgba(20, 31, 28, 0.18);
}

.fuji-print-cell {
  position: absolute;
  overflow: hidden;
  border: 1px solid rgba(25, 35, 32, 0.14);
  background: #ffffff;
  touch-action: none;
}

.fuji-print-cell.is-active {
  outline: 2px solid #d9553d;
  outline-offset: -2px;
  z-index: 2;
}

.fuji-print-cell img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center;
  user-select: none;
  pointer-events: none;
}

.fuji-print-cell span {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #9aa7a3;
  font-size: 0.85rem;
}

.fuji-paper-meta {
  flex-wrap: wrap;
  justify-content: center;
  color: #52635e;
  font-size: 0.8rem;
}

.fuji-paper-meta span {
  border-radius: 999px;
  padding: 6px 9px;
  background: #ffffff;
  border: 1px solid #d7dfdc;
}

@media (max-width: 980px) {
  .fuji-topbar {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .fuji-top-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }

  .fuji-layout-body {
    grid-template-columns: 1fr;
  }

  .fuji-layout-side {
    position: static;
    max-height: 36vh;
    border-right: 0;
    border-bottom: 1px solid #dce5e1;
  }

  .fuji-photo-wall {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .fuji-layout-wall-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}

@media (max-width: 640px) {
  .fuji-page {
    padding: 10px;
  }

  .fuji-title-block h1 {
    font-size: 1.2rem;
  }

  .fuji-library-toolbar {
    top: 62px;
  }

  .fuji-layout-wall-toolbar {
    top: 62px;
  }

  .fuji-photo-wall {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    padding: 10px;
  }

  .fuji-layout-wall-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 10px;
  }

  .fuji-paper-shadow {
    padding: 10px;
  }
}
</style>
