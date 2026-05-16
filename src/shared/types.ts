// ========== 诗词 ==========
export interface Poem {
  id: string
  title: string
  author: string
  dynasty: string
  content: string
  type: 'jueju' | 'lvshi' | 'ci'
}

// ========== 创作流程 ==========
export interface VideoPrompt {
  subject: string
  details: string
  action: string
  scene: string
  camera: string
  lighting: string
  atmosphere: string
  quality: string
}

// ========== 视频生成进度（主进程 → 渲染进程） ==========
export interface GenerationProgress {
  currentClip: number
  totalClips: number
  status: 'generating' | 'clip_done' | 'merging' | 'done' | 'failed'
  clipPath?: string
  error?: string
}

// ========== 视频记录 ==========
export interface VideoRecord {
  id: number
  fileName: string
  filePath: string
  fileSize: number
  createdAt: string
  poemTitle: string
  poemAuthor: string
  poemContent: string
  sceneDescription: string
  promptJson: string
  tags: string
}

// ========== IPC 通道 ==========
export const IPC_CHANNELS = {
  // 诗词
  FETCH_POEMS: 'poetry:fetch-random',
  CONFIRM_POEM: 'poetry:confirm-selection',
  // 豆包 — 场景
  GENERATE_MULTI_SCENES: 'doubao:generate-multi-scenes',
  // 豆包 — 角色
  GENERATE_CHARACTER: 'doubao:generate-character',
  // 豆包 — 提示词
  GENERATE_PROMPTS_FROM_SCENES: 'doubao:generate-prompts-from-scenes',
  // 即梦 — 视频
  GENERATE_LONG_VIDEO: 'jimeng:generate-long-video',
  CANCEL_GENERATION: 'video:cancel-generation',
  QUERY_VIDEO_STATUS: 'jimeng:query-status',
  DOWNLOAD_VIDEO: 'jimeng:download-video',
  // 视频管理
  SAVE_VIDEO: 'video:save',
  GET_VIDEOS: 'video:get-all',
  SEARCH_VIDEOS: 'video:search',
  DELETE_VIDEO: 'video:delete',
  RESCAN_FOLDER: 'video:rescan',
  // 系统
  GET_VERSION: 'app:get-version',
  // 主进程推送
  GENERATION_PROGRESS: 'video:generation-progress',
} as const
