<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const activeTab = ref('home')
const selectedDay = ref(1)
const showAddExpense = ref(false)

const tripInfo = {
  title: '意大利浪漫之旅',
  startDate: '2026-04-15',
  endDate: '2026-04-25',
}

const budget = ref({
  total: 50000,
  spent: {
    accommodation: 15000,
    transport: 5000,
    food: 3000,
    tickets: 4000,
    shopping: 2000,
  },
})

const checkedItems = ref({})

const dailyPlan = {
  1: {
    date: '4月15日',
    city: '罗马',
    title: '抵达罗马',
    items: [
      { time: '14:00', title: '抵达 FCO 机场', location: 'Fiumicino Airport' },
      { time: '15:30', title: '入住酒店', location: 'Hotel Artemide' },
      { time: '17:00', title: '斗兽场', location: 'Colosseo', duration: '2小时', ticket: '€16' },
      { time: '19:30', title: '晚餐', location: 'Trattoria Monti' },
    ],
  },
  2: {
    date: '4月16日',
    city: '罗马',
    title: '古罗马探索',
    items: [
      { time: '09:00', title: '梵蒂冈博物馆', location: 'Vatican Museums', duration: '3小时', ticket: '€20' },
      { time: '12:30', title: '圣彼得大教堂', location: 'St. Peter\'s Basilica' },
      { time: '15:00', title: '圣天使堡', location: 'Castel Sant\'Angelo', ticket: '€14' },
      { time: '19:00', title: '晚餐', location: 'Pizzeria Da Baffetto' },
    ],
  },
  3: {
    date: '4月17日',
    city: '罗马 → 佛罗伦萨',
    title: '前往佛罗伦萨',
    items: [
      { time: '08:30', title: '罗马斗兽场地下层', location: 'Colosseum Underground', ticket: '€24' },
      { time: '11:00', title: '前往火车站', location: 'Roma Termini' },
      { time: '12:30', title: '高铁前往佛罗伦萨', location: 'Frecciarossa 9401', duration: '1.5小时' },
      { time: '14:30', title: '入住酒店', location: 'Hotel Davanzati' },
      { time: '16:00', title: '圣母百花大教堂', location: 'Duomo', ticket: '€18' },
      { time: '19:30', title: '晚餐', location: 'Osteria del Cinghiale Bianco' },
    ],
  },
  4: {
    date: '4月18日',
    city: '佛罗伦萨',
    title: '文艺复兴之旅',
    items: [
      { time: '09:00', title: '乌菲兹美术馆', location: 'Uffizi Gallery', duration: '3小时', ticket: '€20' },
      { time: '12:30', title: '老桥', location: 'Ponte Vecchio' },
      { time: '14:00', title: '皮蒂宫', location: 'Palazzo Pitti', ticket: '€16' },
      { time: '17:00', title: '米开朗基罗广场日落', location: 'Piazzale Michelangelo' },
      { time: '20:00', title: '晚餐', location: 'La Giostra' },
    ],
  },
  5: {
    date: '4月19日',
    city: '佛罗伦萨 → 五渔村',
    title: '前往五渔村',
    items: [
      { time: '08:00', title: '前往火车站', location: 'Firenze SMN' },
      { time: '09:30', title: '火车前往五渔村', location: 'Trenitalia', duration: '2.5小时' },
      { time: '12:00', title: '入住酒店', location: 'Monterosso' },
      { time: '14:00', title: '徒步爱之路', location: 'Via dell\'Amore' },
      { time: '17:00', title: '韦尔纳扎游览', location: 'Vernazza' },
      { time: '19:30', title: '海鲜晚餐', location: 'Ristorante Miky' },
    ],
  },
  6: {
    date: '4月20日',
    city: '五渔村 → 米兰',
    title: '前往米兰',
    items: [
      { time: '09:00', title: '马纳罗拉拍照', location: 'Manarola' },
      { time: '11:00', title: '前往米兰', location: 'Trenitalia', duration: '3小时' },
      { time: '14:30', title: '入住酒店', location: 'Hotel Spadaccini' },
      { time: '16:00', title: '米兰大教堂', location: 'Duomo di Milano', ticket: '€13' },
      { time: '19:00', title: '晚餐', location: 'Trattoria Milanese' },
    ],
  },
  7: {
    date: '4月21日',
    city: '米兰',
    title: '时尚之都',
    items: [
      { time: '09:00', title: '最后的晚餐', location: 'Santa Maria delle Grazie', ticket: '€15' },
      { time: '11:00', title: '斯福尔扎城堡', location: 'Castello Sforzesco', ticket: '€5' },
      { time: '14:00', title: '埃马努埃莱二世拱廊', location: 'Galleria Vittorio Emanuele II' },
      { time: '17:00', title: '购物时间', location: 'Quadrilatero della Moda' },
      { time: '20:00', title: '告别晚餐', location: 'Il Luogo di Aimo e Nadia' },
    ],
  },
}

const accommodations = [
  { city: '罗马', name: 'Hotel Artemide', address: 'Via Nazionale 22, Rome', checkIn: '14:00', checkOut: '11:00', phone: '+39 06 489911', notes: '含早餐，屋顶露台酒吧' },
  { city: '佛罗伦萨', name: 'Hotel Davanzati', address: 'Via del Corso 3, Florence', checkIn: '14:00', checkOut: '10:30', phone: '+39 055 286080', notes: '市中心位置，步行到 Duomo 5 分钟' },
  { city: '五渔村', name: 'Casa Vacanze Cinque Terre', address: 'Via Fegina 25, Monterosso', checkIn: '15:00', checkOut: '10:00', phone: '+39 333 1234567', notes: '自助入住，密码将短信发送' },
  { city: '米兰', name: 'Hotel Spadaccini', address: 'Via Spadaccini 4, Milan', checkIn: '14:00', checkOut: '11:00', phone: '+39 02 72000333', notes: '近中央火车站' },
]

const restaurants = [
  { name: 'Trattoria Monti', city: '罗马', cuisine: '传统罗马菜', price: '€€', mustTry: 'Cacio e Pepe', booked: true },
  { name: 'Pizzeria Da Baffetto', city: '罗马', cuisine: '披萨', price: '€', mustTry: '玛格丽特披萨', booked: false },
  { name: 'Osteria del Cinghiale Bianco', city: '佛罗伦萨', cuisine: '托斯卡纳', price: '€€', mustTry: '佛罗伦萨T骨牛排', booked: true },
  { name: 'La Giostra', city: '佛罗伦萨', cuisine: '意大利融合', price: '€€€', mustTry: '松露意面', booked: true },
  { name: 'Ristorante Miky', city: '五渔村', cuisine: '海鲜', price: '€€', mustTry: '炸鱼拼盘', booked: false },
  { name: 'Trattoria Milanese', city: '米兰', cuisine: '米兰传统', price: '€€', mustTry: '米兰烩饭', booked: true },
  { name: 'Il Luogo di Aimo e Nadia', city: '米兰', cuisine: '高级意大利', price: '€€€€', mustTry: '品尝菜单', booked: true },
]

const tickets = ref([
  { name: '斗兽场 + 古罗马广场', date: '4月15日', time: '17:00', price: '€16', qrCode: 'COLOSSEUM123456', used: false },
  { name: '梵蒂冈博物馆', date: '4月16日', time: '09:00', price: '€20', qrCode: 'VATICAN789012', used: false },
  { name: '斗兽场地下层', date: '4月17日', time: '08:30', price: '€24', qrCode: 'UNDERGROUND345678', used: false },
  { name: '乌菲兹美术馆', date: '4月18日', time: '09:00', price: '€20', qrCode: 'UFFIZI901234', used: false },
  { name: '最后的晚餐', date: '4月21日', time: '09:00', price: '€15', qrCode: 'LASTSUPPER567890', used: false },
])

const transport = [
  { type: 'flight', from: '上海浦东', to: '罗马 FCO', date: '4月15日', time: '14:00 抵达', code: 'MU7543' },
  { type: 'train', from: '罗马', to: '佛罗伦萨', date: '4月17日', time: '12:30', code: 'Frecciarossa 9401', seat: '7车23号' },
  { type: 'train', from: '佛罗伦萨', to: '五渔村', date: '4月19日', time: '09:30', code: 'Regionale 5821', seat: '自由座' },
  { type: 'train', from: '五渔村', to: '米兰', date: '4月20日', time: '11:00', code: 'Intercity 502', seat: '5车12号' },
  { type: 'flight', from: '米兰 MXP', to: '上海浦东', date: '4月22日', time: '13:00', code: 'MU7544' },
]

const phrases = [
  { it: 'Buongiorno', zh: '早上好' },
  { it: 'Buonasera', zh: '晚上好' },
  { it: 'Grazie', zh: '谢谢' },
  { it: 'Prego', zh: '不客气/请' },
  { it: 'Scusi', zh: '打扰一下' },
  { it: 'Il conto, per favore', zh: '买单' },
  { it: 'Dov\'è il bagno?', zh: '洗手间在哪里？' },
  { it: 'Quanto costa?', zh: '多少钱？' },
  { it: 'Un caffè, per favore', zh: '一杯咖啡' },
  { it: 'Aiuto!', zh: '救命！' },
]

const emergencyContacts = [
  { name: '欧洲紧急电话', number: '112', desc: '警察/医疗/消防' },
  { name: '中国驻米兰总领馆', number: '+39 02 56941389', desc: '领事保护' },
  { name: '外交部全球领保热线', number: '+86 10 12308', desc: '24小时' },
]

const tips = [
  '餐厅通常会收取 2-3 欧的座位费（coperto）',
  '小费不是必须的，但可以留些零钱表示满意',
  '景点门票建议提前在线预订',
  '火车需要提前在机器上打票验证',
  '商店周日下午可能关门',
  '电压 230V，需要欧标转换插头',
]

const tabs = [
  { id: 'home', icon: '🏠', label: '首页' },
  { id: 'schedule', icon: '📅', label: '行程' },
  { id: 'tickets', icon: '🎫', label: '票务' },
  { id: 'budget', icon: '💰', label: '预算' },
  { id: 'info', icon: 'ℹ️', label: '信息' },
]

const expenseCategories = [
  { key: 'accommodation', icon: '🏨', label: '住宿', color: '#3b82f6' },
  { key: 'transport', icon: '🚄', label: '交通', color: '#22c55e' },
  { key: 'food', icon: '🍕', label: '餐饮', color: '#f97316' },
  { key: 'tickets', icon: '🎫', label: '门票', color: '#a855f7' },
  { key: 'shopping', icon: '🛍️', label: '购物', color: '#ec4899' },
]

const newExpense = ref({ category: 'food', amount: '', note: '' })

const budgetStats = computed(() => {
  const totalSpent = Object.values(budget.value.spent).reduce((a, b) => a + b, 0)
  const remaining = budget.value.total - totalSpent
  const percentage = (totalSpent / budget.value.total) * 100
  return { totalSpent, remaining, percentage }
})

const todayPlan = computed(() => dailyPlan[selectedDay.value] || null)

const completedCount = computed(() => {
  if (!todayPlan.value) return 0
  const key = `d${selectedDay.value}`
  const checked = checkedItems.value[key] || []
  return todayPlan.value.items.filter((item) => checked.includes(item.title)).length
})

const totalCount = computed(() => todayPlan.value?.items.length || 0)

const progress = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})

function isItemChecked(day, title) {
  const key = `d${day}`
  return (checkedItems.value[key] || []).includes(title)
}

function toggleItem(day, title) {
  const key = `d${day}`
  if (!checkedItems.value[key]) checkedItems.value[key] = []
  const arr = checkedItems.value[key]
  const idx = arr.indexOf(title)
  if (idx > -1) arr.splice(idx, 1)
  else arr.push(title)
}

function addExpense() {
  if (newExpense.value.amount) {
    const amount = parseFloat(newExpense.value.amount)
    budget.value.spent[newExpense.value.category] += amount
    showAddExpense.value = false
    newExpense.value = { category: 'food', amount: '', note: '' }
  }
}

onMounted(() => {
  const saved = localStorage.getItem('itaTripData')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.checkedItems) checkedItems.value = data.checkedItems
      if (data.budget) budget.value = data.budget
    } catch (_) {}
  }
})

watch(
  [checkedItems, budget],
  () => {
    localStorage.setItem('itaTripData', JSON.stringify({
      checkedItems: checkedItems.value,
      budget: budget.value,
    }))
  },
  { deep: true }
)
</script>

<template>
  <div class="ita-app">
    <!-- Header -->
    <header class="ita-header">
      <div class="ita-header-top">
        <div>
          <h1 class="ita-title">🇮🇹 意大利旅行助手</h1>
          <p class="ita-dates">{{ tripInfo.startDate }} → {{ tripInfo.endDate }}</p>
        </div>
        <div class="ita-budget-mini">
          <span class="ita-budget-label">剩余预算</span>
          <span class="ita-budget-amount">¥{{ budgetStats.remaining.toLocaleString() }}</span>
        </div>
      </div>
      <nav class="ita-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['ita-nav-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <span class="ita-nav-icon">{{ tab.icon }}</span>
          <span class="ita-nav-label">{{ tab.label }}</span>
        </button>
      </nav>
    </header>

    <!-- Content -->
    <main class="ita-content">

      <!-- ===== HOME ===== -->
      <section v-show="activeTab === 'home'" class="ita-section">
        <!-- Progress -->
        <div class="ita-card ita-progress-card">
          <div class="ita-progress-head">
            <div>
              <h2 class="ita-day-title">第 {{ selectedDay }} 天</h2>
              <p class="ita-day-sub">{{ todayPlan?.date }} · {{ todayPlan?.city }}</p>
            </div>
            <div class="ita-progress-pct">{{ progress }}%</div>
          </div>
          <div class="ita-progress-bar">
            <div class="ita-progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <p class="ita-progress-text">已完成 {{ completedCount }}/{{ totalCount }} 项</p>
        </div>

        <!-- Today Items -->
        <div class="ita-card">
          <h3 class="ita-card-title">📍 今日行程</h3>
          <div class="ita-timeline">
            <div
              v-for="(item, i) in todayPlan?.items"
              :key="i"
              :class="['ita-timeline-item', { checked: isItemChecked(selectedDay, item.title) }]"
              @click="toggleItem(selectedDay, item.title)"
            >
              <div :class="['ita-checkbox', { done: isItemChecked(selectedDay, item.title) }]">
                <span v-if="isItemChecked(selectedDay, item.title)">✓</span>
              </div>
              <div class="ita-timeline-body">
                <div class="ita-timeline-top">
                  <span class="ita-time">{{ item.time }}</span>
                  <span class="ita-item-title">{{ item.title }}</span>
                </div>
                <span class="ita-location">{{ item.location }}</span>
                <div class="ita-tags">
                  <span v-if="item.duration" class="ita-tag ita-tag--blue">⏱ {{ item.duration }}</span>
                  <span v-if="item.ticket" class="ita-tag ita-tag--purple">🎫 {{ item.ticket }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="ita-quick-grid">
          <div class="ita-quick-card" style="background: linear-gradient(135deg, #3b82f6, #2563eb)" @click="activeTab = 'schedule'">
            <span class="ita-quick-icon">🗺️</span>
            <strong>完整行程</strong>
            <span>查看每日安排</span>
          </div>
          <div class="ita-quick-card" style="background: linear-gradient(135deg, #f97316, #ea580c)" @click="activeTab = 'tickets'">
            <span class="ita-quick-icon">🎫</span>
            <strong>我的票务</strong>
            <span>{{ tickets.filter((t) => !t.used).length }} 张待使用</span>
          </div>
          <div class="ita-quick-card" style="background: linear-gradient(135deg, #ec4899, #db2777)" @click="activeTab = 'budget'">
            <span class="ita-quick-icon">🍕</span>
            <strong>餐厅推荐</strong>
            <span>{{ restaurants.length }} 家收藏</span>
          </div>
          <div class="ita-quick-card" style="background: linear-gradient(135deg, #a855f7, #9333ea)" @click="activeTab = 'info'">
            <span class="ita-quick-icon">🗣️</span>
            <strong>常用短语</strong>
            <span>意大利语速查</span>
          </div>
        </div>
      </section>

      <!-- ===== SCHEDULE ===== -->
      <section v-show="activeTab === 'schedule'" class="ita-section">
        <div class="ita-day-pills">
          <button
            v-for="day in Object.keys(dailyPlan)"
            :key="day"
            :class="['ita-day-pill', { active: selectedDay === parseInt(day) }]"
            @click="selectedDay = parseInt(day)"
          >
            第{{ day }}天
          </button>
        </div>

        <div v-for="(plan, day) in dailyPlan" :key="day" v-show="selectedDay === parseInt(day)">
          <div class="ita-card ita-day-card">
            <div class="ita-day-header">
              <h3 class="ita-day-card-title">{{ plan.title }}</h3>
              <p>{{ plan.date }} · {{ plan.city }}</p>
            </div>
            <div class="ita-day-items">
              <div
                v-for="(item, i) in plan.items"
                :key="i"
                :class="['ita-day-item', { checked: isItemChecked(day, item.title) }]"
                @click="toggleItem(day, item.title)"
              >
                <div :class="['ita-checkbox', { done: isItemChecked(day, item.title) }]">
                  <span v-if="isItemChecked(day, item.title)">✓</span>
                </div>
                <div class="ita-day-item-body">
                  <div class="ita-day-item-top">
                    <span class="ita-time">{{ item.time }}</span>
                    <span class="ita-item-title">{{ item.title }}</span>
                  </div>
                  <span class="ita-location">{{ item.location }}</span>
                  <div class="ita-tags">
                    <span v-if="item.duration" class="ita-tag ita-tag--blue">⏱ {{ item.duration }}</span>
                    <span v-if="item.ticket" class="ita-tag ita-tag--purple">🎫 {{ item.ticket }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h3 class="ita-section-title">🏨 住宿信息</h3>
        <div class="ita-hotel-list">
          <div v-for="(h, i) in accommodations" :key="i" class="ita-card ita-hotel-card">
            <div class="ita-hotel-head">
              <div>
                <h4 class="ita-hotel-name">{{ h.name }}</h4>
                <span class="ita-hotel-city">{{ h.city }}</span>
              </div>
              <span class="ita-badge">{{ h.checkIn }} 入住</span>
            </div>
            <div class="ita-hotel-info">
              <p>📍 {{ h.address }}</p>
              <p>📞 {{ h.phone }}</p>
              <p class="ita-hotel-notes">💡 {{ h.notes }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== TICKETS ===== -->
      <section v-show="activeTab === 'tickets'" class="ita-section">
        <h3 class="ita-section-title">🎫 景点门票</h3>
        <div class="ita-ticket-list">
          <div
            v-for="(t, i) in tickets"
            :key="i"
            :class="['ita-card ita-ticket-card', { used: t.used }]"
          >
            <div class="ita-ticket-head">
              <strong>{{ t.name }}</strong>
              <span v-if="t.used" class="ita-badge-used">已使用</span>
            </div>
            <div class="ita-ticket-body">
              <div class="ita-ticket-row">
                <div>
                  <span class="ita-ticket-label">日期</span>
                  <span class="ita-ticket-value">{{ t.date }} {{ t.time }}</span>
                </div>
                <div class="ita-ticket-price">
                  <span class="ita-ticket-label">价格</span>
                  <span class="ita-ticket-value">{{ t.price }}</span>
                </div>
              </div>
              <div class="ita-qr-code">
                <span>预订码</span>
                <code>{{ t.qrCode }}</code>
              </div>
              <button class="ita-btn-outline" @click="t.used = !t.used">
                {{ t.used ? '标记为未使用' : '标记为已使用' }}
              </button>
            </div>
          </div>
        </div>

        <h3 class="ita-section-title">🚄 交通票务</h3>
        <div class="ita-transport-list">
          <div v-for="(tr, i) in transport" :key="i" class="ita-card ita-transport-card">
            <div class="ita-transport-icon">{{ tr.type === 'flight' ? '✈️' : '🚄' }}</div>
            <div class="ita-transport-body">
              <div class="ita-transport-route">
                <span class="ita-transport-from">{{ tr.from }}</span>
                <span class="ita-arrow">→</span>
                <span class="ita-transport-to">{{ tr.to }}</span>
              </div>
              <span class="ita-transport-date">{{ tr.date }} {{ tr.time }}</span>
              <div class="ita-transport-meta">
                <span>车次: {{ tr.code }}</span>
                <span v-if="tr.seat">座位: {{ tr.seat }}</span>
              </div>
            </div>
          </div>
        </div>

        <h3 class="ita-section-title">🍕 餐厅收藏</h3>
        <div class="ita-restaurant-list">
          <div v-for="(r, i) in restaurants" :key="i" class="ita-card ita-restaurant-card">
            <div class="ita-restaurant-head">
              <div>
                <span class="ita-restaurant-name">{{ r.name }}</span>
                <span class="ita-restaurant-price">{{ r.price }}</span>
              </div>
              <span v-if="r.booked" class="ita-badge-booked">已预订</span>
            </div>
            <span class="ita-restaurant-cuisine">{{ r.city }} · {{ r.cuisine }}</span>
            <span class="ita-restaurant-must">🍴 必点: {{ r.mustTry }}</span>
          </div>
        </div>
      </section>

      <!-- ===== BUDGET ===== -->
      <section v-show="activeTab === 'budget'" class="ita-section">
        <div class="ita-card ita-budget-card">
          <span class="ita-budget-top-label">总预算</span>
          <span class="ita-budget-total">¥{{ budget.total.toLocaleString() }}</span>
          <div class="ita-budget-stats">
            <div>
              <span class="ita-budget-stat-label">已支出</span>
              <span class="ita-budget-stat-value">¥{{ budgetStats.totalSpent.toLocaleString() }}</span>
            </div>
            <div>
              <span class="ita-budget-stat-label">剩余</span>
              <span class="ita-budget-stat-value">¥{{ budgetStats.remaining.toLocaleString() }}</span>
            </div>
          </div>
          <div class="ita-progress-bar ita-budget-bar">
            <div class="ita-progress-fill" :style="{ width: Math.min(budgetStats.percentage, 100) + '%' }"></div>
          </div>
          <span class="ita-budget-pct">{{ budgetStats.percentage.toFixed(0) }}% 已使用</span>
        </div>

        <div class="ita-card">
          <h3 class="ita-card-title">支出分类</h3>
          <div class="ita-category-list">
            <div v-for="cat in expenseCategories" :key="cat.key" class="ita-category-row">
              <div class="ita-category-bar" :style="{ background: cat.color }"></div>
              <div class="ita-category-body">
                <div class="ita-category-head">
                  <span class="ita-category-label">{{ cat.icon }} {{ cat.label }}</span>
                  <span class="ita-category-amount">¥{{ budget.spent[cat.key].toLocaleString() }}</span>
                </div>
                <div class="ita-progress-bar ita-category-bar-bg">
                  <div
                    class="ita-progress-fill"
                    :style="{ width: (budget.spent[cat.key] / budgetStats.totalSpent * 100) + '%', background: cat.color }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button class="ita-btn-primary ita-btn-full" @click="showAddExpense = true">
          ➕ 添加支出
        </button>

        <div class="ita-tip-card">
          <strong>💡 预算小贴士</strong>
          <ul>
            <li>意大利餐厅通常会收取座位费（€2-3/人）</li>
            <li>景点门票提前网购可省排队时间</li>
            <li>城市间火车提前预订更便宜</li>
            <li>保留所有票据以便报销</li>
          </ul>
        </div>
      </section>

      <!-- ===== INFO ===== -->
      <section v-show="activeTab === 'info'" class="ita-section">
        <div class="ita-card ita-info-card">
          <div class="ita-info-header ita-header--blue">
            <h3 class="ita-card-title">🗣️ 常用意大利语</h3>
            <p>基础短语速查</p>
          </div>
          <div class="ita-phrase-list">
            <div v-for="(p, i) in phrases" :key="i" class="ita-phrase-row">
              <div>
                <strong>{{ p.it }}</strong>
                <span>{{ p.zh }}</span>
              </div>
              <button class="ita-phrase-btn">🔊</button>
            </div>
          </div>
        </div>

        <div class="ita-card ita-info-card">
          <div class="ita-info-header ita-header--red">
            <h3 class="ita-card-title">🚨 紧急联系方式</h3>
          </div>
          <div class="ita-emergency-list">
            <div v-for="(e, i) in emergencyContacts" :key="i" class="ita-emergency-item">
              <strong>{{ e.name }}</strong>
              <span class="ita-emergency-number">{{ e.number }}</span>
              <span>{{ e.desc }}</span>
            </div>
          </div>
        </div>

        <div class="ita-card ita-info-card">
          <div class="ita-info-header ita-header--orange">
            <h3 class="ita-card-title">💡 旅行贴士</h3>
          </div>
          <ul class="ita-tip-list">
            <li v-for="(tip, i) in tips" :key="i">{{ tip }}</li>
          </ul>
        </div>

        <div class="ita-card ita-basics-card">
          <h3 class="ita-card-title">🇮🇹 意大利基本信息</h3>
          <div class="ita-basics-grid">
            <div class="ita-basics-row"><span>电压</span><strong>230V（欧标插头）</strong></div>
            <div class="ita-basics-row"><span>时区</span><strong>CET (UTC+1)</strong></div>
            <div class="ita-basics-row"><span>货币</span><strong>欧元 (EUR)</strong></div>
            <div class="ita-basics-row"><span>紧急电话</span><strong>112</strong></div>
            <div class="ita-basics-row"><span>汇率</span><strong>1 EUR ≈ 7.8 CNY</strong></div>
          </div>
        </div>
      </section>
    </main>

    <!-- Expense Modal -->
    <div v-if="showAddExpense" class="ita-modal-overlay" @click="showAddExpense = false">
      <div class="ita-modal" @click.stop>
        <div class="ita-modal-handle"></div>
        <h3 class="ita-modal-title">添加支出</h3>
        <div class="ita-modal-body">
          <label class="ita-modal-label">分类</label>
          <div class="ita-category-picker">
            <button
              v-for="cat in expenseCategories"
              :key="cat.key"
              :class="['ita-cat-btn', { active: newExpense.category === cat.key }]"
              @click="newExpense.category = cat.key"
            >
              <span class="ita-cat-btn-icon">{{ cat.icon }}</span>
              <span>{{ cat.label }}</span>
            </button>
          </div>

          <label class="ita-modal-label">金额 (CNY)</label>
          <input type="number" v-model="newExpense.amount" placeholder="0.00" class="ita-input" />

          <label class="ita-modal-label">备注</label>
          <input type="text" v-model="newExpense.note" placeholder="可选" class="ita-input" />

          <button class="ita-btn-primary ita-btn-full" @click="addExpense">确认添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ita-app {
  min-height: 100vh;
  background: #f3f4f6;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Header */
.ita-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  box-shadow: 0 4px 20px rgba(5, 150, 105, 0.3);
}

.ita-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px 10px;
}

.ita-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
}

.ita-dates {
  margin: 2px 0 0;
  font-size: 0.75rem;
  opacity: 0.85;
}

.ita-budget-mini {
  text-align: right;
}

.ita-budget-label {
  display: block;
  font-size: 0.7rem;
  opacity: 0.85;
}

.ita-budget-amount {
  font-size: 1.1rem;
  font-weight: 800;
}

/* Nav */
.ita-nav {
  display: flex;
  background: rgba(0, 0, 0, 0.1);
}

.ita-nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 0.2s;
}

.ita-nav-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.ita-nav-icon {
  font-size: 1.2rem;
}

/* Content */
.ita-content {
  padding: 12px;
  padding-bottom: 24px;
}

.ita-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ita-section-title {
  margin: 8px 0 0;
  font-size: 1rem;
  font-weight: 700;
  color: #374151;
}

/* Cards */
.ita-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 16px;
}

.ita-card-title {
  margin: 0 0 12px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #111827;
}

/* Progress Card */
.ita-progress-card {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border: 1px solid #a7f3d0;
}

.ita-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.ita-day-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: #065f46;
}

.ita-day-sub {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: #047857;
}

.ita-progress-pct {
  font-size: 1.5rem;
  font-weight: 800;
  color: #059669;
}

.ita-progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 10px;
}

.ita-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  border-radius: 999px;
  transition: width 0.5s ease;
}

.ita-progress-text {
  margin: 6px 0 0;
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
}

/* Timeline */
.ita-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ita-timeline-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  background: #f9fafb;
  cursor: pointer;
  transition: background 0.15s;
}

.ita-timeline-item.checked {
  background: #ecfdf5;
}

.ita-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
  font-size: 0.8rem;
  color: #fff;
}

.ita-checkbox.done {
  background: #10b981;
  border-color: #10b981;
}

.ita-timeline-body {
  flex: 1;
  min-width: 0;
}

.ita-timeline-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ita-time {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 600;
  flex-shrink: 0;
}

.ita-item-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ita-location {
  font-size: 0.75rem;
  color: #9ca3af;
}

.ita-tags {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.ita-tag {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.ita-tag--blue {
  background: #dbeafe;
  color: #2563eb;
}

.ita-tag--purple {
  background: #f3e8ff;
  color: #9333ea;
}

/* Quick Grid */
.ita-quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ita-quick-card {
  border-radius: 16px;
  padding: 16px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.15s;
}

.ita-quick-card:active {
  transform: scale(0.97);
}

.ita-quick-icon {
  font-size: 1.5rem;
}

.ita-quick-card strong {
  font-size: 0.9rem;
}

.ita-quick-card span:last-child {
  font-size: 0.72rem;
  opacity: 0.85;
}

/* Day Pills */
.ita-day-pills {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.ita-day-pills::-webkit-scrollbar {
  display: none;
}

.ita-day-pill {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.ita-day-pill.active {
  background: #059669;
  color: #fff;
  border-color: #059669;
}

/* Day Card */
.ita-day-header {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.ita-day-card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.ita-day-header p {
  margin: 4px 0 0;
  font-size: 0.8rem;
  opacity: 0.85;
}

.ita-day-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ita-day-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: #f9fafb;
  cursor: pointer;
  transition: background 0.15s;
}

.ita-day-item.checked {
  background: #ecfdf5;
}

.ita-day-item-body {
  flex: 1;
}

.ita-day-item-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Hotels */
.ita-hotel-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ita-hotel-card {
  padding: 14px;
}

.ita-hotel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.ita-hotel-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.ita-hotel-city {
  font-size: 0.8rem;
  color: #9ca3af;
}

.ita-hotel-info {
  margin-top: 10px;
  font-size: 0.82rem;
  color: #6b7280;
}

.ita-hotel-info p {
  margin: 4px 0;
}

.ita-hotel-notes {
  font-size: 0.75rem !important;
  color: #9ca3af !important;
  margin-top: 6px !important;
}

/* Badges */
.ita-badge {
  font-size: 0.72rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: #d1fae5;
  color: #065f46;
  font-weight: 600;
  flex-shrink: 0;
}

.ita-badge-used {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.ita-badge-booked {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 999px;
  background: #d1fae5;
  color: #065f46;
  font-weight: 600;
  flex-shrink: 0;
}

/* Tickets */
.ita-ticket-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ita-ticket-card {
  padding: 0;
  overflow: hidden;
  transition: opacity 0.2s;
}

.ita-ticket-card.used {
  opacity: 0.6;
}

.ita-ticket-head {
  background: linear-gradient(135deg, #9333ea, #a855f7);
  color: #fff;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.ita-ticket-body {
  padding: 14px;
}

.ita-ticket-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ita-ticket-label {
  display: block;
  font-size: 0.72rem;
  color: #9ca3af;
}

.ita-ticket-value {
  font-size: 0.88rem;
  font-weight: 600;
  color: #374151;
}

.ita-qr-code {
  background: #f3f4f6;
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}

.ita-qr-code span {
  font-size: 0.72rem;
  color: #9ca3af;
  display: block;
  margin-bottom: 4px;
}

.ita-qr-code code {
  font-family: monospace;
  font-size: 0.95rem;
  font-weight: 700;
  color: #111827;
}

/* Transport */
.ita-transport-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ita-transport-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
}

.ita-transport-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.ita-transport-route {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.9rem;
}

.ita-arrow {
  color: #d1d5db;
}

.ita-transport-date {
  font-size: 0.78rem;
  color: #9ca3af;
  display: block;
  margin-top: 2px;
}

.ita-transport-meta {
  display: flex;
  gap: 12px;
  font-size: 0.72rem;
  color: #6b7280;
  margin-top: 4px;
}

/* Restaurants */
.ita-restaurant-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ita-restaurant-card {
  padding: 12px 14px;
}

.ita-restaurant-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ita-restaurant-name {
  font-weight: 700;
  font-size: 0.9rem;
}

.ita-restaurant-price {
  font-size: 0.78rem;
  color: #9ca3af;
  margin-left: 6px;
}

.ita-restaurant-cuisine {
  font-size: 0.78rem;
  color: #9ca3af;
  display: block;
  margin-top: 2px;
}

.ita-restaurant-must {
  font-size: 0.78rem;
  color: #059669;
  display: block;
  margin-top: 4px;
}

/* Budget */
.ita-budget-card {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  text-align: center;
  padding: 20px;
}

.ita-budget-top-label {
  font-size: 0.82rem;
  opacity: 0.85;
}

.ita-budget-total {
  font-size: 2rem;
  font-weight: 800;
  display: block;
  margin: 6px 0 14px;
}

.ita-budget-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.ita-budget-stat-label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
}

.ita-budget-stat-value {
  font-size: 1.1rem;
  font-weight: 700;
}

.ita-budget-bar {
  background: rgba(255, 255, 255, 0.25);
  margin-top: 0;
}

.ita-budget-bar .ita-progress-fill {
  background: #fff;
}

.ita-budget-pct {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
  margin-top: 6px;
  text-align: right;
}

/* Categories */
.ita-category-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ita-category-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.ita-category-bar {
  width: 4px;
  height: 40px;
  border-radius: 999px;
  flex-shrink: 0;
}

.ita-category-body {
  flex: 1;
}

.ita-category-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.ita-category-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #374151;
}

.ita-category-amount {
  font-size: 0.88rem;
  font-weight: 700;
  color: #111827;
}

.ita-category-bar-bg {
  height: 6px;
  margin-top: 0;
}

/* Buttons */
.ita-btn-primary {
  border: none;
  border-radius: 14px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
}

.ita-btn-primary:active {
  transform: scale(0.97);
}

.ita-btn-full {
  width: 100%;
}

.ita-btn-outline {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 2px solid #9333ea;
  background: transparent;
  color: #9333ea;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 10px;
}

.ita-btn-outline:active {
  background: #f3e8ff;
}

/* Tip Card */
.ita-tip-card {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 14px;
  padding: 14px;
  font-size: 0.82rem;
  color: #92400e;
}

.ita-tip-card strong {
  display: block;
  margin-bottom: 6px;
}

.ita-tip-card ul {
  margin: 0;
  padding-left: 16px;
}

.ita-tip-card li {
  margin: 3px 0;
  font-size: 0.78rem;
}

/* Info Section */
.ita-info-card {
  padding: 0;
  overflow: hidden;
}

.ita-info-header {
  color: #fff;
  padding: 14px;
}

.ita-info-header p {
  margin: 4px 0 0;
  font-size: 0.78rem;
  opacity: 0.85;
}

.ita-info-header .ita-card-title {
  color: #fff;
  margin: 0;
}

.ita-header--blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.ita-header--red {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.ita-header--orange {
  background: linear-gradient(135deg, #f97316, #ea580c);
}

.ita-phrase-list {
  padding: 0 14px 10px;
}

.ita-phrase-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.ita-phrase-row:last-child {
  border-bottom: none;
}

.ita-phrase-row strong {
  display: block;
  font-size: 0.9rem;
  color: #111827;
}

.ita-phrase-row span {
  font-size: 0.78rem;
  color: #9ca3af;
}

.ita-phrase-btn {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 6px;
}

/* Emergency */
.ita-emergency-list {
  padding: 0 14px 10px;
}

.ita-emergency-item {
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ita-emergency-item:last-child {
  border-bottom: none;
}

.ita-emergency-item strong {
  font-size: 0.9rem;
  color: #111827;
}

.ita-emergency-number {
  font-size: 1.1rem;
  font-weight: 800;
  color: #dc2626;
}

.ita-emergency-item span:last-child {
  font-size: 0.78rem;
  color: #9ca3af;
}

/* Tips */
.ita-tip-list {
  padding: 14px;
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ita-tip-list li {
  font-size: 0.82rem;
  color: #6b7280;
  padding-left: 14px;
  position: relative;
}

.ita-tip-list li::before {
  content: '\2022';
  position: absolute;
  left: 0;
  color: #f97316;
  font-weight: 700;
}

/* Basics */
.ita-basics-card {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  padding: 18px;
}

.ita-basics-card .ita-card-title {
  color: #fff;
  margin-bottom: 12px;
}

.ita-basics-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ita-basics-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.ita-basics-row span {
  opacity: 0.8;
}

/* Modal */
.ita-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.ita-modal {
  background: #fff;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 480px;
  padding: 20px;
  animation: itaSlideUp 0.3s ease-out;
}

@keyframes itaSlideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.ita-modal-handle {
  width: 40px;
  height: 4px;
  background: #d1d5db;
  border-radius: 999px;
  margin: 0 auto 16px;
}

.ita-modal-title {
  margin: 0 0 16px;
  font-size: 1.1rem;
  font-weight: 700;
}

.ita-modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ita-modal-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
}

.ita-category-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.ita-cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: 12px;
  border: 2px solid transparent;
  background: #f3f4f6;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.72rem;
  color: #6b7280;
}

.ita-cat-btn.active {
  background: #ecfdf5;
  border-color: #10b981;
  color: #065f46;
}

.ita-cat-btn-icon {
  font-size: 1.4rem;
}

.ita-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  font-size: 1rem;
  color: #111827;
  background: #fff;
  transition: border-color 0.15s;
}

.ita-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* Responsive */
@media (min-width: 640px) {
  .ita-content {
    max-width: 480px;
    margin: 0 auto;
  }
}
</style>
