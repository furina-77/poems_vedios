# 技术架构文档

## 技术选型

| 层级 | 技术 | 版本要求 | 用途 |
|------|------|---------|------|
| 桌面框架 | Electron | ^28.0.0 | 桌面窗口管理、系统集成 |
| 前端 | React + TypeScript | React 18, TS 5 | UI渲染 |
| 构建 | Vite | ^5.0.0 | 开发服务器与打包 |
| 打包 | electron-builder | ^24.0.0 | Windows exe安装包 |
| 数据库 | better-sqlite3 | ^9.0.0 | 本地元数据存储 |
| 样式 | CSS Modules + 主题变量 | - | 组件样式隔离 |
| HTTP | axios | ^1.6.0 | API调用 |
| 环境变量 | dotenv | ^16.0.0 | .env管理 |

## 项目结构

```
douyin-vedio/
├── CLAUDE.md                    # 项目指引（本文件）
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml         # 打包配置
├── .env                         # API Key（不提交git）
├── .env.example                 # .env模板
├── .gitignore
├── docs/                        # 项目文档
│   ├── REQUIREMENTS.md          # 需求规格
│   ├── TECH_STACK.md            # 技术架构（本文件）
│   ├── DESIGN_SPEC.md           # 设计规范
│   ├── API_SPEC.md              # API规范
│   └── DEVELOPMENT_PLAN.md      # 开发计划
├── devlog/                      # 开发日志
│   └── YYYY-MM-DD.md
├── resources/                   # 静态资源（图标等）
├── assets/                      # 前端资源
└── src/
    ├── main/                    # Electron主进程
    │   ├── index.ts             # 入口：窗口管理、生命周期
    │   ├── ipc-handlers.ts      # IPC通道注册
    │   ├── database.ts          # SQLite初始化与操作
    │   └── services/
    │       ├── poetry-api.ts    # 诗词API服务
    │       ├── doubao-api.ts    # 豆包AI服务
    │       └── jimeng-api.ts    # 即梦视频生成服务
    ├── preload/
    │   └── index.ts             # 预加载脚本（暴露IPC接口）
    ├── renderer/                # React前端
    │   ├── index.html
    │   ├── main.tsx             # React入口
    │   ├── App.tsx              # 根组件 + 路由
    │   ├── pages/
    │   │   ├── CreatePage.tsx   # 新建创作页（步骤流程）
    │   │   └── LibraryPage.tsx  # 视频库管理页
    │   ├── components/
    │   │   ├── Layout.tsx       # 整体布局
    │   │   ├── StepperBar.tsx   # 步骤指示器
    │   │   ├── PoemSelector.tsx # 诗词选择卡片
    │   │   ├── SceneEditor.tsx  # 场景编辑
    │   │   ├── PromptEditor.tsx # 提示词编辑
    │   │   └── VideoPreview.tsx # 视频预览播放器
    │   ├── hooks/
    │   │   └── useApi.ts        # API调用hook
    │   ├── styles/
    │   │   ├── theme.css        # 主题变量（淡蓝色系）
    │   │   └── global.css       # 全局样式
    │   └── utils/
    │       └── format.ts        # 工具函数
    └── shared/
        └── types.ts             # 共享TypeScript类型定义
```

## 数据流

```
[诗词API] → PoemSelector → [豆包API] → SceneEditor → [豆包API] → PromptEditor → [即梦API] → VideoPreview → [本地存储]
                                                                                                      ↓
                                                                                              SQLite + 视频文件
```

## IPC 架构

主进程与渲染进程通过 Electron IPC 通信：

```
渲染进程 (React)  ←→  Preload (bridge)  ←→  主进程 (Electron)
                                              ├── 诗词API调用
                                              ├── 豆包API调用  
                                              ├── 即梦API调用
                                              ├── SQLite操作
                                              └── 文件系统操作
```

所有外部API调用在主进程完成，渲染进程不直接访问网络或文件系统。
