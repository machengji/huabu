# Poster Studio (Huabu Vue)

Poster Studio 是一个功能强大的现代化在线海报设计与画板工具。基于 **Vue 3** 和 **Fabric.js** 构建，它不仅提供了流畅的画布编辑体验，还深度集成了多种 **AI 图像生成服务**（MiniMax, Kling, LibLib），让创意设计变得触手可及。

## ✨ 主要功能

- **🎨 交互式画布编辑**
  - 基于 Fabric.js (v7) 的高性能渲染
  - 支持矩形、圆形等基础形状绘制
  - 强大的文本编辑功能
  - 支持拖拽、缩放、旋转等自由变换操作
  - 快捷键支持（空格拖拽画布、Ctrl+滚轮缩放、Delete 删除）

- **🤖 AI 创意生成**
  - 集成 **MiniMax** 文生图能力
  - 集成 **Kling (可灵)** AI 绘画
  - 集成 **LibLib** AI 服务
  - *支持在侧边栏直接配置 API Key 并生成图片到画布*

- **🖼️ 素材管理**
  - 支持本地图片上传（拖拽或点击上传）
  - 图层/对象列表管理
  - 能够定位、重命名、删除画布中的元素

- **🛠️ 实用工具**
  - **导出功能**：一键导出画布内容为 PNG 图片
  - **暗黑模式**：内置深色/浅色主题切换
  - **缩放控制**：精确的画布缩放控制
  - **项目保存**：支持保存和加载项目状态（JSON 格式）

## 🛠️ 技术栈

- **前端框架**: [Vue 3](https://vuejs.org/) (Script Setup)
- **构建工具**: [Vite](https://vitejs.dev/)
- **图形引擎**: [Fabric.js v7](http://fabricjs.com/)
- **图标库**: [Lucide Vue Next](https://lucide.dev/)
- **样式**: CSS Variables + Scoped CSS

## 🚀 快速开始

### 环境要求

- Node.js (推荐 v16+)
- npm 或 yarn / pnpm

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd huabu-vue
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   访问控制台输出的地址（通常是 `http://localhost:5173`）即可预览。

4. **构建生产版本**
   ```bash
   npm run build
   ```

## 📖 使用指南

### 1. 基础操作
- **添加元素**：通过左侧工具栏添加文字、形状。
- **选择与变换**：点击元素进行选中，使用控制点进行缩放、旋转。
- **画布漫游**：按住 `空格键` 并拖动鼠标可移动画布视图。
- **缩放**：使用顶部缩放按钮或按住 `Ctrl` + `鼠标滚轮`。

### 2. AI 图像生成
1. 打开右侧属性面板。
2. 选择 AI 模型（MiniMax, Kling 或 LibLib）。
3. 输入相应的 **API Key** (和 Secret Key 如需)。
4. 输入提示词（Prompt）。
5. 点击生成，AI 生成的图片将自动添加到画布中心。

### 3. 图片上传
- 点击工具栏的图片上传按钮，或直接将本地图片文件拖入画布区域。

### 4. 导出
- 点击顶部右上角的“导出设计”按钮，即可将当前画布内容保存为 PNG 图片。

## 📂 目录结构

```
src/
├── components/        # Vue 组件
│   ├── CanvasEditor.vue  # 核心画布组件 (Fabric.js 封装)
│   ├── SidePanel.vue     # 右侧属性与操作面板
│   ├── ToolBar.vue       # 左侧工具栏
│   └── ObjectToolbar.vue # 选中物体的悬浮工具栏
├── services/          # API 服务集成
│   ├── minimax.js        # MiniMax 接口
│   ├── kling.js          # Kling 接口
│   └── liblib.js         # LibLib 接口
├── App.vue            # 主应用入口
└── main.js            # Vue 初始化
```

## 📄 许可证

[MIT](LICENSE)
