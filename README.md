# 古诗词视频工坊

基于古诗词通过 AI 自动生成短视频的 Electron 桌面应用。

## 效果展示

输入一首古诗词 → AI 自动拆解为分镜 → 每镜生成 5 秒动画 → 拼接为完整视频，全程可视化操作。

## 核心功能

- **选题材**：内置 100 首唐诗宋词，优先绝句，随机推荐 4 首供选择，已用诗词自动去重
- **AI 场景描绘**：逐句生成视觉场景描述，支持手动编辑微调
- **提示词生成**：统一角色设计 + 逐镜结构化提示词（含主体/场景/镜头/光影/氛围等 8 项）
- **视频生成**：接入快手可灵 Kling v3 API，逐镜生成 5 秒片段，实时进度追踪，支持取消
- **字幕叠加**：每镜自动叠加对应诗句字幕（ASS 格式渲染）
- **视频拼接**：FFmpeg 无损拼接全部镜头
- **视频库**：分类浏览、关键词搜索、本地播放、删除管理

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Electron 28 |
| 前端 | React 18 + TypeScript + Vite 5 |
| 本地存储 | SQL.js（SQLite in-memory + 文件持久化） |
| AI 文本 | 豆包 Seed 1.6 Flash（场景/角色/提示词） |
| AI 视频 | 可灵 Kling v3（逐镜文生视频） |
| 视频处理 | FFmpeg（拼接 + 字幕叠加） |
| 安全 | contextIsolation + preload IPC + 路径穿越防护 |

## 项目结构

```
src/
  main/           # Electron 主进程
    services/     # API 服务（doubao/kling/jimeng/video/poetry）
    database.ts   # SQLite 封装
    index.ts      # IPC 通道注册 + 窗口管理
  preload/        # 安全的渲染进程桥接
  shared/         # 共享类型 + 工具函数
  renderer/       # React 渲染层
    pages/        # CreatePage（创作） / LibraryPage（视频库）
    components/   # UI 组件（PoemSelector/SceneEditor/PromptEditor/VideoPreview...）
    styles/       # CSS 主题变量
assets/
  poems.json      # 100 首古诗词数据
```

## 创作流程

```
选择诗词 → AI 逐句场景描绘 → AI 角色 + 提示词生成 → 可灵逐镜生成(5s/镜) → FFmpeg 叠加字幕 → 拼接成品 → 保存到视频库
```

## 快速开始

```bash
# 安装依赖
npm install

# 配置 API Key（复制 .env.example 为 .env 并填入密钥）
# 需要：DOUBAO_API_KEY（豆包文本）、KLING_AK + KLING_SK（可灵视频）

# 开发模式
npm run dev

# 编译 + 打包 Windows
npm run build
npx electron-builder --win --x64 --dir --config.win.signAndEditExecutable=false
```

## 环境要求

- Windows x64
- Node.js >= 18
- FFmpeg（系统 PATH 中可用）
- 火山引擎账号（豆包 API）+ 快手可灵账号（视频 API）

## 安全

- 所有 API Key 通过 `.env` 管理，已加入 `.gitignore`
- 渲染进程 `contextIsolation: true`，`nodeIntegration: false`
- IPC 通道白名单模式，preload 仅暴露必要方法
- 文件访问白名单 + 路径穿越防护
- SQL 参数绑定 + LIKE 通配符转义
