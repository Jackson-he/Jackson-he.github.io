import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import CompliancePage from '@/pages/CompliancePage.vue'
import EnglishHomePage from '@/pages/EnglishHomePage.vue'
import EnglishModeListPage from '@/pages/EnglishModeListPage.vue'
import EnglishPatternDetailPage from '@/pages/EnglishPatternDetailPage.vue'
import SportPredictionPage from '@/pages/SportPredictionPage.vue'
import ToolsPage from '@/pages/ToolsPage.vue'
import StockTransitionPage from '@/pages/StockTransitionPage.vue'
import FuturesMonitorPage from '@/pages/FuturesMonitorPage.vue'
import TwitterMonitorPage from '@/pages/TwitterMonitorPage.vue'
import CodexChatPage from '@/pages/CodexChatPage.vue'
import ItalyTripMapPage from '@/pages/ItalyTripMapPage.vue'
import ItalyTravelCompanionPage from '@/pages/ItalyTravelCompanionPage.vue'
import ItalyTravelPage2 from '@/pages/ItalyTravelPage-2.vue'
import ItalyThreePage from '@/pages/Italy-3.vue'
import CartierPage from '@/pages/CartierPage.vue'
import WeddingPage from '@/pages/WeddingPage.vue'


const SITE_NAME = '项目展示'
const SITE_URL = 'https://jackson-he.github.io'
const DEFAULT_IMAGE = `${SITE_URL}/social-share-cover.png`
const DEFAULT_META = {
  title: '项目展示',
  description: '项目展示站点，包含内容合规检测、英语积累系统、赛事预测和工具应用。',
  sharePath: '/',
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: {
      title: '项目展示',
      description: DEFAULT_META.description,
      sharePath: '/',
    },
  },
  {
    path: '/projects/cartier',
    name: 'cartier',
    component: CartierPage,
    meta: {
      title: 'cartier',
      description: 'cartier。',
      sharePath: '/projects/cartier/',
    },
  },
  {
    path: '/projects/game',
    name: 'compliance',
    component: CompliancePage,
    meta: {
      title: '内容合规检测',
      description: '基于 AI 模型的文本合规检测页，支持单条和批量检测。',
      sharePath: '/projects/game/',
    },
  },
  {
    path: '/projects/data-viz',
    name: 'english-home',
    component: EnglishHomePage,
    meta: {
      title: '英语积累系统',
      description: '五大英语表达模式，支持模式浏览、例句展示与快速定位。',
      sharePath: '/projects/data-viz/',
    },
  },
  {
    path: '/projects/data-viz/mode/:modeId',
    name: 'english-mode',
    component: EnglishModeListPage,
    meta: {
      title: '模式列表 - 英语积累系统',
      description: '英语表达模式列表页，按模式查看常见句型、功能和例句。',
    },
  },
  {
    path: '/projects/data-viz/mode/:modeId/pattern/:patternIndex',
    name: 'english-pattern',
    component: EnglishPatternDetailPage,
    meta: {
      title: '模式详情 - 英语积累系统',
      description: '英语表达模式详情页，展示具体句型、功能说明与例句。',
    },
  },
  {
    path: '/projects/creative',
    name: 'sport-prediction',
    component: SportPredictionPage,
    meta: {
      title: '赛事预测查询',
      description: '连接预测 API 的足球赛事看板，涵盖比赛、推荐、历史与对比。',
      sharePath: '/projects/creative/',
    },
  },
  {
    path: '/projects/stock-transition',
    name: 'stock-transition',
    component: StockTransitionPage,
    meta: {
      title: 'Stock Transition',
      description: '部署到 GitHub Pages 的美股趋势突破监控面板，连接独立后端 API。',
      sharePath: '/projects/stock-transition/',
    },
  },
  {
    path: '/projects/futures-monitor',
    name: 'futures-monitor',
    component: FuturesMonitorPage,
    meta: {
      title: '期货实时监控',
      description: '期货终端风格前端界面，支持实时和演示 K 线、指标叠加与资金信号面板。',
      sharePath: '/projects/futures-monitor/',
    },
  },
  {
    path: '/projects/twitter-monitor',
    name: 'twitter-monitor',
    component: TwitterMonitorPage,
    meta: {
      title: 'Twitter Monitor Console',
      description: '连接 twitter-monitor 独立后端的推文监控工作台，支持目标管理、规则配置、同步和命中查看。',
      sharePath: '/projects/twitter-monitor/',
    },
  },
  {
    path: '/projects/tools',
    name: 'tools',
    component: ToolsPage,
    meta: {
      title: '工具应用',
      description: '集中展示可独立部署的小工具页，包含股票趋势、期货监控、推文监控、行程地图和 Codex Chat。',
      sharePath: '/projects/tools/',
    },
  },
  {
    path: '/projects/italy-trip-map',
    name: 'italy-trip-map',
    component: ItalyTripMapPage,
    meta: {
      title: '意大利旅行地图',
      description: '把意大利婚纱照行程可视化到地图里，支持点位筛选、路线查看和每日节奏概览。',
      sharePath: '/projects/italy-trip-map/',
    },
  },
  {
    path: '/projects/italy-1',
    name: 'italy-travel-companion',
    component: ItalyTravelCompanionPage,
    meta: {
      title: '意大利出行工具',
      description: '个人使用的意大利出行工具，把 Today、Map、Tickets、Transport、Trip 放进一个移动优先工作台。',
      sharePath: '/projects/italy-3/',
    },
  },
  {
    path: '/projects/italy-2',
    name: 'italy-travel-2',
    component: ItalyTravelPage2,
    meta: {
      title: '意大利出行工具',
      description: '个人使用的意大利出行工具。',
      sharePath: '/projects/italy-2/',
    },
  },
  {
    path: '/projects/italy-3',
    name: 'italy-3',
    component: ItalyThreePage,
    meta: {
      title: '意大利出行工具',
      description: '个人意大利出行辅助工具，包含今日行程、地图、票据、交通和旅程总览。',
      sharePath: '/projects/italy-3/',
    },
  },
  {
    path: '/projects/codex-chat',
    name: 'codex-chat',
    component: CodexChatPage,
    meta: {
      title: 'Codex Chat',
      description: '基于 Codex SDK 的本地聊天工作台，支持历史会话和项目目录上下文。',
      sharePath: '/projects/codex-chat/',
    },
  },
  {
    path: '/wedding',
    name: 'wedding',
    component: WeddingPage,
    meta: {
      title: 'Will You Marry Me?',
      description: 'A special moment.',
      sharePath: '/wedding/',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

function ensureMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function ensureLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

function buildSharePath(to) {
  if (to.name === 'english-mode') {
    const modeId = encodeURIComponent(to.params.modeId || 'mode1')
    return `/projects/data-viz/mode/${modeId}`
  }

  if (to.name === 'english-pattern') {
    const modeId = encodeURIComponent(to.params.modeId || 'mode1')
    const patternIndex = encodeURIComponent(to.params.patternIndex || '0')
    return `/projects/data-viz/mode/${modeId}/pattern/${patternIndex}`
  }

  return to.meta?.sharePath || DEFAULT_META.sharePath
}

router.afterEach((to) => {
  const title = to.meta?.title || DEFAULT_META.title
  const description = to.meta?.description || DEFAULT_META.description
  const shareUrl = new URL(buildSharePath(to), `${SITE_URL}/`).toString()
  const image = to.meta?.image || DEFAULT_IMAGE

  document.title = title
  ensureMeta('name', 'description', description)
  ensureMeta('property', 'og:type', 'website')
  ensureMeta('property', 'og:site_name', SITE_NAME)
  ensureMeta('property', 'og:locale', 'zh_CN')
  ensureMeta('property', 'og:title', title)
  ensureMeta('property', 'og:description', description)
  ensureMeta('property', 'og:url', shareUrl)
  ensureMeta('property', 'og:image', image)
  ensureMeta('property', 'og:image:alt', '项目展示封面图')
  ensureMeta('name', 'twitter:card', 'summary_large_image')
  ensureMeta('name', 'twitter:title', title)
  ensureMeta('name', 'twitter:description', description)
  ensureMeta('name', 'twitter:image', image)
  ensureLink('canonical', shareUrl)
})

export default router
