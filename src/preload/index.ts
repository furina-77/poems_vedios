import { contextBridge, ipcRenderer } from 'electron'
import type { Poem, VideoRecord, GenerationProgress } from '../shared/types'

export interface ApiResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface TaskResult { taskId: string }

export interface TaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  rawStatus: string
}

export interface DownloadResult { filePath: string }

export interface SaveResult { id: number; fileName: string; filePath: string }

export type { VideoRecord, GenerationProgress }

export interface ElectronAPI {
  // 诗词
  fetchPoems: (count?: number) => Promise<ApiResult<Poem[]>>
  // 步骤2: 场景描绘（按诗句拆分，一句一场景）
  generateMultiScenes: (poem: { title: string; author: string; content: string }) => Promise<ApiResult<string[]>>
  // 步骤3: 角色生成
  generateCharacter: (params: { poemTitle: string; poemLines: string[] }) => Promise<ApiResult<string>>
  // 步骤3: 提示词生成（基于场景描述）
  generatePromptsFromScenes: (params: { character: string; scenes: string[]; poemTitle: string }) => Promise<ApiResult<string[]>>
  // 步骤4: 视频生成（带进度推送和取消）
  generateLongVideo: (params: { shotPrompts: string[]; subtitles: string[] }) => Promise<ApiResult<DownloadResult>>
  cancelGeneration: () => Promise<ApiResult>
  onGenerationProgress: (callback: (progress: GenerationProgress) => void) => () => void
  // 视频管理
  saveVideo: (params: { tempPath: string; poem: { id: string; title: string; author: string; content: string }; scene: string; prompt: Record<string, string> }) => Promise<ApiResult<SaveResult>>
  getAllVideos: () => Promise<ApiResult<VideoRecord[]>>
  searchVideos: (keyword: string) => Promise<ApiResult<VideoRecord[]>>
  deleteVideo: (id: number) => Promise<ApiResult>
  rescanFolder: () => Promise<ApiResult<{ added: number; total: number }>>
  // 系统
  getVersion: () => Promise<string>
}

const electronAPI: ElectronAPI = {
  fetchPoems: (count = 4) => ipcRenderer.invoke('poetry:fetch-random', count),
  generateMultiScenes: (poem) => ipcRenderer.invoke('doubao:generate-multi-scenes', poem),
  generateCharacter: (params) => ipcRenderer.invoke('doubao:generate-character', params),
  generatePromptsFromScenes: (params) => ipcRenderer.invoke('doubao:generate-prompts-from-scenes', params),
  generateLongVideo: (params) => ipcRenderer.invoke('video:generate', params),
  cancelGeneration: () => ipcRenderer.invoke('video:cancel-generation'),
  onGenerationProgress: (callback: (progress: GenerationProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: GenerationProgress) => callback(progress)
    ipcRenderer.on('video:generation-progress', handler)
    return () => ipcRenderer.removeListener('video:generation-progress', handler)
  },
  saveVideo: (params) => ipcRenderer.invoke('video:save', params),
  getAllVideos: () => ipcRenderer.invoke('video:get-all'),
  searchVideos: (keyword) => ipcRenderer.invoke('video:search', keyword),
  deleteVideo: (id) => ipcRenderer.invoke('video:delete', id),
  rescanFolder: () => ipcRenderer.invoke('video:rescan'),
  getVersion: () => ipcRenderer.invoke('app:get-version'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
