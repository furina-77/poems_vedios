# 开发计划

## 总体原则
- 分阶段推进，每阶段完成后验证再进入下一阶段
- 每阶段完成后请用户确认效果
- 保持代码可运行状态，不积累未测试的代码

---

## P0：项目初始化与环境搭建 ⏳

### 目标
可启动的 Electron 窗口，显示 React 界面

### 任务清单
- [ ] 初始化 npm 项目，安装依赖
  - electron, react, react-dom, typescript, vite
  - @vitejs/plugin-react, electron-builder
  - better-sqlite3, axios, dotenv
- [ ] 配置 TypeScript (tsconfig.json)
- [ ] 配置 Vite (vite.config.ts)
- [ ] 配置 electron-builder (electron-builder.yml)
- [ ] 创建 Electron 主进程入口 (src/main/index.ts)
  - 窗口创建（1200x800，开发模式加载 localhost，生产模式加载本地文件）
- [ ] 创建 Preload 脚本 (src/preload/index.ts)
- [ ] 创建 React 入口 (src/main/index.html + src/renderer/main.tsx)
- [ ] 创建基础 App 组件（Layout + Header + Sidebar + 两个页面占位）
- [ ] 创建主题样式 (theme.css + global.css)
- [ ] 配置 .env 和 .env.example
- [ ] 配置 .gitignore
- [ ] 验证：`npm run dev` 能启动桌面窗口并显示界面

### 预计文件
- package.json, tsconfig.json, vite.config.ts, electron-builder.yml
- .env, .env.example, .gitignore
- src/main/index.ts
- src/preload/index.ts
- src/renderer/index.html, main.tsx, App.tsx
- src/renderer/styles/theme.css, global.css
- src/renderer/components/Layout.tsx

---

## P1：诗词选题模块

### 目标
随机展示4首古诗词，用户可选择题材

### 前置条件
- P0 完成

### 任务清单
- [ ] 实现诗词 API 服务 (src/main/services/poetry-api.ts)
- [ ] 注册 IPC 通道：获取随机诗词
- [ ] 实现 PoemSelector 组件
  - 4张诗词卡片网格布局
  - 显示：标题/作者/朝代/全文
  - "换一批"按钮
  - 选中高亮 + 确认按钮
- [ ] 在 CreatePage 集成，作为步骤1
- [ ] 实现 SQLite 诗词使用记录表
- [ ] 验证：可随机获取4首诗词、换一批、选择并进入下一步

### 预计文件
- src/main/services/poetry-api.ts
- src/main/database.ts
- src/renderer/components/PoemSelector.tsx
- 更新 CreatePage.tsx

---

## P2：AI场景描绘模块

### 目标
调用豆包描绘诗词场景，用户可编辑

### 前置条件
- P1 完成

### 任务清单
- [ ] 实现豆包文本 API 服务 (src/main/services/doubao-api.ts)
- [ ] 注册 IPC 通道：生成场景描述
- [ ] 实现 SceneEditor 组件
  - Loading 状态（生成中动画）
  - 富文本展示AI生成结果
  - 可编辑（textarea）
  - 底部操作：重新生成 / 确认
- [ ] 在 CreatePage 集成，作为步骤2
- [ ] 验证：发送诗词→豆包返回描述→用户编辑→确认进入下一步

### 预计文件
- src/main/services/doubao-api.ts
- src/renderer/components/SceneEditor.tsx
- 更新 CreatePage.tsx

---

## P3：提示词生成模块

### 目标
基于场景描述生成结构化视频提示词

### 前置条件
- P2 完成

### 任务清单
- [ ] 扩展豆包 API 服务，支持提示词生成
- [ ] 实现 PromptEditor 组件
  - 结构化展示8个字段
  - 每项独立可编辑
  - 格式校验（确保8个字段完整）
- [ ] 在 CreatePage 集成，作为步骤3
- [ ] 验证：场景→结构化提示词→用户编辑各项→确认

### 预计文件
- src/renderer/components/PromptEditor.tsx
- 更新 CreatePage.tsx, doubao-api.ts

---

## P4：视频生成模块

### 目标
调用即梦生成视频，预览效果

### 前置条件
- P3 完成

### 任务清单
- [ ] 实现即梦视频生成服务 (src/main/services/jimeng-api.ts)
  - 提交任务
  - 轮询状态（每5秒，最多5分钟超时）
  - 下载视频文件
- [ ] 注册 IPC 通道：生成视频、查询进度
- [ ] 实现 VideoPreview 组件
  - 生成进度（进度条/状态提示）
  - HTML5 video 播放器
  - 保存 / 放弃按钮
- [ ] 在 CreatePage 集成，作为步骤4
- [ ] 文件管理：视频先存临时目录
- [ ] 验证：提示词→视频生成→预览→保存/放弃

### 预计文件
- src/main/services/jimeng-api.ts
- src/renderer/components/VideoPreview.tsx
- 更新 CreatePage.tsx

---

## P5：视频管理模块

### 目标
浏览、搜索、播放、删除已保存的视频

### 前置条件
- P4 完成（至少保存流程可用）

### 任务清单
- [ ] 实现视频保存逻辑（移动文件 + 写入SQLite元数据）
- [ ] 实现视频数据库表结构与操作
- [ ] 实现 LibraryPage 页面
  - 视频卡片网格（缩略图 + 标题 + 日期）
  - 搜索栏（按诗词名/日期搜索）
  - 点击播放（弹窗或内嵌播放器）
  - 删除操作（确认弹窗 + 清理文件）
- [ ] 验证：保存后可浏览、搜索、播放、删除

### 预计文件
- src/renderer/pages/LibraryPage.tsx
- src/renderer/components/VideoCard.tsx
- 更新 database.ts

---

## P6：UI打磨 + 打包

### 目标
美化UI，打包Windows exe安装包

### 前置条件
- P0-P5 全部完成

### 任务清单
- [ ] UI细节调整（动画、过渡、响应式）
- [ ] 首次启动引导（选择视频保存路径）
- [ ] 错误处理完善（网络错误、API异常提示）
- [ ] 空状态设计（视频库为空时的引导）
- [ ] 打包配置（electron-builder.yml）
- [ ] 构建 Windows x64 安装包 (.exe)
- [ ] 在 Windows 环境下安装测试

---

## 里程碑

| 阶段 | 预计完成标志 | 验证方式 |
|------|-------------|---------|
| P0 | 桌面窗口显示淡蓝色UI界面 | `npm run dev` |
| P1 | 可选题材 | 手动选择诗词并确认 |
| P2 | AI场景描绘可编辑 | 豆包返回结果并修改 |
| P3 | 提示词结构化编辑 | 8项字段可独立修改 |
| P4 | 视频生成预览 | 即梦返回视频播放 |
| P5 | 视频管理完整 | 浏览/搜索/删除 |
| P6 | exe安装包 | Windows安装运行 |
