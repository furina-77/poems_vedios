import axios from 'axios'

const BASE_URL = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const API_KEY = process.env.DOUBAO_API_KEY || ''
const MODEL = process.env.DOUBAO_TEXT_MODEL || 'doubao-seed-1.6-flash'

function assertApiKey() {
  if (!API_KEY) throw new Error('豆包 API Key 未配置，请在 .env 中设置 DOUBAO_API_KEY')
}

async function chatCompletion(systemPrompt: string, userMessage: string): Promise<string> {
  assertApiKey()
  try {
    const response = await axios.post(
      BASE_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        timeout: 120000,
      }
    )
    const content = response.data?.choices?.[0]?.message?.content
    if (!content) throw new Error(`API返回数据异常: ${JSON.stringify(response.data).slice(0, 300)}`)
    return content.trim()
  } catch (err: any) {
    if (err.response) {
      const detail = JSON.stringify(err.response.data || {}).slice(0, 500)
      throw new Error(`[${err.response.status}] ${detail}`)
    }
    throw err
  }
}

function splitPoemLines(content: string): string[] {
  return content
    .split(/\n+/)
    .map(s => s.replace(/[，。、；：？！""''（）《》\s]/g, '').trim())
    .filter(s => s.length >= 4)
}

// ====== 步骤2: 按诗句拆分生成N句场景描绘 ======

const MULTI_SCENE_PROMPT = `你是一位擅长将古诗词转化为现代视觉场景的创意文案专家。请为每一句诗描绘对应的视觉场景画面。

要求：
1. 每句诗对应一段场景描述
2. 用生动的视觉语言描述，包含环境、光影、氛围、人物等细节
3. 适合用于卡通动画视频创作（cartoon cute风格）
4. 每段控制在100字以内
5. 段与段之间用"---"分隔
6. 只输出场景描述，不要添加额外解释`

export async function generateMultiLineScenes(poemTitle: string, poemAuthor: string, poemContent: string): Promise<string[]> {
  const lines = splitPoemLines(poemContent)
  if (lines.length === 0) throw new Error('无法解析诗句')

  const linesText = lines.map((l, i) => `第${i + 1}句：${l}`).join('\n')
  const raw = await chatCompletion(
    MULTI_SCENE_PROMPT,
    `请为《${poemTitle}》（${poemAuthor}）的以下诗句描绘场景：\n${linesText}`
  )

  const scenes = raw
    .replace(/\r\n/g, '\n')
    .split(/^---+[ \t]*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  if (scenes.length === 0) throw new Error('场景描绘生成失败')
  return scenes
}

// ====== 步骤3: 生成统一角色 ======

const CHARACTER_PROMPT = `你是一位专业的动画角色设计师。请根据古诗词的意境，设计一个带有猫咪特征的卡通人物形象。

要求：
- 人物带有可爱猫咪特征（猫耳、猫尾、毛茸茸的爪子）
- 卡通可爱风格（cartoon cute）
- 古风服饰，与诗词朝代背景协调
- 输出一行简洁的角色描述，格式：
【角色】[年龄] 的 [性别]，[发型/发色]，穿着[服装颜色/款式]，[猫耳/猫尾特征]，[其他标志性特征]
只输出这一行，不要额外解释。`

export async function generateCharacter(poemTitle: string, poemLines: string[]): Promise<string> {
  return chatCompletion(
    CHARACTER_PROMPT,
    `请为《${poemTitle}》设计一个角色：\n${poemLines.join('\n')}`
  )
}

// ====== 步骤3: 根据场景描述生成提示词 ======

const PROMPTS_FROM_SCENES_SYSTEM = `你是一位专业的AI视频提示词工程师。请根据给定的角色设定和场景描述，为每个场景生成一段结构化视频提示词。

这些镜头将按顺序拼接成一段连贯视频，你必须确保镜头之间的视觉衔接流畅自然。

固定约束：
- 人物形象：使用提供的【角色】设定，所有镜头中保持不变
- 视频时长：每段不超过10秒
- 风格：卡通可爱（cartoon cute style）
- 画质：1080p，C4D渲染风格

=== 镜头衔接规则（非常重要）===
1. 第一个镜头的开头适合作为开场（如角色入场、场景建立），不需要和前镜衔接
2. 中间镜头的开头要从上一个镜头的结尾自然延续：
   - 动作要衔接：上一镜角色做某个动作→下一镜延续该动作或自然过渡到新动作
   - 场景要衔接：如果场景变化，用镜头运动（如平移、跟拍）作为桥梁
   - 视觉元素要衔接：上一镜的视觉焦点（如飘落的花瓣、流水）可以在下一镜开头短暂出现
3. 最后一个镜头的结尾要有收束感（如镜头拉远、渐行渐远、定格留白）
4. 景别要错落：避免连续两镜用同一景别，相邻镜的景别要有变化（近→远→中→特等）

请严格按以下格式为每个场景输出一段提示词（段与段之间用"---"分隔）：

【主体】[年龄/性别/特征/服装] 的 [主体名称]
【细节】[特有标志，如发型、道具、配饰]
【动作】[具体动态，包含速度、幅度、方向]
【场景】[地点 + 时间 + 周围关键元素]
【镜头】[景别] + [运镜方式] + [角度]
【光影】[光源位置/颜色/软硬]
【氛围】[情绪词，如紧张、梦幻、史诗]
【画质】[分辨率] + [风格流派] + [参考作品名]
【衔接】[本镜与下一镜的衔接方式，如"动作顺接：角色转身→下一镜侧面跟拍"、"视觉桥梁：飘落的花瓣过渡到下一镜的花园场景"；最后一镜写"收束：镜头缓慢拉远，画面渐隐"]

只输出上述格式，每段用---分隔，不要额外解释。`

export async function generatePromptsFromScenes(
  character: string,
  scenes: string[],
  poemTitle: string
): Promise<string[]> {
  const n = scenes.length
  const scenesText = scenes.map((s, i) => {
    const pos = i === 0 ? '【开场镜】' : i === n - 1 ? '【收尾镜】' : `【中间镜${i + 1}/${n}】`
    return `${pos} 场景${i + 1}：${s}`
  }).join('\n')
  const raw = await chatCompletion(
    PROMPTS_FROM_SCENES_SYSTEM,
    `角色设定：${character}\n\n诗词：《${poemTitle}》\n\n${scenesText}\n\n请为每个场景生成一段视频提示词，务必遵循镜头衔接规则确保整段视频连贯流畅。`
  )

  const prompts = raw
    .replace(/\r\n/g, '\n')
    .split(/^---+[ \t]*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  if (prompts.length === 0) throw new Error('提示词生成失败')
  return prompts
}
