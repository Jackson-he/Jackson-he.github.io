<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { RouterLink } from 'vue-router'
import { tripMapData } from '@/data/italyTripMapData'

const AMAP_KEY = (import.meta.env.VITE_AMAP_KEY || '').trim()

const pointCategoryColors = {
  交通: '#8b5cf6',
  住宿建议: '#64748b',
  景点: '#ef4444',
  婚纱照: '#ec4899',
  乡村: '#22c55e',
  湖区: '#06b6d4',
  美食: '#f59e0b',
  default: '#6366f1',
}

const routeColors = {
  航班: '#8b5cf6',
  高铁: '#2563eb',
  火车: '#2563eb',
  船: '#16a34a',
  步行: '#f97316',
  '包车/自驾': '#06b6d4',
  default: '#6366f1',
}

const routeLegend = [
  { label: '航班', color: routeColors['航班'] },
  { label: '高铁 / 火车', color: routeColors['高铁'] },
  { label: '船', color: routeColors['船'] },
  { label: '步行', color: routeColors['步行'] },
  { label: '包车 / 自驾', color: routeColors['包车/自驾'] },
]

const dayHighlights = [
  { title: 'D1-D2 长沙 → 佛罗伦萨', text: '先把婚纱照前的缓冲留够，抵达当天只安排轻松散步。' },
  { title: 'D3-D4 佛罗伦萨婚纱照', text: '拍摄两天尽量不插入高强度景点，把体力和光线留给拍摄。' },
  { title: 'D5 托斯卡纳乡村', text: 'Val d’Orcia、Pienza、San Quirico 组成最经典的一日线。' },
  { title: 'D6-D8 佛罗伦萨 → 罗马', text: '先看乌菲兹，再坐高铁去罗马，古城线和梵蒂冈线各一天。' },
  { title: 'D9-D10 罗马 → 威尼斯', text: '第一天走经典主岛，第二天出海岛，节奏轻一点更像度假。' },
  { title: 'D11-D13 威尼斯 → 科莫湖 / 米兰', text: '最后两天切换到湖区慢旅行，再从米兰返程。' },
]

const categoryList = [...new Set(tripMapData.points.map((point) => point.category))]
const selectedCategories = ref([...categoryList])
const mapElement = ref(null)
const mapLoading = ref(false)
const mapReady = ref(false)
const loadError = ref('')

const markerEntries = []
const routeEntries = []
let mapInstance = null
let infoWindow = null

const overlayTitle = computed(() => {
  if (loadError.value) {
    return '地图暂时还没加载起来'
  }

  if (mapLoading.value) {
    return '正在加载高德地图…'
  }

  return '等你填入高德 key 后，这里会显示地图'
})

const overlayMessage = computed(() => {
  if (loadError.value) {
    return loadError.value
  }

  if (mapLoading.value) {
    return '脚本加载成功后，会自动绘制意大利行程点位和路线。'
  }

  return '在项目根目录创建 .env.local，并填入 VITE_AMAP_KEY=你的高德 Web 端 JS API key。'
})

watchEffect(() => {
  document.title = '意大利旅行地图'
})

watch(
  selectedCategories,
  () => {
    updateMarkerVisibility()
  },
  { deep: true },
)

onMounted(async () => {
  if (!AMAP_KEY) {
    loadError.value = '未检测到 VITE_AMAP_KEY，请先在项目根目录创建 .env.local 并配置 key。'
    return
  }

  mapLoading.value = true

  try {
    await loadAmapScript()
    initMap()
    mapReady.value = true
    loadError.value = ''
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '地图加载失败，请稍后重试。'
  } finally {
    mapLoading.value = false
  }
})

onBeforeUnmount(() => {
  markerEntries.splice(0)
  routeEntries.splice(0)
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
  infoWindow = null
})

function toggleCategory(category) {
  const selected = new Set(selectedCategories.value)

  if (selected.has(category)) {
    selected.delete(category)
  } else {
    selected.add(category)
  }

  selectedCategories.value = categoryList.filter((item) => selected.has(item))
}

function isCategorySelected(category) {
  return selectedCategories.value.includes(category)
}

function pointCount(category) {
  return tripMapData.points.filter((point) => point.category === category).length
}

function categoryColor(category) {
  return pointCategoryColors[category] || pointCategoryColors.default
}

function loadAmapScript() {
  if (window.AMap) {
    return Promise.resolve(window.AMap)
  }

  if (window.__travelMapAmapPromise) {
    return window.__travelMapAmapPromise
  }

  window.__travelMapAmapPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(AMAP_KEY)}`
    script.async = true
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap)
        return
      }

      reject(new Error('高德脚本已加载，但地图对象没有初始化成功。'))
    }
    script.onerror = () => {
      reject(new Error('高德脚本加载失败，请检查 key、域名白名单或网络环境。'))
    }
    document.head.appendChild(script)
  })

  return window.__travelMapAmapPromise
}

function initMap() {
  if (!window.AMap || !mapElement.value) {
    return
  }

  const { AMap } = window

  mapInstance = new AMap.Map(mapElement.value, {
    viewMode: '2D',
    zoom: 6,
    center: [11.4, 43.4],
    zooms: [3, 18],
  })

  infoWindow = new AMap.InfoWindow({
    offset: new AMap.Pixel(0, -24),
  })

  tripMapData.routes.forEach((route) => {
    const polyline = new AMap.Polyline({
      path: route.path,
      strokeColor: routeColors[route.transport] || routeColors.default,
      strokeWeight: route.transport === '航班' ? 3 : 4,
      strokeOpacity: 0.92,
      strokeStyle: route.transport === '航班' ? 'dashed' : 'solid',
      lineJoin: 'round',
      lineCap: 'round',
    })

    polyline.on('click', () => {
      openInfoWindow(buildRouteInfo(route), route.path[Math.floor(route.path.length / 2)])
    })

    polyline.setMap(mapInstance)
    routeEntries.push({ route, overlay: polyline })
  })

  tripMapData.points.forEach((point) => {
    const marker = new AMap.Marker({
      position: [point.lng, point.lat],
      title: point.name,
      offset: new AMap.Pixel(-10, -10),
      content: buildMarkerHtml(categoryColor(point.category)),
    })

    marker.on('click', () => {
      openInfoWindow(buildPointInfo(point), [point.lng, point.lat])
    })

    marker.setMap(mapInstance)
    markerEntries.push({ point, overlay: marker })
  })

  updateMarkerVisibility()
}

function updateMarkerVisibility() {
  if (!mapInstance) {
    return
  }

  markerEntries.forEach(({ point, overlay }) => {
    const visible = selectedCategories.value.includes(point.category)
    overlay.setMap(visible ? mapInstance : null)
  })

  fitTripView()
}

function fitTripView() {
  if (!mapInstance || !window.AMap) {
    return
  }

  const visibleMarkers = markerEntries
    .filter(({ point }) => selectedCategories.value.includes(point.category) && point.city !== '长沙')
    .map(({ overlay }) => overlay)

  const routeOverlays = routeEntries
    .filter(({ route }) => route.transport !== '航班')
    .map(({ overlay }) => overlay)

  const overlays = [...routeOverlays, ...visibleMarkers]

  if (overlays.length) {
    mapInstance.setFitView(overlays, false, [48, 48, 48, 48])
  }
}

function openInfoWindow(content, position) {
  if (!mapInstance || !infoWindow) {
    return
  }

  infoWindow.setContent(content)
  infoWindow.open(mapInstance, position)
}

function buildMarkerHtml(color) {
  return `
    <div style="width:20px;height:20px;border-radius:999px;background:${color};border:3px solid rgba(255,255,255,0.92);box-shadow:0 10px 24px rgba(15,23,42,0.24);"></div>
  `
}

function buildPointInfo(point) {
  return `
    <div style="padding:10px 12px;max-width:260px;color:#0f172a;line-height:1.7;">
      <strong style="display:block;font-size:14px;">${escapeHtml(point.day)} · ${escapeHtml(point.name)}</strong>
      <span style="display:block;color:#475569;font-size:12px;">${escapeHtml(point.date)} · ${escapeHtml(point.city)} · ${escapeHtml(point.category)}</span>
      <span style="display:block;margin-top:6px;color:#334155;font-size:13px;">${escapeHtml(point.note)}</span>
    </div>
  `
}

function buildRouteInfo(route) {
  return `
    <div style="padding:10px 12px;max-width:260px;color:#0f172a;line-height:1.7;">
      <strong style="display:block;font-size:14px;">${escapeHtml(route.day)} · ${escapeHtml(route.name)}</strong>
      <span style="display:block;color:#475569;font-size:12px;">${escapeHtml(route.date)} · ${escapeHtml(route.transport)}</span>
      <span style="display:block;margin-top:6px;color:#334155;font-size:13px;">${escapeHtml(route.note)}</span>
    </div>
  `
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
</script>

<template>
  <main class="page page--violet travel-map-page">
    <div class="page-container travel-map-container">
      <RouterLink to="/projects/tools" class="back-link">← 返回工具页</RouterLink>

      <section class="hero travel-hero">
        <p class="eyebrow">Travel Map</p>
        <h1 class="hero-title">意大利旅行地图</h1>
        <p class="hero-subtitle">
          把婚纱照行程、跨城路线和每日重点整理到一张地图里，后续只要替换真实酒店坐标就能继续细化。
        </p>
      </section>

      <section class="travel-layout">
        <aside class="travel-sidebar">
          <section class="panel travel-panel">
            <div class="panel-header panel-header--stack">
              <div>
                <h2 class="panel-title">{{ tripMapData.title }}</h2>
                <p class="panel-subtitle">{{ tripMapData.subtitle }}</p>
              </div>
            </div>

            <div class="surface-block travel-note-block">
              <p class="travel-note-title">接入说明</p>
              <p class="travel-note-text">
                请在项目根目录创建 <code>.env.local</code>，填入 <code>VITE_AMAP_KEY=你的高德 Web 端 JS API key</code>。
              </p>
              <p v-if="loadError" class="travel-feedback travel-feedback--error">{{ loadError }}</p>
              <p v-else-if="mapLoading" class="travel-feedback">地图脚本加载中，稍等一下就好。</p>
              <p v-else-if="mapReady" class="travel-feedback travel-feedback--success">地图已经加载，可以点点位看详情。</p>
            </div>
          </section>

          <section class="panel travel-panel">
            <h2 class="panel-title">点位筛选</h2>
            <div class="travel-filter-list">
              <button
                v-for="category in categoryList"
                :key="category"
                type="button"
                class="travel-filter-chip"
                :class="{ 'is-active': isCategorySelected(category) }"
                @click="toggleCategory(category)"
              >
                <span class="travel-filter-dot" :style="{ backgroundColor: categoryColor(category) }"></span>
                <span>{{ category }}</span>
                <span class="travel-filter-count">{{ pointCount(category) }}</span>
              </button>
            </div>
          </section>

          <section class="panel travel-panel">
            <h2 class="panel-title">路线图例</h2>
            <div class="travel-legend-list">
              <div v-for="item in routeLegend" :key="item.label" class="travel-legend-row">
                <span class="travel-legend-line" :style="{ borderTopColor: item.color }"></span>
                <span>{{ item.label }}</span>
              </div>
            </div>
            <p class="panel-subtitle travel-small-text">地图默认聚焦意大利段路线，国际航班线会保留但不参与自动缩放。</p>
          </section>

          <section class="panel travel-panel">
            <h2 class="panel-title">每日节奏</h2>
            <div class="travel-day-list">
              <article v-for="item in dayHighlights" :key="item.title" class="travel-day-card">
                <strong>{{ item.title }}</strong>
                <span>{{ item.text }}</span>
              </article>
            </div>
          </section>
        </aside>

        <section class="travel-map-card">
          <div ref="mapElement" class="travel-map-canvas"></div>
          <div v-if="!mapReady" class="travel-map-overlay">
            <div class="travel-map-overlay-card">
              <strong>{{ overlayTitle }}</strong>
              <span>{{ overlayMessage }}</span>
            </div>
          </div>
        </section>
      </section>
    </div>
  </main>
</template>

<style scoped>
.travel-map-container {
  width: min(1400px, 100%);
}

.travel-hero {
  margin-bottom: 24px;
}

.travel-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.travel-sidebar {
  display: grid;
  gap: 18px;
}

.travel-panel {
  padding: 22px;
}

.panel-header--stack {
  align-items: stretch;
}

.travel-note-block {
  display: grid;
  gap: 8px;
}

.travel-note-title {
  margin: 0;
  font-weight: 700;
}

.travel-note-text,
.travel-small-text {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.travel-feedback {
  margin: 4px 0 0;
  color: #cbd5e1;
  font-size: 0.95rem;
}

.travel-feedback--success {
  color: #86efac;
}

.travel-feedback--error {
  color: #fda4af;
}

.travel-filter-list,
.travel-day-list {
  display: grid;
  gap: 10px;
}

.travel-filter-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  text-align: left;
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.travel-filter-chip:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.12);
}

.travel-filter-chip.is-active {
  border-color: rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.16);
}

.travel-filter-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  flex: none;
}

.travel-filter-count {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.travel-legend-list {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

.travel-legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.travel-legend-line {
  display: inline-block;
  width: 28px;
  border-top: 3px solid currentColor;
}

.travel-day-card {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.travel-day-card strong {
  font-size: 0.95rem;
}

.travel-day-card span {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.92rem;
}

.travel-map-card {
  position: sticky;
  top: 32px;
  min-height: 760px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  background: rgba(15, 23, 42, 0.46);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.travel-map-canvas {
  width: 100%;
  min-height: 760px;
}

.travel-map-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.74));
}

.travel-map-overlay-card {
  display: grid;
  gap: 10px;
  width: min(360px, 100%);
  padding: 20px 22px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: var(--shadow);
}

.travel-map-overlay-card strong {
  font-size: 1.02rem;
}

.travel-map-overlay-card span {
  color: var(--text-secondary);
  line-height: 1.7;
}

code {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-family: 'SFMono-Regular', ui-monospace, monospace;
  font-size: 0.88em;
}

@media (max-width: 1180px) {
  .travel-layout {
    grid-template-columns: 1fr;
  }

  .travel-map-card {
    position: static;
    min-height: 70vh;
  }

  .travel-map-canvas {
    min-height: 70vh;
  }
}

@media (max-width: 640px) {
  .travel-map-page {
    padding-inline: 14px;
  }

  .travel-panel {
    padding: 18px;
  }

  .travel-map-card,
  .travel-map-canvas {
    min-height: 62vh;
  }
}
</style>
