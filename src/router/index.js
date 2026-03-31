import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import CompliancePage from '@/pages/CompliancePage.vue'
import EnglishHomePage from '@/pages/EnglishHomePage.vue'
import EnglishModeListPage from '@/pages/EnglishModeListPage.vue'
import EnglishPatternDetailPage from '@/pages/EnglishPatternDetailPage.vue'
import SportPredictionPage from '@/pages/SportPredictionPage.vue'
import ToolsPage from '@/pages/ToolsPage.vue'
import StockTransitionPage from '@/pages/StockTransitionPage.vue'
import FuturesMonitorPage from '@/pages/FuturesMonitorPage.vue'
import CodexChatPage from '@/pages/CodexChatPage.vue'
import ItalyTripMapPage from '@/pages/ItalyTripMapPage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: 'Jackson He - 项目展示' },
  },
  {
    path: '/projects/game',
    name: 'compliance',
    component: CompliancePage,
    meta: { title: '内容合规检测 - Jackson He' },
  },
  {
    path: '/projects/data-viz',
    name: 'english-home',
    component: EnglishHomePage,
    meta: { title: '英语积累系统 - Jackson He' },
  },
  {
    path: '/projects/data-viz/mode/:modeId',
    name: 'english-mode',
    component: EnglishModeListPage,
    meta: { title: '模式列表 - 英语积累系统' },
  },
  {
    path: '/projects/data-viz/mode/:modeId/pattern/:patternIndex',
    name: 'english-pattern',
    component: EnglishPatternDetailPage,
    meta: { title: '模式详情 - 英语积累系统' },
  },
  {
    path: '/projects/creative',
    name: 'sport-prediction',
    component: SportPredictionPage,
    meta: { title: '赛事预测查询 - Jackson He' },
  },
  {
    path: '/projects/stock-transition',
    name: 'stock-transition',
    component: StockTransitionPage,
    meta: { title: 'Stock Transition - Jackson He' },
  },
  {
    path: '/projects/futures-monitor',
    name: 'futures-monitor',
    component: FuturesMonitorPage,
    meta: { title: '期货实时监控 - Jackson He' },
  },
  {
    path: '/projects/tools',
    name: 'tools',
    component: ToolsPage,
    meta: { title: '工具应用 - Jackson He' },
  },
  {
    path: '/projects/italy-trip-map',
    name: 'italy-trip-map',
    component: ItalyTripMapPage,
    meta: { title: '意大利旅行地图 - Jackson He' },
  },
  {
    path: '/projects/codex-chat',
    name: 'codex-chat',
    component: CodexChatPage,
    meta: { title: 'Codex Chat - Jackson He' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title
  }
})

export default router
