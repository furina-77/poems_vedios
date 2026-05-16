import fs from 'fs'
import path from 'path'
import { getUsedPoemIds } from '../database'
import type { Poem } from '../../shared/types'

let poemsCache: Poem[] | null = null

function loadPoems(): Poem[] {
  if (poemsCache) return poemsCache
  const paths = [
    path.join(__dirname, '../../../assets/poems.json'),
    path.join(process.resourcesPath, 'assets', 'poems.json'),
  ]
  let raw: string | null = null
  for (const p of paths) {
    if (fs.existsSync(p)) { raw = fs.readFileSync(p, 'utf-8'); break }
  }
  if (!raw) throw new Error('找不到诗词库文件 poems.json')
  poemsCache = JSON.parse(raw) as Poem[]
  return poemsCache
}

export function getRandomPoems(count: number = 4): Poem[] {
  const allPoems = loadPoems()
  const usedIds = getUsedPoemIds()

  let available = allPoems.filter(p => !usedIds.includes(p.id))
  if (available.length === 0) available = allPoems

  const jueju = available.filter(p => p.type === 'jueju')
  const others = available.filter(p => p.type !== 'jueju')
  const shuffledJueju = [...jueju].sort(() => Math.random() - 0.5)
  const shuffledOthers = [...others].sort(() => Math.random() - 0.5)
  const sorted = [...shuffledJueju, ...shuffledOthers]

  return sorted.slice(0, Math.min(count, sorted.length))
}

// confirmPoemSelection 不再标记已用，标记逻辑移到 video-service 的 saveVideo 中
// 只有视频生成成功保存后才标记
export function confirmPoemSelection(_poemId: string): void {
  // no-op：标记逻辑已移至 saveVideo
}

export function getAllPoems(): Poem[] {
  return loadPoems()
}

export function getPoemById(id: string): Poem | undefined {
  return loadPoems().find(p => p.id === id)
}
