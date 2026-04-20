# 北京旅行规划指南 (Beijing Travel Guide)

这是一个高度定制化的北京4天3晚旅行规划工具，包含每日行程、时间线、交通路线和景点详细攻略。

## 项目特点 (Features)
- 🗺️ **真实路线规划**：集成高德地图 (AMap) Web Service API，真实还原步行、公交地铁和驾车路线，不再是简单的两点一线。
- 🌤️ **实时天气**：动态获取北京市实时天气信息（气温、风力、天气现象）。
- 📍 **景点微地图**：每个核心景点（如故宫、天坛、颐和园等）包含专属的内部步行游览路线图和游览建议。
- 🖥️ **前后端分离架构**：
  - **前端**：原生 HTML/CSS/JS，设计精美的交互式时间线和地图组件。
  - **后端**：Node.js Express 代理服务器，安全调用高德 API，解决浏览器跨域 (CORS) 限制。

## 如何运行 (How to run)

### 前置要求 (Prerequisites)
- 安装 [Node.js](https://nodejs.org/) (建议 v14 及以上版本)

### 启动步骤 (Steps)
1. **安装依赖**：
   在项目根目录下打开终端，运行：
   ```bash
   npm install
   ```

2. **启动本地服务器**：
   ```bash
   node server.js
   ```

3. **访问项目**：
   打开浏览器，访问 [http://localhost:3000](http://localhost:3000) 即可查看完整的旅行指南。

## 项目结构 (Project Structure)
- `beijing-travel-guide.html`: 前端核心页面，包含所有 UI 渲染、地图初始化和交互逻辑。
- `server.js`: Node.js 后端服务，负责静态文件托管和高德 API 请求代理。
- `test_playwright.js`: Playwright 端到端 (E2E) 自动化测试脚本，用于验证路线渲染和天气 API 是否正常工作。
- `GEMINI.md`: AI 助手的项目上下文环境配置与规则。

## 开发者说明 (Developer Notes)
- 如果需要更换高德地图 API Key，请在 `server.js` 中修改 `AMAP_KEY` 变量，并在 `beijing-travel-guide.html` 中修改 Web 端 JS API Key 和 `securityJsCode`。
- 所有的景点数据、路线配置（`locations`, `dayRoutes`, `spotDetails` 等）均硬编码在 `beijing-travel-guide.html` 的 `<script>` 标签内。
