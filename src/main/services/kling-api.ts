import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { spawn } from 'child_process'
import jwt from 'jsonwebtoken'
import type { GenerationProgress } from '../../shared/types'

const BASE_URL = 'https://api-beijing.klingai.com'
const AK = process.env.KLING_AK || ''
const SK = process.env.KLING_SK || ''
const MODEL = process.env.KLING_MODEL || 'kling-v3'

let ffmpegPath = 'ffmpeg'
try { const p = require('ffmpeg-static'); if (p) ffmpegPath = p } catch { /* fallback */ }

// JWT 缓存
let cachedToken = ''
let tokenExpiry = 0

function generateToken(): string {
  if (!AK || !SK) throw new Error('可灵 AK/SK 未配置')
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && now < tokenExpiry - 60) return cachedToken
  const payload = { iss: AK, exp: now + 1800, nbf: now - 5 }
  cachedToken = jwt.sign(payload, SK, { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } })
  tokenExpiry = now + 1800
  return cachedToken
}

function authHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${generateToken()}` }
}

async function downloadVideo(videoUrl: string): Promise<string> {
  const tempDir = path.join(app.getPath('temp'), 'douyin-vedio')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
  const filePath = path.join(tempDir, `kling_${Date.now()}.mp4`)
  const response = await axios.get(videoUrl, { responseType: 'stream', timeout: 300000 })
  const writer = fs.createWriteStream(filePath)
  response.data.pipe(writer)
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath))
    writer.on('error', reject)
  })
}

// 用 ASS 字幕叠加到视频
function burnSubtitle(videoPath: string, subtitle: string, duration: number): Promise<string> {
  const tempDir = path.join(app.getPath('temp'), 'douyin-vedio')
  const assPath = path.join(tempDir, `sub_${Date.now()}.ass`)
  const outputPath = path.join(tempDir, `subbed_${Date.now()}.mp4`)

  const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Microsoft YaHei,28,&H00FFFFFF&,2,10,10,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:${String(duration).padStart(2, '0')}.00,Default,,0,0,0,,${subtitle.replace(/[\\{},]/g, '')}
`
  fs.writeFileSync(assPath, assContent, 'utf-8')

  return new Promise((resolve, reject) => {
    const args = [
      '-i', videoPath,
      '-vf', `ass=${assPath.replace(/\\/g, '/').replace(':', '\\\\:')}`,
      '-c:a', 'copy',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '18',
      '-y', outputPath,
    ]
    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    const t = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('字幕叠加超时')) }, 60000)
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      clearTimeout(t)
      try { fs.unlinkSync(assPath) } catch {}
      if (code === 0) resolve(outputPath)
      else reject(new Error(`字幕失败: ${stderr.slice(-200)}`))
    })
    proc.on('error', (err) => { clearTimeout(t); try { fs.unlinkSync(assPath) } catch {}; reject(new Error(`FFmpeg: ${err.message}`)) })
  })
}

// 单镜提交 + 轮询 + 下载
async function generateOneClip(
  prompt: string,
  duration: string | number,
  subtitle: string,
  isCancelled: () => boolean
): Promise<string> {
  const response = await axios.post(
    `${BASE_URL}/v1/videos/text2video`,
    {
      model_name: MODEL,
      prompt: prompt.slice(0, 500),
      duration: String(duration),
      mode: 'pro',
      aspect_ratio: '16:9',
      sound: 'off',
    },
    { headers: authHeaders(), timeout: 60000 }
  )

  const taskId = response.data?.data?.task_id
  if (!taskId) throw new Error(`提交失败: ${JSON.stringify(response.data).slice(0, 400)}`)

  for (let i = 0; i < 240; i++) {
    if (isCancelled()) throw new Error('CANCELLED')
    await new Promise(r => setTimeout(r, 5000))

    const res = await axios.get(`${BASE_URL}/v1/videos/text2video/${taskId}`, {
      headers: authHeaders(), timeout: 15000,
    })
    const data = res.data?.data
    const status = data?.task_status

    if (status === 'succeed') {
      const url = data?.task_result?.videos?.[0]?.url
      if (!url) throw new Error('任务完成但未返回视频URL')
      const videoPath = await downloadVideo(url)
      // 叠加字幕
      if (subtitle) {
        return await burnSubtitle(videoPath, subtitle, Number(duration))
      }
      return videoPath
    }
    if (status === 'failed') throw new Error(data?.task_status_msg || '生成失败')
  }
  throw new Error('轮询超时（20分钟）')
}

// FFmpeg 拼接
function concatClips(inputPaths: string[]): Promise<string> {
  const tempDir = path.join(app.getPath('temp'), 'douyin-vedio')
  const outputPath = path.join(tempDir, `merged_${Date.now()}.mp4`)
  const listFile = path.join(tempDir, 'concat_list.txt')
  const listContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  fs.writeFileSync(listFile, listContent)

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outputPath, '-y'])
    let stderr = ''
    const t = setTimeout(() => { proc.kill('SIGKILL'); try { fs.unlinkSync(listFile) } catch {}; reject(new Error('拼接超时')) }, 300000)
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      clearTimeout(t)
      try { fs.unlinkSync(listFile) } catch {}
      if (code === 0) resolve(outputPath)
      else reject(new Error(`拼接失败: ${stderr.slice(-200)}`))
    })
    proc.on('error', (err) => { clearTimeout(t); try { fs.unlinkSync(listFile) } catch {}; reject(new Error(`FFmpeg未找到: ${err.message}`)) })
  })
}

// 逐镜生成 → 拼接
export async function generateClips(
  shotPrompts: string[],
  subtitles: string[],
  perShotSec: number,
  onProgress: (p: GenerationProgress) => void,
  isCancelled: () => boolean
): Promise<string> {
  const total = shotPrompts.length
  if (total === 0) throw new Error('镜头列表为空')

  const clipPaths: string[] = []

  for (let i = 0; i < total; i++) {
    if (isCancelled()) throw new Error('CANCELLED')
    onProgress({ currentClip: i + 1, totalClips: total, status: 'generating' })

    const clipPath = await generateOneClip(shotPrompts[i], perShotSec, subtitles[i] || '', isCancelled)
    clipPaths.push(clipPath)

    onProgress({ currentClip: i + 1, totalClips: total, status: 'clip_done', clipPath })
  }

  if (total === 1) {
    onProgress({ currentClip: 1, totalClips: 1, status: 'done', clipPath: clipPaths[0] })
    return clipPaths[0]
  }

  onProgress({ currentClip: total, totalClips: total, status: 'merging' })
  const mergedPath = await concatClips(clipPaths)
  onProgress({ currentClip: total, totalClips: total, status: 'done', clipPath: mergedPath })
  return mergedPath
}
