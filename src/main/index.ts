import { app, BrowserWindow, ipcMain, protocol } from 'electron'
import path from 'path'
import { config } from 'dotenv'
import { getDatabase, saveDatabase } from './database'
import { getRandomPoems, confirmPoemSelection } from './services/poetry-service'
import type { GenerationProgress } from '../shared/types'
import { existsSync, statSync, createReadStream } from 'fs'
import { Readable } from 'stream'

const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(process.resourcesPath, '.env'),
]
for (const p of envPaths) {
  if (existsSync(p)) {
    config({ path: p })
    break
  }
}

let mainWindow: BrowserWindow | null = null

async function initApp() {
  try {
    await getDatabase()
  } catch (err) {
    console.error('数据库初始化失败:', err)
  }
  createWindow()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: '古诗词视频工坊',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#F0F7FF',
  })

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  protocol.handle('local-video', (request) => {
    try {
      const url = new URL(request.url)
      const filePath = decodeURIComponent(url.pathname).slice(1)
      const resolved = path.resolve(filePath)
      const tempDir = path.resolve(app.getPath('temp'))
      // 白名单：临时目录、系统视频目录、用户自定义保存目录
      const userVideosDir = path.resolve(app.getPath('videos'), '古诗词视频工坊')
      const saveDir = process.env.VIDEO_SAVE_PATH ? path.resolve(process.env.VIDEO_SAVE_PATH) : ''
      const allowed = resolved.startsWith(tempDir)
        || resolved.startsWith(userVideosDir)
        || (!!saveDir && resolved.startsWith(saveDir))
      if (!allowed) {
        return new Response('Forbidden', { status: 403 })
      }

      // 所有文件操作统一使用 resolved，防止路径穿越
      if (!existsSync(resolved)) {
        return new Response('File not found', { status: 404 })
      }

      const stat = statSync(resolved)
      const fileSize = stat.size
      const rangeHeader = request.headers.get('range')

      if (!rangeHeader) {
        const stream = createReadStream(resolved)
        const webStream = Readable.toWeb(stream)
        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': String(fileSize),
            'Accept-Ranges': 'bytes',
          },
        })
      }

      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (!match) {
        return new Response('Invalid range', { status: 416 })
      }

      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

      if (start >= fileSize || end >= fileSize || start > end) {
        return new Response('Range not satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        })
      }

      const chunkSize = end - start + 1
      const stream = createReadStream(resolved, { start, end })
      const webStream = Readable.toWeb(stream)

      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
        },
      })
    } catch {
      return new Response('Internal error', { status: 500 })
    }
  })
  initApp()
})

app.on('window-all-closed', async () => {
  await import('./database').then(({ saveDatabase }) => saveDatabase())
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await import('./database').then(({ saveDatabase }) => saveDatabase())
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// ====== 取消标志 ======
const generationCancelFlags = new Map<string, boolean>()

// ====== IPC 通道注册 ======
//
// 通道命名与实际实现映射：
//   poetry:*             → poetry-service.ts
//   doubao:generate-*    → doubao-api.ts（豆包文本/场景/角色/提示词）
//   jimeng:query-status  → jimeng-api.ts（即梦任务查询）
//   jimeng:download-video→ jimeng-api.ts（即梦视频下载）
//   video:generate       → kling-api.ts（可灵 Kling v3 多镜生成）
//   video:*              → video-service.ts
//   image-video:*        → image-video-service.ts（备用，文生图+FFmpeg 方案）

// 获取随机诗词
ipcMain.handle('poetry:fetch-random', (_event, count: number = 4) => {
  try {
    const poems = getRandomPoems(count)
    return { success: true, data: poems }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 确认选择诗词（不再标记已用，标记逻辑移到视频保存成功时）
ipcMain.handle('poetry:confirm-selection', (_event, poemId: string) => {
  try {
    confirmPoemSelection(poemId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 步骤2: 豆包 - 按诗句拆分为N句场景描绘
ipcMain.handle('doubao:generate-multi-scenes', async (_event, poem: { title: string; author: string; content: string }) => {
  try {
    const { generateMultiLineScenes } = await import('./services/doubao-api')
    const scenes = await generateMultiLineScenes(poem.title, poem.author, poem.content)
    return { success: true, data: scenes }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 步骤3: 豆包 - 生成统一角色
ipcMain.handle('doubao:generate-character', async (_event, params: { poemTitle: string; poemLines: string[] }) => {
  try {
    const { generateCharacter } = await import('./services/doubao-api')
    const character = await generateCharacter(params.poemTitle, params.poemLines)
    return { success: true, data: character }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 步骤3: 豆包 - 根据场景描述生成提示词
ipcMain.handle('doubao:generate-prompts-from-scenes', async (_event, params: { character: string; scenes: string[]; poemTitle: string }) => {
  try {
    const { generatePromptsFromScenes } = await import('./services/doubao-api')
    const prompts = await generatePromptsFromScenes(params.character, params.scenes, params.poemTitle)
    return { success: true, data: prompts }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 即梦 - 查询任务状态
ipcMain.handle('jimeng:query-status', async (_event, taskId: string) => {
  try {
    const { queryTaskStatus } = await import('./services/jimeng-api')
    const result = await queryTaskStatus(taskId)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 步骤4: 可灵 Kling v3 逐镜生成 + 字幕 + FFmpeg 拼接
ipcMain.handle('video:generate', async (event, params: { shotPrompts: string[]; subtitles: string[] }) => {
  const { generateClips } = await import('./services/kling-api')

  const perShotSec = 5
  const cancelKey = `gen_${Date.now()}`
  generationCancelFlags.set(cancelKey, false)

  const onProgress = (p: GenerationProgress) => {
    if (!mainWindow?.isDestroyed()) {
      mainWindow?.webContents.send('video:generation-progress', p)
    }
  }

  const isCancelled = () => generationCancelFlags.get(cancelKey) === true

  try {
    const filePath = await generateClips(params.shotPrompts, params.subtitles, perShotSec, onProgress, isCancelled)
    return { success: true, data: { filePath } }
  } catch (err: any) {
    if (err.message === 'CANCELLED') {
      return { success: false, error: '已取消生成' }
    }
    return { success: false, error: err.message }
  } finally {
    generationCancelFlags.delete(cancelKey)
  }
})

// 取消视频生成
ipcMain.handle('video:cancel-generation', async () => {
  for (const key of generationCancelFlags.keys()) {
    generationCancelFlags.set(key, true)
  }
  return { success: true }
})

// 即梦 - 下载视频
ipcMain.handle('jimeng:download-video', async (_event, videoUrl: string) => {
  try {
    const { downloadVideo } = await import('./services/jimeng-api')
    const filePath = await downloadVideo(videoUrl)
    return { success: true, data: { filePath } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 保存视频到本地（保存成功后标记诗词已使用）
ipcMain.handle('video:save', async (_event, params: { tempPath: string; poem: any; scene: string; prompt: any }) => {
  try {
    const { saveVideo } = await import('./services/video-service')
    const result = await saveVideo(params.tempPath, params.poem, params.scene, params.prompt)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 获取全部视频
ipcMain.handle('video:get-all', async () => {
  try {
    const { getAllVideos } = await import('./services/video-service')
    const videos = await getAllVideos()
    return { success: true, data: videos }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 搜索视频
ipcMain.handle('video:search', async (_event, keyword: string) => {
  try {
    const { searchVideos } = await import('./services/video-service')
    const videos = await searchVideos(keyword)
    return { success: true, data: videos }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 重新扫描文件夹
ipcMain.handle('video:rescan', async () => {
  try {
    const { rescanFolder } = await import('./services/video-service')
    const result = await rescanFolder()
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 删除视频
ipcMain.handle('video:delete', async (_event, id: number) => {
  try {
    const { deleteVideo } = await import('./services/video-service')
    await deleteVideo(id)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// 应用版本
ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})
