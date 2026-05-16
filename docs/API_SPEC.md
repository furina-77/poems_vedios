# API 集成规范

## 1. 豆包 AI (Doubao) — 文本生成

### 接口信息
| 项目 | 值 |
|------|-----|
| Endpoint | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` |
| 鉴权方式 | `Authorization: Bearer ${API_KEY}` |
| 模型 | `doubao-seed-1.6-flash` |
| 协议 | OpenAI 兼容的 Chat Completions API |

### 场景描绘调用参数
```json
{
  "model": "doubao-seed-1.6-flash",
  "messages": [
    {
      "role": "system",
      "content": "你是一位擅长将古诗词转化为现代视觉场景的创意文案。请用现代汉语描绘诗词中的场景画面，要求细节丰富、画面感强，适合用于视频创作。"
    },
    {
      "role": "user",
      "content": "请描绘以下诗词的视觉场景：\n《诗词标题》- 作者\n诗词正文..."
    }
  ],
  "temperature": 0.8,
  "max_tokens": 1000
}
```

### 提示词生成调用参数
```json
{
  "model": "doubao-seed-1.6-flash",
  "messages": [
    {
      "role": "system",
      "content": "你是一位专业的AI视频提示词工程师。你需要将场景描述转化为结构化视频提示词。\n\n固定约束：\n- 视频时长不超过1分钟\n- 人物形象：带有可爱猫咪特征的卡通人物（猫耳、猫尾）\n- 风格：卡通可爱（cartoon cute style）\n\n请严格按照以下格式输出，每项一行：\n【主体】[年龄/性别/特征/服装] 的 [主体名称]\n【细节】[特有标志，如发型、道具、配饰]\n【动作】[具体动态，包含速度、幅度、方向]\n【场景】[地点 + 时间 + 周围关键元素]\n【镜头】[景别] + [运镜方式] + [角度]\n【光影】[光源位置/颜色/软硬]\n【氛围】[情绪词]\n【画质】[分辨率] + [风格流派] + [参考作品名]"
    },
    {
      "role": "user",
      "content": "场景描述：{user_edited_description}"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1500
}
```

## 2. 即梦 AI (Jimeng) — 视频生成

### 接口信息
| 项目 | 值 |
|------|-----|
| 模型 | `Doubao-Seedance-2.0` |
| 方式 | 异步任务，提交后轮询状态 |
| 返回 | 视频 URL |
| 鉴权 | 同豆包，使用相同 API Key |

> **待确认**：即梦 API 的具体 endpoint、请求参数格式、轮询机制和返回结构。需要查阅火山引擎即梦产品文档。

### 预期流程
```
1. POST 提交视频生成任务 → 返回 task_id
2. GET 轮询任务状态 → pending/processing/completed/failed
3. completed → 获取视频下载 URL
4. 下载视频文件到本地
```

## 3. 诗词 API

### 方案
使用「今日诗词」API 或其他开放诗词接口。

> **待确认**：具体 API 选型和接入方式。优先支持按体裁筛选（绝句/律诗/词）。

### 预期调用
```
GET /api/poem/random?type=jueju,lvshi,ci&count=4
→ 返回 [{id, title, author, dynasty, content, type}]
```

## 环境变量配置 (.env)

```env
# 豆包/火山引擎
DOUBAO_API_KEY=ark-xxx
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
DOUBAO_TEXT_MODEL=doubao-seed-1.6-flash
DOUBAO_VIDEO_MODEL=Doubao-Seedance-2.0

# 视频保存路径（用户首次启动时选择，写入此文件）
VIDEO_SAVE_PATH=C:/Users/xxx/Videos/DouyinVideos
```

> **安全提醒**：`.env` 文件已加入 `.gitignore`，切勿提交到版本控制。
