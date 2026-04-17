<script setup>
const year = new Date().getFullYear()

const projects = [
  {
    icon: '🔍',
    title: '内容合规检测',
    description: '基于 AI 模型的文本合规检测页，支持单条和批量检测。',
    to: '/projects/game',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    size: 'wide',
  },
  {
    icon: '📚',
    title: '英语积累系统',
    description: '五大英语表达模式，支持模式浏览、例句展示与快速定位。',
    to: '/projects/data-viz',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    size: 'normal',
  },
  {
    icon: '⚽',
    title: '赛事预测查询',
    description: '连接预测 API 的足球赛事看板，涵盖比赛、推荐、历史与对比。',
    to: '/projects/creative',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    size: 'normal',
  },
  {
    icon: '📈',
    title: 'Stock Transition',
    description: '部署到 GitHub Pages 的美股趋势突破监控面板，连接独立后端 API。',
    to: '/projects/stock-transition',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    size: 'normal',
  },
  {
    icon: '📉',
    title: '期货实时监控',
    description: '期货终端风格前端界面，支持实时/演示 K 线、指标叠加和资金信号面板。',
    to: '/projects/futures-monitor',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    size: 'wide',
  },
  {
    icon: '🇮🇹',
    title: '意大利出行工具',
    description: '个人旅行工作台，集中处理 Today、地图、票据、交通规则和全程总览。',
    to: '/projects/italy-1',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    size: 'normal',
  },
  {
    icon: '🛠️',
    title: '工具应用',
    description: '为后续更多工具页预留的模块化入口。',
    to: '/projects/tools',
    gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    size: 'normal',
  },
  {
    icon: '⌘',
    title: 'Codex Chat',
    description: '基于 Codex SDK 的本地聊天工作台，支持历史会话和项目目录上下文。',
    to: '/projects/codex-chat',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    size: 'normal',
  },
]
</script>

<template>
  <main class="bento-page">
    <div class="bento-container">
      <header class="bento-hero">
        <p class="bento-eyebrow">PROJECTS</p>
        <h1 class="bento-title">精选项目</h1>
        <p class="bento-subtitle">个人项目合集，涵盖 AI、金融、工具与旅行</p>
      </header>

      <section class="bento-grid">
        <RouterLink
          v-for="project in projects"
          :key="project.to"
          :to="project.to"
          class="bento-card"
          :class="{ 'bento-card--wide': project.size === 'wide' }"
        >
          <div class="bento-card-bg" :style="{ background: project.gradient }" />
          <div class="bento-card-content">
            <span class="bento-card-icon">{{ project.icon }}</span>
            <h2 class="bento-card-title">{{ project.title }}</h2>
            <p class="bento-card-desc">{{ project.description }}</p>
            <span class="bento-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 17L17 7" /><path d="M7 7h10v10" />
              </svg>
            </span>
          </div>
        </RouterLink>
      </section>

      <footer class="bento-footer">
        <span>© {{ year }}</span>
        <a href="https://github.com/Jackson-he" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.bento-page {
  min-height: 100vh;
  padding: 48px 24px 64px;
  background: #000;
  color: #f5f5f7;
}

.bento-container {
  max-width: 1080px;
  margin: 0 auto;
}

/* ---- Hero ---- */
.bento-hero {
  text-align: center;
  margin-bottom: 48px;
  padding-top: 32px;
}

.bento-eyebrow {
  margin: 0 0 12px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: #86868b;
  text-transform: uppercase;
}

.bento-title {
  margin: 0;
  font-size: clamp(2.8rem, 6vw, 4.2rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.6) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.bento-subtitle {
  margin: 14px 0 0;
  font-size: 1.15rem;
  color: #86868b;
  font-weight: 400;
}

/* ---- Bento Grid ---- */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.bento-card {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  min-height: 220px;
  display: flex;
  cursor: pointer;
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.35s ease;
}

.bento-card--wide {
  grid-column: span 2;
}

.bento-card:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* gradient background layer */
.bento-card-bg {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  transition: opacity 0.4s ease;
}

.bento-card:hover .bento-card-bg {
  opacity: 0.32;
}

/* dark glass surface */
.bento-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(28, 28, 30, 0.85);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  z-index: 0;
}

.bento-card-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  padding: 28px;
  width: 100%;
}

.bento-card-icon {
  font-size: 2.4rem;
  margin-bottom: 16px;
  display: inline-block;
  transition: transform 0.3s ease;
}

.bento-card:hover .bento-card-icon {
  transform: scale(1.12);
}

.bento-card-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #f5f5f7;
}

.bento-card-desc {
  margin: 8px 0 0;
  font-size: 0.92rem;
  line-height: 1.6;
  color: #a1a1a6;
  flex: 1;
}

.bento-card-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-top: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #f5f5f7;
  align-self: flex-end;
  transition: background 0.3s ease, transform 0.3s ease;
}

.bento-card:hover .bento-card-arrow {
  background: rgba(255, 255, 255, 0.2);
  transform: translate(2px, -2px);
}

/* ---- Footer ---- */
.bento-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 48px;
  padding: 24px 0;
  font-size: 0.85rem;
  color: #86868b;
}

.bento-footer a {
  color: #86868b;
  text-decoration: none;
  transition: color 0.2s ease;
}

.bento-footer a:hover {
  color: #f5f5f7;
}

/* ---- Responsive ---- */
@media (max-width: 860px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .bento-card--wide {
    grid-column: span 2;
  }
}

@media (max-width: 560px) {
  .bento-page {
    padding: 32px 16px 48px;
  }

  .bento-grid {
    grid-template-columns: 1fr;
  }

  .bento-card--wide {
    grid-column: span 1;
  }

  .bento-card {
    min-height: 180px;
  }
}
</style>
