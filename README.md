# Jackson He - Vue 3 项目展示网站

这是 `Jackson-he.github.io` 的 Vue 3 重构版本，使用 `Vite + Vue Router` 管理首页和各个项目页面，并通过 GitHub Actions 自动发布到 GitHub Pages。

## 技术栈

- Vue 3
- Vue Router 4
- Vite 5
- 原生 Fetch API
- GitHub Actions

## 目录结构

```text
Jackson-he.github.io/
├── .github/workflows/
│   └── deploy-pages.yml          # GitHub Pages 自动部署工作流
├── index.html                    # Vite 入口页面
├── package.json                  # 仓库内前端依赖与脚本
├── vite.config.mjs               # Vite 配置
├── src/
│   ├── App.vue                   # 根组件
│   ├── main.js                   # Vue 启动入口
│   ├── router/
│   │   └── index.js              # 路由配置
│   ├── pages/
│   │   ├── HomePage.vue          # 首页
│   │   ├── CompliancePage.vue    # 内容合规检测
│   │   ├── EnglishHomePage.vue   # 英语积累系统首页
│   │   ├── EnglishModeListPage.vue
│   │   ├── EnglishPatternDetailPage.vue
│   │   ├── SportPredictionPage.vue
│   │   └── ToolsPage.vue
│   └── styles.css                # 全局样式
├── projects/
│   ├── creative/index.html       # 旧路径兼容跳转页
│   ├── data-viz/
│   │   ├── data.js               # 英语积累系统静态数据
│   │   ├── index.html            # 旧路径兼容跳转页
│   │   ├── mode-list.html        # 旧路径兼容跳转页
│   │   └── pattern-detail.html   # 旧路径兼容跳转页
│   ├── game/index.html           # 旧路径兼容跳转页
│   └── tools/index.html          # 旧路径兼容跳转页
└── dist/                         # 本地构建产物（已忽略）
```

## 本地开发

进入仓库目录后运行：

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
```

构建结果输出到 `dist/`，由 GitHub Actions 自动上传并部署到 GitHub Pages。

## GitHub Pages 自动部署

工作流文件：`.github/workflows/deploy-pages.yml`

触发方式：

- 推送到 `gh-pages` 分支时自动部署
- 在 GitHub Actions 页面手动触发 `workflow_dispatch`

仓库需要在 GitHub Pages 设置中选择：

- **Build and deployment** → **Source** → `GitHub Actions`

## 路由说明

- `/#/`：首页
- `/#/projects/game`：内容合规检测
- `/#/projects/data-viz`：英语积累系统
- `/#/projects/data-viz/mode/:modeId`：英语模式列表
- `/#/projects/data-viz/mode/:modeId/pattern/:patternIndex`：英语模式详情
- `/#/projects/creative`：赛事预测查询
- `/#/projects/tools`：工具应用

保留了旧的 HTML 路径，并通过跳转页兼容旧链接。


## Stock Transition

- 路由入口：`#/projects/stock-transition`
- GitHub Pages 部署时页面为静态前端，需要单独部署 `stock-transition` 后端 API
- 页面支持配置 `API Base URL`，并会把该地址保存在浏览器本地存储
