<script setup>
import { computed, ref, watch, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { italyTravelCompanionData as trip } from '@/data/italyTravelCompanionData'

// --- Lookup Maps ---
const dayMap = new Map(trip.days.map(d => [d.id, d]))
const placeMap = new Map(trip.places.map(p => [p.id, p]))
const ticketMap = new Map(trip.tickets.map(t => [t.id, t]))
const transportMap = new Map(trip.transportLegs.map(l => [l.id, l]))

// --- State ---
const tabs = [
  { id: 'today', label: 'Today', caption: '今日时间线' },
  { id: 'map', label: 'Map', caption: '当天地图' },
  { id: 'tickets', label: 'Tickets', caption: '票据' },
  { id: 'transport', label: 'Transport', caption: '交通' },
  { id: 'trip', label: 'Trip', caption: '旅程总览' }
]
const activeTab = ref('today')
const selectedDayId = ref(trip.tripMeta.defaultDayId)
const mapScope = ref('today')
const mapCity = ref(trip.days.find(d => d.id === trip.tripMeta.defaultDayId)?.city || '')
const activePlaceId = ref(null)
const navMode = ref('transit')

// --- AMAP State ---
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || ''
const mapContainer = ref(null)
let amapInstance = null
let mapMarkers = []
let mapPolylineObj = null
let activeInfoWindow = null
const mapReady = ref(false)
const mapLoading = ref(false)
const mapLoadError = ref(false)
let scriptLoaded = false

// --- Computed ---
const selectedDay = computed(() => dayMap.get(selectedDayId.value) || trip.days[0])

const cityOptions = computed(() => [...new Set(trip.days.map(d => d.city))])

const selectedHotel = computed(() => {
  if (!selectedDay.value?.hotelPlaceId) return null
  return placeMap.get(selectedDay.value.hotelPlaceId) || null
})

const selectedDayTickets = computed(() => {
  return (selectedDay.value?.ticketIds || [])
    .map(id => ticketMap.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.timeSort || '').localeCompare(b.timeSort || ''))
})

const selectedDayLegs = computed(() => {
  return (selectedDay.value?.transportIds || [])
    .map(id => transportMap.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''))
})

const nextTicket = computed(() => selectedDayTickets.value[0] || null)
const nextTransport = computed(() => selectedDayLegs.value[0] || null)

const quickCards = computed(() => {
  const cards = []
  const hotel = selectedHotel.value
  if (hotel) {
    cards.push({
      title: 'Hotel', headline: hotel.name,
      meta: hotel.address, text: hotel.note || hotel.contact || '',
      placeId: hotel.id
    })
  }
  const transport = nextTransport.value
  if (transport) {
    const fromP = placeMap.get(transport.fromPlaceId)
    const toP = placeMap.get(transport.toPlaceId)
    cards.push({
      title: 'Next Ride', headline: transport.title,
      meta: `${transport.departureTime} → ${transport.arrivalTime} · ${transport.operator}`,
      text: transport.serviceNo, placeId: transport.toPlaceId
    })
  }
  const ticket = nextTicket.value
  if (ticket) {
    const p = ticket.placeId ? placeMap.get(ticket.placeId) : null
    cards.push({
      title: 'Next Ticket', headline: ticket.title,
      meta: `${ticket.time} · ${ticket.orderRef || ''}`,
      text: ticket.notes?.[0] || '', placeId: ticket.placeId || ''
    })
  }
  if (selectedDay.value?.topReminder) {
    cards.push({
      title: 'Reminder', headline: '重要提醒',
      meta: selectedDay.value.topReminder, text: '', placeId: ''
    })
  }
  return cards
})

const selectedDayPlanningCards = computed(() => selectedDay.value?.planningCards || [])

const timelineEntries = computed(() => {
  if (!selectedDay.value?.timeline) return []
  return selectedDay.value.timeline.map(item => {
    let entry = { id: item.refId, time: '', title: '', subtitle: '', note: '', tags: [], placeId: '', navigationPlaceId: '', kind: item.type }
    if (item.type === 'hotel') {
      const p = placeMap.get(item.refId)
      if (p) { entry = { ...entry, time: p.timeSort, title: p.name, subtitle: p.address, note: p.note, tags: p.riskTags || [], placeId: p.id, navigationPlaceId: p.id } }
    } else if (item.type === 'place') {
      const p = placeMap.get(item.refId)
      if (p) { entry = { ...entry, time: p.timeSort, title: p.name, subtitle: typeLabel(p.type), note: p.note, tags: p.riskTags || [], placeId: p.id, navigationPlaceId: p.id } }
    } else if (item.type === 'ticket') {
      const t = ticketMap.get(item.refId)
      if (t) {
        const p = t.placeId ? placeMap.get(t.placeId) : null
        entry = { ...entry, time: t.time, title: t.title, subtitle: `${t.type === 'train' ? '火车' : '景点票'} · ${t.operator || ''}`, note: t.notes?.join('；') || '', tags: t.warnings || [], placeId: t.placeId || '', navigationPlaceId: t.placeId || '' }
      }
    } else if (item.type === 'transport') {
      const leg = transportMap.get(item.refId)
      if (leg) {
        const fromP = placeMap.get(leg.fromPlaceId)
        const toP = placeMap.get(leg.toPlaceId)
        entry = { ...entry, time: leg.departureTime, title: leg.title, subtitle: `${leg.operator} · ${leg.serviceNo}`, note: leg.ticketRules || '', tags: [], placeId: leg.toPlaceId, navigationPlaceId: leg.toPlaceId }
      }
    }
    return entry
  })
})

const allTickets = computed(() => {
  return [...trip.tickets].sort((a, b) => `${a.date}${a.timeSort}`.localeCompare(`${b.date}${b.timeSort}`))
})

const groupedTripDays = computed(() => {
  const groups = []
  let currentCity = null
  for (const day of trip.days) {
    const hotel = day.hotelPlaceId ? placeMap.get(day.hotelPlaceId) : null
    const firstLeg = day.transportIds?.[0] ? transportMap.get(day.transportIds[0]) : null
    const firstTicket = day.ticketIds?.[0] ? ticketMap.get(day.ticketIds[0]) : null
    if (day.city !== currentCity) {
      currentCity = day.city
      groups.push({ city: day.city, startingLabel: day.label, days: [] })
    }
    groups[groups.length - 1].days.push({
      ...day,
      hotelName: hotel?.name || '',
      keyTicket: firstTicket ? `${firstTicket.time} ${firstTicket.title}` : '',
      keyTransport: firstLeg ? `${firstLeg.departureTime} ${firstLeg.title}` : '',
      isCitySwitch: day.routePlaceIds?.some(pid => {
        const p = placeMap.get(pid)
        return p?.type === 'airport' || p?.type === 'station'
      }),
      isHotelSwitch: !!day.hotelPlaceId
    })
  }
  return groups
})

const mapPlaces = computed(() => {
  if (mapScope.value === 'today' && selectedDay.value) {
    return (selectedDay.value.routePlaceIds || []).map(id => placeMap.get(id)).filter(Boolean)
  }
  if (mapScope.value === 'city') {
    return trip.places.filter(p => p.city === mapCity.value)
  }
  return trip.places
})

const mapNodes = computed(() => buildMapNodes(mapPlaces.value))
const mapPolyline = computed(() => mapNodes.value.map(n => `${n.x},${n.y}`).join(' '))
const activeMapPlace = computed(() => {
  if (activePlaceId.value) return placeMap.get(activePlaceId.value)
  return mapPlaces.value[0] || null
})
const mapLabel = computed(() => {
  const c = mapCity.value || selectedDay.value?.city || ''
  if (mapScope.value === 'today') return `${c} · 今天`
  if (mapScope.value === 'city') return `${c} · 城市总览`
  return `全部 · ${mapPlaces.value.length} 个地点`
})

// --- Watchers ---
watchEffect(() => { document.title = trip.tripMeta.title })

watch([selectedDay, mapPlaces], () => {
  if (mapScope.value === 'today' && selectedDay.value) {
    mapCity.value = selectedDay.value.city
  }
  if (!mapPlaces.value.find(p => p.id === activePlaceId.value)) {
    activePlaceId.value = mapPlaces.value[0]?.id || null
  }
  if (mapReady.value) {
    initMapMarkers()
  }
})

// --- Methods ---
function switchToDay(dayId) { selectedDayId.value = dayId }

function setMapView(scope, city) {
  mapScope.value = scope
  if (city) mapCity.value = city
  if (mapReady.value) initMapMarkers()
}

function focusPlaceOnMap(placeId) {
  const place = placeMap.get(placeId)
  if (!place) return
  const owningDay = trip.days.find(d => d.routePlaceIds?.includes(placeId))
  if (owningDay) selectedDayId.value = owningDay.id
  activeTab.value = 'map'
  activePlaceId.value = placeId
  mapScope.value = 'today'
  if (mapReady.value) {
    setTimeout(() => {
      focusMarker(placeId)
    }, 200)
  }
}

function typeLabel(type) {
  const labels = { hotel: '酒店', attraction: '景点', station: '车站', restaurant: '餐厅', airport: '机场' }
  return labels[type] || type
}

function sortByDateTime(items, accessor) {
  return [...items].sort((a, b) => {
    const av = accessor ? accessor(a) : `${a.date}${a.timeSort || a.time || ''}`
    const bv = accessor ? accessor(b) : `${b.date}${b.timeSort || b.time || ''}`
    return av.localeCompare(bv)
  })
}

function buildMapNodes(places) {
  if (!places.length) return []
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const p of places) {
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
  }
  const pad = 10
  const lngRange = maxLng - minLng || 0.001
  const latRange = maxLat - minLat || 0.001
  return places.map(p => ({
    id: p.id, name: p.name, lat: p.lat, lng: p.lng, type: p.type,
    x: pad + ((p.lng - minLng) / lngRange) * (100 - 2 * pad),
    y: 100 - (pad + ((p.lat - minLat) / latRange) * (100 - 2 * pad))
  }))
}

function googleMapsUrl(place) {
  const modes = { walk: 'walking', transit: 'transit', drive: 'driving' }
  const mode = modes[navMode.value] || 'transit'
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=${mode}`
}

function appleMapsUrl(place) {
  const modes = { walk: 'w', transit: 'r', drive: 'd' }
  return `https://maps.apple.com/?daddr=${place.lat},${place.lng}&dirflg=${modes[navMode.value] || 'r'}`
}

function placeForTicket(ticket) { return ticket.placeId ? placeMap.get(ticket.placeId) : null }
function placeForTransport(leg) { return leg.toPlaceId ? placeMap.get(leg.toPlaceId) : null }

// --- AMAP Integration ---
function loadAmapScript() {
  return new Promise((resolve, reject) => {
    if (scriptLoaded) { resolve(); return }
    if (!AMAP_KEY) { reject(new Error('No AMAP key')); return }
    const existing = document.querySelector('script[src*="webapi.amap.com"]')
    if (existing) {
      if (window['AMap']) { scriptLoaded = true; resolve(); return }
    }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`
    script.onload = () => { scriptLoaded = true; resolve() }
    script.onerror = () => reject(new Error('AMAP script load failed'))
    document.head.appendChild(script)
  })
}

async function initAMap() {
  if (!mapContainer.value || mapReady.value) return
  mapLoading.value = true
  mapLoadError.value = false
  try {
    await loadAmapScript()
    if (!window['AMap']) throw new Error('AMAP not available')
    amapInstance = new window['AMap'].Map(mapContainer.value, {
      zoom: 13,
      center: [12.4964, 41.9028],
      resizeEnable: true
    })
    mapReady.value = true
    initMapMarkers()
  } catch (e) {
    mapLoadError.value = true
    console.error('AMAP init error:', e)
  } finally {
    mapLoading.value = false
  }
}

function initMapMarkers() {
  if (!amapInstance || !mapReady.value) return
  amapInstance.clearMap()
  mapMarkers = []
  if (activeInfoWindow) { activeInfoWindow.close(); activeInfoWindow = null }

  const places = mapPlaces.value
  if (!places.length) return

  const center = [places[0].lng, places[0].lat]
  amapInstance.setCenter(center)
  amapInstance.setZoom(13)

  places.forEach((place, index) => {
    const markerContent = `<div class="amap-marker ${place.id === activePlaceId.value ? 'amap-marker--active' : ''}" data-place-id="${place.id}">
      <span class="amap-marker-num">${index + 1}</span>
    </div>`
    const marker = new window['AMap'].Marker({
      position: [place.lng, place.lat],
      content: markerContent,
      offset: new window['AMap'].Pixel(-15, -30)
    })
    marker.extData = { place, index: index + 1 }
    marker.on('click', () => {
      activePlaceId.value = place.id
      showInfoWindow(place)
      initMapMarkers()
    })
    marker.setMap(amapInstance)
    mapMarkers.push(marker)
  })

  // Draw polyline
  if (places.length > 1) {
    const path = places.map(p => new window['AMap'].LngLat(p.lng, p.lat))
    mapPolylineObj = new window['AMap'].Polyline({
      path,
      strokeColor: '#c2594a',
      strokeWeight: 3,
      strokeOpacity: 0.8,
      lineJoin: 'round',
      lineCap: 'round'
    })
    mapPolylineObj.setMap(amapInstance)
  }

  amapInstance.setFitView()
}

function showInfoWindow(place) {
  if (!amapInstance || !window['AMap']) return
  if (activeInfoWindow) activeInfoWindow.close()
  const content = `<div class="amap-info-content">
    <div class="amap-info-label">${typeLabel(place.type)}</div>
    <h4 class="amap-info-title">${place.name}</h4>
    ${place.plannedTime ? `<div class="amap-info-time">计划时间 ${place.plannedTime}</div>` : ''}
    <div class="amap-info-addr">${place.address}</div>
    ${place.note ? `<div class="amap-info-note">${place.note}</div>` : ''}
    ${place.officialLink ? `<a href="${place.officialLink}" target="_blank" rel="noopener" class="amap-info-link">官网链接</a>` : ''}
  </div>`
  activeInfoWindow = new window['AMap'].InfoWindow({
    content,
    offset: new window['AMap'].Pixel(0, -30)
  })
  const marker = mapMarkers.find(m => m.extData?.place.id === place.id)
  if (marker) {
    activeInfoWindow.open(amapInstance, marker.getPosition())
  }
}

function focusMarker(placeId) {
  const marker = mapMarkers.find(m => m.extData?.place.id === placeId)
  if (marker) {
    activePlaceId.value = placeId
    const place = marker.extData.place
    amapInstance.setCenter([place.lng, place.lat], true)
    showInfoWindow(place)
    initMapMarkers()
  }
}

// --- Lifecycle ---
onMounted(() => {
  if (activeTab.value === 'map') {
    initAMap()
  }
})

watch(activeTab, (tab) => {
  if (tab === 'map' && !mapReady.value) {
    setTimeout(() => initAMap(), 100)
  } else if (tab === 'map' && mapReady.value) {
    setTimeout(() => initMapMarkers(), 100)
  }
})
</script>

<template>
  <main class="companion-page">
    <div class="companion-layout">
      <section class="app-card">
        <!-- Header -->
        <header class="app-header">
          <div class="app-header-left">
            <span class="app-city">{{ selectedDay.city }}</span>
            <span class="app-title">{{ trip.tripMeta.title }}</span>
            <span class="app-subtitle">{{ selectedDay.label }} · {{ selectedDay.title }}</span>
          </div>
          <a v-if="selectedDay.weatherUrl" :href="selectedDay.weatherUrl" target="_blank" rel="noopener" class="weather-link">
            {{ selectedDay.weatherLabel }}
          </a>
        </header>

        <!-- Day Switcher -->
        <div class="day-switcher">
          <button v-for="day in trip.days" :key="day.id" class="day-chip" :class="{ 'day-chip--active': day.id === selectedDayId }" @click="switchToDay(day.id)">
            {{ day.label }}
          </button>
        </div>

        <!-- Alert Banner -->
        <div v-if="selectedDay.topReminder" class="alert-strip">
          <span class="alert-icon">!</span>
          <span>{{ selectedDay.topReminder }}</span>
        </div>

        <!-- Summary Grid -->
        <div class="summary-grid">
          <div v-for="(card, i) in quickCards" :key="i" class="summary-card">
            <span class="summary-label">{{ card.title }}</span>
            <span class="summary-headline">{{ card.headline }}</span>
            <span v-if="card.meta" class="summary-meta">{{ card.meta }}</span>
            <span v-if="card.text" class="summary-text">{{ card.text }}</span>
          </div>
        </div>

        <!-- ===== Today Tab ===== -->
        <section v-if="activeTab === 'today'" class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">今日行程 · {{ selectedDay.label }}</span>
            <button class="text-button" @click="activeTab = 'map'">切到地图</button>
          </div>
          <div v-if="selectedDayPlanningCards.length" class="planning-grid">
            <article v-for="card in selectedDayPlanningCards" :key="`${selectedDay.id}-${card.label}-${card.title}`" class="planning-card">
              <span class="planning-label">{{ card.label }}</span>
              <strong class="planning-title">{{ card.title }}</strong>
              <p class="planning-body">{{ card.body }}</p>
            </article>
          </div>
          <div class="timeline">
            <div class="timeline-rail"></div>
            <div v-for="entry in timelineEntries" :key="entry.id" class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-time">{{ entry.time }}</div>
              <div class="timeline-body">
                <span class="timeline-kind">{{ entry.kind }} · {{ typeLabel(entry.kind) }}</span>
                <strong>{{ entry.title }}</strong>
                <span v-if="entry.subtitle" class="timeline-subtitle">{{ entry.subtitle }}</span>
                <span v-if="entry.note" class="timeline-note">{{ entry.note }}</span>
                <div v-if="entry.tags?.length" class="chip-row">
                  <span v-for="tag in entry.tags" :key="tag" class="tag-chip tag-chip--soft">{{ tag }}</span>
                </div>
                <div class="action-row">
                  <button v-if="entry.placeId" class="solid-link" @click="focusPlaceOnMap(entry.placeId)">查看地图</button>
                  <a v-if="entry.navigationPlaceId" :href="googleMapsUrl(placeMap.get(entry.navigationPlaceId) || { lat: 0, lng: 0 })" target="_blank" rel="noopener" class="ghost-link">开始导航</a>
                </div>
              </div>
            </div>
            <div v-if="!timelineEntries.length" class="empty-ticket">今天暂无行程</div>
          </div>
        </section>

        <!-- ===== Map Tab ===== -->
        <section v-else-if="activeTab === 'map'" class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">{{ mapLabel }}</span>
          </div>

          <!-- Filter Strip -->
          <div class="filter-strip">
            <button class="filter-chip" :class="{ 'filter-chip--active': mapScope === 'today' }" @click="setMapView('today')">今天</button>
            <button v-for="city in cityOptions" :key="city" class="filter-chip" :class="{ 'filter-chip--active': mapScope === 'city' && mapCity === city }" @click="setMapView('city', city)">{{ city }}</button>
            <button class="filter-chip" :class="{ 'filter-chip--active': mapScope === 'all' }" @click="setMapView('all')">全部</button>
          </div>

          <!-- AMAP Canvas -->
          <div class="map-layout">
            <div class="map-surface">
              <div class="map-surface-head">
                <span class="panel-heading" style="font-size:13px">{{ mapLabel }}</span>
              </div>
              <div ref="mapContainer" class="amap-canvas" :class="{ 'amap-canvas--loading': mapLoading }">
                <div v-if="mapLoading" class="amap-overlay-loading">加载中...</div>
                <div v-if="mapLoadError" class="amap-overlay-error">地图加载失败，请检查 AMAP Key</div>
                <div v-if="!mapReady && !mapLoading" class="amap-overlay-loading">点击"Map"标签加载地图</div>
              </div>
              <p class="map-footnote">点击标记查看地点详情 · 导航使用 Google/Apple Maps</p>
            </div>

            <article class="map-detail" v-if="activeMapPlace">
              <div class="map-detail-top">
                <span class="detail-kicker">{{ typeLabel(activeMapPlace.type) }} {{ activeMapPlace.plannedTime }}</span>
                <h4 class="detail-title">{{ activeMapPlace.name }}</h4>
                <address class="detail-address">{{ activeMapPlace.address }}</address>
                <p v-if="activeMapPlace.note" class="detail-note">{{ activeMapPlace.note }}</p>
              </div>
              <div class="detail-grid">
                <div v-if="activeMapPlace.navigationNote" class="detail-field"><strong>导航备注</strong><span>{{ activeMapPlace.navigationNote }}</span></div>
                <div v-if="activeMapPlace.contact" class="detail-field"><strong>联系人</strong><span>{{ activeMapPlace.contact }}</span></div>
                <div v-if="activeMapPlace.orderRef" class="detail-field"><strong>订单号</strong><span>{{ activeMapPlace.orderRef }}</span></div>
                <div v-if="activeMapPlace.officialLink" class="detail-field"><strong>官网链接</strong><a :href="activeMapPlace.officialLink" target="_blank" rel="noopener">{{ activeMapPlace.officialLink }}</a></div>
              </div>
              <div class="mode-row">
                <button class="mode-chip" :class="{ 'mode-chip--active': navMode === 'walk' }" @click="navMode = 'walk'">步行</button>
                <button class="mode-chip" :class="{ 'mode-chip--active': navMode === 'transit' }" @click="navMode = 'transit'">公交</button>
                <button class="mode-chip" :class="{ 'mode-chip--active': navMode === 'drive' }" @click="navMode = 'drive'">打车</button>
              </div>
              <div class="action-row">
                <a :href="googleMapsUrl(activeMapPlace)" target="_blank" rel="noopener" class="solid-link">Google Maps</a>
                <a :href="appleMapsUrl(activeMapPlace)" target="_blank" rel="noopener" class="ghost-link">Apple Maps</a>
              </div>
            </article>
          </div>

          <!-- Place List -->
          <div class="place-list">
            <button v-for="(place, idx) in mapPlaces" :key="place.id" class="place-card" :class="{ 'place-card--active': place.id === activePlaceId }" @click="activePlaceId = place.id; focusMarker(place.id)">
              <span class="place-index">{{ idx + 1 }}</span>
              <div class="place-card-body">
                <strong>{{ place.name }}</strong>
                <span>{{ place.plannedTime || '' }} · {{ typeLabel(place.type) }}</span>
              </div>
            </button>
          </div>
        </section>

        <!-- ===== Tickets Tab ===== -->
        <section v-else-if="activeTab === 'tickets'" class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">票据管理</span>
          </div>

          <!-- Alerts -->
          <div class="alerts-grid">
            <div v-for="(alert, i) in trip.ticketAlerts" :key="i" class="alert-card">
              <strong>{{ alert.title }}</strong>
              <p>{{ alert.body }}</p>
            </div>
          </div>

          <!-- Today's Tickets -->
          <div class="ticket-block">
            <div class="section-heading">今天要用的票</div>
            <div v-if="selectedDayTickets.length" class="ticket-list">
              <div v-for="ticket in selectedDayTickets" :key="ticket.id" class="ticket-card">
                <div class="ticket-top">
                  <div class="ticket-qr"><span class="ticket-qr-box">{{ ticket.qrLabel || 'QR' }}</span></div>
                  <div>
                    <strong>{{ ticket.title }}</strong>
                    <span class="subtitle-line">{{ ticket.time }} · {{ ticket.orderRef }}</span>
                  </div>
                </div>
                <div v-if="ticket.warnings?.length" class="ticket-note">
                  <div v-for="w in ticket.warnings" :key="w" class="tag-chip tag-chip--soft">{{ w }}</div>
                </div>
                <div class="action-row">
                  <button v-if="ticket.placeId" class="solid-link" @click="focusPlaceOnMap(ticket.placeId)">查看地图</button>
                  <a v-if="ticket.officialLink" :href="ticket.officialLink" target="_blank" rel="noopener" class="ghost-link">官网入口</a>
                </div>
              </div>
            </div>
            <div v-else class="empty-ticket">今天没有票据</div>
          </div>

          <!-- All Tickets -->
          <div class="ticket-block">
            <div class="section-heading">全部票据</div>
            <div class="ticket-list">
              <div v-for="ticket in allTickets" :key="ticket.id" class="ticket-card ticket-card--compact">
                <strong>{{ ticket.date }} {{ ticket.time }} · {{ ticket.city }}</strong>
                <span class="subtitle-line">{{ ticket.title }}</span>
                <div class="action-row">
                  <button v-if="ticket.placeId" class="solid-link" @click="focusPlaceOnMap(ticket.placeId)">查看地图</button>
                  <a v-if="ticket.officialLink" :href="ticket.officialLink" target="_blank" rel="noopener" class="ghost-link">官网</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== Transport Tab ===== -->
        <section v-else-if="activeTab === 'transport'" class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">交通 · {{ selectedDay.label }}</span>
          </div>

          <!-- Transport Legs -->
          <div class="transport-list">
            <div v-for="leg in selectedDayLegs" :key="leg.id" class="transport-card">
              <div class="transport-top">
                <span class="transport-operator">{{ leg.operator }} · {{ leg.serviceNo }}</span>
                <strong>{{ leg.title }}</strong>
                <span class="transport-times">{{ leg.departureTime }} → {{ leg.arrivalTime }}</span>
              </div>
              <div class="transport-route">
                <span>{{ placeMap.get(leg.fromPlaceId)?.name || leg.fromPlaceId }}</span>
                <span>→</span>
                <span>{{ placeMap.get(leg.toPlaceId)?.name || leg.toPlaceId }}</span>
              </div>
              <div class="detail-grid">
                <div v-if="leg.ticketRules" class="detail-field"><strong>票务规则</strong><span>{{ leg.ticketRules }}</span></div>
                <div v-if="leg.needsActivation" class="detail-field"><strong>需要激活</strong><span>需要在车站打卡激活车票</span></div>
                <div v-if="leg.stationInfo" class="detail-field"><strong>站点信息</strong><span>{{ leg.stationInfo }}</span></div>
                <div v-if="leg.fallbackPlan" class="detail-field"><strong>备用方案</strong><span>{{ leg.fallbackPlan }}</span></div>
              </div>
              <div class="action-row">
                <a v-if="leg.stationMapLink" :href="leg.stationMapLink" target="_blank" rel="noopener" class="solid-link">站点地图</a>
                <button v-if="leg.toPlaceId" class="ghost-link" @click="focusPlaceOnMap(leg.toPlaceId)">到达导航</button>
                <a v-if="leg.officialLink" :href="leg.officialLink" target="_blank" rel="noopener" class="ghost-link">官网入口</a>
              </div>
            </div>
            <div v-if="!selectedDayLegs.length" class="empty-ticket">今天没有交通段</div>
          </div>

          <!-- Transport Rules -->
          <div class="rules-grid">
            <div v-for="(rule, i) in trip.transportRules" :key="i" class="rule-card">
              <strong>{{ rule.title }}</strong>
              <p>{{ rule.body }}</p>
            </div>
          </div>

          <!-- Resources -->
          <div class="resource-row">
            <a v-for="res in trip.transportResources" :key="res.title" :href="res.url" target="_blank" rel="noopener" class="resource-card">
              <strong>{{ res.title }}</strong>
              <span>{{ res.description }}</span>
            </a>
          </div>
        </section>

        <!-- ===== Trip Tab ===== -->
        <section v-else class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">旅程总览 · {{ trip.dateRange }}</span>
          </div>

          <!-- Jump Strip -->
          <div class="jump-strip">
            <button v-for="day in trip.days" :key="day.id" class="jump-chip" :class="{ 'jump-chip--active': day.id === selectedDayId }" @click="switchToDay(day.id)">{{ day.label }}</button>
          </div>

          <!-- City Groups -->
          <div class="trip-groups">
            <div v-for="group in groupedTripDays" :key="group.city" class="trip-group">
              <div class="trip-group-head">
                <strong>{{ group.city }}</strong>
                <span>{{ group.startingLabel }} 起</span>
              </div>
              <div class="trip-days">
                <div v-for="day in group.days" :key="day.id" class="trip-day-card" :class="{ 'trip-day-card--active': day.id === selectedDayId }" @click="switchToDay(day.id)">
                  <div class="trip-day-top">
                    <strong>{{ day.label }}</strong>
                    <span>{{ day.title }}</span>
                  </div>
                  <div class="chip-row">
                    <span v-if="day.isCitySwitch" class="tag-chip">城市切换</span>
                    <span v-if="day.isHotelSwitch" class="tag-chip tag-chip--soft">{{ day.hotelName }}</span>
                    <span v-if="day.keyTransport" class="tag-chip tag-chip--soft">{{ day.keyTransport }}</span>
                    <span v-if="day.keyTicket" class="tag-chip tag-chip--soft">{{ day.keyTicket }}</span>
                  </div>
                  <span class="trip-day-note">{{ day.weatherLabel }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <!-- Bottom Nav -->
      <nav class="bottom-nav">
        <button v-for="tab in tabs" :key="tab.id" class="bottom-nav-item" :class="{ 'bottom-nav-item--active': activeTab === tab.id }" @click="activeTab = tab.id">
          <span class="bottom-nav-label">{{ tab.label }}</span>
          <span class="bottom-nav-caption">{{ tab.caption }}</span>
        </button>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.companion-page {
  min-height: 100vh;
  background:
    radial-gradient(110% 140% at 10% 0%, rgba(194 89 74 / 0.08) 0%, transparent 55%),
    radial-gradient(100% 120% at 90% 0%, rgba(137 105 41 / 0.10) 0%, transparent 55%),
    linear-gradient(180deg, #f9f5f0, #f4ede4 40%, #ece3d6);
  padding: 24px 16px 100px;
  font-family: "Source Han Serif SC", "Noto Serif SC", "Georgia", serif;
  color: #2c2825;
}

.companion-layout {
  max-width: 1120px;
  margin: 0 auto;
}

.app-card {
  background: #fffcf8;
  border: 1px solid rgba(194 89 74 / 0.12);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(44 40 37 / 0.06);
  animation: card-rise 0.4s ease-out;
}

@keyframes card-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.app-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-city {
  font-size: 13px;
  color: #8b7d6b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.app-title {
  font-size: 22px;
  font-weight: 700;
  color: #2c2825;
  line-height: 1.2;
}

.app-subtitle {
  font-size: 14px;
  color: #8b7d6b;
}

.weather-link {
  font-size: 13px;
  color: #6b8f71;
  background: rgba(107 143 113 / 0.10);
  padding: 6px 12px;
  border-radius: 8px;
  text-decoration: none;
  white-space: nowrap;
}

/* Day Switcher */
.day-switcher {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 16px;
}

.day-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(194 89 74 / 0.2);
  background: transparent;
  color: #8b7d6b;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.day-chip--active {
  background: #c2594a;
  color: #fff;
  border-color: #c2594a;
}

/* Alert Strip */
.alert-strip {
  background: rgba(212 160 23 / 0.12);
  border-left: 3px solid #d4a017;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.alert-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #d4a017;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.summary-card {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-label {
  font-size: 11px;
  text-transform: uppercase;
  color: #c2594a;
  letter-spacing: 0.06em;
  font-weight: 600;
}

.summary-headline {
  font-size: 14px;
  font-weight: 600;
}

.summary-meta {
  font-size: 12px;
  color: #8b7d6b;
}

.summary-text {
  font-size: 12px;
  color: #6b5d50;
}

/* Day Planning */
.planning-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.planning-card {
  background: linear-gradient(180deg, rgba(255 248 241 / 0.96), rgba(250 244 236 / 0.98));
  border: 1px solid rgba(194 89 74 / 0.12);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.planning-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a06a4a;
  font-weight: 700;
}

.planning-title {
  font-size: 15px;
  line-height: 1.35;
}

.planning-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: #5d5145;
}

/* Tab Panel */
.tab-panel {
  margin-top: 8px;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-meta {
  font-size: 13px;
  color: #8b7d6b;
}

.text-button {
  background: none;
  border: 1px solid #c2594a;
  color: #c2594a;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

/* Timeline */
.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline-rail {
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #c2594a 0%, rgba(194 89 74 / 0.1) 100%);
  border-radius: 1px;
}

.timeline-item {
  position: relative;
  padding-bottom: 20px;
}

.timeline-dot {
  position: absolute;
  left: -26px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #c2594a;
  border: 2px solid #fffcf8;
  box-shadow: 0 0 0 2px rgba(194 89 74 / 0.2);
}

.timeline-time {
  font-size: 13px;
  font-weight: 700;
  color: #c2594a;
  margin-bottom: 2px;
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-kind {
  font-size: 11px;
  text-transform: uppercase;
  color: #8b7d6b;
  letter-spacing: 0.04em;
}

.timeline-subtitle {
  font-size: 13px;
  color: #6b5d50;
}

.timeline-note {
  font-size: 13px;
  color: #8b7d6b;
  font-style: italic;
}

/* Chips & Tags */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(194 89 74 / 0.1);
  color: #c2594a;
}

.tag-chip--soft {
  background: rgba(107 143 113 / 0.1);
  color: #6b8f71;
}

/* Action Row */
.action-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.solid-link {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #c2594a;
  color: #fff;
  border: none;
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
}

.ghost-link {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: transparent;
  color: #6b8f71;
  border: 1px solid rgba(107 143 113 / 0.3);
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
}

/* Filter Strip */
.filter-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 12px;
  padding-bottom: 4px;
}

.filter-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(194 89 74 / 0.2);
  background: transparent;
  color: #8b7d6b;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.filter-chip--active {
  background: #2e5c55;
  color: #fff;
  border-color: #2e5c55;
}

/* Map Layout */
.map-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .map-layout {
    grid-template-columns: 1fr;
  }
}

.map-surface {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.map-surface-head {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(194 89 74 / 0.08);
}

.amap-canvas {
  position: relative;
  width: 100%;
  height: 320px;
  background: #f5f0e8;
}

.amap-canvas :deep(.amap-marker) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #c2594a;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(194 89 74 / 0.3);
  font-family: inherit;
}

.amap-canvas :deep(.amap-marker--active) {
  background: #2e5c55;
  box-shadow: 0 0 0 4px rgba(46 92 85 / 0.2), 0 2px 8px rgba(46 92 85 / 0.3);
}

.amap-overlay-loading, .amap-overlay-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #8b7d6b;
  background: rgba(245 240 232 / 0.9);
}

.amap-overlay-error {
  color: #c2594a;
}

.amap-canvas--loading {
  opacity: 0.5;
}

.amap-info-content {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  max-width: 260px;
}

.map-footnote {
  font-size: 11px;
  color: #8b7d6b;
  padding: 6px 12px;
  margin: 0;
}

/* Map Detail */
.map-detail {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-detail-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-kicker {
  font-size: 11px;
  text-transform: uppercase;
  color: #c2594a;
  letter-spacing: 0.06em;
}

.detail-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.detail-address {
  font-size: 13px;
  color: #8b7d6b;
  font-style: normal;
}

.detail-note {
  font-size: 13px;
  color: #6b5d50;
  font-style: italic;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-field {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-field strong {
  color: #8b7d6b;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-field a {
  color: #6b8f71;
  word-break: break-all;
}

/* Navigation Mode */
.mode-row {
  display: flex;
  gap: 6px;
}

.mode-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(107 143 113 / 0.3);
  background: transparent;
  color: #6b8f71;
  cursor: pointer;
  font-family: inherit;
}

.mode-chip--active {
  background: #6b8f71;
  color: #fff;
  border-color: #6b8f71;
}

/* Place List */
.place-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.place-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.place-card--active {
  background: rgba(194 89 74 / 0.06);
  border-color: rgba(194 89 74 / 0.2);
}

.place-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #c2594a;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.place-card-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.place-card-body span {
  font-size: 12px;
  color: #8b7d6b;
}

/* Alerts Grid */
.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.alert-card {
  background: rgba(212 160 23 / 0.1);
  border-left: 3px solid #d4a017;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
}

.alert-card strong {
  display: block;
  margin-bottom: 4px;
  color: #8a6d10;
}

.alert-card p {
  margin: 0;
  color: #6b5d50;
}

/* Tickets */
.ticket-block {
  margin-bottom: 20px;
}

.ticket-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.ticket-card {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ticket-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.ticket-qr {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ticket-qr-box {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2c2825;
  color: #fff;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  font-family: monospace;
}

.ticket-card strong {
  font-size: 14px;
}

.subtitle-line {
  font-size: 12px;
  color: #8b7d6b;
  display: block;
  margin-top: 2px;
}

.ticket-note {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ticket-card--compact {
  padding: 10px 12px;
}

.empty-ticket {
  font-size: 13px;
  color: #8b7d6b;
  padding: 20px;
  text-align: center;
}

/* Transport */
.transport-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.transport-card {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transport-operator {
  font-size: 11px;
  text-transform: uppercase;
  color: #2e5c55;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.transport-times {
  font-size: 14px;
  font-weight: 700;
  color: #c2594a;
}

.transport-route {
  font-size: 13px;
  color: #6b5d50;
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Rules */
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.rule-card {
  background: rgba(46 92 85 / 0.06);
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
}

.rule-card strong {
  display: block;
  margin-bottom: 4px;
  color: #2e5c55;
}

.rule-card p {
  margin: 0;
  color: #6b5d50;
}

/* Resources */
.resource-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resource-card {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.resource-card strong {
  color: #c2594a;
}

.resource-card span {
  color: #8b7d6b;
}

/* Trip Tab */
.section-heading {
  font-size: 14px;
  font-weight: 600;
  color: #2c2825;
  padding: 8px 0 4px;
}

.jump-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
  padding-bottom: 4px;
}

.jump-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(194 89 74 / 0.2);
  background: transparent;
  color: #8b7d6b;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.jump-chip--active {
  background: #c2594a;
  color: #fff;
  border-color: #c2594a;
}

.trip-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trip-group {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.trip-group-head {
  padding: 10px 14px;
  background: rgba(194 89 74 / 0.06);
  border-bottom: 1px solid rgba(194 89 74 / 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trip-group-head strong {
  font-size: 15px;
  color: #2c2825;
}

.trip-group-head span {
  font-size: 12px;
  color: #8b7d6b;
}

.trip-days {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trip-day-card {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.15s;
}

.trip-day-card:hover {
  background: rgba(194 89 74 / 0.06);
}

.trip-day-card--active {
  background: rgba(194 89 74 / 0.1);
  border-color: rgba(194 89 74 / 0.2);
}

.trip-day-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.trip-day-top strong {
  font-size: 14px;
}

.trip-day-top span {
  font-size: 13px;
  color: #8b7d6b;
}

.trip-day-note {
  font-size: 12px;
  color: #6b8f71;
  margin-top: 4px;
  display: block;
}

/* Bottom Nav */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fffcf8;
  border-top: 1px solid rgba(194 89 74 / 0.12);
  box-shadow: 0 -2px 12px rgba(44 40 37 / 0.06);
  z-index: 100;
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: #8b7d6b;
}

.bottom-nav-item--active {
  color: #c2594a;
  background: rgba(194 89 74 / 0.06);
}

.bottom-nav-label {
  font-size: 14px;
  font-weight: 700;
}

.bottom-nav-caption {
  font-size: 10px;
  opacity: 0.7;
}
</style>
