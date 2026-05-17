import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { getDatabase, saveDatabase, markPoemUsed } from '../database'
import type { VideoRecord } from '../../shared/types'

function getSaveDir(): string {
  const customPath = process.env.VIDEO_SAVE_PATH
  if (customPath && fs.existsSync(customPath)) {
    return customPath
  }
  const defaultDir = path.join(app.getPath('videos'), '古诗词视频工坊')
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true })
  }
  return defaultDir
}

export async function saveVideo(
  tempPath: string,
  poem: { id: string; title: string; author: string; content: string },
  sceneDescription: string,
  promptFields: Record<string, string>
): Promise<{ id: number; fileName: string; filePath: string }> {
  const saveDir = getSaveDir()
  const timestamp = Date.now()
  const safeTitle = poem.title.replace(/[<>:"/\\|?*]/g, '_')
  const fileName = `${safeTitle}_${timestamp}.mp4`
  const destPath = path.join(saveDir, fileName)

  fs.copyFileSync(tempPath, destPath)

  const fileSize = fs.statSync(destPath).size
  if (fileSize === 0) {
    fs.unlinkSync(destPath)
    throw new Error('视频文件为空，保存已取消')
  }

  const db = await getDatabase()
  db.run(
    `INSERT INTO saved_videos (file_name, file_path, file_size, poem_title, poem_author, poem_content, scene_description, prompt_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [fileName, destPath, fileSize, poem.title, poem.author, poem.content, sceneDescription, JSON.stringify(promptFields)]
  )

  // 保存成功才标记诗词为已使用
  markPoemUsed(poem.id)

  saveDatabase()

  const result = db.exec('SELECT last_insert_rowid()')
  const id = result[0].values[0][0] as number

  return { id, fileName, filePath: destPath }
}

export async function getAllVideos(): Promise<VideoRecord[]> {
  const db = await getDatabase()
  const result = db.exec('SELECT * FROM saved_videos ORDER BY created_at DESC')
  if (result.length === 0) return []
  return result[0].values.map(row => ({
    id: row[0] as number,
    fileName: row[1] as string,
    filePath: row[2] as string,
    fileSize: row[3] as number,
    createdAt: row[4] as string,
    poemTitle: row[5] as string,
    poemAuthor: row[6] as string,
    poemContent: row[7] as string,
    sceneDescription: row[8] as string,
    promptJson: row[9] as string,
    tags: (row[10] as string) || '',
  }))
}

export async function searchVideos(keyword: string): Promise<VideoRecord[]> {
  const db = await getDatabase()
  // 转义 SQL LIKE 通配符，防止用户输入 % 或 _ 导致匹配异常
  const escaped = keyword.replace(/[%_]/g, '\\$&')
  const like = `%${escaped}%`
  const stmt = db.prepare(
    `SELECT * FROM saved_videos
     WHERE poem_title LIKE ? OR poem_author LIKE ? OR poem_content LIKE ? OR scene_description LIKE ?
     ORDER BY created_at DESC`
  )
  stmt.bind([like, like, like, like])
  const results: VideoRecord[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push({
      id: row.id as number,
      fileName: row.file_name as string,
      filePath: row.file_path as string,
      fileSize: row.file_size as number,
      createdAt: row.created_at as string,
      poemTitle: row.poem_title as string,
      poemAuthor: row.poem_author as string,
      poemContent: row.poem_content as string,
      sceneDescription: row.scene_description as string,
      promptJson: row.prompt_json as string,
      tags: (row.tags as string) || '',
    })
  }
  stmt.free()
  return results
}

export async function rescanFolder(): Promise<{ added: number; total: number }> {
  const saveDir = getSaveDir()
  const db = await getDatabase()

  const existing = new Set<string>()
  const result = db.exec('SELECT file_path FROM saved_videos')
  if (result.length > 0) {
    for (const row of result[0].values) {
      existing.add((row[0] as string).toLowerCase())
    }
  }

  const files = fs.readdirSync(saveDir).filter(f => f.endsWith('.mp4'))
  let added = 0

  const resolvedSaveDir = path.resolve(saveDir)
  for (const file of files) {
    const filePath = path.join(saveDir, file)
    if (!path.resolve(filePath).startsWith(resolvedSaveDir)) continue
    if (existing.has(filePath.toLowerCase())) continue

    try {
      const fileSize = fs.statSync(filePath).size
      const poemTitle = file.replace(/_\d+\.mp4$/, '')
      db.run(
        `INSERT INTO saved_videos (file_name, file_path, file_size, poem_title, poem_author, poem_content, scene_description, prompt_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [file, filePath, fileSize, poemTitle, '', '', '（通过文件夹扫描导入）', '{}']
      )
      added++
    } catch {
      // 跳过无法读取的文件
    }
  }

  if (added > 0) saveDatabase()
  return { added, total: files.length }
}

export async function deleteVideo(id: number): Promise<void> {
  const db = await getDatabase()
  const stmt = db.prepare('SELECT file_path FROM saved_videos WHERE id = ?')
  stmt.bind([id])
  if (stmt.step()) {
    const row = stmt.getAsObject()
    const filePath = row.file_path as string
    stmt.free()
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } else {
    stmt.free()
  }
  db.run('DELETE FROM saved_videos WHERE id = ?', [id])
  saveDatabase()
}
