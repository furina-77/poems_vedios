import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { spawn } from 'child_process'
import type { GenerationProgress } from '../../shared/types'

let ffmpegPath = 'ffmpeg'
try {
  const p = require('ffmpeg-static')
  if (p) ffmpegPath = p
} catch { /* 未安装 ffmpeg-static，用系统 PATH 的 ffmpeg */ }

const TASK_URL = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks'
const API_KEY = process.env.DOUBAO_API_KEY || ''
const VIDEO_MODEL = process.env.DOUBAO_VIDEO_MODEL || 'ep-20260515232908-d7gs6'

function assertApiKey() {
  if (!API_KEY) throw new Error('即梦 API Key 未配置，请在 .env 中设置 DOUBAO_API_KEY')
}

export async function queryTaskStatus(taskId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string; rawStatus: string
}> {
  const response = await axios.get(`${TASK_URL}/${taskId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    timeout: 15000,
  })
  const data = response.data
  const rawStatus = data?.status || data?.state || data?.phase || 'unknown'
  let status: 'pending' | 'processing' | 'completed' | 'failed'
  if (/^(succeeded|completed|done|finished|ready)$/i.test(rawStatus)) status = 'completed'
  else if (/^(failed|error|cancelled|rejected)$/i.test(rawStatus)) status = 'failed'
  else if (/^(running|processing|in_progress|generating)$/i.test(rawStatus)) status = 'processing'
  else if (/^(pending|queued|submitted|created)$/i.test(rawStatus)) status = 'pending'
  else status = 'processing'

  const videoUrl = data?.output?.video_url || data?.video_url || data?.result?.video_url ||
    data?.generations?.[0]?.video_url || data?.content?.video_url ||
    (typeof data?.output === 'string' ? data.output : undefined)

  return { status, videoUrl, rawStatus }
}

export async function downloadVideo(videoUrl: string): Promise<string> {
  const tempDir = path.join(app.getPath('temp'), 'douyin-vedio')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
  const fileName = `video_${Date.now()}.mp4`
  const filePath = path.join(tempDir, fileName)
  const response = await axios.get(videoUrl, { responseType: 'stream', timeout: 300000 })
  const writer = fs.createWriteStream(filePath)
  response.data.pipe(writer)
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath))
    writer.on('error', reject)
  })
}

async function generateOneClip(
  promptText: string,
  label: string,
  isCancelled: () => boolean
): Promise<string> {
  assertApiKey()
  const response = await axios.post(TASK_URL, {
    model: VIDEO_MODEL,
    content: [{ type: 'text', text: promptText }],
    ratio: '16:9', duration: 10, watermark: false,
  }, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    timeout: 60000,
  })
  const taskId = response.data?.id || response.data?.task_id
  if (!taskId) throw new Error(`${label}: 未获取到任务ID`)

  for (let i = 0; i < 90; i++) {
    if (isCancelled()) throw new Error('CANCELLED')
    await new Promise(r => setTimeout(r, 10000))
    const { status, videoUrl } = await queryTaskStatus(taskId)
    if (status === 'completed' && videoUrl) return await downloadVideo(videoUrl)
    if (status === 'failed') throw new Error(`${label}: 生成失败`)
  }
  throw new Error(`${label}: 轮询超时（15分钟）`)
}

function concatVideos(inputPaths: string[]): Promise<string> {
  const tempDir = path.join(app.getPath('temp'), 'douyin-vedio')
  const outputPath = path.join(tempDir, `merged_${Date.now()}.mp4`)
  const listFile = path.join(tempDir, 'concat_list.txt')
  const listContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  fs.writeFileSync(listFile, listContent)

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outputPath, '-y'])
    let stderr = ''
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL')
      try { fs.unlinkSync(listFile) } catch { /* ignore */ }
      reject(new Error('FFmpeg 拼接超时（5分钟）'))
    }, 300000)
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      clearTimeout(timeout)
      try { fs.unlinkSync(listFile) } catch { /* ignore */ }
      if (code === 0) resolve(outputPath)
      else reject(new Error(`FFmpeg 退出码 ${code}: ${stderr.slice(-200)}`))
    })
    proc.on('error', (err) => {
      clearTimeout(timeout)
      try { fs.unlinkSync(listFile) } catch { /* ignore */ }
      reject(new Error(`FFmpeg 未找到: ${err.message}`))
    })
  })
}

export async function generateLongVideo(
  shotPrompts: string[],
  onProgress: (p: GenerationProgress) => void,
  isCancelled: () => boolean
): Promise<string> {
  if (shotPrompts.length === 0) throw new Error('镜头提示词为空')

  const clipPaths: string[] = []
  for (let i = 0; i < shotPrompts.length; i++) {
    if (isCancelled()) throw new Error('CANCELLED')
    onProgress({ currentClip: i + 1, totalClips: shotPrompts.length, status: 'generating' })

    const clipPath = await generateOneClip(shotPrompts[i], `第${i + 1}/${shotPrompts.length}镜`, isCancelled)
    clipPaths.push(clipPath)
    onProgress({ currentClip: i + 1, totalClips: shotPrompts.length, status: 'clip_done', clipPath })
  }

  if (isCancelled()) throw new Error('CANCELLED')

  if (clipPaths.length === 1) {
    onProgress({ currentClip: 1, totalClips: 1, status: 'done', clipPath: clipPaths[0] })
    return clipPaths[0]
  }

  onProgress({ currentClip: shotPrompts.length, totalClips: shotPrompts.length, status: 'merging' })
  const mergedPath = await concatVideos(clipPaths)
  onProgress({ currentClip: shotPrompts.length, totalClips: shotPrompts.length, status: 'done', clipPath: mergedPath })
  return mergedPath
}
