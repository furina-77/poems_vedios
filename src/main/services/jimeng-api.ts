import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

// 火山引擎 ARK 平台（豆包/即梦共用）的异步任务查询与下载接口
// 视频生成主流程已迁移至 kling-api.ts，本文件仅用于遗留的 queryStatus/downloadVideo
const TASK_URL = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks'
const API_KEY = process.env.DOUBAO_API_KEY || ''

function assertApiKey() {
  if (!API_KEY) throw new Error('火山引擎 API Key 未配置，请在 .env 中设置 DOUBAO_API_KEY')
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
