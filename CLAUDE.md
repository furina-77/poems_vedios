# 古诗词AI视频生成与管理工具 - 项目指引

## 项目简介
基于古诗词通过豆包AI + 即梦AI生成短视频的Electron桌面应用（Windows x64）。

## 核心文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求规格 | [REQUIREMENTS.md](docs/REQUIREMENTS.md) | 完整功能需求与用户故事 |
| 技术架构 | [TECH_STACK.md](docs/TECH_STACK.md) | 技术选型、项目结构、数据流 |
| 设计规范 | [DESIGN_SPEC.md](docs/DESIGN_SPEC.md) | UI设计标准、配色、组件规范 |
| API规范 | [API_SPEC.md](docs/API_SPEC.md) | 豆包/即梦/诗词API调用规范 |
| 开发计划 | [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) | 分阶段执行步骤与里程碑 |

## 开发日志

每日开发日志存放于 `devlog/` 目录，命名格式 `YYYY-MM-DD.md`。
每天结束开发时更新，记录完成事项和待办事项。

## 开发守则

1. **安全第一**：所有API Key使用 `.env` 文件管理，绝不硬编码或提交到版本控制
2. **增量推进**：按开发计划的6个阶段逐步推进，每个阶段完成并验证后再进入下一阶段
3. **用户确认**：每个阶段完成后请用户确认效果，再继续
4. **代码规范**：TypeScript严格模式，ESLint + Prettier（后续引入）
5. **注释原则**：仅在非显而易见的逻辑处添加简短注释

## 环境要求

- Node.js >= 18（系统安装）
- 运行前必须确保 `ELECTRON_RUN_AS_NODE` 环境变量**未设置**（项目脚本已自动 unset）
- npm `script-shell` 配置于 `.npmrc` 中，指向 bash

## 常用命令

```bash
npm run dev        # 启动开发模式（Vite + Electron热重载）
npm run build      # 编译TypeScript + 打包渲染层
npm run build:win  # 编译 + 打包 Windows x64 安装包
npm run start      # 启动编译后的Electron应用
npm run typecheck  # 仅类型检查，不输出文件
```

## 关键约束

- 视频时长：≤ 1分钟
- 人物形象：带有可爱猫咪特征的人
- 风格：卡通可爱（cartoon cute）
- 配色主题：淡蓝色系
- 平台：Windows x64
