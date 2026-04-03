<script setup>
import { computed, ref, watch, watchEffect } from 'vue'
import { italyTravelCompanionData } from '@/data/italyTravelCompanionData'

const tabs = [
  { id: 'today', label: 'Today', caption: '今日日程' },
  { id: 'map', label: 'Map', caption: '路线地图' },
  { id: 'tickets', label: 'Tickets', caption: '票据入口' },
  { id: 'transport', label: 'Transport', caption: '交通规则' },
  { id: 'trip', label: 'Trip', caption: '全程总览' },
]

const trip = italyTravelCompanionData
const dayMap = new Map(trip.days.map((day) => [day.id, day]))
const placeMap = new Map(trip.places.map((place) => [place.id, place]))
const ticketMap = new Map(trip.tickets.map((ticket) => [ticket.id, ticket]))
const transportMap = new Map(trip.transportLegs.map((leg) => [leg.id, leg]))

const activeTab = ref('today')
const selectedDayId = ref(trip.tripMeta.defaultDayId)
const mapScope = ref('today')
const mapCity = ref(dayMap.get(selectedDayId.value)?.city || trip.days[0].city)
const activePlaceId = ref(null)
const navMode = ref('transit')

const selectedDay = computed(() => dayMap.get(selectedDayId.value) || trip.days[0])
const cityOptions = computed(() => [...new Set(trip.days.map((day) => day.city))])
const selectedHotel = computed(() => placeMap.get(selectedDay.value.hotelPlaceId) || null)
const selectedDayTickets = computed(() => selectedDay.value.ticketIds.map((id) => ticketMap.get(id)).filter(Boolean))
const selectedDayLegs = computed(() => selectedDay.value.transportIds.map((id) => transportMap.get(id)).filter(Boolean))
const nextTicket = computed(() => selectedDayTickets.value[0] || null)
const nextTransport = computed(() => selectedDayLegs.value[0] || null)

const quickCards = computed(() => [
  {
    title: 'Hotel',
    headline: selectedHotel.value?.name || '待补充',
    meta: selectedHotel.value?.plannedTime || '住宿节点',
    text: selectedHotel.value?.navigationNote || '今天没有住宿信息。',
    placeId: selectedHotel.value?.id || null,
  },
  {
    title: 'Next Ride',
    headline: nextTransport.value ? `${nextTransport.value.operator} · ${nextTransport.value.serviceNo}` : '今天以步行为主',
    meta: nextTransport.value ? `${nextTransport.value.departureTime} → ${nextTransport.value.arrivalTime}` : '无新增交通段',
    text: nextTransport.value?.fallbackPlan || '不做额外换乘，保持轻量路线即可。',
    placeId: nextTransport.value ? nextTransport.value.toPlaceId : null,
  },
  {
    title: 'Next Ticket',
    headline: nextTicket.value?.title || '今天没有强制时段票',
    meta: nextTicket.value ? `${nextTicket.value.date} · ${nextTicket.value.time}` : '自由活动',
    text: nextTicket.value?.warnings?.[0] || '如果临时加项目，优先选可退改的轻量活动。',
    placeId: nextTicket.value?.placeId || null,
  },
  {
    title: 'Reminder',
    headline: '最重要的一件事',
    meta: selectedDay.value.city,
    text: selectedDay.value.topReminder,
    placeId: selectedDay.value.routePlaceIds[0] || null,
  },
])

const timelineEntries = computed(() =>
  selectedDay.value.timeline
    .map((item) => {
      if (item.type === 'hotel') {
        const place = placeMap.get(item.refId)
        if (!place) {
          return null
        }
        return {
          id: `hotel-${place.id}`,
          kind: '酒店',
          time: place.plannedTime,
          title: place.name,
          subtitle: `今天的落脚点 · ${place.address}`,
          note: place.note,
          tags: place.riskTags,
          placeId: place.id,
          navigationPlaceId: place.id,
        }
      }

      if (item.type === 'place') {
        const place = placeMap.get(item.refId)
        if (!place) {
          return null
        }
        return {
          id: `place-${place.id}`,
          kind: typeLabel(place.type),
          time: place.plannedTime,
          title: place.name,
          subtitle: place.address,
          note: place.note,
          tags: place.riskTags,
          placeId: place.id,
          navigationPlaceId: place.id,
        }
      }

      if (item.type === 'ticket') {
        const ticket = ticketMap.get(item.refId)
        const place = ticket ? placeMap.get(ticket.placeId) : null
        if (!ticket || !place) {
          return null
        }
        return {
          id: `ticket-${ticket.id}`,
          kind: ticket.type === 'train' ? '火车票' : '门票',
          time: ticket.time,
          title: ticket.title,
          subtitle: `${place.name} · ${ticket.orderRef}`,
          note: ticket.releaseReminder,
          tags: ticket.warnings,
          placeId: place.id,
          navigationPlaceId: place.id,
        }
      }

      if (item.type === 'transport') {
        const leg = transportMap.get(item.refId)
        const fromPlace = leg ? placeMap.get(leg.fromPlaceId) : null
        const toPlace = leg ? placeMap.get(leg.toPlaceId) : null
        if (!leg || !fromPlace || !toPlace) {
          return null
        }
        return {
          id: `transport-${leg.id}`,
          kind: '交通',
          time: `${leg.departureTime} → ${leg.arrivalTime}`,
          title: `${leg.operator} · ${leg.serviceNo}`,
          subtitle: `${fromPlace.name} → ${toPlace.name}`,
          note: leg.fallbackPlan,
          tags: [leg.needsActivation ? '需激活' : '电子票直刷', leg.operator],
          placeId: toPlace.id,
          navigationPlaceId: fromPlace.id,
        }
      }

      return null
    })
    .filter(Boolean),
)

const allTickets = computed(() => sortByDateTime(trip.tickets, (item) => `${item.date} ${item.timeSort || item.time}`))
const todayOrSelectedTickets = computed(() => allTickets.value.filter((ticket) => ticket.date === selectedDay.value.date))
const groupedTripDays = computed(() => {
  const groups = []

  trip.days.forEach((day, index) => {
    const lastGroup = groups[groups.length - 1]
    const hotel = placeMap.get(day.hotelPlaceId)
    const prevDay = trip.days[index - 1]

    if (!lastGroup || lastGroup.city !== day.city) {
      groups.push({
        city: day.city,
        from: day.label,
        days: [],
      })
    }

    groups[groups.length - 1].days.push({
      ...day,
      hotelName: hotel?.name || '待补充酒店',
      keyTicket: day.ticketIds.map((id) => ticketMap.get(id)).filter(Boolean)[0] || null,
      keyTransport: day.transportIds.map((id) => transportMap.get(id)).filter(Boolean)[0] || null,
      isCitySwitch: Boolean(prevDay && prevDay.city !== day.city),
      isHotelSwitch: Boolean(prevDay && prevDay.hotelPlaceId !== day.hotelPlaceId),
    })
  })

  return groups
})

const mapPlaces = computed(() => {
  if (mapScope.value === 'today') {
    return selectedDay.value.routePlaceIds.map((id) => placeMap.get(id)).filter(Boolean)
  }

  if (mapScope.value === 'city') {
    return sortByDateTime(
      trip.places.filter((place) => place.city === mapCity.value),
      (place) => `${place.date} ${place.timeSort || '23:59'}`,
    )
  }

  return sortByDateTime(trip.places, (place) => `${place.date} ${place.timeSort || '23:59'}`)
})

const mapNodes = computed(() => buildMapNodes(mapPlaces.value))
const mapPolyline = computed(() => mapNodes.value.map((node) => `${node.x},${node.y}`).join(' '))
const activeMapPlace = computed(() => mapPlaces.value.find((place) => place.id === activePlaceId.value) || mapPlaces.value[0] || null)
const mapLabel = computed(() => {
  if (mapScope.value === 'today') {
    return `${selectedDay.value.city} · ${selectedDay.value.label}`
  }

  if (mapScope.value === 'city') {
    return `${mapCity.value} · 城市总览`
  }

  return '整个旅程 · Italy overview'
})

watchEffect(() => {
  document.title = '意大利出行工具'
})

watch(
  [selectedDay, mapPlaces],
  ([day, places]) => {
    if (mapScope.value === 'today') {
      mapCity.value = day.city
    }

    if (!places.some((place) => place.id === activePlaceId.value)) {
      activePlaceId.value = places[0]?.id || null
    }
  },
  { immediate: true },
)

function switchToDay(dayId) {
  selectedDayId.value = dayId
}

function setMapView(scope, city = mapCity.value) {
  mapScope.value = scope
  if (scope === 'city') {
    mapCity.value = city
  }
}

function focusPlaceOnMap(placeId) {
  if (!placeId) {
    return
  }

  const owningDay = trip.days.find(
    (day) => day.hotelPlaceId === placeId || day.routePlaceIds.includes(placeId) || day.ticketIds.some((ticketId) => ticketMap.get(ticketId)?.placeId === placeId),
  )

  if (owningDay) {
    selectedDayId.value = owningDay.id
  }

  activeTab.value = 'map'
  mapScope.value = owningDay ? 'today' : 'city'
  mapCity.value = placeMap.get(placeId)?.city || selectedDay.value.city
  activePlaceId.value = placeId
}

function typeLabel(type) {
  return {
    hotel: '酒店',
    attraction: '景点',
    station: '站点',
    restaurant: '餐厅',
    airport: '机场',
  }[type] || '地点'
}

function sortByDateTime(items, accessor) {
  return [...items].sort((left, right) => accessor(left).localeCompare(accessor(right)))
}

function buildMapNodes(places) {
  if (!places.length) {
    return []
  }

  const lngs = places.map((place) => place.lng)
  const lats = places.map((place) => place.lat)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const lngRange = maxLng - minLng || 0.01
  const latRange = maxLat - minLat || 0.01

  return places.map((place, index) => ({
    ...place,
    index: index + 1,
    x: 10 + ((place.lng - minLng) / lngRange) * 80,
    y: 12 + (1 - (place.lat - minLat) / latRange) * 72,
  }))
}

function googleMapsUrl(place) {
  if (!place) {
    return '#'
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=${navMode.value}`
}

function appleMapsUrl(place) {
  if (!place) {
    return '#'
  }

  const flag = {
    walking: 'w',
    transit: 'r',
    driving: 'd',
  }[navMode.value] || 'r'

  return `https://maps.apple.com/?daddr=${place.lat},${place.lng}&dirflg=${flag}`
}

function placeForTicket(ticket) {
  return ticket ? placeMap.get(ticket.placeId) : null
}

function placeForTransport(leg) {
  return leg ? placeMap.get(leg.toPlaceId) : null
}
</script>

<template>
  <main class="companion-page">
    <div class="companion-layout">
      <section class="app-card">
        <header class="app-header">
          <div>
            <p class="app-city">{{ selectedDay.city }}</p>
            <h2 class="app-title">{{ selectedDay.label }} · {{ selectedDay.title }}</h2>
            <p class="app-subtitle">{{ selectedDay.weatherLabel }}</p>
          </div>

          <a
            class="weather-link"
            :href="selectedDay.weatherUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            天气入口 ↗
          </a>
        </header>

        <div class="day-switcher">
          <button
            v-for="day in trip.days"
            :key="day.id"
            type="button"
            class="day-chip"
            :class="{ 'day-chip--active': day.id === selectedDayId }"
            @click="switchToDay(day.id)"
          >
            <span>{{ day.label }}</span>
            <small>{{ day.city }}</small>
          </button>
        </div>

        <div class="alert-strip">
          <strong>今日提醒</strong>
          <span>{{ selectedDay.topReminder }}</span>
        </div>

        <div class="summary-grid">
          <article class="summary-card" v-for="card in quickCards" :key="card.title">
            <p class="summary-label">{{ card.title }}</p>
            <h3>{{ card.headline }}</h3>
            <strong>{{ card.meta }}</strong>
            <p>{{ card.text }}</p>
            <button v-if="card.placeId" type="button" class="text-button" @click="focusPlaceOnMap(card.placeId)">
              查看地图
            </button>
          </article>
        </div>

        <section class="tab-panel" v-if="activeTab === 'today'">
          <div class="panel-heading">
            <div>
              <h2>Today</h2>
              <p>酒店、下一段交通、下一张门票和重要提醒都放进时间线。</p>
            </div>
            <button type="button" class="ghost-button" @click="activeTab = 'map'">切到地图</button>
          </div>

          <div class="timeline">
            <article class="timeline-item" v-for="entry in timelineEntries" :key="entry.id">
              <div class="timeline-rail">
                <span class="timeline-time">{{ entry.time }}</span>
              </div>

              <div class="timeline-body">
                <div class="timeline-kind">{{ entry.kind }}</div>
                <h3>{{ entry.title }}</h3>
                <p class="timeline-subtitle">{{ entry.subtitle }}</p>
                <p class="timeline-note">{{ entry.note }}</p>

                <div class="chip-row">
                  <span class="tag-chip tag-chip--soft" v-for="tag in entry.tags" :key="tag">{{ tag }}</span>
                </div>

                <div class="action-row">
                  <button type="button" class="ghost-button" @click="focusPlaceOnMap(entry.placeId)">查看地图</button>
                  <a
                    class="solid-link"
                    :href="googleMapsUrl(placeMap.get(entry.navigationPlaceId))"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    开始导航
                  </a>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="tab-panel" v-else-if="activeTab === 'map'">
          <div class="panel-heading">
            <div>
              <h2>Map</h2>
              <p>先做今日地图、顺序连线、地点卡片和一键导航，不做完整路线引擎。</p>
            </div>
            <span class="panel-meta">{{ mapLabel }}</span>
          </div>

          <div class="filter-strip">
            <button type="button" class="filter-chip" :class="{ 'filter-chip--active': mapScope === 'today' }" @click="setMapView('today')">
              今天
            </button>
            <button
              v-for="city in cityOptions"
              :key="city"
              type="button"
              class="filter-chip"
              :class="{ 'filter-chip--active': mapScope === 'city' && mapCity === city }"
              @click="setMapView('city', city)"
            >
              {{ city }}
            </button>
            <button type="button" class="filter-chip" :class="{ 'filter-chip--active': mapScope === 'all' }" @click="setMapView('all')">
              全部
            </button>
          </div>

          <div class="map-layout">
            <div class="map-surface">
              <div class="map-surface-head">
                <strong>Route sketch</strong>
                <span>{{ mapPlaces.length }} 个点位</span>
              </div>

              <div class="map-canvas">
                <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polyline :points="mapPolyline" />
                </svg>

                <button
                  v-for="node in mapNodes"
                  :key="node.id"
                  type="button"
                  class="map-marker"
                  :class="{ 'map-marker--active': activeMapPlace && activeMapPlace.id === node.id }"
                  :style="{ left: `${node.x}%`, top: `${node.y}%` }"
                  @click="activePlaceId = node.id"
                >
                  <span>{{ node.index }}</span>
                </button>
              </div>

              <p class="map-footnote">按当前筛选范围自动缩放，经纬度直接来自地点数据，点序号就是当天动线顺序。</p>
            </div>

            <article class="map-detail" v-if="activeMapPlace">
              <div class="map-detail-top">
                <div>
                  <p class="detail-kicker">{{ typeLabel(activeMapPlace.type) }}</p>
                  <h3>{{ activeMapPlace.name }}</h3>
                </div>
                <strong>{{ activeMapPlace.plannedTime }}</strong>
              </div>

              <p class="detail-address">{{ activeMapPlace.address }}</p>
              <p class="detail-note">{{ activeMapPlace.note }}</p>

              <div class="detail-grid">
                <div>
                  <span>导航备注</span>
                  <strong>{{ activeMapPlace.navigationNote }}</strong>
                </div>
                <div>
                  <span>联系人</span>
                  <strong>{{ activeMapPlace.contact }}</strong>
                </div>
                <div>
                  <span>订单号 / 票号</span>
                  <strong>{{ activeMapPlace.orderRef || '无' }}</strong>
                </div>
                <div>
                  <span>官网链接</span>
                  <a
                    v-if="activeMapPlace.officialLink"
                    :href="activeMapPlace.officialLink"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    打开官网 ↗
                  </a>
                  <strong v-else>无</strong>
                </div>
              </div>

              <div class="chip-row">
                <span class="tag-chip tag-chip--soft" v-for="tag in activeMapPlace.riskTags" :key="tag">{{ tag }}</span>
              </div>

              <div class="mode-row">
                <button
                  type="button"
                  class="mode-chip"
                  :class="{ 'mode-chip--active': navMode === 'walking' }"
                  @click="navMode = 'walking'"
                >
                  步行
                </button>
                <button
                  type="button"
                  class="mode-chip"
                  :class="{ 'mode-chip--active': navMode === 'transit' }"
                  @click="navMode = 'transit'"
                >
                  公交
                </button>
                <button
                  type="button"
                  class="mode-chip"
                  :class="{ 'mode-chip--active': navMode === 'driving' }"
                  @click="navMode = 'driving'"
                >
                  打车
                </button>
              </div>

              <div class="action-row">
                <a class="solid-link" :href="googleMapsUrl(activeMapPlace)" target="_blank" rel="noopener noreferrer">
                  Google Maps
                </a>
                <a class="ghost-link" :href="appleMapsUrl(activeMapPlace)" target="_blank" rel="noopener noreferrer">
                  Apple Maps
                </a>
              </div>
            </article>
          </div>

          <div class="place-list">
            <button
              v-for="(place, index) in mapPlaces"
              :key="place.id"
              type="button"
              class="place-card"
              :class="{ 'place-card--active': activeMapPlace && activeMapPlace.id === place.id }"
              @click="activePlaceId = place.id"
            >
              <span class="place-index">{{ index + 1 }}</span>
              <div>
                <strong>{{ place.name }}</strong>
                <p>{{ place.plannedTime }} · {{ typeLabel(place.type) }} · {{ place.city }}</p>
              </div>
            </button>
          </div>
        </section>

        <section class="tab-panel" v-else-if="activeTab === 'tickets'">
          <div class="panel-heading">
            <div>
              <h2>Tickets</h2>
              <p>景点票、火车票、二维码、官网入口和放票提醒都集中放这里。</p>
            </div>
          </div>

          <div class="alerts-grid">
            <article class="alert-card" v-for="alert in trip.ticketAlerts" :key="alert.title">
              <strong>{{ alert.title }}</strong>
              <p>{{ alert.body }}</p>
            </article>
          </div>

          <div class="ticket-block">
            <div class="section-heading">
              <h3>今天要用的票</h3>
              <span>{{ selectedDay.label }}</span>
            </div>

            <div class="empty-ticket" v-if="!todayOrSelectedTickets.length">
              今天没有必须掏二维码的票据，适合轻量活动或自由走。
            </div>

            <div class="ticket-list" v-else>
              <article class="ticket-card" v-for="ticket in todayOrSelectedTickets" :key="ticket.id">
                <div class="ticket-top">
                  <div>
                    <p>{{ ticket.type === 'train' ? 'Train ticket' : 'Timed entry' }}</p>
                    <h3>{{ ticket.title }}</h3>
                  </div>
                  <strong>{{ ticket.time }}</strong>
                </div>

                <div class="ticket-qr">
                  <div class="ticket-qr-box" />
                  <div>
                    <span>二维码 / 票号</span>
                    <strong>{{ ticket.qrLabel }}</strong>
                    <small>{{ ticket.orderRef }}</small>
                  </div>
                </div>

                <div class="chip-row">
                  <span class="tag-chip tag-chip--soft" v-for="warning in ticket.warnings" :key="warning">{{ warning }}</span>
                </div>

                <p class="ticket-note">{{ ticket.releaseReminder }}</p>

                <div class="action-row">
                  <button type="button" class="ghost-button" @click="focusPlaceOnMap(ticket.placeId)">查看地图</button>
                  <a class="solid-link" :href="ticket.officialLink" target="_blank" rel="noopener noreferrer">官网入口</a>
                </div>
              </article>
            </div>
          </div>

          <div class="ticket-block">
            <div class="section-heading">
              <h3>全部票据</h3>
              <span>按日期整理</span>
            </div>

            <div class="ticket-list">
              <article class="ticket-card ticket-card--compact" v-for="ticket in allTickets" :key="ticket.id">
                <div class="ticket-top">
                  <div>
                    <p>{{ ticket.date }} · {{ ticket.city }}</p>
                    <h3>{{ ticket.title }}</h3>
                  </div>
                  <strong>{{ ticket.time }}</strong>
                </div>

                <p class="ticket-note">{{ placeForTicket(ticket)?.name }} · {{ ticket.notes.join(' / ') }}</p>

                <div class="action-row">
                  <button type="button" class="ghost-button" @click="focusPlaceOnMap(ticket.placeId)">地点卡片</button>
                  <a
                    class="ghost-link"
                    :href="googleMapsUrl(placeForTicket(ticket))"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    开始导航
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="tab-panel" v-else-if="activeTab === 'transport'">
          <div class="panel-heading">
            <div>
              <h2>Transport</h2>
              <p>今日交通段、常用规则卡片和官方入口放在同一页，临时出状况时更省时间。</p>
            </div>
          </div>

          <div class="transport-list">
            <article class="transport-card" v-for="leg in selectedDayLegs" :key="leg.id">
              <div class="transport-top">
                <div>
                  <p>{{ leg.operator }}</p>
                  <h3>{{ leg.title }}</h3>
                </div>
                <strong>{{ leg.departureTime }} → {{ leg.arrivalTime }}</strong>
              </div>

              <p class="transport-note">
                {{ placeMap.get(leg.fromPlaceId)?.name }} → {{ placeMap.get(leg.toPlaceId)?.name }}
              </p>

              <div class="detail-grid">
                <div>
                  <span>票务规则</span>
                  <strong>{{ leg.ticketRules }}</strong>
                </div>
                <div>
                  <span>是否需要激活</span>
                  <strong>{{ leg.needsActivation ? '需要' : '不需要' }}</strong>
                </div>
                <div>
                  <span>站点提示</span>
                  <strong>{{ leg.stationInfo }}</strong>
                </div>
                <div>
                  <span>备用方案</span>
                  <strong>{{ leg.fallbackPlan }}</strong>
                </div>
              </div>

              <div class="action-row">
                <a class="ghost-link" :href="leg.stationMapLink" target="_blank" rel="noopener noreferrer">站点地图</a>
                <a class="ghost-link" :href="googleMapsUrl(placeForTransport(leg))" target="_blank" rel="noopener noreferrer">到达导航</a>
                <a class="solid-link" :href="leg.officialLink" target="_blank" rel="noopener noreferrer">官网入口</a>
              </div>
            </article>
          </div>

          <div class="rules-grid">
            <article class="rule-card" v-for="rule in trip.transportRules" :key="rule.title">
              <strong>{{ rule.title }}</strong>
              <p>{{ rule.body }}</p>
            </article>
          </div>

          <div class="resource-row">
            <a
              v-for="resource in trip.transportResources"
              :key="resource.title"
              class="resource-card"
              :href="resource.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>{{ resource.title }}</strong>
              <p>{{ resource.description }}</p>
            </a>
          </div>
        </section>

        <section class="tab-panel" v-else>
          <div class="panel-heading">
            <div>
              <h2>Trip</h2>
              <p>按城市和日期看整个旅程，能快速跳到某一天，也能一眼看到酒店和城市切换。</p>
            </div>
          </div>

          <div class="jump-strip">
            <button
              v-for="day in trip.days"
              :key="day.id"
              type="button"
              class="jump-chip"
              :class="{ 'jump-chip--active': day.id === selectedDayId }"
              @click="switchToDay(day.id)"
            >
              {{ day.label }}
            </button>
          </div>

          <div class="trip-groups">
            <article class="trip-group" v-for="group in groupedTripDays" :key="group.city">
              <div class="trip-group-head">
                <div>
                  <p>City block</p>
                  <h3>{{ group.city }}</h3>
                </div>
                <span>{{ group.from }}</span>
              </div>

              <div class="trip-days">
                <button
                  v-for="day in group.days"
                  :key="day.id"
                  type="button"
                  class="trip-day-card"
                  :class="{ 'trip-day-card--active': day.id === selectedDayId }"
                  @click="switchToDay(day.id)"
                >
                  <div class="trip-day-top">
                    <div>
                      <strong>{{ day.label }}</strong>
                      <p>{{ day.title }}</p>
                    </div>
                    <span>{{ day.weatherLabel }}</span>
                  </div>

                  <div class="chip-row">
                    <span class="tag-chip tag-chip--soft" v-if="day.isCitySwitch">城市切换</span>
                    <span class="tag-chip tag-chip--soft" v-if="day.isHotelSwitch">酒店切换</span>
                    <span class="tag-chip tag-chip--soft">{{ day.hotelName }}</span>
                  </div>

                  <p class="trip-day-note">
                    {{ day.keyTransport ? `${day.keyTransport.operator} · ${day.keyTransport.serviceNo}` : '本日以城市内步行为主' }}
                  </p>
                  <p class="trip-day-note">
                    {{ day.keyTicket ? `关键票务：${day.keyTicket.title} ${day.keyTicket.time}` : '关键票务：无强制时段票' }}
                  </p>
                </button>
              </div>
            </article>
          </div>
        </section>
      </section>

      <nav class="bottom-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="bottom-nav-item"
          :class="{ 'bottom-nav-item--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <strong>{{ tab.label }}</strong>
          <small>{{ tab.caption }}</small>
        </button>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.companion-page {
  --paper: #fff8ee;
  --paper-strong: #fffdf8;
  --ink: #20170f;
  --muted: #69584a;
  --line: rgba(82, 56, 37, 0.12);
  --terracotta: #c96d45;
  --terracotta-deep: #954b2a;
  --olive: #67714d;
  --canal: #2d6973;
  --gold: #d8a15d;
  min-height: 100vh;
  padding: 28px 16px 80px;
  color: var(--ink);
  background:
    radial-gradient(circle at top right, rgba(201, 109, 69, 0.22), transparent 24%),
    radial-gradient(circle at bottom left, rgba(45, 105, 115, 0.18), transparent 26%),
    linear-gradient(180deg, #f7efe5 0%, #edd9bc 40%, #d6b48e 100%);
  font-family: 'Avenir Next', 'Segoe UI', sans-serif;
}

.companion-layout {
  width: min(1120px, 100%);
  margin: 0 auto;
  display: block;
}

.app-card {
  animation: card-rise 0.55s ease both;
}

.editorial-card,
.app-card {
  border: 1px solid rgba(82, 56, 37, 0.12);
  background: rgba(255, 252, 247, 0.9);
  box-shadow: 0 24px 60px rgba(82, 56, 37, 0.12);
  backdrop-filter: blur(18px);
}

.editorial-card {
  padding: 22px;
  border-radius: 28px;
}

.editorial-card--hero {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.68), rgba(255, 247, 237, 0.92)),
    linear-gradient(135deg, rgba(201, 109, 69, 0.15), rgba(45, 105, 115, 0.12));
}

.eyebrow,
.detail-kicker,
.summary-label,
.ticket-top p,
.transport-top p,
.trip-group-head p,
.app-city {
  margin: 0;
  color: var(--terracotta-deep);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.74rem;
  font-weight: 700;
}

.editorial-title,
.app-title,
.panel-heading h2,
.section-heading h2,
.section-heading h3,
.ticket-card h3,
.transport-card h3,
.trip-group-head h3,
.timeline-body h3,
.map-detail h3 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
}

.editorial-title {
  margin-top: 10px;
  font-size: clamp(2.4rem, 6vw, 3.5rem);
  line-height: 1;
}

.editorial-copy,
.editorial-note,
.mini-card p,
.timeline-subtitle,
.timeline-note,
.app-subtitle,
.map-footnote,
.ticket-note,
.transport-note,
.trip-day-note,
.alert-card p,
.rule-card p,
.resource-card p,
.summary-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}

.editorial-copy {
  margin-top: 12px;
  font-size: 1.05rem;
}

.editorial-note {
  margin-top: 10px;
}

.section-heading,
.panel-heading,
.map-surface-head,
.map-detail-top,
.ticket-top,
.transport-top,
.trip-group-head,
.trip-day-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.mini-grid,
.summary-grid,
.alerts-grid,
.rules-grid,
.resource-row,
.transport-list,
.trip-groups {
  display: grid;
  gap: 14px;
}

.mini-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.mini-card,
.summary-card,
.alert-card,
.rule-card,
.resource-card,
.ticket-card,
.transport-card,
.trip-group,
.trip-day-card,
.place-card,
.map-detail,
.map-surface {
  border-radius: 24px;
  border: 1px solid var(--line);
  background: var(--paper-strong);
}

.mini-card,
.alert-card,
.rule-card,
.resource-card {
  padding: 16px;
}

.mini-card strong,
.summary-card h3,
.map-detail h3,
.trip-day-card strong,
.place-card strong {
  display: block;
  margin-bottom: 6px;
}

.chip-row,
.filter-strip,
.mode-row,
.jump-strip,
.day-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip-row {
  margin-top: 14px;
}

.tag-chip,
.day-chip,
.filter-chip,
.mode-chip,
.jump-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(82, 56, 37, 0.14);
  background: rgba(255, 255, 255, 0.8);
  color: var(--ink);
}

.tag-chip {
  padding: 8px 12px;
  font-size: 0.86rem;
}

.tag-chip--soft {
  background: rgba(216, 161, 93, 0.12);
}

.app-card {
  position: relative;
  padding: 22px;
  border-radius: 34px;
  overflow: hidden;
  min-height: calc(100vh - 56px);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.app-title {
  margin-top: 8px;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
}

.weather-link,
.solid-link,
.ghost-link,
.ghost-button,
.text-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  text-decoration: none;
  cursor: pointer;
}

.weather-link {
  padding: 12px 16px;
  border: 1px solid rgba(82, 56, 37, 0.12);
  background: rgba(255, 255, 255, 0.78);
}

.day-switcher {
  margin-top: 18px;
}

.day-chip {
  flex-direction: column;
  align-items: flex-start;
  min-width: 104px;
  cursor: pointer;
}

.day-chip small,
.bottom-nav-item small {
  color: var(--muted);
}

.day-chip--active,
.filter-chip--active,
.mode-chip--active,
.jump-chip--active {
  background: linear-gradient(135deg, var(--terracotta), var(--gold));
  color: #fff;
  border-color: transparent;
}

.day-chip--active small,
.bottom-nav-item--active small,
.filter-chip--active,
.mode-chip--active,
.jump-chip--active {
  color: rgba(255, 255, 255, 0.88);
}

.alert-strip {
  position: sticky;
  top: 14px;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
  padding: 14px 18px;
  border-radius: 22px;
  color: #fff;
  background: linear-gradient(135deg, var(--terracotta-deep), var(--terracotta));
  box-shadow: 0 16px 32px rgba(149, 75, 42, 0.24);
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 18px;
}

.summary-card {
  padding: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 248, 238, 0.96));
}

.summary-card strong {
  display: block;
  margin-top: 4px;
  color: var(--terracotta-deep);
}

.text-button,
.ghost-button {
  padding: 10px 14px;
  border: 1px solid rgba(82, 56, 37, 0.14);
  background: rgba(255, 255, 255, 0.84);
}

.text-button {
  margin-top: 14px;
}

.solid-link {
  padding: 11px 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--canal), #174b54);
}

.ghost-link {
  padding: 11px 16px;
  border: 1px solid rgba(82, 56, 37, 0.14);
  background: rgba(255, 255, 255, 0.82);
}

.tab-panel {
  margin-top: 22px;
}

.panel-meta {
  color: var(--muted);
}

.timeline {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 14px;
  padding: 18px;
  border-radius: 28px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.82);
}

.timeline-rail {
  position: relative;
  padding-right: 10px;
}

.timeline-rail::after {
  content: '';
  position: absolute;
  top: 28px;
  right: 0;
  bottom: -28px;
  width: 1px;
  background: linear-gradient(180deg, rgba(201, 109, 69, 0.6), rgba(201, 109, 69, 0));
}

.timeline-item:last-child .timeline-rail::after {
  display: none;
}

.timeline-time {
  display: inline-flex;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(201, 109, 69, 0.12);
  color: var(--terracotta-deep);
  font-weight: 700;
}

.timeline-body {
  display: grid;
  gap: 10px;
}

.timeline-kind {
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(45, 105, 115, 0.1);
  color: var(--canal);
  font-size: 0.84rem;
  font-weight: 700;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.map-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 16px;
  margin-top: 18px;
}

.map-surface,
.map-detail {
  padding: 18px;
}

.map-canvas {
  position: relative;
  margin-top: 16px;
  min-height: 360px;
  border-radius: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 24%, rgba(216, 161, 93, 0.24), transparent 18%),
    radial-gradient(circle at 70% 68%, rgba(45, 105, 115, 0.16), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 241, 227, 0.98));
}

.map-canvas::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(82, 56, 37, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(82, 56, 37, 0.05) 1px, transparent 1px);
  background-size: 44px 44px;
}

.map-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-lines polyline {
  fill: none;
  stroke: var(--terracotta);
  stroke-width: 1.8;
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-dasharray: 2.8 1.8;
}

.map-marker {
  position: absolute;
  width: 46px;
  height: 46px;
  transform: translate(-50%, -50%);
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, var(--canal), #11464e);
  box-shadow: 0 14px 24px rgba(17, 70, 78, 0.24);
  cursor: pointer;
}

.map-marker span {
  font-weight: 800;
}

.map-marker--active {
  background: linear-gradient(135deg, var(--terracotta), var(--gold));
  animation: pulse-ring 1.6s ease-in-out infinite;
}

.detail-address,
.detail-note {
  margin: 14px 0 0;
  color: var(--muted);
  line-height: 1.65;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.detail-grid div {
  padding: 14px;
  border-radius: 18px;
  background: rgba(248, 239, 226, 0.72);
}

.detail-grid span {
  display: block;
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 0.82rem;
}

.mode-row {
  margin-top: 16px;
}

.mode-chip,
.filter-chip,
.jump-chip,
.bottom-nav-item {
  cursor: pointer;
}

.place-list,
.ticket-list,
.trip-days {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.place-card,
.trip-day-card {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
}

.place-card--active,
.trip-day-card--active {
  border-color: rgba(201, 109, 69, 0.42);
  box-shadow: 0 16px 32px rgba(201, 109, 69, 0.12);
}

.place-card p,
.trip-day-card p {
  margin: 0;
  color: var(--muted);
}

.place-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--terracotta), var(--gold));
  font-weight: 800;
}

.ticket-block {
  margin-top: 18px;
}

.empty-ticket {
  margin-top: 12px;
  padding: 18px;
  border-radius: 20px;
  border: 1px dashed rgba(82, 56, 37, 0.16);
  color: var(--muted);
}

.ticket-card,
.transport-card,
.trip-group {
  padding: 18px;
}

.ticket-card--compact {
  background: rgba(255, 252, 247, 0.86);
}

.ticket-qr {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  margin-top: 16px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(248, 239, 226, 0.82);
}

.ticket-qr-box {
  width: 84px;
  height: 84px;
  border-radius: 16px;
  background:
    repeating-linear-gradient(0deg, #111 0 7px, #fff 7px 14px),
    repeating-linear-gradient(90deg, #111 0 7px, #fff 7px 14px);
  background-blend-mode: multiply;
}

.ticket-qr span,
.ticket-qr small {
  display: block;
  color: var(--muted);
}

.transport-list,
.rules-grid {
  margin-top: 18px;
}

.alerts-grid,
.rules-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.resource-row {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin-top: 18px;
}

.resource-card {
  text-decoration: none;
}

.jump-strip {
  margin-top: 18px;
}

.trip-days {
  margin-top: 16px;
}

.trip-day-card {
  grid-template-columns: 1fr;
}

.trip-day-top span {
  color: var(--muted);
  font-size: 0.86rem;
}

.bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 16px;
  z-index: 100;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  width: min(760px, calc(100vw - 24px));
  transform: translateX(-50%);
  padding: 10px;
  border-radius: 24px;
  background: rgba(32, 23, 15, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 48px rgba(32, 23, 15, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(20px);
}

.bottom-nav-item {
  padding: 12px 10px;
  border: 0;
  border-radius: 18px;
  color: rgba(255, 255, 255, 0.82);
  background: transparent;
}

.bottom-nav-item strong,
.bottom-nav-item small {
  display: block;
}

.bottom-nav-item--active {
  background: linear-gradient(135deg, var(--terracotta), var(--gold));
  color: #fff;
}

@keyframes card-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-ring {
  0%,
  100% {
    box-shadow: 0 14px 24px rgba(201, 109, 69, 0.24);
  }

  50% {
    box-shadow: 0 18px 32px rgba(201, 109, 69, 0.4);
  }
}

@media (max-width: 1120px) {
  .summary-grid,
  .alerts-grid,
  .rules-grid,
  .map-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .companion-page {
    padding: 12px 10px 70px;
  }

  .app-card,
  .editorial-card {
    border-radius: 26px;
    padding: 18px;
  }

  .timeline-item,
  .place-card {
    grid-template-columns: 1fr;
  }

  .timeline-rail::after {
    display: none;
  }

  .detail-grid,
  .summary-grid,
  .alerts-grid,
  .rules-grid {
    grid-template-columns: 1fr;
  }

  .ticket-qr {
    grid-template-columns: 1fr;
  }

  .bottom-nav {
    bottom: 8px;
    width: calc(100vw - 16px);
    padding: 8px;
    border-radius: 22px;
    grid-template-columns: repeat(5, minmax(58px, 1fr));
  }

  .bottom-nav-item {
    padding: 10px 6px;
  }
}
</style>
