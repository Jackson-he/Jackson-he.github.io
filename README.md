# Jackson He - 个人项目展示网站

这是一个现代化的个人项目展示静态网站，部署在 GitHub Pages 上。

## 📁 项目结构

```
Jackson-he.github.io/
├── index.html              # 主页
├── styles/
│   └── main.css           # 主样式文件
├── scripts/
│   └── main.js            # 主交互脚本
├── projects/              # 项目文件夹
│   ├── game/              # 游戏项目
│   │   └── index.html
│   ├── data-viz/          # 数据可视化项目
│   │   └── index.html
│   ├── creative/          # 创意设计项目
│   │   └── index.html
│   └── tools/             # 工具应用项目
│       └── index.html
└── README.md              # 说明文档
```

## 🚀 如何使用

### 添加新项目

1. 在 `projects/` 目录下创建新的项目文件夹
2. 在新文件夹中创建 `index.html` 文件
3. 在主页 `index.html` 中添加新的项目卡片

### 自定义样式

编辑 `styles/main.css` 文件中的 CSS 变量来自定义颜色主题：

```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --background: #0f172a;
    --surface: #1e293b;
    /* ... 更多变量 */
}
```

### 修改项目信息

在 `index.html` 中找到对应的项目卡片，修改：
- `card-icon`: 项目图标（emoji）
- `card-title`: 项目标题
- `card-description`: 项目描述
- `href`: 项目链接

## 🛠️ 技术栈

- HTML5
- CSS3 (Grid, Flexbox, Animations)
- Vanilla JavaScript
- Intersection Observer API

## 📄 许可

© 2025 Jackson He. All rights reserved.

---